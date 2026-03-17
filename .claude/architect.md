You are a senior AI systems architect.

### Task
Design the **chunked semantic indexing system** with **auto-generated titles, summaries, and tags**, aligned with AI-driven semantic search.

### Constraints
- Backend: FastAPI
- Frontend: Next.js 14
- Database: PostgreSQL + pgvector
- Embeddings: all-MiniLM-L6-v2
- User submits **body only**, backend generates title
- Deployment: Docker → Render (backend), Vercel (frontend)

### Required Design
1. **Database Schema**
- `notes`: id, auto_title, raw_content, summary, created_at, updated_at
- `note_chunks`: id, note_id, chunk_text, embedding vector(384), chunk_index
- `note_tags`: id, note_id, tag

2. **Ingestion Pipeline**
- Stepwise backend pipeline:
  1. Chunk submitted body (400 tokens, 50 overlap)
  2. Generate embeddings per chunk
  3. Generate title (auto, editable later)
  4. Generate summary
  5. Generate tags
  6. Persist all data to respective tables
- Each step should be modular (service layer per step)
- Provide **clear local testing instructions** after each step

3. **API Endpoints (Backend-first)**
- `POST /notes` → accepts body only, returns NoteIngestionResult
- `PATCH /notes/:id` → optionally edit title
- `GET /notes/search` → returns semantic search results:
  - title, summary, snippet, similarity score, tags

4. **Service Layer (Backend-first)**
- Chunking service
- Embedding service
- Title generation service
- Summary service
- Tagging service
- Search service

### Implementation Order (Stepwise)
1. Design database tables (`notes`, `note_chunks`, `note_tags`) and relationships
2. Implement backend services (chunking, embedding, title, summary, tagging)
3. Implement POST /notes endpoint + persistence
4. Implement semantic search endpoint
5. Review & optimize backend
6. Implement frontend components:
   - Note cards, search UI, sidebar, quick capture
7. Integrate and test full stack