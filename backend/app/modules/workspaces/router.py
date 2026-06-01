from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import require_authenticated_user
from app.modules.users.model import User
from app.modules.workspaces import schemas, service
from app.modules.workspaces.repository import get_active_workspace_member
from app.utils.responses import success

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post(
    "",
    response_model=schemas.WorkspaceRead,
    status_code=201,
    summary="Create a workspace",
)
async def create_workspace(
    data: schemas.WorkspaceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.WorkspaceRead:
    ws = service.create_workspace(db, data, creator_id=current_user.id)
    return schemas.WorkspaceRead.model_validate(ws)


@router.get(
    "",
    response_model=list[schemas.WorkspaceWithRoleRead],
    summary="List workspaces the current user can access",
)
async def list_workspaces(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
    organization_id: UUID | None = Query(
        default=None,
        description="Filter workspaces by organization. Omit for all accessible workspaces.",
    ),
) -> list[schemas.WorkspaceWithRoleRead]:
    return service.list_workspaces(db, current_user.id, organization_id=organization_id)


@router.get(
    "/{workspace_id}",
    response_model=schemas.WorkspaceWithRoleRead,
    summary="Get workspace details",
)
async def get_workspace(
    workspace_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.WorkspaceWithRoleRead:
    ws, user_role = service.get_workspace(db, workspace_id, current_user.id)
    return schemas.WorkspaceWithRoleRead(
        **schemas.WorkspaceRead.model_validate(ws).model_dump(),
        current_user_role=user_role,
    )


@router.patch(
    "/{workspace_id}",
    response_model=schemas.WorkspaceRead,
    summary="Update workspace settings",
)
async def update_workspace(
    workspace_id: UUID,
    data: schemas.WorkspaceUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.WorkspaceRead:
    ws = service.update_workspace(db, workspace_id, data, current_user.id)
    return schemas.WorkspaceRead.model_validate(ws)


@router.delete(
    "/{workspace_id}",
    summary="Deactivate a workspace (soft delete)",
)
async def deactivate_workspace(
    workspace_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> dict:
    service.deactivate_workspace(db, workspace_id, current_user.id)
    return success(message="Workspace deactivated")


# ---------------------------------------------------------------------------
# Workspace member management
# ---------------------------------------------------------------------------

@router.get(
    "/{workspace_id}/members",
    response_model=list[schemas.WorkspaceMemberRead],
    summary="List workspace members",
)
async def list_workspace_members(
    workspace_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> list[schemas.WorkspaceMemberRead]:
    return service.list_workspace_members(db, workspace_id, current_user.id)


@router.post(
    "/{workspace_id}/members",
    response_model=schemas.WorkspaceMemberRead,
    status_code=201,
    summary="Add a member to the workspace by email",
)
async def add_workspace_member(
    workspace_id: UUID,
    data: schemas.WorkspaceMemberCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.WorkspaceMemberRead:
    return service.add_workspace_member(db, workspace_id, data, acting_user_id=current_user.id)


@router.patch(
    "/{workspace_id}/members/{member_id}",
    response_model=schemas.WorkspaceMemberRead,
    summary="Update a workspace member's role or status",
)
async def update_workspace_member(
    workspace_id: UUID,
    member_id: UUID,
    data: schemas.WorkspaceMemberUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_authenticated_user)],
) -> schemas.WorkspaceMemberRead:
    return service.update_workspace_member(
        db, workspace_id, member_id, data, acting_user_id=current_user.id
    )
