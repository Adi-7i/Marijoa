from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RefreshToken(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Persisted refresh token record.

    Only a SHA-256 hash of the raw token value is stored.
    The raw token is returned to the client exactly once and never persisted.
    """

    __tablename__ = "refresh_tokens"

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # SHA-256 hex digest is exactly 64 characters
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Audit fields — nullable; populated from request context
    created_by_ip: Mapped[str | None] = mapped_column(
        String(45), nullable=True  # 45 chars covers IPv6 max length
    )
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)

    def __repr__(self) -> str:
        revoked = " REVOKED" if self.revoked_at else ""
        return f"<RefreshToken user_id={self.user_id}{revoked}>"
