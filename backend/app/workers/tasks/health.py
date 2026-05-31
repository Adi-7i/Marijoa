from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def background_health_check() -> dict:
    """Simple background task to verify the worker is alive.

    Enqueue via enqueue_health_check_task() to confirm worker connectivity.
    """
    logger.info("background_health_check executed")
    return {"status": "ok", "worker": "alive"}
