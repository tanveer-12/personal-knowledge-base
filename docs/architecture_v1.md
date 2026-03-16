# Personal Knowledge Base — Version 1 Architecture

**Document type:** Internal Engineering Reference
**Status:** Current implementation as of v1
**Scope:** Backend API, database, embedding pipeline, deployment topology

---

## 1. System Overview

The Personal Knowledge Base (PKB) is a note-storage and semantic retrieval system. Users create free-form notes (title + body + optional tags). Each note is embedded into a 384-dimensional vector at write time. At read time, a natural-language query is embedded using the same model and compared against stored vectors to return semantically similar notes — regardless of keyword overlap.

The system consists of:

- A **FastAPI backend** that owns all business logic, persistence, and embedding inference.
- A **Neon serverless PostgreSQL database** with the `pgvector` extension for vector storage and similarity search.
- A **frontend directory** that is currently empty; no UI has been implemented.

---

## 2. Backend Architecture

### Runtime

The backend is a synchronous FastAPI application served by Uvicorn. All database access is synchronous SQLAlchemy 2.x.

### Entry Point — `main.py`

Application startup is managed via FastAPI's `lifespan` context manager:

1. Calls `verify_connection()` to assert the database is reachable.
2. Calls `Base.metadata.create_all()` to create any missing tables (non-destructive; does not alter existing schema).
3. Logs startup confirmation.

CORS origins are resolved at import time from the `ALLOWED_ORIGINS` environment variable (comma-separated). If the variable is absent or empty, the application defaults to `http://localhost:3000`.

### Configuration — `config.py`

Settings are managed via `pydantic-settings`. Two fields are declared:

| Field          | Type   | Default         | Source       |
|----------------|--------|-----------------|--------------|
| `database_url` | `str`  | *(required)*    | env / `.env` |
| `app_env`      | `str`  | `"development"` | env / `.env` |

The `Settings` instance is cached via `@lru_cache` and reused across the process lifetime.

### Database Layer — `database.py`

A single SQLAlchemy `Engine` is created at module import time with:

- `pool_pre_ping=True` — validates connections before use (guards against Neon idle-connection drops).
- `pool_recycle=300` — recycles connections every 5 minutes.

`get_db()` is a FastAPI dependency that yields a `SessionLocal` instance and closes it in the `finally` block.

### Routers

#### `routers/notes.py` — CRUD

| Method   | Path            | Behaviour                                                              |
|----------|-----------------|------------------------------------------------------------------------|
| `POST`   | `/notes/`       | Embeds `"{title}. {body}"`, persists `Note`, returns `NoteResponse`.   |
| `GET`    | `/notes/`       | Returns paginated notes ordered by `created_at DESC`. Default: `skip=0, limit=20`. |
| `GET`    | `/notes/{id}`   | Returns a single note; 404 if not found.                               |
| `PATCH`  | `/notes/{id}`   | Applies partial update. Re-embeds if `title` or `body` changed.        |
| `DELETE` | `/notes/{id}`   | Hard deletes; returns HTTP 204.                                        |

#### `routers/search.py` — Semantic Search

| Method | Path                      | Behaviour                                                                 |
|--------|---------------------------|---------------------------------------------------------------------------|
| `GET`  | `/search/`                | Embeds query `q`, runs similarity SQL, returns `SearchResponse`.          |
| `GET`  | `/search/related/{id}`    | Uses the stored embedding of note `{id}` as query; excludes self.         |

Both endpoints accept `limit` (max 50, default 10) and `threshold` (0.0–1.0, default 0.25) query parameters.

#### `GET /health`

Returns model name (`all-MiniLM-L6-v2`), embedding dimensions (384), and current `app_env`.

### Schemas — `schemas.py`

| Schema           | Purpose                                                                      |
|------------------|------------------------------------------------------------------------------|
| `NoteCreate`     | Input validation for note creation (title, body required; tags optional).    |
| `NoteUpdate`     | Partial update; all fields optional.                                         |
| `NoteResponse`   | API response shape; excludes `embedding`.                                    |
| `SearchResult`   | Wraps `NoteResponse` with a `similarity_score`.                              |
| `SearchResponse` | Wraps `List[SearchResult]` with `query` and `total`.                         |

---

## 3. Frontend Architecture

The `frontend/` directory exists in the repository but contains no files. No frontend has been implemented in v1. The backend's CORS configuration defaults to `http://localhost:3000`, indicating the intended frontend framework is Next.js.

---

## 4. Database Schema

### Table: `notes`

| Column       | Type           | Constraints                 | Notes                                                                   |
|--------------|----------------|-----------------------------|-------------------------------------------------------------------------|
| `id`         | `SERIAL`       | `PRIMARY KEY`               | Auto-incrementing integer.                                              |
| `title`      | `VARCHAR(255)` | `NOT NULL`                  |                                                                         |
| `body`       | `TEXT`         | `NOT NULL`                  |                                                                         |
| `tags`       | `VARCHAR(500)` | nullable                    | Comma-separated string (e.g. `"python,learning"`). Not an array type.   |
| `embedding`  | `vector(384)`  | nullable                    | L2-normalised; generated by `all-MiniLM-L6-v2`.                         |
| `created_at` | `TIMESTAMPTZ`  | `DEFAULT CURRENT_TIMESTAMP` |                                                                         |
| `updated_at` | `TIMESTAMPTZ`  | `DEFAULT CURRENT_TIMESTAMP` | Maintained by a database trigger on update.                             |

### Indexes

| Name                       | Type   | Column      | Operator class      | Parameters                 |
|----------------------------|--------|-------------|---------------------|----------------------------|
| `notes_embedding_hnsw_idx` | HNSW   | `embedding` | `vector_cosine_ops` | `m=16, ef_construction=64` |
| `notes_created_at_idx`     | B-tree | `created_at`| —                   | `DESC`                     |

### Trigger

`set_timestamp` — a `BEFORE UPDATE` row-level trigger that sets `updated_at = CURRENT_TIMESTAMP` on every update. This supplements the SQLAlchemy-side `onupdate` lambda defined in the ORM model.

### Schema Management

`init.sql` uses `DROP TABLE IF EXISTS notes CASCADE` followed by `CREATE TABLE` to guarantee a clean, correct schema. SQLAlchemy's `create_all()` (run on startup) handles the case where the table does not yet exist, but will not alter an existing table.

---

## 5. Embedding Pipeline

### Model

- **Name:** `all-MiniLM-L6-v2` (SentenceTransformers)
- **Output dimensionality:** 384
- **Normalisation:** L2-normalised (`normalize_embeddings=True`); dot product between two normalised vectors equals cosine similarity.

### `EmbeddingService` (`embeddings.py`)

Implemented as a singleton via `__new__`. The model is not loaded at import time; it is loaded on the first call to `embed()` or `embed_batch()` (`_load_model()`).

Device selection is automatic: CUDA if `torch.cuda.is_available()`, otherwise CPU.

| Method        | Signature                                                | Behaviour                                      |
|---------------|----------------------------------------------------------|------------------------------------------------|
| `embed`       | `(text: str) -> List[float]`                             | Encodes a single string; returns a Python list. |
| `embed_batch` | `(texts: List[str], batch_size=32) -> List[List[float]]` | Batch encoding with configurable batch size.   |

### Embedding Input Format

Notes are embedded as the concatenation `"{title}. {body}"`. This applies both at creation time and on update (when `title` or `body` is modified). Tag content is not included in the embedding input.

---

## 6. Semantic Search Pipeline

### Query Search (`GET /search/`)

1. The query string `q` is passed to `embedding_service.embed(q)`, producing a 384-dimensional vector.
2. A raw SQL query is executed against the `notes` table using pgvector's cosine distance operator (`<=>`):

   ```sql
   SELECT id, title, body, tags, created_at, updated_at,
          1 - (embedding <=> CAST(:query_vec AS vector)) AS similarity_score
   FROM notes
   WHERE 1 - (embedding <=> CAST(:query_vec AS vector)) > :threshold
   ORDER BY similarity_score DESC
   LIMIT :limit
   ```

3. `similarity_score` is a value in `[0.0, 1.0]`, where 1.0 is identical.
4. The response includes the original query string, the result list, and the total count.

### Related Notes (`GET /search/related/{note_id}`)

Uses the pre-stored `embedding` column of the specified note as the query vector. Adds `AND id != :note_id` to exclude the source note from results. Returns `List[SearchResult]` directly (no outer `SearchResponse` wrapper).

### Threshold Behaviour

The default threshold of `0.25` filters out notes with cosine similarity ≤ 0.25. The value is configurable per request. Notes with a `NULL` embedding are never returned by similarity queries (the `WHERE` clause evaluates to NULL for them).

---

## 7. Deployment Architecture

The system operates across three distinct environments. The `backend/app/` package is environment-agnostic; all environment-specific behaviour is driven by environment variables.

### Development — Google Colab Pro

- FastAPI runs inside a Jupyter notebook (`notebooks/development.ipynb`).
- A T4 GPU is available; the embedding model uses CUDA.
- The public URL is exposed via ngrok.
- Connects to the Neon database directly over SSL.

### Local Testing — Docker

- `docker-compose.yml` builds `./backend` into the `pkb-backend` container and exposes port `8000`.
- A volume mount (`./backend:/app`) enables hot reload (`--reload` flag overrides the Dockerfile `CMD`).
- No local database container; the container connects to Neon over the network.
- Inference runs on CPU (no GPU passthrough is configured).

### Production — Render + Vercel

- Backend deployed as a web service on **Render**.
- Frontend (not yet implemented) is intended for deployment on **Vercel**.
- `APP_ENV=production` is set via Render environment variables.
- `ALLOWED_ORIGINS` is set to the Vercel deployment URL.
- The same Neon database is used across all environments (single connection string).

### Environment Variables

| Variable          | Required | Default                 | Description                           |
|-------------------|----------|-------------------------|---------------------------------------|
| `DATABASE_URL`    | Yes      | —                       | PostgreSQL connection string (Neon).  |
| `APP_ENV`         | No       | `"development"`         | Surfaced on `/health`.                |
| `ALLOWED_ORIGINS` | No       | `http://localhost:3000` | Comma-separated CORS origins.         |

### Dependency Versions (pinned)

All versions in `requirements.txt` are explicitly pinned. Notable constraints:

- `numpy==1.26.4` — pinned to the 1.x series to avoid a NumPy 2.x ABI conflict with `sentence-transformers==2.7.0` and `torch==2.2.2`.
- `torch==2.2.2`, `transformers==4.40.0`, `sentence-transformers==2.7.0` — tested together as a compatible set.

---

## 8. Known Limitations

### No Frontend
The `frontend/` directory is empty. The system has no user interface; all interaction is via the REST API directly.

### No Authentication or Authorisation
The API has no authentication layer. All endpoints are publicly accessible to any origin listed in `ALLOWED_ORIGINS`.

### Single-Table, Single-User Data Model
There is no concept of users, workspaces, or access control. All notes are global.

### Tags Are Unstructured Strings
Tags are stored as a single `VARCHAR(500)` comma-separated string. There is no tag index, no tag-based filtering endpoint, and no enforcement of tag format.

### Embeddings Not Generated for Seeded Data
`seed.sql` inserts notes without embedding values (the column is omitted). Embeddings for seeded rows must be generated separately after seeding. Until embeddings exist, seeded notes do not appear in similarity search results.

### No Pagination on Search
The `/search/` endpoint does not support offset-based pagination. Results are limited to a single page of up to 50 items.

### Synchronous Embedding Inference Blocks the Request Thread
`embedding_service.embed()` is a synchronous call executed on the request thread. For CPU inference this can take hundreds of milliseconds, and FastAPI's async event loop is not used for this operation. Concurrent requests queue behind one another during inference.

### Single Neon Database Across All Environments
Development, local Docker, and production all share the same Neon database. There is no environment isolation for data.

### `updated_at` Has Dual Ownership
`updated_at` is maintained by both the SQLAlchemy `onupdate` lambda (ORM layer) and the `set_timestamp` database trigger (database layer). These are consistent but redundant. The trigger is authoritative for updates made outside the ORM.
