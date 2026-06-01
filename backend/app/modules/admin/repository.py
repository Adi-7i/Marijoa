from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.artifacts.model import Artifact
from app.modules.audit_logs.model import AuditLog
from app.modules.chats.model import Chat
from app.modules.files.model import File, FileStatus
from app.modules.messages.model import Message
from app.modules.organizations.model import OrgMemberStatus, OrganizationMember
from app.modules.users.model import User
from app.modules.workspaces.model import Workspace


# ---------------------------------------------------------------------------
# User listing
# ---------------------------------------------------------------------------

def list_organization_users(
    db: Session,
    *,
    organization_id: UUID,
    role: str | None = None,
    status: str | None = None,
    search: str | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[tuple[OrganizationMember, User]]:
    stmt = (
        select(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == organization_id)
    )
    if role:
        stmt = stmt.where(OrganizationMember.role == role)
    if status:
        stmt = stmt.where(OrganizationMember.status == status)
    else:
        stmt = stmt.where(OrganizationMember.status != OrgMemberStatus.REMOVED.value)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            User.full_name.ilike(pattern) | User.email.ilike(pattern)
        )
    stmt = stmt.order_by(OrganizationMember.created_at.asc()).limit(limit).offset(offset)
    rows = db.execute(stmt).all()
    return [(row[0], row[1]) for row in rows]


def count_organization_users(
    db: Session,
    *,
    organization_id: UUID,
    role: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> int:
    stmt = (
        select(func.count())
        .select_from(OrganizationMember)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == organization_id)
    )
    if role:
        stmt = stmt.where(OrganizationMember.role == role)
    if status:
        stmt = stmt.where(OrganizationMember.status == status)
    else:
        stmt = stmt.where(OrganizationMember.status != OrgMemberStatus.REMOVED.value)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            User.full_name.ilike(pattern) | User.email.ilike(pattern)
        )
    return db.scalar(stmt) or 0


# ---------------------------------------------------------------------------
# Audit log listing
# ---------------------------------------------------------------------------

def list_organization_audit_logs(
    db: Session,
    *,
    organization_id: UUID,
    action: str | None = None,
    user_id: UUID | None = None,
    workspace_id: UUID | None = None,
    entity_type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = 20,
    offset: int = 0,
) -> list[AuditLog]:
    stmt = select(AuditLog).where(AuditLog.organization_id == organization_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if workspace_id:
        stmt = stmt.where(AuditLog.workspace_id == workspace_id)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())


def count_organization_audit_logs(
    db: Session,
    *,
    organization_id: UUID,
    action: str | None = None,
    user_id: UUID | None = None,
    workspace_id: UUID | None = None,
    entity_type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> int:
    stmt = (
        select(func.count())
        .select_from(AuditLog)
        .where(AuditLog.organization_id == organization_id)
    )
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if workspace_id:
        stmt = stmt.where(AuditLog.workspace_id == workspace_id)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= date_from)
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= date_to)
    return db.scalar(stmt) or 0


# ---------------------------------------------------------------------------
# Usage summary — all counts via aggregation; no full-row loading
# ---------------------------------------------------------------------------

def get_organization_usage_summary(
    db: Session,
    *,
    organization_id: UUID,
) -> dict:
    # Active workspace IDs for this organization
    ws_subquery = (
        select(Workspace.id)
        .where(Workspace.organization_id == organization_id)
        .where(Workspace.is_active.is_(True))
        .scalar_subquery()
    )

    # Chat IDs inside those workspaces (used for message count)
    chat_subquery = (
        select(Chat.id)
        .where(Chat.workspace_id.in_(ws_subquery))
        .scalar_subquery()
    )

    users_count = db.scalar(
        select(func.count())
        .select_from(OrganizationMember)
        .where(OrganizationMember.organization_id == organization_id)
        .where(OrganizationMember.status != OrgMemberStatus.REMOVED.value)
    ) or 0

    active_users_count = db.scalar(
        select(func.count())
        .select_from(OrganizationMember)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == organization_id)
        .where(OrganizationMember.status == OrgMemberStatus.ACTIVE.value)
        .where(User.is_active.is_(True))
    ) or 0

    workspaces_count = db.scalar(
        select(func.count())
        .select_from(Workspace)
        .where(Workspace.organization_id == organization_id)
        .where(Workspace.is_active.is_(True))
    ) or 0

    chats_count = db.scalar(
        select(func.count())
        .select_from(Chat)
        .where(Chat.workspace_id.in_(ws_subquery))
    ) or 0

    messages_count = db.scalar(
        select(func.count())
        .select_from(Message)
        .where(Message.chat_id.in_(chat_subquery))
    ) or 0

    artifacts_count = db.scalar(
        select(func.count())
        .select_from(Artifact)
        .where(Artifact.workspace_id.in_(ws_subquery))
        .where(Artifact.is_active.is_(True))
    ) or 0

    files_count = db.scalar(
        select(func.count())
        .select_from(File)
        .where(File.workspace_id.in_(ws_subquery))
        .where(File.is_active.is_(True))
        .where(File.status != FileStatus.DELETED.value)
    ) or 0

    storage_bytes = db.scalar(
        select(func.coalesce(func.sum(File.size_bytes), 0))
        .select_from(File)
        .where(File.workspace_id.in_(ws_subquery))
        .where(File.is_active.is_(True))
        .where(File.status != FileStatus.DELETED.value)
    ) or 0

    return {
        "organization_id": organization_id,
        "users_count": users_count,
        "active_users_count": active_users_count,
        "workspaces_count": workspaces_count,
        "chats_count": chats_count,
        "messages_count": messages_count,
        "artifacts_count": artifacts_count,
        "files_count": files_count,
        "storage_bytes": storage_bytes,
    }
