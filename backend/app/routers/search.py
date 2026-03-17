from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.embeddings import embedding_service
from app.models import Note, NoteChunk
from app.queries.search_queries import chunk_similarity_search
from app.schemas import ChunkSearchResult, SearchResponse

router = APIRouter(prefix="/search", tags=["search"])


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
    note = (
        db.query(Note)
        .options(selectinload(Note.chunks))
        .filter(Note.id == note_id)
        .first()
    )
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    if not note.chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Note has no chunks",
        )

    first_chunk: NoteChunk = min(note.chunks, key=lambda c: c.chunk_index)

    return chunk_similarity_search(
        db,
        first_chunk.embedding,
        threshold,
        limit,
        # extra_where references columns in the deduped CTE (no table prefix)
        extra_where="AND note_id != :exclude_note_id",
        extra_params={"exclude_note_id": note_id},
    )
