"""Unit tests for the user service layer.

All database interactions are mocked — no live PostgreSQL required.
Integration tests that hit a real database are marked @pytest.mark.integration.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.modules.users import service
from app.modules.users.schemas import UserCreateInternal, UserUpdateInternal


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_db() -> MagicMock:
    """Return a minimal mock that satisfies the Session interface used by the service."""
    db = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    return db


def _sample_create_data(**overrides) -> UserCreateInternal:
    defaults = dict(
        full_name="Alice Smith",
        email="alice@example.com",
        password_hash="$2b$12$somehash",
    )
    defaults.update(overrides)
    return UserCreateInternal(**defaults)


# ---------------------------------------------------------------------------
# create_user
# ---------------------------------------------------------------------------

def test_create_user_raises_conflict_when_email_exists() -> None:
    db = _make_db()
    existing_user = MagicMock()

    with patch("app.modules.users.service.repository.get_user_by_email", return_value=existing_user):
        with pytest.raises(ConflictError) as exc_info:
            service.create_user(db, _sample_create_data())

    assert exc_info.value.status_code == 409
    db.commit.assert_not_called()


def test_create_user_succeeds_when_email_is_new() -> None:
    db = _make_db()
    new_user = MagicMock()

    with (
        patch("app.modules.users.service.repository.get_user_by_email", return_value=None),
        patch("app.modules.users.service.repository.create_user", return_value=new_user),
    ):
        result = service.create_user(db, _sample_create_data())

    assert result is new_user
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(new_user)


def test_create_user_normalises_email_before_duplicate_check() -> None:
    db = _make_db()
    data = _sample_create_data(email="ALICE@Example.COM")

    with (
        patch("app.modules.users.service.repository.get_user_by_email", return_value=None) as mock_get,
        patch("app.modules.users.service.repository.create_user", return_value=MagicMock()),
    ):
        service.create_user(db, data)

    # Schema normalised the email; repository should receive the lowercase form
    mock_get.assert_called_once()
    call_email_arg = mock_get.call_args[0][1]
    assert call_email_arg == "alice@example.com"


# ---------------------------------------------------------------------------
# get_user_by_id
# ---------------------------------------------------------------------------

def test_get_user_by_id_returns_user_when_found() -> None:
    db = _make_db()
    user = MagicMock()
    user_id = uuid4()

    with patch("app.modules.users.service.repository.get_user_by_id", return_value=user):
        result = service.get_user_by_id(db, user_id)

    assert result is user


def test_get_user_by_id_raises_not_found_when_missing() -> None:
    db = _make_db()

    with patch("app.modules.users.service.repository.get_user_by_id", return_value=None):
        with pytest.raises(ResourceNotFoundError) as exc_info:
            service.get_user_by_id(db, uuid4())

    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# get_user_by_email
# ---------------------------------------------------------------------------

def test_get_user_by_email_returns_user_when_found() -> None:
    db = _make_db()
    user = MagicMock()

    with patch("app.modules.users.service.repository.get_user_by_email", return_value=user):
        result = service.get_user_by_email(db, "alice@example.com")

    assert result is user


def test_get_user_by_email_raises_not_found_when_missing() -> None:
    db = _make_db()

    with patch("app.modules.users.service.repository.get_user_by_email", return_value=None):
        with pytest.raises(ResourceNotFoundError):
            service.get_user_by_email(db, "nobody@example.com")


# ---------------------------------------------------------------------------
# update_user
# ---------------------------------------------------------------------------

def test_update_user_raises_not_found_for_unknown_user_id() -> None:
    db = _make_db()

    with patch("app.modules.users.service.repository.get_user_by_id", return_value=None):
        with pytest.raises(ResourceNotFoundError):
            service.update_user(db, uuid4(), UserUpdateInternal(full_name="New"))


def test_update_user_commits_and_refreshes() -> None:
    db = _make_db()
    user = MagicMock()
    updated = MagicMock()

    with (
        patch("app.modules.users.service.repository.get_user_by_id", return_value=user),
        patch("app.modules.users.service.repository.update_user", return_value=updated),
    ):
        result = service.update_user(db, uuid4(), UserUpdateInternal(full_name="New Name"))

    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(updated)
    assert result is updated
