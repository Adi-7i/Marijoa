from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.modules.organizations.model import OrgMemberStatus, OrgRole
from app.schemas.base import AppSchema


# ---------------------------------------------------------------------------
# Organization schemas
# ---------------------------------------------------------------------------

class OrganizationCreate(AppSchema):
    name: str = Field(..., min_length=2, max_length=160)
    slug: str | None = Field(
        default=None,
        min_length=2,
        max_length=160,
        pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$",
        description="URL-safe lowercase slug. Auto-generated from name if omitted.",
    )


class OrganizationRead(AppSchema):
    id: UUID
    name: str
    slug: str
    owner_id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class OrganizationWithRoleRead(OrganizationRead):
    """Organization view that includes the requesting user's membership role."""

    current_user_role: OrgRole


# ---------------------------------------------------------------------------
# Organization member schemas
# ---------------------------------------------------------------------------

class OrganizationMemberCreate(AppSchema):
    """Add an existing user to an organization by email."""

    email: EmailStr
    role: OrgRole = OrgRole.MEMBER

    @field_validator("email", mode="before")
    @classmethod
    def _normalise_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class OrganizationMemberUpdate(AppSchema):
    """Partial update for a member's role or status.

    Both fields are optional; at least one should be provided.
    """

    role: OrgRole | None = None
    status: OrgMemberStatus | None = None


class OrganizationMemberRead(AppSchema):
    id: UUID
    organization_id: UUID
    user_id: UUID
    role: OrgRole
    status: OrgMemberStatus
    created_at: datetime
    updated_at: datetime
    # Denormalized from users for display — populated by the service layer
    user_full_name: str
    user_email: str
    user_avatar_url: str | None = None
