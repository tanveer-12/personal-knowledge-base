You are a senior FastAPI backend engineer.

### Task
Implement REST endpoints for V2 semantic notes.

### Endpoints
1. `POST /notes`
   - Accepts JSON: `{ "body": "..." }`
   - Calls `ingest_note` service
   - Persists into DB tables (`notes`, `note_chunks`, `note_tags`)
   - Returns NoteIngestionResult

2. `PATCH /notes/{id}`
   - Allows editing auto_title only
   - Updates DB

3. `GET /notes/search`
   - Accepts query string
   - Performs semantic search on chunk embeddings
   - Returns top-N results with title, summary, snippet, similarity score, tags

### Constraints
- Keep current folder structure (`routers/`)
- Each endpoint should be testable independently
- Mock embeddings in tests if needed