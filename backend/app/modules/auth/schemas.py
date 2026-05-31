from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.schemas.base import AppSchema

# ---------------------------------------------------------------------------
# Password strength constants
# ---------------------------------------------------------------------------

_SPECIAL_CHARS: frozenset[str] = frozenset("!@#$%^&*()_+-=[]{}|;':\",./<>?~`")


def _validate_password_strength(value: str) -> str:
    missing: list[str] = []
    if len(value) < 8:
        missing.append("at least 8 characters")
    if not any(c.isupper() for c in value):
        missing.append("one uppercase letter")
    if not any(c.islower() for c in value):
        missing.append("one lowercase letter")
    if not any(c.isdigit() for c in value):
        missing.append("one digit")
    if not any(c in _SPECIAL_CHARS for c in value):
        missing.append("one special character (!@#$%^&* etc.)")
    if missing:
        raise ValueError(f"Password must contain: {', '.join(missing)}")
    return value


# ---------------------------------------------------------------------------
# Inbound request schemas
# ---------------------------------------------------------------------------

class RegisterRequest(AppSchema):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8)

    @field_validator("email", mode="before")
    @classmethod
    def _normalise_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class LoginRequest(AppSchema):
    email: EmailStr
    password: str = Field(..., min_length=1)

    @field_validator("email", mode="before")
    @classmethod
    def _normalise_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class RefreshRequest(AppSchema):
    refresh_token: str = Field(..., min_length=1)


class LogoutRequest(AppSchema):
    refresh_token: str = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Outbound response schemas
# ---------------------------------------------------------------------------

class AuthUserResponse(AppSchema):
    """Public user representation — never includes password_hash."""

    id: UUID
    full_name: str
    email: str
    avatar_url: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime


class TokenResponse(AppSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expiry


class AuthResponse(AppSchema):
    """Combined user + token payload returned on register and login."""

    user: AuthUserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
