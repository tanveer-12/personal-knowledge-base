# Personal Knowledge Base

> A semantic note-taking app — write freely, find anything by meaning.

<!-- Replace with a real screenshot after deployment -->
![App Screenshot](docs/screenshot.png)

---

## Why this is interesting

Most note apps search by keywords. This one searches by **meaning**.

You write a note in plain language. The backend splits it into overlapping text chunks, embeds each chunk through `all-MiniLM-L6-v2`, and stores the resulting 384-dimensional vectors in PostgreSQL. When you search, your query goes through the exact same pipeline — the database then finds chunks whose vectors are *geometrically close* using cosine distance. Notes surface based on conceptual similarity, not word overlap.

This means searching `"feeling overwhelmed"` can surface a note titled *"My Calendar Works Against Me"* whose body says *"back-to-back commitments produce the least output"* — no shared vocabulary, but the same region of meaning-space.

The second interesting piece is **related notes**: every note can surface conceptually adjacent notes without you ever tagging or linking them manually. Write enough notes and the graph builds itself.

---

## How it flows

```
You write a note
        │
        ▼
  raw_content split into overlapping text chunks
        │
        ▼
  each chunk → all-MiniLM-L6-v2 (SentenceTransformers)
  384-dim vector, L2-normalized (cosine similarity via dot product)
        │
        ▼
  stored in PostgreSQL + pgvector  (note_chunks table)


  Search query → same model → same 384-dim vector
        │
        ▼
  pgvector  SELECT ... ORDER BY embedding <=> query_vector
  (cosine distance, default threshold 0.25)
  CTE deduplicates — one result per note, ranked by best chunk match
        │
        ▼
  ranked results with relevance score → Next.js frontend
```

### Embedding model

| Property | Value |
|---|---|
| Model | `all-MiniLM-L6-v2` |
| Library | `sentence-transformers` |
| Dimensions | 384 |
| Normalization | L2 — cosine similarity reduces to a dot product |
| Device | CUDA if available, CPU fallback |
| Loading strategy | Lazy singleton warmed up at startup — no cold-start penalty on first request |

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI + SQLAlchemy |
| Embeddings | SentenceTransformers `all-MiniLM-L6-v2` |
| Vector store | PostgreSQL + pgvector (Neon serverless) |
| Frontend | Next.js + Tailwind CSS (dark mode + theme switcher) |
| Dev env | Google Colab Pro (T4 GPU) via ngrok |
| Production | Render (API) + Vercel (frontend) |

---

## API

```
POST   /notes                      create (auto-chunks + embeds)
GET    /notes                      list all notes
GET    /notes/{id}                 single note
PATCH  /notes/{id}                 update (re-embeds on content change)
DELETE /notes/{id}                 delete

GET    /search?q=your+query        semantic search across all chunks
GET    /search/related/{note_id}   notes semantically similar to a given note

GET    /health                     model name, dims, env
```

---

## Running locally

```bash
# backend
cp backend/.env.example backend/.env
# fill in DATABASE_URL (Neon connection string)
docker compose up --build

# frontend
cd frontend && npm install && npm run dev
```

The backend also runs in Google Colab — see `notebooks/development.ipynb`.

---

## Project structure

```
backend/app/
  main.py            lifespan startup, CORS, global error handler
  models.py          Note, NoteChunk, NoteTag ORM models
  embeddings.py      EmbeddingService singleton
  routers/notes.py   CRUD endpoints
  routers/search.py  semantic search + related notes
frontend/            Next.js app
notebooks/           Colab development notebook
database/            init.sql, seed.sql
```

---

## License

MIT
