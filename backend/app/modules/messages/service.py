from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ResourceNotFoundError
from app.modules.chats import permissions as chat_perms
from app.modules.chats import repository as chat_repo
from app.modules.messages import repository
from app.modules.messages.model import Message


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _touch_chat_last_message_at(db: Session, chat_id: UUID) -> None:
    """Update the denormalized `last_message_at` timestamp on the parent chat.

    Uses db.flush() — no commit; the surrounding service call owns the
    transaction boundary.
    """
    chat = chat_repo.get_chat_by_id(db, chat_id)
    if chat is not None:
        chat.last_message_at = datetime.now(timezone.utc)
        db.flush()


# ---------------------------------------------------------------------------
# Message persistence
# ---------------------------------------------------------------------------


def save_user_message(
    db: Session,
    *,
    chat_id: UUID,
    content: str,
    user_id: UUID,
) -> Message:
    """Persist a USER-role message and update the chat's last_message_at.

    Commits the transaction and refreshes the returned object so all
    server-generated fields (id, created_at, updated_at) are populated.
    """
    msg = repository.create_message(
        db,
        chat_id=chat_id,
        user_id=user_id,
        role_value="user",
        content=content,
    )
    _touch_chat_last_message_at(db, chat_id)
    db.commit()
    db.refresh(msg)
    return msg


def save_assistant_message(
    db: Session,
    *,
    chat_id: UUID,
    content: str,
    model: str | None = None,
    metadata_json: dict | None = None,
) -> Message:
    """Persist an ASSISTANT-role message and update the chat's last_message_at.

    user_id is None for assistant turns — the message is machine-generated.
    Commits the transaction and refreshes the returned object.
    """
    msg = repository.create_message(
        db,
        chat_id=chat_id,
        user_id=None,
        role_value="assistant",
        content=content,
        model=model,
        metadata_json=metadata_json,
    )
    _touch_chat_last_message_at(db, chat_id)
    db.commit()
    db.refresh(msg)
    return msg


# ---------------------------------------------------------------------------
# Message retrieval
# ---------------------------------------------------------------------------


def list_messages(
    db: Session,
    chat_id: UUID,
    user_id: UUID,
    *,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[Message], int]:
    """Return paginated messages for a chat after verifying access.

    Raises ResourceNotFoundError if the chat does not exist or the user is not
    a member of the chat's workspace.

    Returns a (items, total) tuple — total reflects the full count before
    pagination so the caller can build `X-Total-Count` / pagination metadata.
    """
    chat = chat_repo.get_chat_by_id(db, chat_id)
    if chat is None:
        raise ResourceNotFoundError("Chat", chat_id)

    chat_perms.require_chat_access(db, chat=chat, user_id=user_id)

    items = repository.list_messages_by_chat(db, chat_id, limit=limit, offset=offset)
    total = repository.count_messages_by_chat(db, chat_id)
    return items, total


def get_recent_for_ai(
    db: Session,
    chat_id: UUID,
    *,
    limit: int = 20,
) -> list[Message]:
    """Return the most recent `limit` messages in ascending order for LLM context.

    No access check — intended for internal AI Gateway / background task usage
    only. Callers must perform their own authorization before calling this.
    """
    return repository.get_recent_messages_for_ai(db, chat_id, limit=limit)
