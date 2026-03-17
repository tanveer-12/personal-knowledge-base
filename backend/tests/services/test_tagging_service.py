"""
Tests for tagging_service.extract_tags().

Requires: yake (no ML model download, pure Python).

Run:
    cd backend
    pytest tests/services/test_tagging_service.py -v
"""

import pytest
from app.services.tagging_service import extract_tags


ML_NOTE = (
    "Transformer models use self-attention mechanisms to process text. "
    "BERT and GPT are prominent examples of transformer architectures. "
    "Training transformers requires large datasets and significant compute. "
    "Attention heads allow the model to focus on relevant context tokens."
)


class TestReturnShape:
    def test_returns_list(self):
        assert isinstance(extract_tags(ML_NOTE), list)

    def test_default_max_five_tags(self):
        assert len(extract_tags(ML_NOTE)) <= 5

    def test_custom_max_tags(self):
        tags = extract_tags(ML_NOTE, max_tags=3)
        assert len(tags) <= 3

    def test_tags_are_strings(self):
        for tag in extract_tags(ML_NOTE):
            assert isinstance(tag, str)


class TestTagQuality:
    def test_tags_are_lowercase(self):
        for tag in extract_tags(ML_NOTE):
            assert tag == tag.lower()

    def test_tags_are_stripped(self):
        for tag in extract_tags(ML_NOTE):
            assert tag == tag.strip()

    def test_relevant_keyword_present(self):
        tags = extract_tags(ML_NOTE)
        # YAKE should surface "transformer" or "attention" or "bert"
        assert any(kw in tags for kw in ["transformer", "attention", "bert", "gpt"])


class TestEdgeCases:
    def test_short_text_returns_list(self):
        result = extract_tags("Short text.")
        assert isinstance(result, list)

    def test_max_tags_zero_returns_empty(self):
        assert extract_tags(ML_NOTE, max_tags=0) == []

    def test_repeated_word_not_duplicated(self):
        text = "attention attention attention attention attention"
        tags = extract_tags(text)
        assert len(tags) == len(set(tags))
