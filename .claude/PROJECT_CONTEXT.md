# Project Context – AI Semantic Notes V2

This project is an AI-powered personal knowledge base.

### Stack

**Backend**
- FastAPI
- Python 3.11
- SQLAlchemy
- PostgreSQL + pgvector
- Sentence Transformers (all-MiniLM-L6-v2)

**Frontend**
- Next.js 14
- TypeScript
- Tailwind CSS

**Database**
- PostgreSQL (Neon)
- pgvector extension

**Embeddings**
- sentence-transformers
- all-MiniLM-L6-v2 (384 dimension vectors)

**Infrastructure**
- Render (backend)
- Vercel (frontend)
- Docker (local dev and deployment)

### Current System
- Notes currently store: `title`, `body`, `embedding`
- User submits body only; backend auto-generates `title`, `summary`, and `tags`

### Goal
Upgrade to chunked semantic indexing:

- `note` → `chunks` → `embeddings`
- Automatic tag generation
- Automatic summary generation
- Semantic search with relevance scoring
- Related note visualization
- Smart collections
- Daily recall
- Maintain modular, testable backend architecture
