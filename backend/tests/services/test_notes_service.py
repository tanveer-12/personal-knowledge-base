"""
Tests for notes_service.ingest_note().

The embedding model is MOCKED so these tests run on CPU-only machines
(no GPU, no model download).  All other services are exercised for real.

Run:
    cd backend
    pytest tests/services/test_notes_service.py -v

To run with the real embedding model (requires torch + sentence-transformers):
    pytest tests/services/test_notes_service.py -v -m real_embeddings
"""

import importlib
from unittest.mock import MagicMock, patch

import pytest

MOCK_VECTOR = [0.0] * 384  # 384-dim zero vector stands in for a real embedding


@pytest.fixture()
def mock_embed_batch():
    """
    Patch embedding_service.embed_batch so no ML model is loaded.

    The mock returns a list of MOCK_VECTORs — one per input text — which
    satisfies the contract expected by ingest_note().
    """
    def _fake_embed_batch(texts, batch_size=32):
        return [MOCK_VECTOR[:] for _ in texts]

    with patch(
        "app.services.embedding_service._get_embedder",
        return_value=MagicMock(
            embed_batch=_fake_embed_batch,
            embed=lambda text: MOCK_VECTOR[:],
        ),
    ):
        # Force re-import so the patched function is picked up
        import app.services.notes_service as ns
        importlib.reload(ns)
        yield ns


SHORT_NOTE = "Transformers use self-attention. They replaced RNNs for most NLP tasks."
LONG_NOTE  = " ".join([
    "Neural networks learn representations from data.",
    "Convolutional nets excel at image tasks.",
    "Recurrent nets handle sequential data.",
    "Transformers use self-attention mechanisms.",
    "BERT is a bidirectional transformer model.",
] * 100)  # ~500 words — forces >1 chunk


class TestReturnType:
    def test_returns_note_ingestion_result(self, mock_embed_batch):
        from app.services.notes_service import NoteIngestionResult
        result = mock_embed_batch.ingest_note(SHORT_NOTE)
        assert isinstance(result, NoteIngestionResult)

    def test_has_required_fields(self, mock_embed_batch):
        result = mock_embed_batch.ingest_note(SHORT_NOTE)
        assert result.auto_title
        assert result.raw_content == SHORT_NOTE
        assert isinstance(result.summary, str)
        assert isinstance(result.tags, list)
        assert isinstance(result.chunks, list)


class TestAutoTitle:
    def test_title_is_first_sentence(self, mock_embed_batch):
        result = mock_embed_batch.ingest_note(SHORT_NOTE)
        assert result.auto_title == "Transformers use self-attention"

    def test_title_max_80_chars(self, mock_embed_batch):
        assert len(mock_embed_batch.ingest_note(SHORT_NOTE).auto_title) <= 80


class TestChunks:
    def test_short_note_produces_one_chunk(self, mock_embed_batch):
        result = mock_embed_batch.ingest_note(SHORT_NOTE)
        assert len(result.chunks) == 1

    def test_long_note_produces_multiple_chunks(self, mock_embed_batch):
        result = mock_embed_batch.ingest_note(LONG_NOTE)
        assert len(result.chunks) > 1

    def test_chunk_indices_are_sequential(self, mock_embed_batch):
        result = mock_embed_batch.ingest_note(LONG_NOTE)
        indices = [c.chunk_index for c in result.chunks]
        assert indices == list(range(len(result.chunks)))

    def test_chunk_embeddings_are_384_dim(self, mock_embed_batch):
        for chunk in mock_embed_batch.ingest_note(SHORT_NOTE).chunks:
            assert len(chunk.embedding) == 384

    def test_chunk_text_is_non_empty(self, mock_embed_batch):
        for chunk in mock_embed_batch.ingest_note(SHORT_NOTE).chunks:
            assert chunk.chunk_text.strip()


class TestNoDBSideEffects:
    def test_ingest_note_has_no_db_import(self):
        import app.services.notes_service as ns
        import inspect
        source = inspect.getsource(ns)
        assert "sqlalchemy" not in source
        assert "Session" not in source
        assert "db.add" not in source


class TestValidation:
    def test_empty_string_raises_value_error(self, mock_embed_batch):
        with pytest.raises(ValueError):
            mock_embed_batch.ingest_note("")

    def test_whitespace_only_raises_value_error(self, mock_embed_batch):
        with pytest.raises(ValueError):
            mock_embed_batch.ingest_note("   ")
