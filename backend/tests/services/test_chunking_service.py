"""
Tests for chunking_service.chunk_text().

No ML dependencies — runs without a GPU or model download.

Run:
    cd backend
    pip install pytest
    pytest tests/services/test_chunking_service.py -v
"""

import pytest
from app.services.chunking_service import chunk_text


SHORT = "This is a short note."
MEDIUM = " ".join(f"word{i}" for i in range(450))   # 450 words → 2 chunks at size=400/overlap=50
LONG   = " ".join(f"word{i}" for i in range(900))   # 900 words → 3 chunks


class TestShortText:
    def test_returns_single_chunk(self):
        result = chunk_text(SHORT)
        assert result == [SHORT.strip()]

    def test_single_element_list(self):
        assert len(chunk_text(SHORT)) == 1

    def test_exactly_chunk_size_is_single_chunk(self):
        text = " ".join(["word"] * 400)
        assert len(chunk_text(text)) == 1


class TestChunkCount:
    def test_medium_text_produces_two_chunks(self):
        # 450 words: chunk1=words[0:400], chunk2=words[350:450] (start=400-50=350)
        result = chunk_text(MEDIUM)
        assert len(result) == 2

    def test_long_text_produces_three_chunks(self):
        # 900 words: [0:400], [350:750], [700:900]
        result = chunk_text(LONG)
        assert len(result) == 3


class TestOverlap:
    def test_consecutive_chunks_share_overlap_words(self):
        result = chunk_text(MEDIUM, chunk_size=400, overlap=50)
        tail_of_first  = result[0].split()[-50:]
        head_of_second = result[1].split()[:50]
        assert tail_of_first == head_of_second

    def test_no_overlap_produces_disjoint_chunks(self):
        result = chunk_text(MEDIUM, chunk_size=400, overlap=0)
        # Without overlap the chunks are exactly back-to-back
        first_words  = set(result[0].split())
        second_words = set(result[1].split())
        assert first_words.isdisjoint(second_words)


class TestEdgeCases:
    def test_empty_string_returns_empty_string_chunk(self):
        result = chunk_text("")
        assert result == [""]

    def test_whitespace_only_returns_single_chunk(self):
        result = chunk_text("   ")
        assert len(result) == 1

    def test_custom_chunk_size(self):
        text = " ".join(["w"] * 20)
        result = chunk_text(text, chunk_size=10, overlap=2)
        assert len(result) > 1

    def test_all_chunks_are_non_empty(self):
        for chunk in chunk_text(LONG):
            assert chunk.strip() != ""
