from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.chats.model import Chat, ChatStatus


def create_chat(
    db: Session,
    *,
    workspace_id: UUID,
    user_id: UUID,
    title: str,
) -> Chat:
    chat = Chat(workspace_id=workspace_id, user_id=user_id, title=title)
    db.add(chat)
    db.flush()
    return chat


def get_chat_by_id(db: Session, chat_id: UUID) -> Chat | None:
    return db.get(Chat, chat_id)


def list_chats_by_workspace(
    db: Session,
    workspace_id: UUID,
    *,
    status: ChatStatus | None = None,
) -> list[Chat]:
    """List chats for a workspace.

    When status is provided, filters to that status only.
    When status is None, DELETED chats are excluded by default.
    """
    stmt = (
        select(Chat)
        .where(Chat.workspace_id == workspace_id)
        .order_by(Chat.created_at.desc())
    )
    if status is not None:
        stmt = stmt.where(Chat.status == status.value)
    else:
        stmt = stmt.where(Chat.status != ChatStatus.DELETED.value)
    return list(db.scalars(stmt))


def update_chat(db: Session, chat: Chat, **changes: object) -> Chat:
    for field, value in changes.items():
        setattr(chat, field, value)
    db.flush()
    return chat
