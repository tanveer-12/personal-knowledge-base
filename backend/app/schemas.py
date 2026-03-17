from datetime import datetime
from typing import List, Optional

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

class NoteResponse(BaseModel):
    id: int
    auto_title: str
    summary: Optional[str]
    tags: List[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class NoteIngestionResponse(BaseModel):
    """Returned immediately after POST /notes — includes ingestion metadata."""
    id: int
    auto_title: str
    summary: Optional[str]
    tags: List[str]
    chunk_count: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Outbound — search
# ---------------------------------------------------------------------------

class ChunkSearchResult(BaseModel):
    """One result row from chunk-level semantic search."""
    note_id: int
    auto_title: str
    summary: Optional[str]
    snippet: str        # the matching chunk text
    similarity_score: float
    tags: List[str]


class SearchResponse(BaseModel):
    query: str
    results: List[ChunkSearchResult]
    total: int
