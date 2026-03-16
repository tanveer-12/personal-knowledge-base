# Architecture

## Project overview

Personal Knowledge Base with Semantic Search. Users store notes and retrieve them by meaning using vector similarity, not keyword matching.

---

## Live deployment

| Service | URL |
|---|---|
| Frontend | https://personal-knowledge-base-three.vercel.app |
| Backend API | https://personal-knowledge-base-mlh9.onrender.com |
| API docs | https://personal-knowledge-base-mlh9.onrender.com/docs |

---

## Tech stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| API framework | FastAPI | 0.109.0 | Async, auto OpenAPI docs, Pydantic integration |
| Database | PostgreSQL (Neon) | 16 | Serverless, free tier, pgvector support |
| Vector extension | pgvector | 0.2.4 | Native cosine similarity search in SQL |
| Embedding model | SentenceTransformers all-MiniLM-L6-v2 | 2.7.0 | 384 dims, 80MB, fast on CPU, strong semantic quality |
| Frontend framework | Next.js | 16.1.6 | React with SSR, Vercel-native deployment |
| CSS | Tailwind CSS | 4.x | Utility-first, no custom CSS needed |
| Backend hosting | Render | — | Free tier, auto-deploy from GitHub |
| Frontend hosting | Vercel | — | Free tier, native Next.js support |
| Database hosting | Neon | — | Serverless PostgreSQL, free tier, pgvector enabled |
| Containerisation | Docker (Ubuntu 20.04) | — | Local CPU testing, mirrors production environment |
| Development GPU | Google Colab Pro (T4) | — | Development only — not in production path |

---

## System architecture

```
                       ┌─────────────────────────────┐
  VS Code ─── push ──► │          GitHub              │
                       └──────┬──────────┬────────────┘
                              │          │
                         auto-deploy  auto-deploy
                              │          │
                              ▼          ▼
                          Render      Vercel
                         (FastAPI)  (Next.js)
                              │          │
                              │   HTTP   │
  Browser ◄──────────────────┼──────────┘
                              │
                         SQL + pgvector
                              │
                              ▼
                    Neon (PostgreSQL + pgvector)


  Google Colab Pro ─── ngrok URL ─── Next.js on Windows
  (dev only, T4 GPU)                 (calls ngrok instead of Render)
```

---

## Data flow — write path

1. User submits note via frontend form
2. Next.js calls `POST /notes/` on FastAPI
3. FastAPI combines title + body into a single string: `"{title}. {body}"`
4. `EmbeddingService.embed()` encodes the string using all-MiniLM-L6-v2
5. Model outputs a 384-dimensional float vector
6. FastAPI stores the note + vector in PostgreSQL via SQLAlchemy
7. pgvector stores the vector in the `embedding vector(384)` column
8. FastAPI returns a `NoteResponse` to the frontend
9. Frontend adds the note to the UI without a page refresh

---

## Data flow — search path

1. User types a query in `SearchBar` (300ms debounce)
2. Next.js calls `GET /search/?q={query}`
3. FastAPI embeds the query using the same model
4. pgvector executes cosine similarity: `1 - (embedding <=> query_vec)`
5. Results filtered by threshold (default 0.25)
6. Results ordered by similarity score descending
7. FastAPI returns a `SearchResponse` with scores
8. Frontend displays `NoteCard` components with percentage similarity badges

---

## Database schema

**Table: `notes`**

| Column | Type | Constraints |
|---|---|---|
| `id` | `SERIAL` | `PRIMARY KEY` |
| `title` | `VARCHAR(255)` | `NOT NULL` |
| `body` | `TEXT` | `NOT NULL` |
| `tags` | `VARCHAR(500)` | nullable, comma-separated string e.g. `"python,learning"` |
| `embedding` | `vector(384)` | nullable |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP` |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT CURRENT_TIMESTAMP`, auto-updated by trigger |

**Indexes:**

| Name | Type | Columns | Options |
|---|---|---|---|
| `notes_embedding_hnsw_idx` | HNSW | `embedding` | `vector_cosine_ops`, m=16, ef_construction=64 |
| `notes_created_at_idx` | B-tree | `created_at DESC` | — |

**Trigger:** `set_timestamp` — `BEFORE UPDATE` on `notes`, sets `updated_at = CURRENT_TIMESTAMP` on every row modification.

---

## API endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/health` | Health check, returns status + model info | None |
| `GET` | `/notes/` | List notes (default limit 20, ordered by `created_at DESC`) | None |
| `POST` | `/notes/` | Create a note, generates and stores embedding | None |
| `GET` | `/notes/{id}` | Get a single note by ID | None |
| `PATCH` | `/notes/{id}` | Partial update; regenerates embedding if title or body changes | None |
| `DELETE` | `/notes/{id}` | Delete a note | None |
| `GET` | `/search/` | Semantic search with `?q=`, optional `limit` and `threshold` | None |
| `GET` | `/search/related/{note_id}` | Find notes similar to a given note (excludes self) | None |

---

## Embedding service

`EmbeddingService` in [backend/app/embeddings.py](../backend/app/embeddings.py) implements the singleton pattern via `__new__`. The model is lazy-loaded — it is not loaded at import time or on startup, only on the first call to `embed()` or `embed_batch()`.

**Device selection:** `torch.cuda.is_available()` is checked at load time. CUDA is used if available (Colab T4), otherwise CPU (Render, Docker).

**Normalization:** `normalize_embeddings=True` is passed to every `.encode()` call. This ensures all vectors are unit-length, making the cosine distance operator (`<=>`) equivalent to dot product — computationally cheaper and consistent.

**Why all-MiniLM-L6-v2:**
- 384 dimensions — small enough to store efficiently in pgvector
- ~80MB model size — fits within Render's free-tier memory
- Fast inference on CPU — acceptable latency without a GPU
- Strong semantic understanding relative to its size — outperforms keyword search for meaning-based retrieval

---

## Environment variables

| Variable | Service | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Render, Colab | PostgreSQL connection string (Neon) | `postgresql://user:pass@host/db?sslmode=require` |
| `APP_ENV` | Render | Application environment label | `production` |
| `ALLOWED_ORIGINS` | Render | Comma-separated list of allowed CORS origins | `https://personal-knowledge-base-three.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Vercel | Base URL of the FastAPI backend | `https://personal-knowledge-base-mlh9.onrender.com` |

---

## Development workflow

### Two environments

**1. Active development — Google Colab Pro (T4 GPU)**
- Colab notebook runs FastAPI with a T4 GPU for fast embedding inference
- ngrok exposes the Colab server as a public HTTPS URL
- Next.js on Windows sets `NEXT_PUBLIC_API_URL` to the ngrok URL
- Neon is the shared database across all environments

**2. Local testing — Docker**
- `docker-compose.yml` builds the backend image from `backend/Dockerfile`
- Ubuntu 20.04 container runs FastAPI on CPU
- Identical codebase to production — no environment-specific branches

### Daily dev loop

1. Edit code in VS Code
2. `git push` to GitHub
3. In Colab: Cell 2 (`git pull`) → Cell 4 (restart server)
4. Test via ngrok URL or `localhost:3000`
5. Merge to `main` triggers auto-deploy on Render and Vercel

---

## Known limitations and future improvements

- **Render cold starts:** Free tier spins down after 15 minutes of inactivity. First request after idle takes 30–60 seconds.
- **General-purpose model:** all-MiniLM-L6-v2 is not domain-tuned. Fine-tuning on personal notes would improve retrieval quality.
- **No authentication:** Single-user only. No login, no access control.
- **Hardcoded search threshold:** Default of 0.25 is fixed in the API. Could be exposed as a user-configurable setting in the frontend.
- **No frontend pagination:** The note list fetches a fixed limit of 20 notes. No infinite scroll or page controls.

---

## Project structure

```
personal-knowledge-base/
├── .editorconfig                  # Editor formatting rules
├── .gitignore                     # Root gitignore
├── README.md                      # Project overview (placeholder)
├── docker-compose.yml             # Local development: builds + runs backend container
├── render.yaml                    # Render deployment configuration
│
├── backend/
│   ├── Dockerfile                 # Dev image (CPU, includes dev dependencies)
│   ├── Dockerfile.production      # Production image (optimised for Render)
│   ├── requirements.txt           # All Python dependencies, fully pinned
│   ├── .env                       # Local env vars (gitignored)
│   ├── .env.example               # Template for required env vars
│   └── app/
│       ├── __init__.py
│       ├── main.py                # FastAPI app: lifespan, CORS middleware, router includes
│       ├── config.py              # pydantic-settings: DATABASE_URL, APP_ENV
│       ├── database.py            # SQLAlchemy engine, SessionLocal, verify_connection
│       ├── models.py              # Note ORM model (id, title, body, tags, embedding, timestamps)
│       ├── schemas.py             # Pydantic schemas: NoteCreate, NoteUpdate, NoteResponse, SearchResult, SearchResponse
│       ├── embeddings.py          # EmbeddingService singleton (lazy-loads all-MiniLM-L6-v2)
│       └── routers/
│           ├── __init__.py
│           ├── notes.py           # CRUD endpoints: POST/GET/PATCH/DELETE /notes/
│           └── search.py          # Search endpoints: GET /search/, GET /search/related/{id}
│
├── database/
│   ├── init.sql                   # Schema setup: pgvector, notes table, HNSW index, trigger
│   └── seed.sql                   # Sample notes for development
│
├── docs/
│   └── architecture.md            # This file
│
├── notebooks/
│   └── development.ipynb          # Colab notebook: installs deps, runs FastAPI with ngrok
│
└── frontend/
    ├── .env.local                  # NEXT_PUBLIC_API_URL (gitignored)
    ├── .env.local.example          # Template for frontend env vars
    ├── .gitignore
    ├── next.config.ts              # Next.js configuration
    ├── tsconfig.json               # TypeScript configuration
    ├── postcss.config.mjs          # PostCSS / Tailwind configuration
    ├── eslint.config.mjs           # ESLint configuration
    ├── package.json                # Dependencies: Next.js 16, React 19, Tailwind 4
    ├── next-env.d.ts               # Next.js TypeScript ambient types
    ├── types/
    │   └── index.ts                # Shared TypeScript types: Note, NoteCreate, SearchResponse, etc.
    ├── lib/
    │   └── api.ts                  # All fetch calls to the FastAPI backend
    ├── app/
    │   ├── favicon.ico
    │   ├── globals.css             # Tailwind base styles
    │   ├── layout.tsx              # Root layout: font, metadata
    │   ├── page.tsx                # Home page: note list + search bar
    │   └── notes/
    │       ├── new/
    │       │   └── page.tsx        # New note form page
    │       └── [id]/
    │           └── page.tsx        # Note detail + edit page
    ├── components/
    │   ├── NoteCard.tsx            # Note preview card with title, tags, snippet
    │   ├── NoteEditor.tsx          # Create/edit form for notes
    │   ├── SearchBar.tsx           # Debounced search input
    │   └── SearchResults.tsx       # Renders list of SearchResult with similarity badges
    └── public/
        ├── file.svg
        ├── globe.svg
        ├── next.svg
        ├── vercel.svg
        └── window.svg
```
