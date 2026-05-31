from __future__ import annotations

import logging
from typing import Any, Callable
from uuid import UUID

from app.core.config import get_settings
from app.workers.queues import get_queue

logger = logging.getLogger(__name__)


def enqueue_job(
    queue_name: str,
    func: Callable,
    *args: Any,
    **kwargs: Any,
) -> str | None:
    """Enqueue a job on the named queue.

    Returns the job id on success, or None when jobs are disabled or enqueue fails.
    Do not pass DB sessions, request objects, or secrets as args/kwargs.
    """
    settings = get_settings()

    if not settings.BACKGROUND_JOBS_ENABLED:
        logger.debug("Background jobs disabled; skipping enqueue for %s", func.__name__)
        return None

    try:
        queue = get_queue(queue_name)
        if queue is None:
            logger.warning(
                "Queue '%s' unavailable; skipping job %s", queue_name, func.__name__
            )
            return None
        job = queue.enqueue(func, *args, **kwargs)
        logger.info("Enqueued job %s on queue '%s' (id=%s)", func.__name__, queue_name, job.id)
        return job.id
    except Exception as exc:
        logger.warning(
            "Failed to enqueue job %s on queue '%s': %s",
            func.__name__,
            queue_name,
            type(exc).__name__,
        )
        return None


def enqueue_file_processing_task(file_id: UUID | str) -> str | None:
    """Enqueue a file processing placeholder on the files queue."""
    from app.workers.tasks.files import process_uploaded_file

    return enqueue_job(
        get_settings().RQ_FILE_QUEUE,
        process_uploaded_file,
        str(file_id),
    )


def enqueue_health_check_task() -> str | None:
    """Enqueue a background health check on the default queue."""
    from app.workers.tasks.health import background_health_check

    return enqueue_job(
        get_settings().RQ_DEFAULT_QUEUE,
        background_health_check,
    )
