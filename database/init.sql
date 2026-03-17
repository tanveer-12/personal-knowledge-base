-- ==========================================================
-- Personal Knowledge Base — Chunked Semantic Indexing
-- Database initialization script (v2)
--
-- Schema:
--   notes       — metadata: auto_title, raw_content, summary
--   note_chunks — chunk_text + per-chunk embedding (vector search target)
--   note_tags   — one row per tag per note
--
-- Run this in the Neon SQL editor OR via Cell 3 in the Colab notebook.
-- FastAPI startup calls create_all() but will NOT alter existing tables,
-- so use this script (DROP + CREATE) for a guaranteed clean schema reset.
-- ==========================================================


-- ----------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;


-- ----------------------------------------------------------
-- Drop tables in dependency order (children first)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS note_tags   CASCADE;
DROP TABLE IF EXISTS note_chunks CASCADE;
DROP TABLE IF EXISTS notes       CASCADE;


-- ----------------------------------------------------------
-- notes — one row per submitted note
-- ----------------------------------------------------------
-- No embedding here; vectors live in note_chunks.
CREATE TABLE notes (
    id           SERIAL PRIMARY KEY,
    auto_title   VARCHAR(255) NOT NULL,
    raw_content  TEXT         NOT NULL,
    summary      TEXT,
    created_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at   TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX notes_created_at_idx ON notes (created_at DESC);


-- ----------------------------------------------------------
-- note_chunks — overlapping word-window chunks of raw_content
-- ----------------------------------------------------------
-- chunk_size=400 words, overlap=50 words (see notes_service.py).
-- embedding is 384-dim all-MiniLM-L6-v2 output, L2-normalised.
CREATE TABLE note_chunks (
    id           SERIAL PRIMARY KEY,
    note_id      INT     NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    chunk_index  INT     NOT NULL,          -- 0-based position in the note
    chunk_text   TEXT    NOT NULL,
    embedding    vector(384),
    UNIQUE (note_id, chunk_index)
);

-- HNSW index on chunk embeddings — cosine similarity search
CREATE INDEX note_chunks_embedding_hnsw_idx
ON note_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX note_chunks_note_id_idx ON note_chunks (note_id);


-- ----------------------------------------------------------
-- note_tags — extracted keyword tags (one row per tag)
-- ----------------------------------------------------------
CREATE TABLE note_tags (
    id       SERIAL PRIMARY KEY,
    note_id  INT          NOT NULL REFERENCES notes (id) ON DELETE CASCADE,
    tag      VARCHAR(100) NOT NULL,
    UNIQUE (note_id, tag)
);

CREATE INDEX note_tags_note_id_idx ON note_tags (note_id);
CREATE INDEX note_tags_tag_idx     ON note_tags (tag);


-- ----------------------------------------------------------
-- Auto-update trigger for notes.updated_at
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
