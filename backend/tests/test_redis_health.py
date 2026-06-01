from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.core.redis import check_redis_connectivity, reset_redis_client


@pytest.fixture(autouse=True)
def reset_client():
    reset_redis_client()
    yield
    reset_redis_client()


class TestCheckRedisConnectivity:
    def test_returns_true_when_ping_succeeds(self):
        mock_client = MagicMock()
        mock_client.ping.return_value = True

        with patch("app.core.redis.get_redis_client", return_value=mock_client):
            result = check_redis_connectivity()

        assert result is True

    def test_returns_false_when_ping_fails(self):
        from redis.exceptions import ConnectionError as RedisConnectionError

        mock_client = MagicMock()
        mock_client.ping.side_effect = RedisConnectionError("refused")

        with patch("app.core.redis.get_redis_client", return_value=mock_client):
            result = check_redis_connectivity()

        assert result is False

    def test_returns_false_when_client_is_none(self):
        with patch("app.core.redis.get_redis_client", return_value=None):
            result = check_redis_connectivity()

        assert result is False

    def test_never_raises(self):
        mock_client = MagicMock()
        mock_client.ping.side_effect = RuntimeError("totally unexpected")

        with patch("app.core.redis.get_redis_client", return_value=mock_client):
            # Must not raise — always returns bool
            result = check_redis_connectivity()

        assert isinstance(result, bool)


class TestRedisHealthEndpoint:
    """Test the health router Redis endpoint via schema logic."""

    def test_disabled_response_body(self):
        from app.modules.health.schemas import RedisHealthResponse

        r = RedisHealthResponse(status="disabled", redis="disabled")
        assert r.status == "disabled"
        assert r.redis == "disabled"

    def test_connected_response_body(self):
        from app.modules.health.schemas import RedisHealthResponse

        r = RedisHealthResponse(status="ok", redis="connected")
        assert r.status == "ok"
        assert r.redis == "connected"

    def test_unavailable_response_body(self):
        from app.modules.health.schemas import RedisHealthResponse

        r = RedisHealthResponse(status="error", redis="unavailable")
        assert r.status == "error"
        assert r.redis == "unavailable"

    def test_health_schema_does_not_include_host_or_password(self):
        from app.modules.health.schemas import RedisHealthResponse

        fields = RedisHealthResponse.model_fields
        assert "host" not in fields
        assert "password" not in fields
        assert "url" not in fields
