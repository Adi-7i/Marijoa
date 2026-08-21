"""create_organization_invitations_table

Adds the `organization_invitations` table that backs the secure invite-link
flow described in the product spec.

Only the SHA-256 hash of an invite token is stored — raw tokens never touch
the database. Status transitions: PENDING_SIGNUP → PENDING_APPROVAL → APPROVED
(or REJECTED / EXPIRED / CANCELLED).

Revision ID: a7c91f08e2d4
Revises: 5191b04819c5
Create Date: 2026-06-02 00:00:00+00:00
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a7c91f08e2d4"
down_revision: Union[str, None] = "5191b04819c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization_invitations",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("invited_by", sa.Uuid(), nullable=False),
        sa.Column("accepted_user_id", sa.Uuid(), nullable=True),
        sa.Column("approved_by", sa.Uuid(), nullable=True),
        sa.Column("rejected_by", sa.Uuid(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_organization_invitations_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["invited_by"],
            ["users.id"],
            name=op.f("fk_organization_invitations_invited_by_users"),
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["accepted_user_id"],
            ["users.id"],
            name=op.f("fk_organization_invitations_accepted_user_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["approved_by"],
            ["users.id"],
            name=op.f("fk_organization_invitations_approved_by_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["rejected_by"],
            ["users.id"],
            name=op.f("fk_organization_invitations_rejected_by_users"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organization_invitations")),
    )
    op.create_index(
        op.f("ix_organization_invitations_organization_id"),
        "organization_invitations",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_invitations_email"),
        "organization_invitations",
        ["email"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_invitations_status"),
        "organization_invitations",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_invitations_invited_by"),
        "organization_invitations",
        ["invited_by"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_invitations_accepted_user_id"),
        "organization_invitations",
        ["accepted_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_invitations_expires_at"),
        "organization_invitations",
        ["expires_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_invitations_token_hash"),
        "organization_invitations",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_organization_invitations_org_email",
        "organization_invitations",
        ["organization_id", "email"],
        unique=False,
    )
    op.create_index(
        "ix_organization_invitations_org_status",
        "organization_invitations",
        ["organization_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_organization_invitations_org_status",
        table_name="organization_invitations",
    )
    op.drop_index(
        "ix_organization_invitations_org_email",
        table_name="organization_invitations",
    )
    op.drop_index(
        op.f("ix_organization_invitations_token_hash"),
        table_name="organization_invitations",
    )
    op.drop_index(
        op.f("ix_organization_invitations_expires_at"),
        table_name="organization_invitations",
    )
    op.drop_index(
        op.f("ix_organization_invitations_accepted_user_id"),
        table_name="organization_invitations",
    )
    op.drop_index(
        op.f("ix_organization_invitations_invited_by"),
        table_name="organization_invitations",
    )
    op.drop_index(
        op.f("ix_organization_invitations_status"),
        table_name="organization_invitations",
    )
    op.drop_index(
        op.f("ix_organization_invitations_email"),
        table_name="organization_invitations",
    )
    op.drop_index(
        op.f("ix_organization_invitations_organization_id"),
        table_name="organization_invitations",
    )
    op.drop_table("organization_invitations")
