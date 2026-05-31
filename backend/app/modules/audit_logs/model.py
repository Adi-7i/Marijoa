from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKeyMixin


class AuditAction:
    USER_REGISTERED = 'USER_REGISTERED'
    USER_LOGIN = 'USER_LOGIN'
    USER_LOGOUT = 'USER_LOGOUT'
    ORGANIZATION_CREATED = 'ORGANIZATION_CREATED'
    ORGANIZATION_MEMBER_ADDED = 'ORGANIZATION_MEMBER_ADDED'
    WORKSPACE_CREATED = 'WORKSPACE_CREATED'
    WORKSPACE_UPDATED = 'WORKSPACE_UPDATED'
    WORKSPACE_DELETED = 'WORKSPACE_DELETED'
    CHAT_CREATED = 'CHAT_CREATED'
    CHAT_UPDATED = 'CHAT_UPDATED'
    CHAT_DELETED = 'CHAT_DELETED'
    MESSAGE_CREATED = 'MESSAGE_CREATED'
    AI_RESPONSE_CREATED = 'AI_RESPONSE_CREATED'
    AI_STREAM_COMPLETED = 'AI_STREAM_COMPLETED'
    ARTIFACT_CREATED = 'ARTIFACT_CREATED'
    ARTIFACT_UPDATED = 'ARTIFACT_UPDATED'
    ARTIFACT_DELETED = 'ARTIFACT_DELETED'
    FILE_UPLOADED = 'FILE_UPLOADED'
    FILE_DELETED = 'FILE_DELETED'
    ADMIN_USERS_VIEWED = 'ADMIN_USERS_VIEWED'
    ADMIN_AUDIT_LOGS_VIEWED = 'ADMIN_AUDIT_LOGS_VIEWED'
    ADMIN_USAGE_VIEWED = 'ADMIN_USAGE_VIEWED'


class AuditLog(Base, UUIDPrimaryKeyMixin):
    __tablename__ = 'audit_logs'

    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey('organizations.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    workspace_id: Mapped[UUID | None] = mapped_column(
        ForeignKey('workspaces.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    entity_id: Mapped[UUID | None] = mapped_column(nullable=True, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        Index('ix_audit_logs_entity', 'entity_type', 'entity_id'),
    )
