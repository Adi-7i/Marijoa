from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError
from app.modules.artifacts.model import Artifact
from app.modules.workspaces import permissions as ws_permissions
from app.modules.workspaces.model import WorkspaceRole

_MANAGE_ROLES = {WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MANAGER}


def can_manage_artifact(
    artifact: Artifact,
    *,
    user_id: UUID,
    workspace_role: str,
) -> bool:
    """Return True if the user may update or delete the artifact.

    The artifact creator can always manage their own artifact.
    Workspace MANAGER, ADMIN, and OWNER can manage any artifact.
    """
    is_creator = str(artifact.created_by) == str(user_id)
    has_manage_role = WorkspaceRole(workspace_role) in _MANAGE_ROLES
    return is_creator or has_manage_role


def require_artifact_read_access(
    db: Session,
    *,
    artifact: Artifact,
    user_id: UUID,
) -> None:
    """Validate the user holds an active workspace membership for the artifact's workspace.

    Raises ResourceNotFoundError if the workspace is not found or the user is
    not a member — consistent with the workspace permission policy of not
    revealing resource existence to non-members.
    """
    ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=artifact.workspace_id
    )


def require_artifact_manage_permission(
    db: Session,
    *,
    artifact: Artifact,
    user_id: UUID,
) -> None:
    """Raise AuthorizationError if the user cannot manage the given artifact."""
    member = ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=artifact.workspace_id
    )
    if not can_manage_artifact(artifact, user_id=user_id, workspace_role=member.role):
        raise AuthorizationError("Insufficient permissions to manage this artifact")
