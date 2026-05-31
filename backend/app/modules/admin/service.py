from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.admin import repository as repo
from app.modules.admin.permissions import require_org_admin_or_owner
from app.modules.admin.schemas import (
    AdminAuditLogListResponse,
    AdminAuditLogRead,
    AdminUsageSummary,
    AdminUserListResponse,
    AdminUserRead,
)
from app.modules.audit_logs import service as audit_service
from app.modules.audit_logs.model import AuditAction

logger = logging.getLogger(__name__)

_MAX_PAGE_SIZE = 100


def _page_count(total: int, page_size: int) -> int:
    return max(1, -(-total // page_size))


def list_organization_users(
    db: Session,
    *,
    organization_id: UUID,
    current_user_id: UUID,
    role: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AdminUserListResponse:
    require_org_admin_or_owner(db, user_id=current_user_id, organization_id=organization_id)

    page_size = min(page_size, _MAX_PAGE_SIZE)
    offset = (page - 1) * page_size

    rows = repo.list_organization_users(
        db,
        organization_id=organization_id,
        role=role,
        status=status,
        search=search,
        limit=page_size,
        offset=offset,
    )
    total = repo.count_organization_users(
        db,
        organization_id=organization_id,
        role=role,
        status=status,
        search=search,
    )

    items = [
        AdminUserRead(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            is_verified=user.is_verified,
            org_role=member.role,
            org_member_status=member.status,
            joined_at=member.created_at,
        )
        for member, user in rows
    ]

    audit_service.record_event(
        db,
        action=AuditAction.ADMIN_USERS_VIEWED,
        entity_type="organization",
        entity_id=organization_id,
        user_id=current_user_id,
        organization_id=organization_id,
        metadata={"page": page, "page_size": page_size},
    )

    return AdminUserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=_page_count(total, page_size),
    )


def list_organization_audit_logs(
    db: Session,
    *,
    organization_id: UUID,
    current_user_id: UUID,
    action: str | None = None,
    filter_user_id: UUID | None = None,
    workspace_id: UUID | None = None,
    entity_type: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AdminAuditLogListResponse:
    require_org_admin_or_owner(db, user_id=current_user_id, organization_id=organization_id)

    page_size = min(page_size, _MAX_PAGE_SIZE)
    offset = (page - 1) * page_size

    logs = repo.list_organization_audit_logs(
        db,
        organization_id=organization_id,
        action=action,
        user_id=filter_user_id,
        workspace_id=workspace_id,
        entity_type=entity_type,
        date_from=date_from,
        date_to=date_to,
        limit=page_size,
        offset=offset,
    )
    total = repo.count_organization_audit_logs(
        db,
        organization_id=organization_id,
        action=action,
        user_id=filter_user_id,
        workspace_id=workspace_id,
        entity_type=entity_type,
        date_from=date_from,
        date_to=date_to,
    )

    # Re-sanitize metadata defensively before returning to the API
    items = [
        AdminAuditLogRead(
            id=log.id,
            organization_id=log.organization_id,
            workspace_id=log.workspace_id,
            user_id=log.user_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            metadata_json=audit_service.sanitize_metadata(log.metadata_json),
            created_at=log.created_at,
        )
        for log in logs
    ]

    audit_service.record_event(
        db,
        action=AuditAction.ADMIN_AUDIT_LOGS_VIEWED,
        entity_type="organization",
        entity_id=organization_id,
        user_id=current_user_id,
        organization_id=organization_id,
    )

    return AdminAuditLogListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=_page_count(total, page_size),
    )


def get_organization_usage(
    db: Session,
    *,
    organization_id: UUID,
    current_user_id: UUID,
) -> AdminUsageSummary:
    require_org_admin_or_owner(db, user_id=current_user_id, organization_id=organization_id)

    summary = repo.get_organization_usage_summary(db, organization_id=organization_id)

    audit_service.record_event(
        db,
        action=AuditAction.ADMIN_USAGE_VIEWED,
        entity_type="organization",
        entity_id=organization_id,
        user_id=current_user_id,
        organization_id=organization_id,
    )

    return AdminUsageSummary(**summary)
