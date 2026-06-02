from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.modules.invitations.model import InvitationStatus
from app.schemas.base import AppSchema


class InvitableRole(str, Enum):
    """Roles that can be assigned via invitation.

    OWNER is intentionally excluded — owners are created at organization
    creation time only and cannot be invited through the normal flow.
    """

    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


# ---------------------------------------------------------------------------
# Admin-facing schemas
# ---------------------------------------------------------------------------

class InvitationCreate(AppSchema):
    email: EmailStr
    role: InvitableRole = InvitableRole.MEMBER

    @field_validator("email", mode="before")
    @classmethod
    def _normalise_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class InvitationRead(AppSchema):
    id: UUID
    organization_id: UUID
    email: str
    role: InvitableRole
    status: InvitationStatus
    invited_by: UUID
    accepted_user_id: UUID | None
    expires_at: datetime
    created_at: datetime
    accepted_at: datetime | None
    approved_at: datetime | None
    rejected_at: datetime | None


class InvitationCreateResponse(InvitationRead):
    """Invitation create response — includes the one-time invite URL."""

    invite_url: str


# ---------------------------------------------------------------------------
# Public accept schemas
# ---------------------------------------------------------------------------

class InvitationValidateResponse(AppSchema):
    """Safe public view of an invitation — returned by the validate endpoint."""

    valid: bool
    organization_name: str
    email: str
    role: InvitableRole
    status: InvitationStatus
    expires_at: datetime


# Password rules mirror the auth registration schema to keep UX consistent.
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


class InvitationAcceptRequest(AppSchema):
    """Submitted by an invited user from the public accept page.

    Email is NEVER taken from the client — the backend uses invitation.email.
    """

    token: str = Field(..., min_length=8, max_length=512)
    full_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=8)

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class InvitationAcceptResponse(AppSchema):
    """Pending-approval response returned after a successful submission."""

    status: InvitationStatus
    organization_name: str
    message: str


class InvitationAcceptExistingRequest(AppSchema):
    """Submitted by an already-authenticated user accepting an invitation."""

    token: str = Field(..., min_length=8, max_length=512)
