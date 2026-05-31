"""Unit tests for auth Pydantic schemas — validation rules, normalization."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.modules.auth.schemas import (
    AuthUserResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)


# ---------------------------------------------------------------------------
# RegisterRequest — password strength
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "password,reason",
    [
        ("short1@A", "length OK but let's verify it passes"),  # actually passes
    ],
)
def test_register_request_accepts_strong_password(password: str, reason: str) -> None:
    req = RegisterRequest(full_name="Alice Smith", email="alice@example.com", password=password)
    assert req.password == password


@pytest.mark.parametrize(
    "weak_password",
    [
        "short",          # too short, no upper/digit/special
        "alllowercase1!", # no uppercase
        "ALLUPPERCASE1!", # no lowercase
        "NoDigitsHere!",  # no digit
        "NoSpecial1Char", # no special char
        "ab",             # too short
    ],
)
def test_register_request_rejects_weak_passwords(weak_password: str) -> None:
    with pytest.raises(Exception):
        RegisterRequest(full_name="Test", email="t@example.com", password=weak_password)


@pytest.mark.parametrize(
    "strong_password",
    [
        "Secure1@Pass",
        "C0mplex!Word",
        "My$uper1Password",
    ],
)
def test_register_request_accepts_strong_passwords(strong_password: str) -> None:
    req = RegisterRequest(full_name="Bob", email="bob@example.com", password=strong_password)
    assert req.password == strong_password


# ---------------------------------------------------------------------------
# RegisterRequest — email normalization
# ---------------------------------------------------------------------------

def test_register_normalises_email_to_lowercase() -> None:
    req = RegisterRequest(full_name="Alice", email="ALICE@EXAMPLE.COM", password="Secure1@Pass")
    assert req.email == "alice@example.com"


def test_login_normalises_email_to_lowercase() -> None:
    req = LoginRequest(email="TEST@Domain.ORG", password="anything")
    assert req.email == "test@domain.org"


# ---------------------------------------------------------------------------
# RegisterRequest — full_name validation
# ---------------------------------------------------------------------------

def test_register_rejects_too_short_full_name() -> None:
    with pytest.raises(Exception):
        RegisterRequest(full_name="A", email="a@example.com", password="Secure1@Pass")


def test_register_rejects_empty_full_name() -> None:
    with pytest.raises(Exception):
        RegisterRequest(full_name="", email="a@example.com", password="Secure1@Pass")


def test_register_rejects_invalid_email() -> None:
    with pytest.raises(Exception):
        RegisterRequest(full_name="Alice", email="not-valid", password="Secure1@Pass")


# ---------------------------------------------------------------------------
# AuthUserResponse — never exposes password_hash
# ---------------------------------------------------------------------------

def test_auth_user_response_has_no_password_hash_field() -> None:
    assert "password_hash" not in AuthUserResponse.model_fields


def test_auth_user_response_exposes_expected_fields() -> None:
    expected = {"id", "full_name", "email", "avatar_url", "is_active", "is_verified", "created_at"}
    assert expected.issubset(AuthUserResponse.model_fields.keys())


def test_auth_user_response_from_orm_attributes() -> None:
    from unittest.mock import MagicMock

    now = datetime.now(tz=timezone.utc)
    mock_user = MagicMock()
    mock_user.id = uuid4()
    mock_user.full_name = "Carol Jones"
    mock_user.email = "carol@example.com"
    mock_user.avatar_url = None
    mock_user.is_active = True
    mock_user.is_verified = False
    mock_user.created_at = now

    resp = AuthUserResponse.model_validate(mock_user)
    assert resp.email == "carol@example.com"
    assert resp.is_active is True


# ---------------------------------------------------------------------------
# TokenResponse
# ---------------------------------------------------------------------------

def test_token_response_default_token_type() -> None:
    tr = TokenResponse(access_token="at", refresh_token="rt", expires_in=1800)
    assert tr.token_type == "bearer"


# ---------------------------------------------------------------------------
# Logout / Refresh request — non-empty token required
# ---------------------------------------------------------------------------

def test_logout_request_rejects_empty_token() -> None:
    with pytest.raises(Exception):
        LogoutRequest(refresh_token="")


def test_refresh_request_rejects_empty_token() -> None:
    with pytest.raises(Exception):
        RefreshRequest(refresh_token="")
