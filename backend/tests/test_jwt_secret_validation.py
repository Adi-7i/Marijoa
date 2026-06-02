"""Configuration validation for JWT_SECRET_KEY length.

Ensures the backend refuses to start in production with a weak JWT secret
(HS256 / HS512 require >= 32 bytes per PyJWT) but stays permissive in
development so local dev with a placeholder secret keeps working.
"""
from __future__ import annotations

import logging
from unittest.mock import patch

import pytest

from app.core.config import MIN_JWT_SECRET_BYTES, Settings


def _strong() -> str:
    # Deterministic >= 32-byte string; never used as a real secret.
    return "test-secret-must-be-at-least-32-bytes-long"


# ---------------------------------------------------------------------------
# Production environment
# ---------------------------------------------------------------------------


def test_production_rejects_short_jwt_secret() -> None:
    with pytest.raises(ValueError) as excinfo:
        Settings(
            APP_ENV="production",
            JWT_SECRET_KEY="x" * (MIN_JWT_SECRET_BYTES - 1),
            DATABASE_URL="postgresql+psycopg://u:p@h/db",
        )
    msg = str(excinfo.value)
    assert "JWT_SECRET_KEY" in msg
    assert str(MIN_JWT_SECRET_BYTES) in msg


def test_production_rejects_default_jwt_secret() -> None:
    with pytest.raises(ValueError) as excinfo:
        Settings(
            APP_ENV="production",
            JWT_SECRET_KEY="change-me-in-production",
            DATABASE_URL="postgresql+psycopg://u:p@h/db",
        )
    assert "JWT_SECRET_KEY" in str(excinfo.value)


def test_production_accepts_long_jwt_secret() -> None:
    settings = Settings(
        APP_ENV="production",
        JWT_SECRET_KEY=_strong(),
        DATABASE_URL="postgresql+psycopg://u:p@h/db",
    )
    assert len(settings.JWT_SECRET_KEY.encode("utf-8")) >= MIN_JWT_SECRET_BYTES


# ---------------------------------------------------------------------------
# Development environment — warn, do not crash
# ---------------------------------------------------------------------------


def test_development_warns_for_short_jwt_secret(caplog: pytest.LogCaptureFixture) -> None:
    short = "x" * (MIN_JWT_SECRET_BYTES - 1)
    with caplog.at_level(logging.WARNING, logger="app.core.config"):
        settings = Settings(APP_ENV="development", JWT_SECRET_KEY=short)
    assert settings.JWT_SECRET_KEY == short
    assert any(
        "JWT_SECRET_KEY" in rec.message and "32" in rec.message for rec in caplog.records
    )
    # The actual secret value must never appear in log output.
    assert all(short not in rec.message for rec in caplog.records)


def test_development_silent_for_strong_secret(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="app.core.config"):
        Settings(APP_ENV="development", JWT_SECRET_KEY=_strong())
    assert not any("JWT_SECRET_KEY" in rec.message for rec in caplog.records)
