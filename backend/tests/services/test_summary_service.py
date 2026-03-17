"""
Tests for summary_service.generate_summary().

No ML dependencies — runs without a GPU or model download.

Run:
    cd backend
    pytest tests/services/test_summary_service.py -v
"""

import pytest
from app.services.summary_service import generate_summary


FIVE_SENTENCES = (
    "Transformers use self-attention. "
    "They process all tokens in parallel. "
    "BERT is bidirectional. "
    "GPT is autoregressive. "
    "Both are widely deployed."
)


class TestSentenceCount:
    def test_returns_three_sentences_by_default(self):
        summary = generate_summary(FIVE_SENTENCES)
        # Three sentences separated by spaces — count periods
        assert summary.count(".") == 3

    def test_custom_num_sentences(self):
        summary = generate_summary(FIVE_SENTENCES, num_sentences=2)
        assert summary.count(".") == 2

    def test_one_sentence_requested(self):
        summary = generate_summary(FIVE_SENTENCES, num_sentences=1)
        assert "Transformers use self-attention" in summary
        assert "parallel" not in summary


class TestShortContent:
    def test_fewer_sentences_than_requested_returns_all(self):
        text = "Only one sentence here."
        summary = generate_summary(text, num_sentences=5)
        assert summary == "Only one sentence here."

    def test_single_sentence_matches_input(self):
        text = "Just a single thought."
        assert generate_summary(text) == text.strip()


class TestEdgeCases:
    def test_newline_separated_sentences(self):
        text = "First sentence\nSecond sentence\nThird sentence"
        summary = generate_summary(text, num_sentences=2)
        assert "First sentence" in summary
        assert "Second sentence" in summary
        assert "Third sentence" not in summary

    def test_returns_non_empty_for_non_empty_input(self):
        assert generate_summary("Some content.") != ""

    def test_leading_trailing_whitespace_stripped(self):
        summary = generate_summary("  Hello world.  Second sentence.  ")
        assert not summary.startswith(" ")
