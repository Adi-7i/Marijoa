from __future__ import annotations

import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

try:
    from rq import Queue
    from redis import Redis
    _RQ_AVAILABLE = True
except ImportError:
    _RQ_AVAILABLE = False
    Queue = None  # type: ignore[misc,assignment]
    Redis = None  # type: ignore[misc,assignment]


def _build_connection() -> "Redis | None":
    settings = get_settings()
    if not settings.REDIS_ENABLED:
        return None
    if not _RQ_AVAILABLE:
        logger.warning("rq package not available; background jobs disabled")
        return None
    try:
        import redis as redis_lib
        # REDIS_URL contains credentials — do not log it
        conn = redis_lib.from_url(
            settings.REDIS_URL,
            socket_timeout=float(settings.REDIS_SOCKET_TIMEOUT_SECONDS),
            socket_connect_timeout=float(settings.REDIS_CONNECT_TIMEOUT_SECONDS),
            decode_responses=False,  # RQ requires bytes
        )
        return conn
    except Exception as exc:
        logger.warning("Failed to create Redis connection for RQ: %s", type(exc).__name__)
        return None


def get_queue(name: str) -> "Queue | None":
    """Return an RQ Queue by name, or None when unavailable."""
    settings = get_settings()
    if not settings.BACKGROUND_JOBS_ENABLED:
        return None
    conn = _build_connection()
    if conn is None:
        return None
    if not _RQ_AVAILABLE:
        return None
    return Queue(
        name,
        connection=conn,
        default_timeout=settings.RQ_JOB_TIMEOUT_SECONDS,
        result_ttl=settings.RQ_JOB_RESULT_TTL_SECONDS,
        failure_ttl=settings.RQ_JOB_FAILURE_TTL_SECONDS,
    )


def get_default_queue() -> "Queue | None":
    return get_queue(get_settings().RQ_DEFAULT_QUEUE)


def get_file_queue() -> "Queue | None":
    return get_queue(get_settings().RQ_FILE_QUEUE)


def get_ai_queue() -> "Queue | None":
    return get_queue(get_settings().RQ_AI_QUEUE)
