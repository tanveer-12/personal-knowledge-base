# Personal Knowledge Base — System Overview

**Audience:** Recruiters, engineers reading the repository, future maintainers
**Detail level:** Conceptual and product — for implementation detail see [architecture_v1.md](architecture_v1.md)

---

## 1. Project Summary

The Personal Knowledge Base (PKB) is a self-hosted note-taking system built around semantic search. Notes are written as free-form text with an optional tag string. Rather than relying on keyword matching or manual organisation to find things again, the system understands the *meaning* of each note and can surface related content from a plain English query — even when the query shares no words with the result.

The problem it solves is a familiar one: a collection of personal notes becomes increasingly hard to navigate over time. Traditional search returns nothing if you misremember the exact phrasing you used. Folder hierarchies and tags help, but they require upfront discipline and break down as a collection grows. PKB approaches retrieval differently: every note is represented as a mathematical vector that encodes its meaning, and search is a measurement of conceptual distance between the query and every stored note.

---

## 2. Core Idea

When a note is saved, the system converts its text into a vector — a list of 384 numbers — using a pre-trained language model. This vector is a point in a high-dimensional space where semantically related concepts cluster together, regardless of the specific words used to express them.

When a user searches, the query is converted into a vector using the same model. The system then finds the stored notes whose vectors are closest to the query vector. Because the proximity is based on meaning rather than vocabulary, a search for *"protecting my mornings for deep work"* can return a note titled *"My Calendar Works Against Me"* — even though those phrases share no keywords.

This is the core property that makes vector search useful for personal knowledge management: it retrieves by concept, not by string.

The same mechanism powers a "related notes" feature. Instead of embedding a new query, the system uses the stored vector of an existing note as the search key, finding other notes that are conceptually nearby.

---

## 3. High-Level Architecture

The system has three main components.

### FastAPI Backend

The backend is the single point of entry for all operations. It handles note creation and retrieval, runs embedding inference, and executes similarity search queries. There is no separate service for ML inference — embedding happens inside the same process that serves the API.

### Neon PostgreSQL + pgvector

Notes and their vector representations are stored together in a single PostgreSQL table. The `pgvector` extension adds a native vector column type and a cosine-similarity operator, which means similarity search is expressed as a standard SQL query. An HNSW index on the vector column accelerates approximate nearest-neighbour lookups at scale. Neon is used as a serverless managed PostgreSQL host, which eliminates infrastructure overhead while keeping the storage layer standard SQL.

### Embedding Model — `all-MiniLM-L6-v2`

The embedding model is a small, fast sentence transformer that produces 384-dimensional vectors. It runs inside the backend process and is loaded lazily on the first request. It uses a GPU when one is available (development in Colab) and falls back to CPU otherwise (local Docker, production on Render).

### Data Flow: Creating a Note

1. A client sends a `POST /notes/` request with a title, body, and optional tags.
2. The backend concatenates the title and body and passes the combined text to the embedding model.
3. The model returns a 384-dimensional vector.
4. The note text and vector are written together to the database in a single row.

### Data Flow: Executing a Search

1. A client sends `GET /search/?q=some+query`.
2. The backend embeds the query string using the same model.
3. The resulting vector is sent to PostgreSQL, which computes cosine similarity against every stored note vector and returns the closest matches above a configurable threshold.
4. Results are returned ordered by similarity score, highest first.

---

## 4. Key Design Decisions (Version 1)

### pgvector instead of a dedicated vector database

Dedicated vector databases (Pinecone, Weaviate, Qdrant) add operational complexity and introduce a second data store to manage. Since notes are short documents, the full dataset fits comfortably in PostgreSQL. Using `pgvector` means notes and their vectors live in the same row, queries are standard SQL, and the entire stack reduces to a single database connection. For a personal-scale application this is the simplest architecture that works.

### MiniLM as the embedding model

`all-MiniLM-L6-v2` was chosen for its balance of quality and operational cost. It produces vectors that capture sentence-level semantics well, runs on CPU without unreasonable latency, and is small enough to include in the same process as the API rather than requiring a separate model server. For a personal knowledge base with note-sized inputs, the quality ceiling of larger models is not necessary.

### Storing embeddings in PostgreSQL alongside note text

An alternative approach is to store embeddings in a separate store and note text elsewhere. Colocation was preferred here because it keeps the data model simple — a note is one row — and avoids synchronisation complexity. Updates that change note content regenerate the embedding atomically in the same transaction.

### FastAPI as the backend framework

FastAPI provides automatic request validation, OpenAPI documentation generation, and a clean dependency injection model. These properties make the backend easy to extend and test. For a project that will grow incrementally, having interactive API docs available from day one reduces friction when developing or demonstrating features.

### Tags as a plain string

Tags are stored as a comma-separated `VARCHAR` field rather than a relational tags table or a PostgreSQL array. This choice reflects the current scope: tags are informational metadata and there is no tag-based filtering or querying in v1. Keeping tags as a string avoids schema complexity that would not yet be used, and semantic search largely subsumes the role that tags would otherwise play.

---

## 5. Deployment Model

The backend application is environment-agnostic by design — all environment-specific values are injected via environment variables, and the same codebase runs in all three contexts.

**Development** runs inside a Google Colab Pro notebook, which provides a T4 GPU for fast embedding inference. The FastAPI server is started from the notebook and exposed publicly via ngrok, allowing the frontend (or any HTTP client) to reach it without deploying anywhere.

**Local testing** uses Docker Compose to build and run the backend in an Ubuntu container on the developer's machine. The volume mount enables live code reloading. There is no local database — the container connects to the same Neon instance used in other environments. Inference runs on CPU in this context.

**Production** deploys the backend as a web service on Render and is designed to host the frontend on Vercel. Neon's serverless PostgreSQL is the database for all environments. There is currently no environment isolation between development and production data.

---

## 6. Current Limitations

**No user interface.** The frontend directory is empty. In v1, the API must be accessed directly via HTTP. No browser-based interface exists yet.

**No authentication.** The API is open to any origin listed in the CORS configuration. There is no concept of users, accounts, or access control of any kind. The system is designed for single-person use and should not be exposed publicly without adding an auth layer.

**Synchronous embedding blocks requests.** Embedding runs on the same thread as the HTTP request. On CPU hardware, this can take several hundred milliseconds per request, and concurrent requests queue behind each other. The system is not designed for high concurrency.

**Full notes are embedded as single vectors.** Each note produces exactly one vector, regardless of length. Long notes with multiple distinct topics are compressed into a single point in vector space, which can reduce retrieval precision. There is no chunking or multi-vector representation.

**Tags are manually assigned and unstructured.** Tags must be written by the user at creation time as a free-form string. There is no automatic tagging, no tag index, and no tag-based filtering API.

**All environments share one database.** Development, local testing, and production all connect to the same Neon instance. There is no staging or test isolation.

---

## 7. Future Improvements (v2 Direction)

**Intelligent chunking.** Rather than embedding each note as a single unit, longer notes would be split into overlapping chunks, each with its own vector. Search would retrieve at the chunk level and surface the parent note. This improves recall for notes that span multiple topics.

**Automatic tag generation.** On note creation or update, a language model would suggest tags based on note content. This removes the burden of manual tagging and produces more consistent categorisation.

**Async embedding inference.** Moving embedding out of the request thread — either via a background task queue or a dedicated inference worker — would allow the API to accept requests concurrently and return faster responses on creation and update operations.

**Frontend UI.** A Next.js interface is planned that surfaces the full API: note creation and editing, free-text search with result scoring, and a related-notes panel displayed alongside any open note.

**Retrieval improvements.** Hybrid search — combining vector similarity with keyword filtering — would improve precision for queries that do include distinctive terms. Re-ranking results with a cross-encoder model is a further option for higher-quality relevance ordering.

**Environment isolation.** Separate Neon branches or database instances for development and production would prevent test data from polluting the production dataset.

---

## 8. Why This Project Exists

PKB was built as a practical exercise in designing and operating production-style ML infrastructure from scratch. The specific goals were:

**To understand vector search end to end.** Reading about embeddings and similarity search is not the same as debugging why a query returns unexpected results at a particular threshold, or choosing between HNSW and IVFFlat indexes based on dataset size. Building the full pipeline — from text input to vector storage to ranked retrieval — forces every abstraction to be understood rather than assumed.

**To build with a realistic deployment topology.** The project deliberately spans multiple environments (Colab, Docker, cloud PaaS) with a single codebase, to practice the discipline of keeping application code environment-agnostic and configuration externalised. This pattern is standard in production ML systems and non-trivial to get right the first time.

**To experiment with semantic retrieval as a product primitive.** Vector search is increasingly a foundational capability in knowledge management, document retrieval, and AI-assisted tooling. PKB is a contained, well-understood domain for exploring what semantic retrieval enables, where it falls short, and what engineering decisions shape its behaviour.

The result is a system that works, is deployable, and is honest about what it does not yet do. It is a starting point, not a finished product.
