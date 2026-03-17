from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.embeddings import embedding_service
from app.models import Note, NoteChunk, NoteTag
from app.queries.search_queries import chunk_similarity_search
from app.schemas import (
    NoteContentUpdate,
    NoteCreate,
    NoteIngestionResponse,
    NoteResponse,
    NoteTitleUpdate,
    SearchResponse,
)
from app.services.notes_service import ingest_note

router = APIRouter(prefix="/notes", tags=["notes"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_or_404(db: Session, note_id: int, *options) -> Note:
    """Fetch a Note by id or raise 404.  Pass SQLAlchemy load options as needed."""
    q = db.query(Note)
    if options:
        q = q.options(*options)
    note = q.filter(Note.id == note_id).first()
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


def _note_response(note: Note) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        auto_title=note.auto_title,
        raw_content=note.raw_content,
        summary=note.summary,
        tags=[t.tag for t in note.tags],
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


# ---------------------------------------------------------------------------
# POST /notes
# ---------------------------------------------------------------------------

@router.post("/", response_model=NoteIngestionResponse, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreate, db: Session = Depends(get_db)):
    result = ingest_note(payload.body)

    note = Note(
        auto_title=result.auto_title,
        raw_content=result.raw_content,
        summary=result.summary,
    )
    db.add(note)
    db.flush()  # populate note.id before inserting children

    db.bulk_save_objects([
        NoteChunk(
            note_id=note.id,
            chunk_index=c.chunk_index,
            chunk_text=c.chunk_text,
            embedding=c.embedding,
        )
        for c in result.chunks
    ])
    db.bulk_save_objects([
        NoteTag(note_id=note.id, tag=tag)
        for tag in result.tags
    ])

    db.commit()
    db.refresh(note)

    return NoteIngestionResponse(
        id=note.id,
        auto_title=note.auto_title,
        summary=note.summary,
        tags=result.tags,
        chunk_count=len(result.chunks),
        created_at=note.created_at,
    )


# ---------------------------------------------------------------------------
# GET /notes
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[NoteResponse])
def list_notes(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    notes = (
        db.query(Note)
        .options(selectinload(Note.tags))
        .order_by(Note.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_note_response(n) for n in notes]


# ---------------------------------------------------------------------------
# GET /notes/search  — registered before /{note_id} to avoid route conflict
# ---------------------------------------------------------------------------

@router.get("/search", response_model=SearchResponse)
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
# GET /notes/{note_id}
# ---------------------------------------------------------------------------

@router.get("/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = _get_or_404(db, note_id, selectinload(Note.tags))
    return _note_response(note)


# ---------------------------------------------------------------------------
# PATCH /notes/{note_id}
# ---------------------------------------------------------------------------

@router.patch("/{note_id}", response_model=NoteResponse)
def update_note_title(note_id: int, payload: NoteTitleUpdate, db: Session = Depends(get_db)):
    note = _get_or_404(db, note_id, selectinload(Note.tags))
    note.auto_title = payload.title
    db.commit()
    db.refresh(note)
    return _note_response(note)


# ---------------------------------------------------------------------------
# PUT /notes/{note_id}/content — re-ingest with new body, preserve title
# ---------------------------------------------------------------------------

@router.put("/{note_id}/content", response_model=NoteResponse)
def update_note_content(note_id: int, payload: NoteContentUpdate, db: Session = Depends(get_db)):
    """
    Replace raw_content and re-run the full ingestion pipeline.
    Regenerates summary, tags, and semantic chunks/embeddings.
    Preserves any user-set auto_title so manual renames are not overwritten.
    """
    note = _get_or_404(db, note_id, selectinload(Note.tags))

    # Re-ingest new body
    result = ingest_note(payload.body)

    # Update note — preserve existing title, refresh everything else
    note.raw_content = result.raw_content
    note.summary = result.summary

    # Replace chunks: delete old, insert new
    db.query(NoteChunk).filter(NoteChunk.note_id == note_id).delete()
    db.bulk_save_objects([
        NoteChunk(
            note_id=note_id,
            chunk_index=c.chunk_index,
            chunk_text=c.chunk_text,
            embedding=c.embedding,
        )
        for c in result.chunks
    ])

    # Replace tags: delete old, insert new
    db.query(NoteTag).filter(NoteTag.note_id == note_id).delete()
    db.bulk_save_objects([
        NoteTag(note_id=note_id, tag=tag)
        for tag in result.tags
    ])

    db.commit()

    # Reload with fresh tags after commit
    note = _get_or_404(db, note_id, selectinload(Note.tags))
    return _note_response(note)


# ---------------------------------------------------------------------------
# DELETE /notes/{note_id}
# ---------------------------------------------------------------------------

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = _get_or_404(db, note_id)  # no eager load needed — no response built
    db.delete(note)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)