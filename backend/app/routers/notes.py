from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Note, NoteChunk, NoteTag
from app.schemas import (
    NoteCreate,
    NoteIngestionResponse,
    NoteResponse,
    NoteTitleUpdate,
)
from app.services.notes_service import ingest_note

router = APIRouter(prefix="/notes", tags=["notes"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tag_strings(note: Note) -> List[str]:
    return [t.tag for t in note.tags]


def _note_response(note: Note) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        auto_title=note.auto_title,
        summary=note.summary,
        tags=_tag_strings(note),
        created_at=note.created_at,
        updated_at=note.updated_at,
    )


# ---------------------------------------------------------------------------
# POST /notes  — ingest body, auto-generate title/summary/tags/chunks
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

    for chunk in result.chunks:
        db.add(NoteChunk(
            note_id=note.id,
            chunk_index=chunk.chunk_index,
            chunk_text=chunk.chunk_text,
            embedding=chunk.embedding,
        ))

    for tag in result.tags:
        db.add(NoteTag(note_id=note.id, tag=tag))

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
# GET /notes  — list notes (newest first)
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[NoteResponse])
def list_notes(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    notes = (
        db.query(Note)
        .order_by(Note.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_note_response(n) for n in notes]


# ---------------------------------------------------------------------------
# GET /notes/search  — chunk-level semantic search (registered before /{id})
# ---------------------------------------------------------------------------

@router.get("/search")
def search_notes(
    q: str,
    limit: int = 10,
    threshold: float = 0.25,
    db: Session = Depends(get_db),
):
    from app.embeddings import embedding_service
    from app.routers.search import chunk_similarity_search

    query_vec = embedding_service.embed(q)
    results = chunk_similarity_search(db, query_vec, threshold, limit)
    from app.schemas import SearchResponse
    return SearchResponse(query=q, results=results, total=len(results))


# ---------------------------------------------------------------------------
# GET /notes/{note_id}
# ---------------------------------------------------------------------------

@router.get("/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return _note_response(note)


# ---------------------------------------------------------------------------
# PATCH /notes/{note_id}  — user can edit auto-generated title only
# ---------------------------------------------------------------------------

@router.patch("/{note_id}", response_model=NoteResponse)
def update_note_title(note_id: int, payload: NoteTitleUpdate, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    note.auto_title = payload.title
    db.commit()
    db.refresh(note)
    return _note_response(note)


# ---------------------------------------------------------------------------
# DELETE /notes/{note_id}
# ---------------------------------------------------------------------------

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(note_id: int, db: Session = Depends(get_db)):
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    db.delete(note)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
