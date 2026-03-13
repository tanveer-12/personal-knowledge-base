from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.embeddings import embedding_service
from app.models import Note
from app.schemas import NoteResponse, SearchResponse, SearchResult

router = APIRouter(prefix="/search", tags=["search"])

_SIMILARITY_SQL = """
    SELECT id, title, body, tags, created_at, updated_at,
           1 - (embedding <=> CAST(:query_vec AS vector)) AS similarity_score
    FROM notes
    WHERE 1 - (embedding <=> CAST(:query_vec AS vector)) > :threshold
    {extra_where}
    ORDER BY similarity_score DESC
    LIMIT :limit
"""


def _run_similarity_query(
    db: Session,
    query_vec: list,
    threshold: float,
    limit: int,
    extra_where: str = "",
    extra_params: dict | None = None,
) -> List[SearchResult]:
    params = {"query_vec": str(query_vec), "threshold": threshold, "limit": limit}
    if extra_params:
        params.update(extra_params)

    rows = db.execute(
        text(_SIMILARITY_SQL.format(extra_where=extra_where)), params
    ).fetchall()

    return [
        SearchResult(
            note=NoteResponse(
                id=row.id,
                title=row.title,
                body=row.body,
                tags=row.tags,
                created_at=row.created_at,
                updated_at=row.updated_at,
            ),
            similarity_score=row.similarity_score,
        )
        for row in rows
    ]


@router.get("/", response_model=SearchResponse)
def search_notes(
    q: str = Query(min_length=1),
    limit: int = Query(default=10, le=50),
    threshold: float = Query(default=0.25, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    query_vec = embedding_service.embed(q)
    results = _run_similarity_query(db, query_vec, threshold, limit)
    return SearchResponse(query=q, results=results, total=len(results))


@router.get("/related/{note_id}", response_model=List[SearchResult])
def related_notes(
    note_id: int,
    limit: int = Query(default=10, le=50),
    threshold: float = Query(default=0.25, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if note.embedding is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Note has no embedding")

    return _run_similarity_query(
        db,
        note.embedding,
        threshold,
        limit,
        extra_where="AND id != :note_id",
        extra_params={"note_id": note_id},
    )
