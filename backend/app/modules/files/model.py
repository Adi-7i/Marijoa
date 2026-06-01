from __future__ import annotations

from enum import Enum
from uuid import UUID

from sqlalchemy import BigInteger, Boolean, ForeignKey, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FileStatus(str, Enum):
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"
    DELETED = "DELETED"


class File(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "files"

    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    uploaded_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=False,
        index=True,
    )

    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)

    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)

    mime_type: Mapped[str] = mapped_column(String(120), nullable=False, index=True)

    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)

    storage_provider: Mapped[str] = mapped_column(
        String(60), nullable=False, default="azure_blob"
    )

    blob_container: Mapped[str] = mapped_column(String(120), nullable=False)

    blob_name: Mapped[str] = mapped_column(
        String(512), nullable=False, unique=True, index=True
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=FileStatus.READY.value,
        index=True,
    )

    checksum_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )

    __table_args__ = (Index("ix_files_created_at", "created_at"),)

    def __repr__(self) -> str:
        return (
            f"<File original_filename={self.original_filename!r} "
            f"ws={self.workspace_id} status={self.status}>"
        )
