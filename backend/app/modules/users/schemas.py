from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.schemas.base import AppSchema


class UserBase(AppSchema):
    """Shared fields present in most user-facing schemas."""

    full_name: str = Field(..., min_length=1, max_length=255, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane@example.com"])

    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v


# ---------------------------------------------------------------------------
# Internal schemas — never exposed directly via public API responses
# ---------------------------------------------------------------------------

class UserCreateInternal(UserBase):
    """Schema for creating a user record in the database.

    INTERNAL — this schema is consumed by the service/repository layer only.
    The password_hash field must be prepared by the auth layer (Step 7) before
    being passed here; plain passwords must never reach this schema.
    """

    password_hash: str = Field(..., min_length=1)
    avatar_url: str | None = Field(default=None)


class UserUpdateInternal(AppSchema):
    """Schema for partial user updates applied by the service layer.

    All fields are optional — only explicitly set fields will be persisted
    (via model_dump(exclude_unset=True) in the repository).
    """

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    avatar_url: str | None = Field(default=None)
    is_active: bool | None = None
    is_verified: bool | None = None
    last_login_at: datetime | None = None


# ---------------------------------------------------------------------------
# Public / API-facing schemas
# ---------------------------------------------------------------------------

class UserRead(UserBase):
    """Safe user representation returned to API consumers.

    password_hash is intentionally absent from this schema.
    """

    id: UUID
    avatar_url: str | None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
