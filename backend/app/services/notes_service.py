"""
notes_service.py — v2 semantic note ingestion pipeline.

Orchestrates the five individual services in order:
  1. chunking_service  → split raw_content into overlapping word windows
  2. embedding_service → batch-encode all chunks (single inference call)
  3. title_service     → extract first sentence as auto-title
  4. summary_service   → extract first N sentences as summary
  5. tagging_service   → extract top keywords via YAKE

Returns a NoteIngestionResult dataclass.  No database side-effects —
all persistence is delegated to the router / CRUD layer.
"""

from dataclasses import dataclass, field

from app.services import chunking_service, embedding_service as _emb
from app.services import summary_service, tagging_service, title_service


# ---------------------------------------------------------------------------
# Result containers
# ---------------------------------------------------------------------------

@dataclass
class ChunkResult:
    """A single processed chunk with its precomputed embedding."""
    chunk_index: int
    chunk_text: str
    embedding: list[float]  # 384-dimensional normalised vector


@dataclass
class NoteIngestionResult:
    """
    Complete output of the v2 ingestion pipeline for one note submission.

    Consumed by the router / CRUD layer, which persists each field to the
    appropriate database table:

    - auto_title, raw_content, summary  →  notes
    - chunks[i].chunk_text/embedding    →  note_chunks
    - tags[i]                           →  note_tags
    """
    auto_title: str
    raw_content: str
    summary: str
    tags: list[str]
    chunks: list[ChunkResult] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def ingest_note(raw_content: str) -> NoteIngestionResult:
    """
    Run the full v2 ingestion pipeline for a single note submission.

    Steps:
      1. chunk      — overlapping 400-word windows (50-word overlap)
      2. embed      — single batched inference call for all chunks
      3. title      — first sentence, ≤ 80 chars
      4. summary    — first 3 sentences
      5. tags       — YAKE top-5 keywords
      6. assemble   — return NoteIngestionResult

    Args:
        raw_content: Raw body text submitted by the user. Must be non-empty.

    Returns:
        Fully-populated NoteIngestionResult.

    Raises:
        ValueError: If raw_content is empty or whitespace-only.
    """
    if not raw_content or not raw_content.strip():
        raise ValueError("raw_content must not be empty")

    # Step 1 — chunk
    text_chunks = chunking_service.chunk_text(raw_content)

    # Step 2 — embed (single batched inference call)
    embeddings: list[list[float]] = _emb.embed_batch(text_chunks)

    # Steps 3–5 — pure Python / YAKE, no external API
    auto_title = title_service.generate_title(raw_content)
    summary    = summary_service.generate_summary(raw_content)
    tags       = tagging_service.extract_tags(raw_content)

    # Step 6 — assemble
    chunks = [
        ChunkResult(chunk_index=i, chunk_text=text, embedding=emb)
        for i, (text, emb) in enumerate(zip(text_chunks, embeddings))
    ]

    return NoteIngestionResult(
        auto_title=auto_title,
        raw_content=raw_content,
        summary=summary,
        tags=tags,
        chunks=chunks,
    )
