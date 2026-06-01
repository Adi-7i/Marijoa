from __future__ import annotations

from enum import Enum
from uuid import UUID

from sqlalchemy import ForeignKey, Index, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MessageRole(str, Enum):
    """Role of the author of a message in a conversation.

    Mirrors the OpenAI / Anthropic message role vocabulary so values can be
    passed through to the AI Gateway without transformation.
    """

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class Message(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A single turn in a chat conversation.

    The `role` column stores MessageRole.value — validated at the schema/service
    layer, stored as a plain string in the database for portability.

    `metadata_json` is intentionally named with a `_json` suffix because
    SQLAlchemy reserves the attribute name `metadata` on mapped classes.
    """

    __tablename__ = "messages"

    chat_id: Mapped[UUID] = mapped_column(
        ForeignKey("chats.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # MessageRole.value stored as string; validated at the schema/service layer
    role: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    # The model identifier used to generate this message (assistant turns only)
    model: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # Arbitrary provider/gateway metadata (token counts, stop reason, etc.)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_messages_chat_created_at", "chat_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Message role={self.role!r} chat={self.chat_id}>"
