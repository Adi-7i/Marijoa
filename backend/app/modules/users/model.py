from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Persistent user record.

    Design notes:
    - Passwords are never stored; only the bcrypt hash (set by the auth layer).
    - Email is stored normalised to lowercase; the schema layer enforces this.
    - The unique constraint on email is implicitly backed by a PostgreSQL unique index.
    - `is_active` / `is_verified` gates are toggled by the admin/auth layers later.
    """

    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(255), nullable=False)

    email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,  # also creates the backing index in PostgreSQL
    )

    password_hash: Mapped[str] = mapped_column(Text, nullable=False)

    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} active={self.is_active}>"
