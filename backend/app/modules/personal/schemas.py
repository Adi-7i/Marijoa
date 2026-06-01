from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.modules.organizations.model import OrganizationType
from app.schemas.base import AppSchema


class PersonalOrganizationRead(AppSchema):
    id: UUID
    name: str
    type: OrganizationType


class PersonalWorkspaceRead(AppSchema):
    id: UUID
    name: str
    organization_id: UUID


class PersonalUserRead(AppSchema):
    """Minimal user snapshot included in personal context — no sensitive fields."""

    id: UUID
    full_name: str
    email: str
    avatar_url: str | None = None
    is_active: bool
    is_verified: bool
    created_at: datetime


class PersonalContextResponse(AppSchema):
    """Full personal context returned to the frontend on the /me/personal-context endpoint.

    Provides everything the frontend needs to open a personal AI chat session
    without prompting the user to create an organization or workspace.
    """

    user: PersonalUserRead
    personal_organization: PersonalOrganizationRead
    personal_workspace: PersonalWorkspaceRead
