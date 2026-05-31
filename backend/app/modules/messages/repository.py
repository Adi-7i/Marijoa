from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.messages.model import Message


# ---------------------------------------------------------------------------
# Message queries
# ---------------------------------------------------------------------------


def create_message(
    db: Session,
    *,
    chat_id: UUID,
    user_id: UUID | None,
    role_value: str,
    content: str,
    model: str | None = None,
    metadata_json: dict | None = None,
) -> Message:
    """Insert a new message row and flush without committing.

    The caller (service layer) is responsible for the final db.commit().
    """
    msg = Message(
        chat_id=chat_id,
        user_id=user_id,
        role=role_value,
        content=content,
        model=model,
        metadata_json=metadata_json,
    )
    db.add(msg)
    db.flush()
    return msg


def get_message_by_id(db: Session, message_id: UUID) -> Message | None:
    return db.get(Message, message_id)


def list_messages_by_chat(
    db: Session,
    chat_id: UUID,
    *,
    limit: int = 100,
    offset: int = 0,
) -> list[Message]:
    """Return messages for a chat in ascending chronological order (oldest first)."""
    return list(
        db.scalars(
            select(Message)
            .where(Message.chat_id == chat_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
            .offset(offset)
        )
    )


def count_messages_by_chat(db: Session, chat_id: UUID) -> int:
    """Return the total number of messages in a chat."""
    result = db.scalar(
        select(func.count())
        .select_from(Message)
        .where(Message.chat_id == chat_id)
    )
    return result or 0


def get_recent_messages_for_ai(
    db: Session,
    chat_id: UUID,
    *,
    limit: int = 20,
) -> list[Message]:
    """Return the last `limit` messages in ascending order for AI context building.

    Fetches DESC-limited rows from the database then reverses in Python so the
    returned list is always oldest-first — ready to pass directly to the LLM.
    """
    rows = list(
        db.scalars(
            select(Message)
            .where(Message.chat_id == chat_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
    )
    rows.reverse()
    return rows
