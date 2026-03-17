"""
embedding_service.py

Thin service-layer wrapper around the app-level EmbeddingService singleton.
Exposes embed_batch() and embed() as module-level functions so other services
can import them without depending on the singleton directly.

The underlying model (all-MiniLM-L6-v2, 384-dim) is loaded lazily on first
call — safe to import this module without triggering a model download.
"""

from typing import Protocol, runtime_checkable


@runtime_checkable
class EmbedderProtocol(Protocol):
    """Structural interface used by tests to inject mock embedders."""

    def embed(self, text: str) -> list[float]: ...
    def embed_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]: ...


def _get_embedder() -> EmbedderProtocol:
    # Deferred import keeps this module safe to import in test environments
    # that stub out the heavy ML stack.
    from app.embeddings import embedding_service as _singleton
    return _singleton  # type: ignore[return-value]


def embed(text: str) -> list[float]:
    """Encode a single string into a 384-dim normalised float vector."""
    return _get_embedder().embed(text)


def embed_batch(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """
    Encode a list of strings in one batched inference call.

    Args:
        texts:      Non-empty list of strings to encode.
        batch_size: GPU/CPU mini-batch size (default 32).

    Returns:
        List of 384-dim normalised float vectors, one per input string,
        in the same order as *texts*.
    """
    return _get_embedder().embed_batch(texts, batch_size=batch_size)
