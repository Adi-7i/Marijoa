"""Tests for database health utilities and the /api/v1/health/db endpoint.

These tests do NOT require a live PostgreSQL instance — all DB interactions
are mocked. Integration tests that hit a real database should be marked
with @pytest.mark.integration and excluded from the default test run.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.health import check_database_connectivity
from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Unit tests: check_database_connectivity()
# ---------------------------------------------------------------------------

def _make_session_mock(*, raises: Exception | None = None) -> MagicMock:
    """Build a MagicMock that behaves as a SQLAlchemy Session context manager."""
    mock_session = MagicMock()
    mock_cm = MagicMock()
    if raises:
        mock_cm.__enter__ = MagicMock(side_effect=raises)
    else:
        mock_cm.__enter__ = MagicMock(return_value=mock_session)
    mock_cm.__exit__ = MagicMock(return_value=False)
    return mock_cm


def test_connectivity_returns_true_when_db_responds() -> None:
    mock_cm = _make_session_mock()
    with patch("app.db.health.SessionLocal", return_value=mock_cm):
        assert check_database_connectivity() is True


def test_connectivity_returns_false_on_operational_error() -> None:
    from sqlalchemy.exc import OperationalError

    mock_cm = _make_session_mock(raises=OperationalError("connect", {}, None))
    with patch("app.db.health.SessionLocal", return_value=mock_cm):
        assert check_database_connectivity() is False


def test_connectivity_returns_false_on_generic_exception() -> None:
    mock_cm = _make_session_mock(raises=RuntimeError("unexpected"))
    with patch("app.db.health.SessionLocal", return_value=mock_cm):
        assert check_database_connectivity() is False


def test_connectivity_never_raises() -> None:
    mock_cm = _make_session_mock(raises=Exception("worst case"))
    with patch("app.db.health.SessionLocal", return_value=mock_cm):
        result = check_database_connectivity()
    assert isinstance(result, bool)


# ---------------------------------------------------------------------------
# Endpoint tests: GET /api/v1/health/db
# ---------------------------------------------------------------------------

def test_db_health_endpoint_returns_200_when_connected() -> None:
    with patch("app.modules.health.router.check_database_connectivity", return_value=True):
        response = client.get("/api/v1/health/db")
    assert response.status_code == 200


def test_db_health_endpoint_body_when_connected() -> None:
    with patch("app.modules.health.router.check_database_connectivity", return_value=True):
        data = client.get("/api/v1/health/db").json()
    assert data["status"] == "ok"
    assert data["database"] == "connected"


def test_db_health_endpoint_returns_503_when_unavailable() -> None:
    with patch("app.modules.health.router.check_database_connectivity", return_value=False):
        response = client.get("/api/v1/health/db")
    assert response.status_code == 503


def test_db_health_endpoint_body_when_unavailable() -> None:
    with patch("app.modules.health.router.check_database_connectivity", return_value=False):
        data = client.get("/api/v1/health/db").json()
    assert data["status"] == "error"
    assert data["database"] == "unavailable"


def test_db_health_response_never_exposes_credentials() -> None:
    with patch("app.modules.health.router.check_database_connectivity", return_value=False):
        data = client.get("/api/v1/health/db").json()
    body = str(data)
    assert "password" not in body
    assert "change_me" not in body
    assert "localhost" not in body
    assert "5432" not in body


# ---------------------------------------------------------------------------
# Integration test marker (skipped unless --integration flag passed)
# ---------------------------------------------------------------------------

@pytest.mark.integration
def test_db_health_endpoint_live() -> None:
    """Requires a running PostgreSQL database matching DATABASE_URL in .env."""
    response = client.get("/api/v1/health/db")
    assert response.status_code == 200
    assert response.json()["database"] == "connected"
