from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)
    tags: Optional[str] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1)
    body: Optional[str] = Field(default=None, min_length=1)
    tags: Optional[str] = None


class NoteResponse(BaseModel):
    id: int
    title: str
    body: str
    tags: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class SearchResult(BaseModel):
    note: NoteResponse
    similarity_score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int
