from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def process_uploaded_file(file_id: str) -> dict:
    """Placeholder file processing task for MVP 1.

    Actual text extraction, embeddings, and RAG pipeline are not implemented yet.
    Enqueued automatically after upload when BACKGROUND_JOBS_ENABLED=true.
    """
    if not file_id or not isinstance(file_id, str):
        logger.warning("process_uploaded_file called with invalid file_id")
        return {"status": "error", "reason": "invalid file_id", "file_id": str(file_id)}

    logger.info("process_uploaded_file placeholder executed for file_id=%s", file_id)
    return {
        "status": "skipped",
        "reason": "file processing not implemented in MVP1",
        "file_id": file_id,
    }
