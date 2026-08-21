"""RQ worker bootstrap.

Start with:
    python -m app.workers.worker default files ai

Or run a specific subset:
    python -m app.workers.worker default
"""
from __future__ import annotations

import logging
import sys

logger = logging.getLogger(__name__)


def main(queue_names: list[str] | None = None) -> None:
    try:
        from rq import Worker
    except ImportError:
        logger.error("rq is not installed; cannot start worker. Run: pip install rq")
        sys.exit(1)

    from app.core.config import get_settings
    from app.workers.queues import _build_connection

    settings = get_settings()

    if not settings.BACKGROUND_JOBS_ENABLED:
        logger.error("BACKGROUND_JOBS_ENABLED is false; worker will not start")
        sys.exit(1)

    conn = _build_connection()
    if conn is None:
        logger.error("Redis connection unavailable; worker cannot start")
        sys.exit(1)

    names = queue_names or [
        settings.RQ_DEFAULT_QUEUE,
        settings.RQ_FILE_QUEUE,
        settings.RQ_AI_QUEUE,
        settings.RQ_RESEARCH_QUEUE,
    ]

    # Log queue names — never log the Redis URL
    logger.info("Starting RQ worker on queues: %s", names)

    worker = Worker(names, connection=conn)
    worker.work()


if __name__ == "__main__":
    import sys as _sys
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    queue_args = _sys.argv[1:] or None
    main(queue_args)
