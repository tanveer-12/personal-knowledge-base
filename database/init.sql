-- ==========================================================
-- Personal Knowledge Base with Semantic Search
-- Database intialization script
--
-- This script prepares PostgreSQL for semantic vector search.
-- 
-- It will:
-- 1. Enable the pgvector extension
-- 2. Create the notes table
-- 3. Create a vector similarity index (HNSW)
-- 4. Create a timestamp update trigger
--
-- NOTE:
-- This file can be run manually in the Neon SQL editor,
-- but it is also compatible with SQLAlchemy migrations.
-- FastAPI's Base.metadata.create_all() may create tables
-- automatically on first startup if they do not exist.
-- ==========================================================


-- ----------------------------------------------------------
-- Enable the pgvector extension
-- ----------------------------------------------------------
-- pgvector adds a new column type "vector"
-- that stores embedding arrays and allows similarity search
-- such as cosine distance or L2 distance.

CREATE EXTENSION IF NOT EXISTS vector;

-- ----------------------------------------------------------
-- Notes Table
-- ----------------------------------------------------------
-- This table stores user notes and their corresponding
-- embedding vectors for semantic search.

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT NOT NULL,
    -- embedding vector produced by SentenceTransformers
    -- all-MiniLM-L6-v2 produces 384 dimensional embeddings
    embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------
-- HNSW Vector Index
-- ----------------------------------------------------------
-- This index accelerates nearest-neighbour vector search.
--
-- HNSW = Hierarchical Navigable Small World Graph
-- It allows approximate nearest neighbor search in high
-- dimensional vector spaces.
--
-- Parameters:
-- m = 16
-- Each node connects to 16 neighbours in the graph.
--
-- ef_construction = 64
-- Search depth during index construction.
--
-- These values are pgvector defaults and are well suited
-- for datasets under ~1 million vectors.

CREATE INDEX IF NOT EXISTS notes_embedding_hsnw_idx 
ON notes
USING hnsw (embedding vector_cosine_ops)
WITH(
    m = 16,
    ef_construction = 64
);

-- ----------------------------------------------------------
-- Index for ordering notes
-- ----------------------------------------------------------
-- This allows efficient sorting when retrieving notes
-- in reverse chronological order.

CREATE INDEX IF NOT EXISTS notes_created_at_idx
ON notes (created_at DESC);

-- ----------------------------------------------------------
-- Trigger Function to Auto Update updated_at
-- ----------------------------------------------------------
-- Every time a row is modified, we automatically
-- update the updated_at timestamp.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- Trigger Binding
-- ----------------------------------------------------------

DROP TRIGGER IF EXISTS set_timestamp ON notes;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();