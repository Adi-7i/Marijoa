from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict, Field

from app.schemas.base import AppSchema


class AdminUserRead(AppSchema):
    """Public user profile as seen by an organization admin.

    password_hash and all raw auth fields are intentionally excluded.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    avatar_url: str | None
    is_active: bool
    is_verified: bool
    # Organization membership context
    org_role: str
    org_member_status: str
    joined_at: datetime


class AdminUserListResponse(AppSchema):
    items: list[AdminUserRead]
    total: int
    page: int
    page_size: int
    pages: int


class AdminAuditLogRead(AppSchema):
    """Audit log record as seen by an organization admin.

    Metadata is always re-sanitized before inclusion in this schema.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID | None
    workspace_id: UUID | None
    user_id: UUID | None
    action: str
    entity_type: str
    entity_id: UUID | None
    ip_address: str | None
    user_agent: str | None
    metadata_json: dict | None
    created_at: datetime


class AdminAuditLogListResponse(AppSchema):
    items: list[AdminAuditLogRead]
    total: int
    page: int
    page_size: int
    pages: int


class AdminUsageSummary(AppSchema):
    """Organization-level usage summary. Never includes secrets or config."""

    organization_id: UUID
    users_count: int = Field(ge=0)
    active_users_count: int = Field(ge=0)
    workspaces_count: int = Field(ge=0)
    chats_count: int = Field(ge=0)
    messages_count: int = Field(ge=0)
    artifacts_count: int = Field(ge=0)
    files_count: int = Field(ge=0)
    storage_bytes: int = Field(ge=0)
