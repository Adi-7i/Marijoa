from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.chats.model import Chat
from app.modules.chats.permissions import require_chat_access


def require_message_access(db: Session, *, chat: Chat, user_id: UUID) -> None:
    """Validate the user may read/write messages in the given chat.

    Thin wrapper over require_chat_access — a user must hold an active
    workspace membership for the chat's workspace to access its messages.

    Raises ResourceNotFoundError if the workspace or membership is not found,
    consistent with the workspace permission policy of not revealing resource
    existence to non-members.
    """
    require_chat_access(db, chat=chat, user_id=user_id)
