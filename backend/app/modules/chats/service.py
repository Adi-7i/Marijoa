from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import InvalidOperationError, ResourceNotFoundError
from app.modules.chats import permissions, repository
from app.modules.chats.model import Chat, ChatStatus
from app.modules.chats.schemas import ChatCreate, ChatUpdate
from app.modules.workspaces import permissions as ws_permissions

_DEFAULT_TITLE = "New Chat"

# Valid status transitions — DELETED is a terminal state.
_VALID_TRANSITIONS: dict[ChatStatus, set[ChatStatus]] = {
    ChatStatus.ACTIVE: {ChatStatus.ARCHIVED, ChatStatus.DELETED},
    ChatStatus.ARCHIVED: {ChatStatus.ACTIVE, ChatStatus.DELETED},
    ChatStatus.DELETED: set(),
}


def create_chat(db: Session, data: ChatCreate, user_id: UUID) -> Chat:
    """Create a new chat in the workspace. User must be an active workspace member."""
    ws_permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=data.workspace_id
    )
    title = data.title.strip() if data.title else _DEFAULT_TITLE
    chat = repository.create_chat(
        db, workspace_id=data.workspace_id, user_id=user_id, title=title
    )
    db.commit()
    db.refresh(chat)
    return chat


def get_chat(db: Session, chat_id: UUID, user_id: UUID) -> Chat:
    """Return the chat or raise 404 if not found or inaccessible."""
    chat = repository.get_chat_by_id(db, chat_id)
    if chat is None:
        raise ResourceNotFoundError("Chat", chat_id)
    permissions.require_chat_access(db, chat=chat, user_id=user_id)
    return chat


def list_chats(
    db: Session,
    workspace_id: UUID,
    user_id: UUID,
    status: ChatStatus | None = None,
) -> list[Chat]:
    """List chats the user can access in the workspace.

    DELETED chats are excluded unless status=DELETED is explicitly requested.
    """
    ws_permissions.require_workspace_member(db, user_id=user_id, workspace_id=workspace_id)
    return repository.list_chats_by_workspace(db, workspace_id, status=status)


def update_chat(db: Session, chat_id: UUID, data: ChatUpdate, user_id: UUID) -> Chat:
    """Rename or change the status of a chat.

    Status transitions are validated against _VALID_TRANSITIONS.
    """
    chat = repository.get_chat_by_id(db, chat_id)
    if chat is None:
        raise ResourceNotFoundError("Chat", chat_id)

    permissions.require_chat_manage_permission(db, chat=chat, user_id=user_id)

    changes: dict[str, object] = {}

    if data.title is not None:
        changes["title"] = data.title.strip()

    if data.status is not None:
        current = ChatStatus(chat.status)
        allowed = _VALID_TRANSITIONS.get(current, set())
        if data.status not in allowed:
            raise InvalidOperationError(
                f"Cannot transition chat from {current.value} to {data.status.value}"
            )
        changes["status"] = data.status.value

    if changes:
        repository.update_chat(db, chat, **changes)
        db.commit()
        db.refresh(chat)

    return chat


def delete_chat(db: Session, chat_id: UUID, user_id: UUID) -> None:
    """Soft-delete a chat by setting status=DELETED. Idempotent if already deleted."""
    chat = repository.get_chat_by_id(db, chat_id)
    if chat is None:
        raise ResourceNotFoundError("Chat", chat_id)

    permissions.require_chat_manage_permission(db, chat=chat, user_id=user_id)

    if ChatStatus(chat.status) == ChatStatus.DELETED:
        return  # Already deleted — no-op

    repository.update_chat(db, chat, status=ChatStatus.DELETED.value)
    db.commit()
