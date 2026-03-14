-- ==========================================================
-- Personal Knowledge Base with Semantic Search
-- Database initialization script
--
-- This script prepares PostgreSQL for semantic vector search.
--
-- It will:
-- 1. Enable the pgvector extension
-- 2. Drop and recreate the notes table with correct schema
-- 3. Create a vector similarity index (HNSW)
-- 4. Create a timestamp update trigger
--
-- NOTE:
-- Run this in Neon SQL editor OR via Cell 3 in the Colab
-- notebook. FastAPI startup also calls create_all() but
-- that will NOT alter an existing table — so this script
-- uses DROP + CREATE to guarantee a clean correct schema.
-- ==========================================================


-- ----------------------------------------------------------
-- Enable the pgvector extension
-- ----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;


-- ----------------------------------------------------------
-- Notes table — drop first to guarantee correct schema
-- ----------------------------------------------------------
-- We drop and recreate instead of using CREATE TABLE IF NOT
-- EXISTS because IF NOT EXISTS will silently keep a stale
-- table that is missing columns. During development this
-- causes confusing 500 errors. Drop + recreate is safe
-- because Neon is not production data.

DROP TABLE IF EXISTS notes CASCADE;

CREATE TABLE notes (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    -- body matches the SQLAlchemy model field name exactly
    body        TEXT NOT NULL,
    -- tags stored as comma-separated string e.g. "python,learning"
    tags        VARCHAR(500),
    -- 384 dimensions matches all-MiniLM-L6-v2 output
    embedding   vector(384),
    created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


-- ----------------------------------------------------------
-- HNSW vector index
-- ----------------------------------------------------------
-- Accelerates cosine similarity search.
-- m=16 and ef_construction=64 are pgvector defaults,
-- well suited for datasets under 1 million vectors.

CREATE INDEX notes_embedding_hnsw_idx
ON notes
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);


-- ----------------------------------------------------------
-- Index for chronological ordering
-- ----------------------------------------------------------
CREATE INDEX notes_created_at_idx
ON notes (created_at DESC);


-- ----------------------------------------------------------
-- Auto-update trigger for updated_at
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON notes;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## What changed and why

| What | Before | After | Why |
|---|---|---|---|
| `content` column | `content TEXT NOT NULL` | `body TEXT NOT NULL` | Must match SQLAlchemy model exactly |
| `tags` column | missing | `tags VARCHAR(500)` | Router tries to insert it, missing column = 500 error |
| `title` type | `TEXT` | `VARCHAR(255) NOT NULL` | Matches model, enforces not null |
| `CREATE TABLE IF NOT EXISTS` | present | replaced with `DROP + CREATE` | IF NOT EXISTS silently keeps wrong schema |
| `created_at` type | `TIMESTAMP WITH TIME ZONE` | `TIMESTAMPTZ` | Shorter alias, same thing |

---

## What to do now

**Step 1** — Replace the contents of `database/init.sql` in VS Code with the file above. Save it.

**Step 2** — Push to GitHub:
```
git add database/init.sql
git commit -m "fix: correct notes schema — rename content to body, add tags column"
git push
```

**Step 3** — In Colab, run Cell 2 (git pull) so the notebook has the updated file.

**Step 4** — Run Cell 3. It will now drop the old broken table and recreate it correctly. You should see:
```
Notes in database: 0
Database ready