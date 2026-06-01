from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Lazy import so the module can be loaded without redis installed when disabled
try:
    import redis as redis_lib
    from redis import Redis
    from redis.exceptions import RedisError
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False
    Redis = Any  # type: ignore[misc,assignment]
    RedisError = Exception  # type: ignore[misc,assignment]

_client: "Redis | None" = None


def _build_client() -> "Redis | None":
    settings = get_settings()
    if not settings.REDIS_ENABLED:
        return None
    if not _REDIS_AVAILABLE:
        logger.warning("Redis is enabled but the 'redis' package is not installed")
        return None
    # REDIS_URL contains credentials — do not log it
    client = redis_lib.from_url(
        settings.REDIS_URL,
        socket_timeout=float(settings.REDIS_SOCKET_TIMEOUT_SECONDS),
        socket_connect_timeout=float(settings.REDIS_CONNECT_TIMEOUT_SECONDS),
        decode_responses=True,
    )
    return client


def get_redis_client() -> "Redis | None":
    """Return a shared Redis client instance, or None when Redis is disabled."""
    global _client
    if _client is None:
        _client = _build_client()
    return _client


def reset_redis_client() -> None:
    """Reset the cached client. Used in tests to inject a mock."""
    global _client
    _client = None


def check_redis_connectivity() -> bool:
    """Ping Redis and return True if reachable, False otherwise.

    Never raises — always returns a boolean.
    """
    client = get_redis_client()
    if client is None:
        return False
    try:
        return bool(client.ping())
    except Exception as exc:
        logger.warning("Redis connectivity check failed: %s", type(exc).__name__)
        return False


class RedisService:
    """Thin, prefix-aware Redis wrapper.

    All operations suppress raw RedisError and log a warning instead,
    so Redis failures do not propagate as unhandled exceptions.
    """

    def __init__(self, client: "Redis", prefix: str) -> None:
        self._client = client
        self._prefix = prefix

    # ------------------------------------------------------------------
    # Key construction
    # ------------------------------------------------------------------

    def build_key(self, *parts: str) -> str:
        """Build a namespaced key: prefix:part1:part2:...

        Each part is stripped of leading/trailing colons to prevent
        double-colon segments from arbitrary input.
        """
        cleaned = [p.strip(":") for p in parts if p]
        return ":".join([self._prefix, *cleaned])

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    def ping(self) -> bool:
        try:
            return bool(self._client.ping())
        except RedisError:
            return False

    def get(self, key: str) -> str | None:
        try:
            return self._client.get(key)
        except RedisError as exc:
            logger.warning("Redis GET failed: %s", type(exc).__name__)
            return None

    def set(
        self,
        key: str,
        value: str | int,
        *,
        expire_seconds: int | None = None,
    ) -> bool:
        try:
            return bool(self._client.set(key, value, ex=expire_seconds))
        except RedisError as exc:
            logger.warning("Redis SET failed: %s", type(exc).__name__)
            return False

    def delete(self, key: str) -> int:
        try:
            return self._client.delete(key)
        except RedisError as exc:
            logger.warning("Redis DELETE failed: %s", type(exc).__name__)
            return 0

    def exists(self, key: str) -> bool:
        try:
            return bool(self._client.exists(key))
        except RedisError as exc:
            logger.warning("Redis EXISTS failed: %s", type(exc).__name__)
            return False

    def increment(self, key: str, *, expire_seconds: int | None = None) -> int | None:
        """Increment counter; set TTL on the first increment.

        Returns the new value, or None if Redis is unavailable.
        """
        try:
            value = self._client.incr(key)
            if value == 1 and expire_seconds:
                self._client.expire(key, expire_seconds)
            return value
        except RedisError as exc:
            logger.warning("Redis INCR failed: %s", type(exc).__name__)
            return None


def get_redis_service() -> RedisService | None:
    """Return a configured RedisService, or None when Redis is disabled."""
    client = get_redis_client()
    if client is None:
        return None
    settings = get_settings()
    return RedisService(client, prefix=settings.REDIS_KEY_PREFIX)
