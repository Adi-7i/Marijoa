from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.core.redis import RedisService, reset_redis_client


@pytest.fixture(autouse=True)
def reset_client():
    """Ensure the global cached Redis client is cleared between tests."""
    reset_redis_client()
    yield
    reset_redis_client()


def _service(mock_redis: MagicMock | None = None, prefix: str = "marijoa") -> RedisService:
    client = mock_redis or MagicMock()
    return RedisService(client, prefix=prefix)


class TestRedisServiceKeyBuilder:
    def test_simple_key(self):
        svc = _service()
        assert svc.build_key("ratelimit", "user", "abc123") == "marijoa:ratelimit:user:abc123"

    def test_single_part(self):
        svc = _service()
        assert svc.build_key("token_blacklist") == "marijoa:token_blacklist"

    def test_strips_leading_colons_from_parts(self):
        svc = _service()
        key = svc.build_key(":ratelimit:", ":user:")
        assert "::" not in key

    def test_custom_prefix(self):
        svc = _service(prefix="myapp")
        assert svc.build_key("cache", "org") == "myapp:cache:org"

    def test_empty_parts_skipped(self):
        svc = _service()
        key = svc.build_key("cache", "", "123")
        assert "cache" in key
        assert "123" in key


class TestRedisServiceGet:
    def test_get_returns_value(self):
        mock_client = MagicMock()
        mock_client.get.return_value = "hello"
        svc = _service(mock_client)
        assert svc.get("some:key") == "hello"

    def test_get_returns_none_on_redis_error(self):
        from redis.exceptions import RedisError
        mock_client = MagicMock()
        mock_client.get.side_effect = RedisError("connection refused")
        svc = _service(mock_client)
        result = svc.get("some:key")
        assert result is None


class TestRedisServiceSet:
    def test_set_returns_true_on_success(self):
        mock_client = MagicMock()
        mock_client.set.return_value = True
        svc = _service(mock_client)
        assert svc.set("k", "v", expire_seconds=60) is True

    def test_set_passes_expire(self):
        mock_client = MagicMock()
        svc = _service(mock_client)
        svc.set("k", "v", expire_seconds=30)
        mock_client.set.assert_called_once_with("k", "v", ex=30)

    def test_set_returns_false_on_redis_error(self):
        from redis.exceptions import RedisError
        mock_client = MagicMock()
        mock_client.set.side_effect = RedisError("timeout")
        svc = _service(mock_client)
        assert svc.set("k", "v") is False


class TestRedisServiceDelete:
    def test_delete_returns_count(self):
        mock_client = MagicMock()
        mock_client.delete.return_value = 1
        svc = _service(mock_client)
        assert svc.delete("k") == 1

    def test_delete_returns_zero_on_error(self):
        from redis.exceptions import RedisError
        mock_client = MagicMock()
        mock_client.delete.side_effect = RedisError("connection refused")
        svc = _service(mock_client)
        assert svc.delete("k") == 0


class TestRedisServiceIncrement:
    def test_increment_sets_expire_on_first_call(self):
        mock_client = MagicMock()
        mock_client.incr.return_value = 1
        svc = _service(mock_client)
        value = svc.increment("rate:key", expire_seconds=60)
        assert value == 1
        mock_client.expire.assert_called_once_with("rate:key", 60)

    def test_increment_no_expire_on_subsequent_calls(self):
        mock_client = MagicMock()
        mock_client.incr.return_value = 5
        svc = _service(mock_client)
        svc.increment("rate:key", expire_seconds=60)
        mock_client.expire.assert_not_called()

    def test_increment_returns_none_on_error(self):
        from redis.exceptions import RedisError
        mock_client = MagicMock()
        mock_client.incr.side_effect = RedisError("timeout")
        svc = _service(mock_client)
        assert svc.increment("k") is None


class TestGetRedisClient:
    def test_returns_none_when_disabled(self):
        from app.core.redis import get_redis_client

        with patch("app.core.redis.get_settings") as mock_settings:
            mock_settings.return_value.REDIS_ENABLED = False
            client = get_redis_client()
        assert client is None
