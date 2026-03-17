You are a senior FastAPI + SQLAlchemy engineer.

### Task
Update the current `models.py` to implement the **chunked semantic indexing DB schema**.

### Requirements
- Tables:
  1. `notes` → id, auto_title, raw_content, summary, created_at, updated_at
  2. `note_chunks` → id, note_id (FK notes.id), chunk_text, embedding vector(384), chunk_index
  3. `note_tags` → id, note_id (FK notes.id), tag

- Relationships:
  - `Note` has many `NoteChunk` and `NoteTag`
  - Ensure foreign keys with `ondelete="CASCADE"`

- Constraints:
  - Do **not** remove any unrelated tables
  - Use SQLAlchemy 2.x syntax (declarative base)
  - No hardcoded embeddings — stored as vector field (pgvector)

- Output:
  - Modified `models.py` with only new classes and updated relationships

- Stepwise instruction:
  1. Add `NoteChunk` class
  2. Add `NoteTag` class
  3. Update `Note` to include relationships