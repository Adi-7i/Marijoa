"""Unit tests for user Pydantic schemas.

No database connection required — all assertions are against schema logic only.
"""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.modules.users.schemas import (
    UserBase,
    UserCreateInternal,
    UserRead,
    UserUpdateInternal,
)


# ---------------------------------------------------------------------------
# UserRead — field presence / absence
# ---------------------------------------------------------------------------

def test_user_read_does_not_expose_password_hash() -> None:
    assert "password_hash" not in UserRead.model_fields


def test_user_read_exposes_expected_fields() -> None:
    expected = {"id", "full_name", "email", "avatar_url", "is_active", "is_verified", "created_at", "updated_at"}
    assert expected.issubset(UserRead.model_fields.keys())


# ---------------------------------------------------------------------------
# Email normalisation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "raw, expected",
    [
        ("TEST@Example.COM", "test@example.com"),
        ("  user@domain.org  ", "user@domain.org"),
        ("Mixed.Case@DOMAIN.IO", "mixed.case@domain.io"),
        ("already@lowercase.net", "already@lowercase.net"),
    ],
)
def test_user_base_normalises_email(raw: str, expected: str) -> None:
    schema = UserBase(full_name="Test User", email=raw)
    assert schema.email == expected


# ---------------------------------------------------------------------------
# UserCreateInternal
# ---------------------------------------------------------------------------

def test_user_create_internal_accepts_valid_input() -> None:
    schema = UserCreateInternal(
        full_name="Alice Smith",
        email="alice@example.com",
        password_hash="$2b$12$fakehash",
    )
    assert schema.full_name == "Alice Smith"
    assert schema.email == "alice@example.com"
    assert schema.password_hash == "$2b$12$fakehash"
    assert schema.avatar_url is None


def test_user_create_internal_rejects_empty_full_name() -> None:
    with pytest.raises(Exception):
        UserCreateInternal(
            full_name="",
            email="alice@example.com",
            password_hash="$2b$12$fakehash",
        )


def test_user_create_internal_rejects_invalid_email() -> None:
    with pytest.raises(Exception):
        UserCreateInternal(
            full_name="Alice",
            email="not-an-email",
            password_hash="$2b$12$fakehash",
        )


# ---------------------------------------------------------------------------
# UserUpdateInternal — partial updates
# ---------------------------------------------------------------------------

def test_user_update_internal_all_optional() -> None:
    schema = UserUpdateInternal()
    assert schema.model_dump(exclude_unset=True) == {}


def test_user_update_internal_partial_fields() -> None:
    schema = UserUpdateInternal(full_name="New Name")
    dumped = schema.model_dump(exclude_unset=True)
    assert dumped == {"full_name": "New Name"}
    assert "is_active" not in dumped


# ---------------------------------------------------------------------------
# UserRead — ORM reading via from_attributes
# ---------------------------------------------------------------------------

def test_user_read_from_orm_attributes() -> None:
    now = datetime.now(tz=timezone.utc)
    mock_orm = MagicMock()
    mock_orm.id = uuid4()
    mock_orm.full_name = "Bob Jones"
    mock_orm.email = "bob@example.com"
    mock_orm.avatar_url = None
    mock_orm.is_active = True
    mock_orm.is_verified = False
    mock_orm.created_at = now
    mock_orm.updated_at = now

    user_read = UserRead.model_validate(mock_orm)

    assert user_read.full_name == "Bob Jones"
    assert user_read.email == "bob@example.com"
    assert user_read.is_active is True
    assert user_read.is_verified is False
    assert not hasattr(user_read, "password_hash")
