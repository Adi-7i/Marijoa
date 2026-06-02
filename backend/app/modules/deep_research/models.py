from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import UserDefinedType

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Vector(UserDefinedType):
    """Minimal pgvector SQLAlchemy type without requiring the pgvector package."""

    cache_ok = True

    def __init__(self, dimensions: int | None = None) -> None:
        self.dimensions = dimensions or 1536

    def get_col_spec(self, **kw: object) -> str:
        return f"vector({self.dimensions})"

    def bind_processor(self, dialect):  # type: ignore[no-untyped-def]
        def process(value: list[float] | None) -> str | None:
            if value is None:
                return None
            return "[" + ",".join(str(float(item)) for item in value) + "]"

        return process

    def result_processor(self, dialect, coltype):  # type: ignore[no-untyped-def]
        def process(value: object) -> list[float] | None:
            if value is None:
                return None
            if isinstance(value, list):
                return [float(item) for item in value]
            if isinstance(value, str):
                cleaned = value.strip().strip("[]")
                return [float(item) for item in cleaned.split(",") if item]
            return None

        return process


class ResearchSessionStatus(str, Enum):
    DRAFT = "DRAFT"
    PLANNED = "PLANNED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ResearchStepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class ResearchSourceStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    SELECTED = "SELECTED"
    FETCHED = "FETCHED"
    EXTRACTED = "EXTRACTED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class ResearchPdfStatus(str, Enum):
    READY = "ready"
    UNAVAILABLE = "unavailable"


class DeepResearchSession(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deep_research_sessions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    organization_id: Mapped[UUID | None] = mapped_column(ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True, index=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True)
    chat_id: Mapped[UUID | None] = mapped_column(ForeignKey("chats.id", ondelete="SET NULL"), nullable=True, index=True)

    query: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str | None] = mapped_column(String(240), nullable=True)
    mode: Mapped[str] = mapped_column(String(40), nullable=False, default="standard", server_default="standard")
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    current_step: Mapped[str | None] = mapped_column(String(80), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("ix_deep_research_sessions_created_at", "created_at"),)


class DeepResearchStep(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deep_research_steps"

    session_id: Mapped[UUID] = mapped_column(ForeignKey("deep_research_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    step_key: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    progress_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("session_id", "step_key", name="uq_deep_research_steps_session_step"),
        Index("ix_deep_research_steps_session_order", "session_id", "order_index"),
    )


class DeepResearchSource(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deep_research_sources"

    session_id: Mapped[UUID] = mapped_column(ForeignKey("deep_research_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    search_query: Mapped[str | None] = mapped_column(Text, nullable=True)
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    fetch_status: Mapped[str | None] = mapped_column(String(60), nullable=True)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    content_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    extracted_chars: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    fetched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("session_id", "url", name="uq_deep_research_sources_session_url"),
        Index("ix_deep_research_sources_session_status", "session_id", "status"),
    )


class DeepResearchChunk(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deep_research_chunks"

    session_id: Mapped[UUID] = mapped_column(ForeignKey("deep_research_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[UUID] = mapped_column(ForeignKey("deep_research_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    char_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    embedding_model: Mapped[str | None] = mapped_column(String(120), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("session_id", "source_id", "chunk_index", name="uq_deep_research_chunks_session_source_index"),
        Index("ix_deep_research_chunks_session_source", "session_id", "source_id"),
    )


class DeepResearchReport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "deep_research_reports"

    session_id: Mapped[UUID] = mapped_column(ForeignKey("deep_research_sessions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False)
    citation_map_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    citation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    pdf_file_id: Mapped[UUID | None] = mapped_column(ForeignKey("files.id", ondelete="SET NULL"), nullable=True)
    pdf_status: Mapped[str | None] = mapped_column(String(40), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
