# Design Decisions: Version 1 → Version 2

**Document type:** Internal Engineering Design Proposal
**Scope:** Semantic indexing, content enrichment, knowledge organisation
**Status:** Proposed

---

## Overview

Version 1 established a working foundation: notes are stored in PostgreSQL, each note is embedded as a single vector, and cosine similarity search retrieves semantically related content. This architecture is correct and functional at small scale.

Version 2 addresses a set of structural limitations that become apparent as the note collection grows and use patterns become more demanding. The changes fall into two categories:

- **Indexing improvements** — how notes are represented in vector space (chunking)
- **Content enrichment** — what the system knows about each note beyond raw text (tags, summaries, collections)

Each decision is documented below with the problem it addresses, the alternatives considered, and the tradeoffs accepted.

---

## Decision 1: Chunked Semantic Indexing

### Problem

In v1, each note is embedded as a single concatenated string: `"{title}. {body}"`. This produces one vector per note, regardless of the note's length or thematic breadth.

This design has two failure modes.

**Precision loss in long notes.** A note that spans multiple topics — say, a reflection on sleep quality that drifts into a discussion of morning routines and then into productivity habits — is compressed into a single point in 384-dimensional space. That point is a centroid of all the note's themes. A search for *"sleep quality"* may rank this note lower than it deserves because the vector is diluted by content about productivity. Conversely, the note may surface for queries it should not match, because its broad centroid sits near many clusters.

**Uneven representation across note lengths.** A three-sentence note and a twenty-paragraph note both produce one vector. The short note's vector is a precise, high-confidence representation of a single idea. The long note's vector is a rough average of many ideas. These two vectors participate in the same similarity computation as if they were equivalent in structure, which they are not.

The root cause is a mismatch between the granularity of indexing and the granularity of retrieval. A user searching for a specific idea should match the *passage* that contains that idea, not a whole-note summary that may bury it.

### Decision

Split each note into overlapping text chunks before embedding. Each chunk produces its own vector and is stored as a separate row in a `note_chunks` table, with a foreign key back to the parent note. Search operates at the chunk level; the parent note is surfaced from the result.

Overlap between adjacent chunks (typically 20–25% of chunk length) ensures that sentences near chunk boundaries are fully represented and not split across two under-context vectors.

### Alternatives Considered

**Keep single-vector indexing, increase model size.** Larger models (e.g., `all-mpnet-base-v2`, 768 dimensions) produce better single-document representations. This does not solve the structural problem — a 768-dimensional centroid of five topics is still a centroid. It improves quality at the margins, not the failure mode.

**Hierarchical embeddings (chunk + document).** Embed both chunks and the full note; use the note-level vector for coarse ranking and chunk-level vectors for re-ranking. This is theoretically sounder but adds query complexity and a two-stage retrieval pipeline. The marginal benefit over flat chunk indexing is not justified at personal-notebook scale.

**Fixed token count chunking without overlap.** Simpler to implement but introduces hard cuts at arbitrary positions, degrading the quality of chunks near boundaries. Overlap is a small implementation cost for a meaningful quality improvement.

### Tradeoffs

| Consideration | Impact |
|---|---|
| Storage | Each note produces multiple rows in `note_chunks`. A 500-word note at 200-token chunks with 50-token overlap yields ~5 chunk rows. Storage cost is acceptable; Neon's free tier supports this at notebook scale. |
| Write latency | Creating or updating a note now involves chunking, multiple embed calls, and multiple inserts. This increases write latency, particularly on CPU. Acceptable for a low-write personal system. |
| Search result deduplication | Multiple chunks from the same note may appear in a similarity result set. The API must deduplicate to note level, surfacing only the highest-scoring chunk per parent note. |
| Query simplicity | The `_SIMILARITY_SQL` pattern from v1 is extended, not replaced. A join to `note_chunks` and a `DISTINCT ON (note_id)` or `GROUP BY` handles deduplication at the database level. |

---

## Decision 2: Automatic Tag Generation

### Problem

In v1, tags are a `VARCHAR(500)` field that the user populates manually as a comma-separated string. In practice this has two problems.

**Inconsistency.** Tags are freeform. The same concept appears as `"deep-work"`, `"deep work"`, `"DeepWork"`, and `"focus"` across different notes. There is no vocabulary enforcement and no index. Tag-based filtering is therefore unreliable and currently not even exposed as a search parameter.

**Abandonment.** Manual tagging requires discipline at write time. Many notes are saved without tags. As the collection grows, the gap between tagged and untagged notes widens, and the tag field loses utility as an organisational tool.

The deeper issue is that tags in v1 are a human-maintained metadata layer competing with a system that already understands note content semantically. The value of manual tags is low relative to the effort, and the cost of missing or inconsistent tags compounds over time.

### Decision

On note creation and update, pass the note title and body to a language model (LLM) with a prompt that requests a small set of concise, normalised tags. The LLM returns structured output (a JSON array of strings). These tags are written back to the note's `tags` field automatically.

Users retain the ability to override or extend generated tags. The system treats LLM-generated tags as a default that the user can revise, not a locked classification.

Tag generation runs as part of the note write pipeline, after the note is persisted and chunks are embedded. If tag generation fails (LLM timeout, API error), the note is saved without tags and generation is retried asynchronously. Tag failure must not block note creation.

### Alternatives Considered

**Keyword extraction (TF-IDF, RAKE, KeyBERT).** Statistical keyword extraction does not require an LLM API call and has no cost or latency dependency. However, these methods extract prominent words rather than conceptual categories. A note about morning routines and sleep would yield tags like `"morning"`, `"sleep"`, `"routine"` — accurate but low-signal. LLM-generated tags can produce `"circadian-rhythm"`, `"habit-formation"`, `"recovery"` — more useful for organisation.

**Embedding-based clustering to derive tags.** As the corpus grows, cluster the note embeddings and assign cluster labels as tags. This is a corpus-level operation rather than a per-note operation. It is better suited for periodic re-organisation than for real-time tagging at write time.

**No change (keep manual tags).** Acceptable for a small corpus where discipline is maintained. Not acceptable as the collection scales — the failure mode is silent and cumulative.

### Tradeoffs

| Consideration | Impact |
|---|---|
| External API dependency | Tag generation introduces a dependency on an LLM API (e.g., the Anthropic or OpenAI API). Write path now has an external network call. Must be non-blocking on failure. |
| Cost | LLM API calls are not free. For a personal notebook with low write frequency, the cost is negligible. This assumption holds until write volume increases significantly. |
| Quality variance | Generated tags may occasionally be wrong or too generic. User override addresses this. The expected quality of a small language model on short note content is high enough to be useful without being authoritative. |
| Consistency | The LLM prompt must explicitly instruct the model to use lowercase, hyphenated, concise labels. Without prompt discipline, output variance undermines the consistency goal that motivated this decision. |

---

## Decision 3: Automatic Note Summaries

### Problem

The note list in a typical knowledge base UI displays title and a truncated preview of the body. For long notes, the truncated preview is often uninformative — it shows the opening sentences, which may be context-setting rather than substantive.

A user scanning their note list cannot efficiently assess relevance without opening each note. At small scale this is tolerable. As the collection grows, browsing becomes a meaningful friction point.

Additionally, search results in v1 return full note bodies. For a frontend rendering a results list, displaying the full body of each result is visually noisy. There is no concise representation of what each result is about.

A summary field solves both problems: it gives the list view a meaningful preview and gives search results a compact representation of relevance.

### Decision

On note creation and update, generate a two-to-three sentence summary of the note body using an LLM. The summary is stored in a `summary` column on the `notes` table (nullable `TEXT`). The `NoteResponse` schema exposes it alongside the body.

Like tag generation, summary generation is non-blocking. If the LLM call fails, the note is saved without a summary. The `summary` field is null until generation succeeds; the frontend treats null summary as a signal to fall back to a body truncation preview.

### Alternatives Considered

**Extractive summarisation (first N sentences or highest-TF-IDF sentences).** No external dependency, zero latency cost. For well-structured notes that lead with a thesis sentence, extractive methods work adequately. For notes that begin with context, narrative, or examples before reaching the main point, extractive methods produce misleading summaries. An LLM abstractive summary is more reliable across note styles.

**Client-side truncation.** The frontend truncates the body to a fixed character count. This is what v1 effectively does. It requires no backend change but produces the lowest-quality previews: the truncation point is arbitrary relative to content structure.

**Embedding-based sentence ranking.** Score each sentence against the note's own embedding and extract the highest-scoring sentences. More principled than first-N extraction, cheaper than LLM. A reasonable intermediate option if LLM API cost becomes a concern at scale.

### Tradeoffs

| Consideration | Impact |
|---|---|
| Schema change | A `summary TEXT` column is added to `notes`. Non-breaking; existing rows have null summary and fall back gracefully. |
| LLM call per note write | Combined with tag generation, each note creation now makes two LLM calls. These can be parallelised (both called concurrently in an async context), reducing the combined latency to approximately the latency of the slower call. |
| Summary staleness | If a note is edited and LLM generation fails on the update, the stored summary may describe the previous version of the note. A `summary_generated_at` timestamp enables the frontend or a background job to detect and resolve staleness. |

---

## Decision 4: Smart Collections

### Problem

The note collection in v1 is a flat list ordered by creation date. The only organisational primitives are manual tags (which are inconsistent, per Decision 2) and semantic search (which requires active querying).

Passive organisation — the ability to browse notes by theme without issuing a query — is absent. A user who wants to review everything they have written about sleep, productivity, or a particular technical topic must either remember the right search terms or scroll through a chronological list.

The limitation is structural: v1 has no concept of groups, topics, or clusters. Every note is equally accessible and equally unorganised.

### Decision

Introduce smart collections as a derived organisational layer. A smart collection is a named group of notes defined by a seed — either a topic description (a short text string) or one or more existing notes. The system embeds the seed, computes similarity against all stored note vectors, and assigns notes above a configurable threshold to the collection.

Collections are materialised (stored as rows in a `collections` table with a many-to-many `note_collections` join) and refreshed on demand or on a schedule. They are read-only from the user's perspective — the contents are determined by the similarity logic, not by manual assignment.

This creates a browsable topic structure that emerges from the content rather than requiring the user to maintain it.

### Alternatives Considered

**Manual collections (user assigns notes to named folders).** Full user control, no ML complexity. This is the model used by Notion, Bear, and most note-taking apps. It requires ongoing maintenance discipline and does not scale to large collections without becoming its own organisational burden. It also does not exploit the semantic understanding already built into the system.

**Automatic clustering (k-means or HDBSCAN over all note embeddings).** Cluster the entire corpus periodically and label each cluster as a collection. More principled than threshold-based assignment and handles the case where a note belongs to no seed naturally. More complex to implement, requires choosing k or a density parameter, and produces collections without user-defined names. Useful as a complementary feature; not a replacement for seed-based collections.

**Tag-based collections.** Group notes by tag. Simple and deterministic, but depends on tag quality and consistency. With automatic tag generation (Decision 2), this becomes more viable, but it still cannot surface thematic relationships that tags do not explicitly encode.

### Tradeoffs

| Consideration | Impact |
|---|---|
| New schema objects | Requires `collections` and `note_collections` tables. Incremental migration; existing notes and search are unaffected. |
| Collection freshness | A note added after a collection is created is not automatically assigned. Either a background job re-evaluates collection membership on new writes, or the user triggers a manual refresh. The v2 design opts for manual refresh initially, with a background job as a later addition. |
| Collection overlap | A note can belong to multiple collections. This is intentional — a note about sleep and performance legitimately belongs in both a "Sleep" and a "Performance" collection. The frontend must handle multi-collection membership in its display. |
| Seed quality sensitivity | A poorly written seed description produces a low-quality collection. This is the correct failure mode — it surfaces the input quality problem immediately rather than silently producing bad groupings. |

---

## Final Architecture: Version 2

The following describes the complete data model and write/read paths as they exist after all four decisions are applied.

### Data Model

```
notes
  id, title, body, tags, summary, created_at, updated_at

note_chunks
  id, note_id (FK), chunk_index, chunk_text, embedding vector(384)

collections
  id, name, seed_text, created_at

note_collections
  note_id (FK), collection_id (FK)
```

The `embedding` column moves from `notes` to `note_chunks`. The `notes` table gains `summary TEXT`. The HNSW index is created on `note_chunks.embedding` rather than `notes.embedding`.

### Write Path (Note Creation)

1. Validate and persist the note to `notes` (no embedding at this step).
2. Split the note body into overlapping chunks.
3. Embed each chunk and insert rows into `note_chunks`.
4. In parallel: call the LLM to generate tags and summary.
5. Write tags and summary back to the `notes` row.

Steps 2–3 are synchronous in the request. Steps 4–5 are async background tasks; the API returns the note immediately after step 1 with null tags and summary, which are populated shortly after.

### Read Path (Semantic Search)

1. Embed the query string.
2. Run a similarity query against `note_chunks` with the HNSW index.
3. Deduplicate results to one row per `note_id`, retaining the highest similarity score.
4. Join back to `notes` to retrieve title, summary, tags, and timestamps.
5. Return ranked results with per-note best-chunk similarity score.

### Deployment Impact

The LLM API calls in steps 4–5 of the write path introduce an external network dependency not present in v1. The backend must be configured with an API key (e.g., `ANTHROPIC_API_KEY`) as an additional environment variable. LLM calls are isolated in a service layer; failure is caught, logged, and does not propagate to the response.

The move to async background tasks for enrichment requires a lightweight task mechanism. For v2, FastAPI's `BackgroundTasks` is sufficient. A durable task queue (Celery, Redis Queue) is not required at this scale.

All other deployment characteristics — Neon PostgreSQL, Render backend, Vercel frontend, environment-variable-driven configuration — are unchanged.
