from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.embeddings import embedding_service
from app.models import Note
from app.schemas import ChunkSearchResult, SearchResponse

router = APIRouter(prefix="/search", tags=["search"])

# ---------------------------------------------------------------------------
# Core similarity query
# ---------------------------------------------------------------------------
# Strategy:
#   1. Score every chunk against the query vector.
#   2. Keep only the highest-scoring chunk per note (DISTINCT ON).
#   3. Join back to notes for metadata; aggregate tags in a subquery.
#   4. Re-order by score and apply LIMIT.
#
# The outer ORDER BY is required because DISTINCT ON forces an inner ORDER BY
# on (note_id, similarity_score DESC) which is not the final sort order.
# ---------------------------------------------------------------------------

_CHUNK_SEARCH_SQL = """
    SELECT
        ranked.note_id,
        ranked.snippet,
        ranked.similarity_score,
        ranked.auto_title,
        ranked.summary,
        COALESCE(
            (
                SELECT string_agg(t.tag, ',' ORDER BY t.id)
                FROM   note_tags t
                WHERE  t.note_id = ranked.note_id
            ),
            ''
        ) AS tags_csv
    FROM (
        SELECT DISTINCT ON (nc.note_id)
            nc.note_id,
            nc.chunk_text                                                 AS snippet,
            1 - (nc.embedding <=> CAST(:query_vec AS vector))             AS similarity_score,
            n.auto_title,
            n.summary
        FROM  note_chunks nc
        JOIN  notes       n  ON n.id = nc.note_id
        WHERE 1 - (nc.embedding <=> CAST(:query_vec AS vector)) > :threshold
        {extra_where}
        ORDER BY nc.note_id,
                 1 - (nc.embedding <=> CAST(:query_vec AS vector)) DESC
    ) ranked
    ORDER BY ranked.similarity_score DESC
    LIMIT :limit
"""


def chunk_similarity_search(
    db: Session,
    query_vec: list,
    threshold: float,
    limit: int,
    extra_where: str = "",
    extra_params: dict | None = None,
) -> List[ChunkSearchResult]:
    params: dict = {
        "query_vec": str(query_vec),
        "threshold": threshold,
        "limit": limit,
    }
    if extra_params:
        params.update(extra_params)

    rows = db.execute(
        text(_CHUNK_SEARCH_SQL.format(extra_where=extra_where)), params
    ).fetchall()

    return [
        ChunkSearchResult(
            note_id=row.note_id,
            auto_title=row.auto_title,
            summary=row.summary,
            snippet=row.snippet,
            similarity_score=row.similarity_score,
            tags=[t.strip() for t in row.tags_csv.split(",") if t.strip()],
        )
        for row in rows
    ]


# ---------------------------------------------------------------------------
# GET /search?q=
# ---------------------------------------------------------------------------

@router.get("/", response_model=SearchResponse)
def search_notes(
    q: str = Query(min_length=1),
    limit: int = Query(default=10, le=50),
    threshold: float = Query(default=0.25, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    query_vec = embedding_service.embed(q)
    results = chunk_similarity_search(db, query_vec, threshold, limit)
    return SearchResponse(query=q, results=results, total=len(results))


# ---------------------------------------------------------------------------
# GET /search/related/{note_id}
# ---------------------------------------------------------------------------

@router.get("/related/{note_id}", response_model=list[ChunkSearchResult])
def related_notes(
    note_id: int,
    limit: int = Query(default=10, le=50),
    threshold: float = Query(default=0.25, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if not note.chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Note has no chunks",
        )

    # Use the first chunk's embedding as the query vector for related search.
    first_chunk = min(note.chunks, key=lambda c: c.chunk_index)
    query_vec = first_chunk.embedding

    return chunk_similarity_search(
        db,
        query_vec,
        threshold,
        limit,
        extra_where="AND nc.note_id != :exclude_note_id",
        extra_params={"exclude_note_id": note_id},
    )
