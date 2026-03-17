"""
tests/routers/test_notes_router.py

HTTP-level tests for the three v2 endpoints:
  POST   /notes
  PATCH  /notes/{id}
  GET    /notes/search

Fixtures (from conftest.py):
  client      — TestClient backed by SQLite in-memory
  clean_db    — truncates all rows between tests (autouse)

All ML / embedding calls are patched per-test or at module import time so
these tests run on CPU-only machines with no model download.

Run:
    cd backend
    pip install pytest httpx
    pytest tests/routers/ -v
"""

from unittest.mock import MagicMock, patch

import pytest

from tests.routers.conftest import make_ingestion_result

# Patch target: the name as it appears inside the router module
_INGEST_PATCH  = "app.routers.notes.ingest_note"
_SEARCH_PATCH  = "app.routers.notes.chunk_similarity_search"
_EMBED_PATCH   = "app.routers.notes.embedding_service"


# ═══════════════════════════════════════════════════════════════════════════════
# POST /notes
# ═══════════════════════════════════════════════════════════════════════════════

class TestCreateNote:
    def _post(self, client, body: str = "Transformers use self-attention. They replaced RNNs."):
        result = make_ingestion_result(raw_content=body)
        with patch(_INGEST_PATCH, return_value=result):
            return client.post("/notes/", json={"body": body})

    def test_returns_201(self, client):
        resp = self._post(client)
        assert resp.status_code == 201

    def test_response_has_required_fields(self, client):
        data = self._post(client).json()
        assert "id" in data
        assert "auto_title" in data
        assert "summary" in data
        assert "tags" in data
        assert "chunk_count" in data
        assert "created_at" in data

    def test_auto_title_matches_service_output(self, client):
        result = make_ingestion_result(auto_title="Custom Generated Title")
        with patch(_INGEST_PATCH, return_value=result):
            data = client.post("/notes/", json={"body": "anything"}).json()
        assert data["auto_title"] == "Custom Generated Title"

    def test_tags_list_returned(self, client):
        result = make_ingestion_result(tags=["neural", "network"])
        with patch(_INGEST_PATCH, return_value=result):
            data = client.post("/notes/", json={"body": "anything"}).json()
        assert data["tags"] == ["neural", "network"]

    def test_chunk_count_matches_result(self, client):
        result = make_ingestion_result(num_chunks=3)
        with patch(_INGEST_PATCH, return_value=result):
            data = client.post("/notes/", json={"body": "anything"}).json()
        assert data["chunk_count"] == 3

    def test_persists_note_to_db(self, client):
        """A note created via POST should appear in GET /notes/."""
        self._post(client)
        resp = client.get("/notes/")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_empty_body_returns_422(self, client):
        resp = client.post("/notes/", json={"body": ""})
        assert resp.status_code == 422

    def test_missing_body_field_returns_422(self, client):
        resp = client.post("/notes/", json={})
        assert resp.status_code == 422

    def test_two_notes_both_stored(self, client):
        self._post(client, "Note one.")
        self._post(client, "Note two.")
        resp = client.get("/notes/")
        assert len(resp.json()) == 2


# ═══════════════════════════════════════════════════════════════════════════════
# PATCH /notes/{id}
# ═══════════════════════════════════════════════════════════════════════════════

class TestUpdateNoteTitle:
    def _create_and_patch(self, client, new_title: str):
        """Create a note then PATCH its title."""
        result = make_ingestion_result()
        with patch(_INGEST_PATCH, return_value=result):
            note_id = client.post("/notes/", json={"body": "Some content."}).json()["id"]
        return client.patch(f"/notes/{note_id}", json={"title": new_title}), note_id

    def test_returns_200(self, client):
        resp, _ = self._create_and_patch(client, "New Title")
        assert resp.status_code == 200

    def test_title_is_updated(self, client):
        resp, _ = self._create_and_patch(client, "Updated Title")
        assert resp.json()["auto_title"] == "Updated Title"

    def test_update_does_not_change_tags(self, client):
        result = make_ingestion_result(tags=["ml", "bert"])
        with patch(_INGEST_PATCH, return_value=result):
            note_id = client.post("/notes/", json={"body": "x"}).json()["id"]
        resp = client.patch(f"/notes/{note_id}", json={"title": "New"})
        assert resp.json()["tags"] == ["ml", "bert"]

    def test_nonexistent_note_returns_404(self, client):
        resp = client.patch("/notes/99999", json={"title": "whatever"})
        assert resp.status_code == 404

    def test_empty_title_returns_422(self, client):
        result = make_ingestion_result()
        with patch(_INGEST_PATCH, return_value=result):
            note_id = client.post("/notes/", json={"body": "x"}).json()["id"]
        resp = client.patch(f"/notes/{note_id}", json={"title": ""})
        assert resp.status_code == 422

    def test_get_after_patch_reflects_new_title(self, client):
        _, note_id = self._create_and_patch(client, "Patched Title")
        resp = client.get(f"/notes/{note_id}")
        assert resp.json()["auto_title"] == "Patched Title"


# ═══════════════════════════════════════════════════════════════════════════════
# GET /notes/search
# ═══════════════════════════════════════════════════════════════════════════════

class TestSearchNotes:
    """
    The search endpoint embeds the query string and runs a pgvector SQL query.
    Both operations are mocked so no GPU or real DB vector index is needed.
    """

    def _fake_search_result(self, note_id: int = 1):
        from app.schemas import ChunkSearchResult
        return [
            ChunkSearchResult(
                note_id=note_id,
                auto_title="Transformers use self-attention",
                summary="Transformers replaced RNNs.",
                snippet="self-attention allows parallel processing of tokens.",
                similarity_score=0.87,
                tags=["transformer", "attention"],
            )
        ]

    def test_returns_200(self, client):
        with (
            patch("app.routers.notes.embedding_service") as mock_emb,
            patch(_SEARCH_PATCH, return_value=self._fake_search_result()),
        ):
            mock_emb.embed.return_value = [0.0] * 384
            resp = client.get("/notes/search?q=attention+mechanisms")
        assert resp.status_code == 200

    def test_response_has_query_and_results(self, client):
        with (
            patch("app.routers.notes.embedding_service") as mock_emb,
            patch(_SEARCH_PATCH, return_value=self._fake_search_result()),
        ):
            mock_emb.embed.return_value = [0.0] * 384
            data = client.get("/notes/search?q=transformers").json()
        assert data["query"] == "transformers"
        assert "results" in data
        assert "total" in data

    def test_result_fields_present(self, client):
        with (
            patch("app.routers.notes.embedding_service") as mock_emb,
            patch(_SEARCH_PATCH, return_value=self._fake_search_result()),
        ):
            mock_emb.embed.return_value = [0.0] * 384
            result = client.get("/notes/search?q=test").json()["results"][0]
        assert "note_id" in result
        assert "auto_title" in result
        assert "summary" in result
        assert "snippet" in result
        assert "similarity_score" in result
        assert "tags" in result

    def test_similarity_score_in_result(self, client):
        with (
            patch("app.routers.notes.embedding_service") as mock_emb,
            patch(_SEARCH_PATCH, return_value=self._fake_search_result()),
        ):
            mock_emb.embed.return_value = [0.0] * 384
            result = client.get("/notes/search?q=test").json()["results"][0]
        assert result["similarity_score"] == pytest.approx(0.87, abs=1e-4)

    def test_empty_query_returns_422(self, client):
        resp = client.get("/notes/search?q=")
        assert resp.status_code == 422

    def test_missing_query_param_returns_422(self, client):
        resp = client.get("/notes/search")
        assert resp.status_code == 422

    def test_no_results_returns_empty_list(self, client):
        with (
            patch("app.routers.notes.embedding_service") as mock_emb,
            patch(_SEARCH_PATCH, return_value=[]),
        ):
            mock_emb.embed.return_value = [0.0] * 384
            data = client.get("/notes/search?q=nothing").json()
        assert data["results"] == []
        assert data["total"] == 0

    def test_total_matches_result_count(self, client):
        fake = self._fake_search_result()
        with (
            patch("app.routers.notes.embedding_service") as mock_emb,
            patch(_SEARCH_PATCH, return_value=fake),
        ):
            mock_emb.embed.return_value = [0.0] * 384
            data = client.get("/notes/search?q=transformers").json()
        assert data["total"] == len(data["results"])
