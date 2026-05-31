from __future__ import annotations

from enum import Enum
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ArtifactType(str, Enum):
    DOCUMENT = "document"
    CODE = "code"
    PROMPT = "prompt"
    EMAIL = "email"
    PROPOSAL = "proposal"
    NOTE = "note"


class Artifact(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "artifacts"

    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    chat_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("chats.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    created_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )

    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    __table_args__ = (Index("ix_artifacts_created_at", "created_at"),)

    def __repr__(self) -> str:
        return f"<Artifact title={self.title!r} type={self.type} ws={self.workspace_id}>"
