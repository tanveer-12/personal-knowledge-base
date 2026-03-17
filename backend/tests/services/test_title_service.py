"""
Tests for title_service.generate_title().

No ML dependencies — runs without a GPU or model download.

Run:
    cd backend
    pytest tests/services/test_title_service.py -v
"""

import pytest
from app.services.title_service import generate_title


class TestBasicExtraction:
    def test_extracts_first_sentence(self):
        text = "Transformers use self-attention. They replaced RNNs."
        assert generate_title(text) == "Transformers use self-attention"

    def test_splits_on_exclamation(self):
        text = "Great insight! More details follow."
        assert generate_title(text) == "Great insight"

    def test_splits_on_question_mark(self):
        text = "What is attention? It weights token pairs."
        assert generate_title(text) == "What is attention"

    def test_splits_on_newline(self):
        text = "First line\nSecond line follows here."
        assert generate_title(text) == "First line"


class TestTruncation:
    def test_truncates_to_max_length(self):
        long_sentence = "A" * 200 + ". Rest of note."
        title = generate_title(long_sentence, max_length=80)
        assert len(title) <= 80

    def test_default_max_length_is_80(self):
        text = "word " * 100
        assert len(generate_title(text)) <= 80

    def test_strips_trailing_punctuation_after_truncation(self):
        title = generate_title("Hello world.", max_length=80)
        assert not title.endswith(".")


class TestEdgeCases:
    def test_single_sentence_no_period(self):
        text = "A note with no sentence boundary"
        title = generate_title(text)
        assert title == text[:80]

    def test_returns_non_empty_string(self):
        assert generate_title("x") != ""

    def test_whitespace_stripped(self):
        title = generate_title("  Hello world.  More text.")
        assert not title.startswith(" ")
        assert not title.endswith(" ")
