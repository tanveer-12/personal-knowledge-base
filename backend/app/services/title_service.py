"""
title_service.py

Extractive title generation — no ML model required.
Importable independently of FastAPI, SQLAlchemy, and ML dependencies.
"""

import re

_SENTENCE_BOUNDARY = re.compile(r'(?<=[.!?])\s+|[\n\r]+')


def generate_title(raw_content: str, max_length: int = 80) -> str:
    """
    Extract an auto-title from the first sentence of *raw_content*.

    Strategy (in order):
    1. Split on sentence-ending punctuation (. ! ?) or newline characters.
    2. Take the first non-empty segment.
    3. Truncate to *max_length* characters and strip trailing punctuation.

    Falls back to the first *max_length* characters of raw_content when
    no sentence boundary is found.

    Args:
        raw_content: Full note body submitted by the user.
        max_length:  Maximum character length of the returned title.

    Returns:
        Non-empty title string, never longer than *max_length* characters.
    """
    sentences = [s.strip() for s in _SENTENCE_BOUNDARY.split(raw_content) if s.strip()]
    title = sentences[0] if sentences else raw_content.strip()
    title = title[:max_length].rstrip(".!?,;:")
    return title or raw_content[:max_length]
