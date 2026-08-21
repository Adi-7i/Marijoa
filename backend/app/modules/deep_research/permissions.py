from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.deep_research.models import DeepResearchSession
from app.modules.workspaces import permissions as ws_permissions
from app.modules.workspaces.model import WorkspaceMember, WorkspaceRole


def require_read_access(
    db: Session, *, user_id: UUID, session: DeepResearchSession
) -> WorkspaceMember:
    return ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=session.workspace_id
    )


def require_create_access(
    db: Session, *, user_id: UUID, workspace_id: UUID
) -> WorkspaceMember:
    return ws_permissions.require_workspace_role(
        db,
        user_id=user_id,
        workspace_id=workspace_id,
        minimum_role=WorkspaceRole.MEMBER,
    )


def require_start_access(
    db: Session, *, user_id: UUID, session: DeepResearchSession
) -> WorkspaceMember:
    return ws_permissions.require_workspace_role(
        db,
        user_id=user_id,
        workspace_id=session.workspace_id,
        minimum_role=WorkspaceRole.MEMBER,
    )

