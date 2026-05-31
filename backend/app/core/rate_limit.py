from __future__ import annotations

import logging

from app.core.redis import RedisService

logger = logging.getLogger(__name__)


def check_rate_limit(
    redis_service: RedisService | None,
    key: str,
    *,
    limit: int,
    window_seconds: int,
) -> bool:
    """Return True if the request is within the rate limit, False if exceeded.

    Fails open when Redis is unavailable — auth/AI endpoints stay operational
    even if Redis is temporarily down. Log a warning so operators are notified.
    """
    if redis_service is None:
        return True

    try:
        count = redis_service.increment(key, expire_seconds=window_seconds)
        if count is None:
            logger.warning("Rate limit check inconclusive (Redis error) — failing open for key pattern")
            return True
        return count <= limit
    except Exception as exc:
        logger.warning("Unexpected rate limit error: %s — failing open", type(exc).__name__)
        return True
