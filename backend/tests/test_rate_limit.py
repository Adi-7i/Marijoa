from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.core.rate_limit import check_rate_limit
from app.core.redis import RedisService


def _service_with_increment(increment_return) -> RedisService:
    mock_client = MagicMock()
    svc = RedisService(mock_client, prefix="test")
    svc.increment = MagicMock(return_value=increment_return)
    return svc


class TestCheckRateLimit:
    def test_allows_when_under_limit(self):
        svc = _service_with_increment(1)
        allowed = check_rate_limit(svc, "some:key", limit=10, window_seconds=60)
        assert allowed is True

    def test_allows_exactly_at_limit(self):
        svc = _service_with_increment(10)
        allowed = check_rate_limit(svc, "some:key", limit=10, window_seconds=60)
        assert allowed is True

    def test_blocks_when_over_limit(self):
        svc = _service_with_increment(11)
        allowed = check_rate_limit(svc, "some:key", limit=10, window_seconds=60)
        assert allowed is False

    def test_fails_open_when_redis_service_is_none(self):
        allowed = check_rate_limit(None, "some:key", limit=5, window_seconds=30)
        assert allowed is True

    def test_fails_open_when_increment_returns_none(self):
        svc = _service_with_increment(None)
        allowed = check_rate_limit(svc, "some:key", limit=5, window_seconds=30)
        assert allowed is True

    def test_fails_open_on_unexpected_exception(self):
        svc = MagicMock(spec=RedisService)
        svc.increment.side_effect = RuntimeError("totally unexpected")
        allowed = check_rate_limit(svc, "some:key", limit=5, window_seconds=30)
        assert allowed is True

    def test_window_seconds_passed_to_increment(self):
        svc = MagicMock(spec=RedisService)
        svc.increment.return_value = 1
        check_rate_limit(svc, "my:key", limit=10, window_seconds=120)
        svc.increment.assert_called_once_with("my:key", expire_seconds=120)
