You are a senior FastAPI backend engineer.

### Task
Implement the **chunked semantic note ingestion pipeline** in a modular way.

### Services
- `chunking_service` → chunk_text()
- `embedding_service` → embed_batch()
- `title_service` → generate_title()
- `summary_service` → generate_summary()
- `tagging_service` → extract_tags()

### Requirements
- Accept raw note body only
- Return a `NoteIngestionResult` (dataclass) with:
  - auto_title
  - raw_content
  - summary
  - tags
  - chunks (ChunkResult objects with chunk_index, text, embedding)

- Stepwise workflow:
1. Implement `chunking_service` first, test locally
2. Implement `embedding_service`, test locally (mock if GPU unavailable)
3. Implement `title_service`, `summary_service`, `tagging_service`, test
4. Integrate all services into `notes_service.py` ingest_note()
5. No DB writes in services; persistence handled by router/CRUD
6. Provide unit test suggestions for each service

- Constraints:
  - Do not rewrite unrelated files
  - Keep folder structure intact (`services/`, `routers/`)
  - Services should be importable independently