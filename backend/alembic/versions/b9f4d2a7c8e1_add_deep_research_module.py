"""add_deep_research_module

Revision ID: b9f4d2a7c8e1
Revises: a7c91f08e2d4
Create Date: 2026-06-02 00:00:00.000000+00:00

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b9f4d2a7c8e1"
down_revision: Union[str, None] = "a7c91f08e2d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "deep_research_sessions",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("chat_id", sa.Uuid(), nullable=True),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("title", sa.String(length=240), nullable=True),
        sa.Column("mode", sa.String(length=40), server_default="standard", nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("progress_percent", sa.Integer(), server_default="0", nullable=False),
        sa.Column("current_step", sa.String(length=80), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["chat_id"], ["chats.id"], name=op.f("fk_deep_research_sessions_chat_id_chats"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], name=op.f("fk_deep_research_sessions_organization_id_organizations"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_deep_research_sessions_user_id_users"), ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], name=op.f("fk_deep_research_sessions_workspace_id_workspaces"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deep_research_sessions")),
    )
    op.create_index(op.f("ix_deep_research_sessions_chat_id"), "deep_research_sessions", ["chat_id"], unique=False)
    op.create_index("ix_deep_research_sessions_created_at", "deep_research_sessions", ["created_at"], unique=False)
    op.create_index(op.f("ix_deep_research_sessions_organization_id"), "deep_research_sessions", ["organization_id"], unique=False)
    op.create_index(op.f("ix_deep_research_sessions_status"), "deep_research_sessions", ["status"], unique=False)
    op.create_index(op.f("ix_deep_research_sessions_user_id"), "deep_research_sessions", ["user_id"], unique=False)
    op.create_index(op.f("ix_deep_research_sessions_workspace_id"), "deep_research_sessions", ["workspace_id"], unique=False)

    op.create_table(
        "deep_research_steps",
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("step_key", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("progress_percent", sa.Integer(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["deep_research_sessions.id"], name=op.f("fk_deep_research_steps_session_id_deep_research_sessions"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deep_research_steps")),
        sa.UniqueConstraint("session_id", "step_key", name="uq_deep_research_steps_session_step"),
    )
    op.create_index("ix_deep_research_steps_session_order", "deep_research_steps", ["session_id", "order_index"], unique=False)
    op.create_index(op.f("ix_deep_research_steps_session_id"), "deep_research_steps", ["session_id"], unique=False)

    op.create_table(
        "deep_research_sources",
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("domain", sa.String(length=255), nullable=True),
        sa.Column("snippet", sa.Text(), nullable=True),
        sa.Column("source_type", sa.String(length=80), nullable=True),
        sa.Column("search_query", sa.Text(), nullable=True),
        sa.Column("rank", sa.Integer(), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("fetch_status", sa.String(length=60), nullable=True),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column("content_type", sa.String(length=120), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=True),
        sa.Column("extracted_chars", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["deep_research_sessions.id"], name=op.f("fk_deep_research_sources_session_id_deep_research_sessions"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deep_research_sources")),
        sa.UniqueConstraint("session_id", "url", name="uq_deep_research_sources_session_url"),
    )
    op.create_index(op.f("ix_deep_research_sources_domain"), "deep_research_sources", ["domain"], unique=False)
    op.create_index(op.f("ix_deep_research_sources_session_id"), "deep_research_sources", ["session_id"], unique=False)
    op.create_index("ix_deep_research_sources_session_status", "deep_research_sources", ["session_id", "status"], unique=False)
    op.create_index(op.f("ix_deep_research_sources_status"), "deep_research_sources", ["status"], unique=False)

    op.create_table(
        "deep_research_chunks",
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column("char_count", sa.Integer(), nullable=True),
        sa.Column("embedding", sa.JSON(), nullable=True),
        sa.Column("embedding_model", sa.String(length=120), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["deep_research_sessions.id"], name=op.f("fk_deep_research_chunks_session_id_deep_research_sessions"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_id"], ["deep_research_sources.id"], name=op.f("fk_deep_research_chunks_source_id_deep_research_sources"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deep_research_chunks")),
        sa.UniqueConstraint("session_id", "source_id", "chunk_index", name="uq_deep_research_chunks_session_source_index"),
    )
    op.create_index(op.f("ix_deep_research_chunks_session_id"), "deep_research_chunks", ["session_id"], unique=False)
    op.create_index(op.f("ix_deep_research_chunks_source_id"), "deep_research_chunks", ["source_id"], unique=False)
    op.create_index("ix_deep_research_chunks_session_source", "deep_research_chunks", ["session_id", "source_id"], unique=False)

    op.create_table(
        "deep_research_reports",
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("content_markdown", sa.Text(), nullable=False),
        sa.Column("citation_map_json", sa.JSON(), nullable=True),
        sa.Column("source_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("citation_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("pdf_file_id", sa.Uuid(), nullable=True),
        sa.Column("pdf_status", sa.String(length=40), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["pdf_file_id"], ["files.id"], name=op.f("fk_deep_research_reports_pdf_file_id_files"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["session_id"], ["deep_research_sessions.id"], name=op.f("fk_deep_research_reports_session_id_deep_research_sessions"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deep_research_reports")),
        sa.UniqueConstraint("session_id", name=op.f("uq_deep_research_reports_session_id")),
    )
    op.create_index(op.f("ix_deep_research_reports_session_id"), "deep_research_reports", ["session_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_deep_research_reports_session_id"), table_name="deep_research_reports")
    op.drop_table("deep_research_reports")
    op.drop_index("ix_deep_research_chunks_session_source", table_name="deep_research_chunks")
    op.drop_index(op.f("ix_deep_research_chunks_source_id"), table_name="deep_research_chunks")
    op.drop_index(op.f("ix_deep_research_chunks_session_id"), table_name="deep_research_chunks")
    op.drop_table("deep_research_chunks")
    op.drop_index(op.f("ix_deep_research_sources_status"), table_name="deep_research_sources")
    op.drop_index("ix_deep_research_sources_session_status", table_name="deep_research_sources")
    op.drop_index(op.f("ix_deep_research_sources_session_id"), table_name="deep_research_sources")
    op.drop_index(op.f("ix_deep_research_sources_domain"), table_name="deep_research_sources")
    op.drop_table("deep_research_sources")
    op.drop_index(op.f("ix_deep_research_steps_session_id"), table_name="deep_research_steps")
    op.drop_index("ix_deep_research_steps_session_order", table_name="deep_research_steps")
    op.drop_table("deep_research_steps")
    op.drop_index(op.f("ix_deep_research_sessions_workspace_id"), table_name="deep_research_sessions")
    op.drop_index(op.f("ix_deep_research_sessions_user_id"), table_name="deep_research_sessions")
    op.drop_index(op.f("ix_deep_research_sessions_status"), table_name="deep_research_sessions")
    op.drop_index(op.f("ix_deep_research_sessions_organization_id"), table_name="deep_research_sessions")
    op.drop_index("ix_deep_research_sessions_created_at", table_name="deep_research_sessions")
    op.drop_index(op.f("ix_deep_research_sessions_chat_id"), table_name="deep_research_sessions")
    op.drop_table("deep_research_sessions")
