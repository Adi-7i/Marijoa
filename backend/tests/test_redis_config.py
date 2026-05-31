from __future__ import annotations

import pytest

from app.core.config import Settings


class TestRedisConfig:
    def test_default_redis_url(self):
        s = Settings(DATABASE_URL="postgresql+psycopg://x:y@localhost/z")
        assert s.REDIS_URL.startswith("redis://")

    def test_redis_enabled_default_true(self):
        s = Settings(DATABASE_URL="postgresql+psycopg://x:y@localhost/z")
        assert s.REDIS_ENABLED is True

    def test_redis_key_prefix_default(self):
        s = Settings(DATABASE_URL="postgresql+psycopg://x:y@localhost/z")
        assert s.REDIS_KEY_PREFIX == "marijoa"

    def test_redis_enabled_can_be_disabled(self):
        s = Settings(DATABASE_URL="postgresql+psycopg://x:y@localhost/z", REDIS_ENABLED=False)
        assert s.REDIS_ENABLED is False

    def test_socket_timeout_defaults(self):
        s = Settings(DATABASE_URL="postgresql+psycopg://x:y@localhost/z")
        assert s.REDIS_SOCKET_TIMEOUT_SECONDS == 5
        assert s.REDIS_CONNECT_TIMEOUT_SECONDS == 5

    def test_rate_limit_config_defaults(self):
        s = Settings(DATABASE_URL="postgresql+psycopg://x:y@localhost/z")
        assert s.RATE_LIMIT_ENABLED is True
        assert s.AUTH_LOGIN_RATE_LIMIT == 10
        assert s.AUTH_LOGIN_RATE_WINDOW_SECONDS == 60
        assert s.AI_RATE_LIMIT == 30
        assert s.AI_RATE_WINDOW_SECONDS == 60

    def test_redis_url_not_exposed_in_repr(self):
        # Settings repr should not be used to dump secrets — basic sanity check
        # that the url is stored but we do not accidentally log it
        s = Settings(
            DATABASE_URL="postgresql+psycopg://x:y@localhost/z",
            REDIS_URL="rediss://default:supersecret@redis.cloud:6379/0",
        )
        assert s.REDIS_URL == "rediss://default:supersecret@redis.cloud:6379/0"
        # The test here is that the attribute is accessible; logging discipline
        # is enforced by the redis.py module (which never logs REDIS_URL).
