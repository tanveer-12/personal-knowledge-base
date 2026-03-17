"""
summary_service.py

Extractive summary generation — no ML model required.
Importable independently of FastAPI, SQLAlchemy, and ML dependencies.
"""

import re

_SENTENCE_BOUNDARY = re.compile(r'(?<=[.!?])\s+|[\n\r]+')


def generate_summary(raw_content: str, num_sentences: int = 3) -> str:
    """
    Extract an auto-summary from the leading *num_sentences* sentences.

    Uses the same sentence splitter as title_service.  When the content has
    fewer sentences than *num_sentences*, the full content is returned.

    Args:
        raw_content:   Full note body.
        num_sentences: Number of leading sentences to include in the summary.

    Returns:
        Summary string. Never empty if *raw_content* is non-empty.
    """
    sentences = [s.strip() for s in _SENTENCE_BOUNDARY.split(raw_content) if s.strip()]
    return " ".join(sentences[:num_sentences]) if sentences else raw_content.strip()
