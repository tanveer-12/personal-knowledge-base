from datetime import datetime

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Inbound
# ---------------------------------------------------------------------------

class NoteCreate(BaseModel):
    """User submits body only — title/summary/tags are auto-generated."""
    body: str = Field(min_length=1)


class NoteTitleUpdate(BaseModel):
    """Only the auto-generated title is user-editable after creation."""
    title: str = Field(min_length=1, max_length=255)


# ---------------------------------------------------------------------------
# Outbound — note CRUD
# ---------------------------------------------------------------------------

class NoteContentUpdate(BaseModel):
    """Update the raw body — triggers full re-ingestion of summary/tags/chunks."""
    body: str = Field(min_length=1)


class _NoteBase(BaseModel):
    """Shared fields for all note response schemas."""
    id: int
    auto_title: str
    raw_content: str
    summary: str | None
    tags: list[str]


class NoteResponse(_NoteBase):
    created_at: datetime
    updated_at: datetime | None

    model_config = {"from_attributes": True}


class NoteIngestionResponse(_NoteBase):
    """Returned immediately after POST /notes — includes ingestion metadata."""
    chunk_count: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Outbound — search
# ---------------------------------------------------------------------------

class ChunkSearchResult(BaseModel):
    """One result row from chunk-level semantic search."""
    note_id: int
    auto_title: str
    summary: str | None
    snippet: str        # the matching chunk text
    similarity_score: float
    tags: list[str]


class SearchResponse(BaseModel):
    query: str
    results: list[ChunkSearchResult]
    total: int