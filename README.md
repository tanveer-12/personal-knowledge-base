# Personal Knowledge Base

**Search your notes by meaning, not keywords.**

---

## Live Demo

> Add your Vercel URL here after deployment.

<!-- Screenshot placeholder — replace with an actual screenshot after deployment -->
> ![Screenshot](docs/screenshot.png)

---

## How It Works

When you save a note, the backend converts the text into a list of 384 numbers called an embedding vector — a kind of coordinate in meaning-space where similar ideas end up close together. When you search, your query gets the same treatment and the database finds notes whose vectors are nearest to it using cosine similarity, returning them ranked by closeness.

This is why searching **"feeling overwhelmed"** surfaces a note titled *"My Calendar Works Against Me"* whose body says *"back-to-back commitments… the busiest days consistently produce the least"* — not a single word overlaps, but the ideas sit in the same region of meaning-space. Traditional keyword search would return nothing.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | FastAPI + Python | Async-native, minimal boilerplate, excellent type support via Pydantic |
| Frontend | Next.js 15 + TypeScript | App Router makes layout and loading states simple; Vercel deployment is one click |
| Database | Neon serverless PostgreSQL + pgvector | Managed Postgres with a vector extension — no separate vector database needed |
| Embeddings | SentenceTransformers `all-MiniLM-L6-v2` | 384-dimension model that fits in free-tier RAM and runs on CPU without meaningful quality loss |
| Deployment | Render (backend) + Vercel (frontend) | Both have generous free tiers and connect directly to GitHub |

---

## Architecture

```
User types a query
        │
        ▼
  Next.js frontend
  (Vercel / localhost:3000)
        │  GET /search?q=...
        ▼
  FastAPI backend
  (Render / Colab + ngrok)
        │
        ├─► SentenceTransformers
        │   converts query → 384-dim vector
        │
        ▼
  Neon PostgreSQL + pgvector
  SELECT ... ORDER BY embedding <=> query_vector
  (cosine distance, threshold 0.25)
        │
        ▼
  Ranked results returned as JSON
        │
        ▼
  NoteCards rendered with similarity scores
```

---

## Local Development Setup

**Prerequisites:** Python 3.11+, Node.js 18+, a free [Neon](https://neon.tech) account, a free [ngrok](https://ngrok.com) account, and a Google account for Colab.

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/personal-knowledge-base.git
   cd personal-knowledge-base
   ```

2. Create a Neon project and copy the connection string from the dashboard.

3. Run the database schema and seed data against your Neon database:
   ```bash
   psql "your-neon-connection-string" -f database/init.sql
   psql "your-neon-connection-string" -f database/seed.sql
   ```

4. Open `notebooks/development.ipynb` in Google Colab (File → Upload notebook).

5. In the Colab notebook's first cell, set your environment variables:
   ```python
   DATABASE_URL = "your-neon-connection-string"
   NGROK_AUTHTOKEN = "your-ngrok-token"
   ```

6. Run all cells. The final cell prints your public ngrok URL — copy it.

7. In the frontend directory, copy the env example and paste your ngrok URL:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   # Edit .env.local and set NEXT_PUBLIC_API_URL=https://your-ngrok-url.ngrok-free.app
   ```

8. Install dependencies and start the frontend:
   ```bash
   npm install
   npm run dev
   ```

9. Open [http://localhost:3000](http://localhost:3000).

---

## API Reference

| Method | Path | Description | Request body |
|---|---|---|---|
| `GET` | `/health` | Health check, returns model info | — |
| `GET` | `/notes/` | List notes (default 100, pass `?limit=N`) | — |
| `GET` | `/notes/{id}` | Get a single note by ID | — |
| `POST` | `/notes/` | Create a note (embedding generated automatically) | `{ title, body, tags? }` |
| `PATCH` | `/notes/{id}` | Update a note (embedding regenerated if title/body changes) | `{ title?, body?, tags? }` |
| `DELETE` | `/notes/{id}` | Delete a note | — |
| `GET` | `/search/` | Semantic search (`?q=`, optional `limit`, `threshold`) | — |
| `GET` | `/search/related/{id}` | Find notes semantically similar to an existing note | — |

---

## Semantic Search Quality

These examples use the seeded notes. No query words appear in the matched note's body.

**Query:** `"packed schedule"`
**Top result:** *"Why I Block Out My Mornings"*
> "Meaningful output requires long stretches where nobody can reach me. Thirty-minute gaps between obligations are worthless…"
Both notes are about the same idea — too many commitments destroy productive time — with zero shared vocabulary.

---

**Query:** `"I thought I understood it but I didn't"`
**Top result:** *"Writing Summaries Exposed My Blind Spots"*
> "The gap between what I thought I understood and what I could articulate was sobering."
The query describes the experience of false confidence; the note describes the same discovery through a different mechanism.

---

**Query:** `"exercise improved my mood"`
**Top result:** *"Progressive Overload Is an Underrated Intervention"*
> "Adding structured resistance sessions has done more for my baseline disposition than almost any other intervention I have tried."
"Mood" and "disposition" are synonyms the model understands; "exercise" and "resistance sessions" map to the same concept.

---

## What I Learned

- **pgvector makes PostgreSQL a vector database.** I did not need a separate service like Pinecone or Weaviate. Adding a `Vector(384)` column to an existing Postgres table and an `ivfflat` index was enough to get sub-10ms similarity queries on a free Neon instance.

- **Embeddings encode meaning, not words.** Seeing the model return genuinely relevant notes for queries that share no vocabulary with the results was the moment the concept clicked. The seed data was designed specifically to have zero keyword overlap between semantically paired notes, and watching the search surface those pairs correctly was satisfying.

- **The GPU/CPU architecture decision was deliberate.** The model runs on a T4 GPU in Colab during development (fast) and on CPU in Docker and on Render's free tier (slower but adequate — `all-MiniLM-L6-v2` is small enough that CPU inference is under 100 ms). Keeping the same codebase across both environments — with no `if GPU` branches — required thinking about the architecture early.

- **Lazy model loading matters for cold starts.** Loading the model at import time added several seconds to every Render cold start. Moving to a singleton that initialises on the first actual embed call, combined with pre-downloading the weights in `Dockerfile.production`, reduced perceived latency significantly.

---

## License

MIT