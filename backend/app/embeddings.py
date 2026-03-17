import logging

import torch
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"


class EmbeddingService:
    _instance = None
    _model: SentenceTransformer | None = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self) -> None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("Loading embedding model %s on %s", MODEL_NAME, device)
        self._model = SentenceTransformer(MODEL_NAME, device=device)

    def _ensure_loaded(self) -> None:
        if self._model is None:
            self._load_model()

    def embed(self, text: str) -> list[float]:
        self._ensure_loaded()
        return self._model.encode(text, normalize_embeddings=True).tolist()

    def embed_batch(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        self._ensure_loaded()
        return self._model.encode(
            texts, batch_size=batch_size, normalize_embeddings=True
        ).tolist()


embedding_service = EmbeddingService()