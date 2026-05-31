from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.modules.workspaces.model import WorkspaceMemberStatus, WorkspaceRole
from app.schemas.base import AppSchema


# ---------------------------------------------------------------------------
# Workspace schemas
# ---------------------------------------------------------------------------

class WorkspaceCreate(AppSchema):
    organization_id: UUID
    name: str = Field(..., min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    system_instruction: str | None = Field(default=None, max_length=8000)


class WorkspaceUpdate(AppSchema):
    """All fields are optional; at least one should be supplied."""

    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    system_instruction: str | None = Field(default=None, max_length=8000)
    is_active: bool | None = None


class WorkspaceRead(AppSchema):
    id: UUID
    organization_id: UUID
    name: str
    description: str | None
    system_instruction: str | None
    created_by: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime


class WorkspaceWithRoleRead(WorkspaceRead):
    """Workspace view that includes the requesting user's membership role."""

    current_user_role: WorkspaceRole


# ---------------------------------------------------------------------------
# Workspace member schemas
# ---------------------------------------------------------------------------

class WorkspaceMemberCreate(AppSchema):
    """Add an existing user to a workspace by email."""

    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.MEMBER

    @field_validator("email", mode="before")
    @classmethod
    def _normalise_email(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip().lower()
        return v


class WorkspaceMemberUpdate(AppSchema):
    """Partial update for a workspace member's role or status."""

    role: WorkspaceRole | None = None
    status: WorkspaceMemberStatus | None = None


class WorkspaceMemberRead(AppSchema):
    id: UUID
    workspace_id: UUID
    user_id: UUID
    role: WorkspaceRole
    status: WorkspaceMemberStatus
    created_at: datetime
    updated_at: datetime
    # Denormalized from users for display — populated by the service layer
    user_full_name: str
    user_email: str
    user_avatar_url: str | None = None
