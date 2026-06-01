"""Unit tests for auth/security.py — password hashing and JWT utilities.

No database or network access required.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError
from app.modules.auth import security


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def test_hash_password_does_not_return_plaintext() -> None:
    result = security.hash_password("Secure1@Pass")
    assert result != "Secure1@Pass"


def test_hash_password_produces_bcrypt_hash() -> None:
    result = security.hash_password("Secure1@Pass")
    assert result.startswith("$2b$")  # bcrypt 2b prefix


def test_verify_password_succeeds_with_correct_password() -> None:
    h = security.hash_password("Correct1@Horse")
    assert security.verify_password("Correct1@Horse", h) is True


def test_verify_password_fails_with_wrong_password() -> None:
    h = security.hash_password("Correct1@Horse")
    assert security.verify_password("Wrong1@Horse", h) is False


def test_two_hashes_of_same_password_differ() -> None:
    h1 = security.hash_password("Same1@Password")
    h2 = security.hash_password("Same1@Password")
    assert h1 != h2  # bcrypt uses random salt


# ---------------------------------------------------------------------------
# Refresh token helpers
# ---------------------------------------------------------------------------

def test_create_refresh_token_value_is_non_empty() -> None:
    value = security.create_refresh_token_value()
    assert len(value) > 32


def test_hash_token_is_deterministic() -> None:
    v = security.create_refresh_token_value()
    assert security.hash_token(v) == security.hash_token(v)


def test_hash_token_is_64_chars() -> None:
    v = security.create_refresh_token_value()
    assert len(security.hash_token(v)) == 64


def test_raw_token_differs_from_its_hash() -> None:
    v = security.create_refresh_token_value()
    assert v != security.hash_token(v)


# ---------------------------------------------------------------------------
# JWT — access tokens
# ---------------------------------------------------------------------------

def test_access_token_can_be_created_and_decoded() -> None:
    token = security.create_access_token("user-abc-123")
    payload = security.decode_access_token(token)
    assert payload["sub"] == "user-abc-123"


def test_access_token_has_correct_type_claim() -> None:
    token = security.create_access_token("uid-1")
    payload = security.decode_access_token(token)
    assert payload["type"] == "access"


def test_access_token_has_expiry_claim() -> None:
    token = security.create_access_token("uid-1")
    payload = security.decode_access_token(token)
    assert "exp" in payload


def test_invalid_token_string_raises_authentication_error() -> None:
    with pytest.raises(AuthenticationError):
        security.decode_access_token("this.is.not.a.token")


def test_empty_token_raises_authentication_error() -> None:
    with pytest.raises(AuthenticationError):
        security.decode_access_token("")


def test_expired_token_raises_authentication_error() -> None:
    settings = get_settings()
    past = datetime.now(tz=timezone.utc) - timedelta(hours=1)
    payload = {"sub": "uid-1", "type": "access", "iat": past, "exp": past}
    expired_token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(AuthenticationError, match="expired"):
        security.decode_access_token(expired_token)


def test_token_with_wrong_type_raises_authentication_error() -> None:
    settings = get_settings()
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": "uid-1",
        "type": "refresh",  # wrong type
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    with pytest.raises(AuthenticationError):
        security.decode_access_token(token)


def test_token_signed_with_wrong_secret_raises_error() -> None:
    import jwt as _jwt
    payload = {"sub": "uid-1", "type": "access"}
    bad_token = _jwt.encode(payload, "wrong-secret", algorithm="HS256")
    with pytest.raises(AuthenticationError):
        security.decode_access_token(bad_token)
