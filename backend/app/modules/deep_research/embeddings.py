from __future__ import annotations

import logging
from collections.abc import Iterable

from openai import OpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingsClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.enabled = settings.EMBEDDINGS_ENABLED
        self.model = settings.EMBEDDING_MODEL
        self.dimensions = settings.EMBEDDING_DIMENSIONS
        self.batch_size = settings.EMBEDDING_BATCH_SIZE
        if self.enabled and settings.EMBEDDING_API_KEY and settings.EMBEDDING_API_KEY != "PASTE_YOUR_EMBEDDING_API_KEY_HERE":
            self._client: OpenAI | None = OpenAI(
                api_key=settings.EMBEDDING_API_KEY,
                base_url=settings.EMBEDDING_HOST,
                timeout=float(settings.EMBEDDING_TIMEOUT_SECONDS),
            )
        else:
            self._client = None

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not self.enabled or self._client is None:
            return []
        vectors: list[list[float]] = []
        for batch in batched(texts, self.batch_size):
            try:
                response = self._client.embeddings.create(model=self.model, input=batch)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Embedding request failed: %s", type(exc).__name__)
                return []
            vectors.extend([list(item.embedding) for item in response.data])
        return vectors


def batched(values: list[str], size: int) -> Iterable[list[str]]:
    size = max(1, size)
    for index in range(0, len(values), size):
        yield values[index : index + size]

