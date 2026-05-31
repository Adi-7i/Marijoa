from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.admin import schemas, service
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.users.model import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/organizations/{organization_id}/users",
    response_model=schemas.AdminUserListResponse,
    summary="[Admin] List organization users",
    description=(
        "Returns organization members with their public profile data. "
        "Requires active OWNER or ADMIN membership in the organization."
    ),
)
async def list_organization_users(
    organization_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    role: Annotated[str | None, Query(description="Filter by org role (OWNER/ADMIN/MANAGER/MEMBER)")] = None,
    status: Annotated[str | None, Query(description="Filter by member status (ACTIVE/INVITED/SUSPENDED)")] = None,
    search: Annotated[str | None, Query(max_length=100, description="Search by name or email")] = None,
    page: Annotated[int, Query(ge=1, description="1-based page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page (max 100)")] = 20,
) -> schemas.AdminUserListResponse:
    return service.list_organization_users(
        db,
        organization_id=organization_id,
        current_user_id=current_user.id,
        role=role,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/organizations/{organization_id}/audit-logs",
    response_model=schemas.AdminAuditLogListResponse,
    summary="[Admin] List organization audit logs",
    description=(
        "Returns paginated audit logs for the organization. "
        "Requires active OWNER or ADMIN membership."
    ),
)
async def list_organization_audit_logs(
    organization_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    action: Annotated[str | None, Query(description="Filter by action type")] = None,
    user_id: Annotated[UUID | None, Query(description="Filter by user who performed the action")] = None,
    workspace_id: Annotated[UUID | None, Query(description="Filter by workspace")] = None,
    entity_type: Annotated[str | None, Query(description="Filter by entity type (e.g. 'user', 'file')")] = None,
    date_from: Annotated[datetime | None, Query(description="Filter from date (ISO 8601)")] = None,
    date_to: Annotated[datetime | None, Query(description="Filter to date (ISO 8601)")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> schemas.AdminAuditLogListResponse:
    return service.list_organization_audit_logs(
        db,
        organization_id=organization_id,
        current_user_id=current_user.id,
        action=action,
        filter_user_id=user_id,
        workspace_id=workspace_id,
        entity_type=entity_type,
        date_from=date_from,
        date_to=date_to,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/organizations/{organization_id}/usage",
    response_model=schemas.AdminUsageSummary,
    summary="[Admin] Get organization usage summary",
    description=(
        "Returns aggregated usage statistics for the organization. "
        "Requires active OWNER or ADMIN membership."
    ),
)
async def get_organization_usage(
    organization_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.AdminUsageSummary:
    return service.get_organization_usage(
        db,
        organization_id=organization_id,
        current_user_id=current_user.id,
    )
