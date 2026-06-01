from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.audit_logs.model import AuditLog


def create_audit_log(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    user_id: UUID | None = None,
    organization_id: UUID | None = None,
    workspace_id: UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    metadata_json: dict | None = None,
) -> AuditLog:
    obj = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        organization_id=organization_id,
        workspace_id=workspace_id,
        ip_address=ip_address,
        user_agent=user_agent,
        metadata_json=metadata_json,
    )
    db.add(obj)
    db.flush()
    return obj


def list_audit_logs(
    db: Session,
    *,
    workspace_id: UUID | None = None,
    user_id: UUID | None = None,
    action: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    stmt = select(AuditLog)
    if workspace_id:
        stmt = stmt.where(AuditLog.workspace_id == workspace_id)
    if user_id:
        stmt = stmt.where(AuditLog.user_id == user_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(stmt).all())
