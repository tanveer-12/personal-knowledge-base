"""
tests/routers/conftest.py

Shared fixtures for router tests.

Key decisions
─────────────
1. SQLite in-memory for speed and zero Postgres dependency.
2. pgvector.sqlalchemy.Vector is monkey-patched to Text BEFORE any app
   model is imported.  This file must be the first file pytest executes
   from this directory (it is — conftest.py loads before test files).
3. The embedding model is fully mocked via a module-level patch so that
   no model download or GPU is required.
4. `ingest_note` is patched at the router import site so individual tests
   can override its return value with `mock_ingest.return_value = ...`
"""

import sys

# ── 1. Patch pgvector.Vector → Text before any app module is imported ────────
#
# app.models does `from pgvector.sqlalchemy import Vector` and uses it as a
# column type.  SQLite does not understand custom types, so we replace
# Vector(384) with Text() which SQLite handles natively.
#
# This must happen before `from app.models import ...` anywhere in this process.
import pgvector.sqlalchemy as _pgv
from sqlalchemy import Text as _Text

_orig_vector = _pgv.Vector

class _FakeVector(_Text):
    """Text stand-in for pgvector.Vector — stores embeddings as strings in tests."""
    def __init__(self, dim=None):
        super().__init__()

_pgv.Vector = _FakeVector  # type: ignore[assignment]

# Reload models so the monkey-patch takes effect if models were already cached.
for _mod in list(sys.modules.keys()):
    if _mod.startswith("app.models") or _mod.startswith("app.services"):
        del sys.modules[_mod]

# ── 2. Remaining fixtures ────────────────────────────────────────────────────
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# In-memory SQLite — discarded after each test session
_SQLITE_URL = "sqlite:///:memory:"
_engine = create_engine(_SQLITE_URL, connect_args={"check_same_thread": False})
_TestingSessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)

# Create all tables once per session
Base.metadata.create_all(bind=_engine)


def _override_get_db():
    db = _TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture()
def client():
    """FastAPI TestClient backed by in-memory SQLite."""
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture(autouse=True)
def clean_db():
    """Truncate all rows between tests to guarantee isolation."""
    yield
    db = _TestingSessionLocal()
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    finally:
        db.close()


# ── 3. Convenience: a pre-built NoteIngestionResult factory ─────────────────

from app.services.notes_service import ChunkResult, NoteIngestionResult  # noqa: E402

MOCK_VECTOR = [0.0] * 384


def make_ingestion_result(
    raw_content: str = "Transformers use self-attention. They replaced RNNs.",
    auto_title: str = "Transformers use self-attention",
    summary: str = "Transformers use self-attention. They replaced RNNs.",
    tags: list[str] | None = None,
    num_chunks: int = 1,
) -> NoteIngestionResult:
    tags = tags or ["transformer", "attention"]
    chunks = [
        ChunkResult(
            chunk_index=i,
            chunk_text=f"chunk {i} of {raw_content[:40]}",
            embedding=MOCK_VECTOR[:],
        )
        for i in range(num_chunks)
    ]
    return NoteIngestionResult(
        auto_title=auto_title,
        raw_content=raw_content,
        summary=summary,
        tags=tags,
        chunks=chunks,
    )
