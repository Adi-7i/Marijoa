from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Return a secure bcrypt hash of the given plain-text password."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Return True if plain_password matches the stored hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))


# ---------------------------------------------------------------------------
# Refresh token helpers
# ---------------------------------------------------------------------------

def create_refresh_token_value() -> str:
    """Generate a cryptographically secure random token value (URL-safe base64)."""
    return secrets.token_urlsafe(64)


def hash_token(token_value: str) -> str:
    """Return the SHA-256 hex digest of a raw token value.

    Only the hash is stored in the database; the raw value is never persisted.
    """
    return hashlib.sha256(token_value.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# JWT — access tokens
# ---------------------------------------------------------------------------

def create_access_token(
    subject: str,
    additional_claims: dict[str, Any] | None = None,
) -> str:
    """Create a signed JWT access token for the given subject (user id as string)."""
    settings = get_settings()
    now = datetime.now(tz=timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    if additional_claims:
        payload.update(additional_claims)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Raises AuthenticationError on any failure — details are never leaked to callers.
    """
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "iat", "sub", "type"]},
        )
    except ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except InvalidTokenError:
        raise AuthenticationError("Invalid authentication token")

    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token type")

    return payload
