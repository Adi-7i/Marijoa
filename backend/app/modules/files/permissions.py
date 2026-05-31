from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError
from app.modules.workspaces import repository as ws_repo
from app.modules.workspaces.model import WorkspaceRole

# Roles that can manage files (delete/update files they do not own)
_MANAGE_ROLES = {WorkspaceRole.OWNER, WorkspaceRole.ADMIN, WorkspaceRole.MANAGER}

# Roles blocked from uploading files
_UPLOAD_BLOCKED_ROLES = {WorkspaceRole.VIEWER}


def require_file_access(
    db: Session,
    *,
    file_obj: object,
    user_id: UUID,
) -> None:
    """Verify the user is an active workspace member for the file's workspace.

    Raises AuthorizationError if the user is not an active member.
    """
    member = ws_repo.get_active_workspace_member(
        db, file_obj.workspace_id, user_id  # type: ignore[attr-defined]
    )
    if member is None:
        raise AuthorizationError("No access to this file's workspace")


def can_upload_file(workspace_role: str) -> bool:
    """Return True if the given workspace role is allowed to upload files."""
    try:
        role = WorkspaceRole(workspace_role)
    except ValueError:
        return False
    return role not in _UPLOAD_BLOCKED_ROLES


def can_manage_file(
    file_obj: object,
    *,
    user_id: UUID,
    workspace_role: str,
) -> bool:
    """Return True if the user can delete/update the file.

    Owners of the file or members with OWNER/ADMIN/MANAGER role can manage.
    """
    try:
        role = WorkspaceRole(workspace_role)
    except ValueError:
        return False
    is_uploader = str(file_obj.uploaded_by) == str(user_id)  # type: ignore[attr-defined]
    return is_uploader or role in _MANAGE_ROLES


def require_file_manage_permission(
    db: Session,
    *,
    file_obj: object,
    user_id: UUID,
) -> None:
    """Raise AuthorizationError if the user cannot manage (delete/update) the file."""
    member = ws_repo.get_active_workspace_member(
        db, file_obj.workspace_id, user_id  # type: ignore[attr-defined]
    )
    if member is None:
        raise AuthorizationError("No access to this file's workspace")
    if not can_manage_file(file_obj, user_id=user_id, workspace_role=member.role):
        raise AuthorizationError("Insufficient permissions to manage this file")
