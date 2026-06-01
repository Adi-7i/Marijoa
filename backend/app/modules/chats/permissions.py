from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError
from app.modules.chats.model import Chat
from app.modules.workspaces import permissions as ws_permissions
from app.modules.workspaces.model import WorkspaceRole


def require_chat_access(db: Session, *, chat: Chat, user_id: UUID) -> None:
    """Validate the user holds an active workspace membership for the chat's workspace.

    Raises ResourceNotFoundError if the workspace is not found or the user is
    not a member — consistent with the workspace permission policy of not
    revealing resource existence to non-members.
    """
    ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=chat.workspace_id
    )


def can_manage_chat(
    chat: Chat, user_id: UUID, ws_role: WorkspaceRole
) -> bool:
    """Return True if the user may rename/archive/delete the given chat.

    Rules:
    - The chat's creator can always manage their own chat.
    - Workspace MANAGER, ADMIN, and OWNER can manage any chat in the workspace.
    """
    is_creator = chat.user_id == user_id
    has_manage_role = ws_permissions.has_role_at_least(ws_role, WorkspaceRole.MANAGER)
    return is_creator or has_manage_role


def require_chat_manage_permission(
    db: Session, *, chat: Chat, user_id: UUID
) -> None:
    """Raise AuthorizationError if the user cannot manage the given chat."""
    member = ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=chat.workspace_id
    )
    ws_role = WorkspaceRole(member.role)
    if not can_manage_chat(chat, user_id, ws_role):
        raise AuthorizationError("Insufficient permissions to manage this chat")
