"""
chunking_service.py

Splits raw note text into overlapping word-window chunks suitable for
all-MiniLM-L6-v2 (512 subword-token limit, safely covered by 400-word windows).

Importable independently — no FastAPI, SQLAlchemy, or ML dependencies.
"""


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    """
    Split *text* into overlapping word-approximate chunks.

    Uses a sliding word-window strategy.  If the text is shorter than
    *chunk_size* words the original text is returned as a single-item list.

    Args:
        text:       Raw input string.
        chunk_size: Target number of words per chunk.
        overlap:    Words repeated at the start of each successive chunk
                    to preserve cross-chunk context.

    Returns:
        Non-empty list of non-empty chunk strings.
    """
    words = text.split()
    if len(words) <= chunk_size:
        return [text.strip()]

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(start + chunk_size, len(words))
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start = end - overlap  # slide back to carry cross-chunk context

    return chunks
