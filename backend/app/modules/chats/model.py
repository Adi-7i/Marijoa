from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ChatStatus(str, Enum):
    """Lifecycle status of a chat session.

    State machine:
        ACTIVE  → ARCHIVED | DELETED
        ARCHIVED → ACTIVE  | DELETED
        DELETED  → (terminal — no further transitions)
    """

    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


class Chat(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A conversation session belonging to a workspace.

    Messages (Step 11) will reference this table.
    The AI Gateway will read chat + messages to build context for LLM calls.
    """

    __tablename__ = "chats"

    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=ChatStatus.ACTIVE.value,
        server_default="ACTIVE",
        index=True,
    )

    # Denormalized timestamp — updated by the messages layer in Step 11.
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<Chat title={self.title!r} status={self.status} ws={self.workspace_id}>"
