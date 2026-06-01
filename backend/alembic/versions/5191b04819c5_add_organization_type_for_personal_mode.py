"""add_organization_type_for_personal_mode

Adds the `type` column to organizations (values: PERSONAL | COMPANY).
Existing organizations are backfilled as COMPANY.
A partial unique index ensures each user has at most one active PERSONAL org.

Revision ID: 5191b04819c5
Revises: 3bc5dbde46c2
Create Date: 2026-05-31 17:46:02.837007+00:00

"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "5191b04819c5"
down_revision: Union[str, None] = "3bc5dbde46c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add column as nullable first so existing rows are not immediately violated.
    op.add_column(
        "organizations",
        sa.Column("type", sa.String(length=20), nullable=True),
    )

    # Step 2: Backfill all existing organizations as COMPANY.
    op.execute("UPDATE organizations SET type = 'COMPANY' WHERE type IS NULL")

    # Step 3: Make the column non-null with a server-side default of COMPANY.
    op.alter_column(
        "organizations",
        "type",
        nullable=False,
        server_default="COMPANY",
    )

    # Step 4: Composite index for efficient personal org lookups (owner_id + type).
    op.create_index(
        "ix_organizations_owner_type",
        "organizations",
        ["owner_id", "type"],
        unique=False,
    )

    # Step 5: Partial unique index — enforces one active PERSONAL org per owner.
    # This is a PostgreSQL-specific feature supported natively by Alembic.
    op.create_index(
        "uq_organizations_personal_owner",
        "organizations",
        ["owner_id"],
        unique=True,
        postgresql_where=sa.text("type = 'PERSONAL'"),
    )


def downgrade() -> None:
    op.drop_index("uq_organizations_personal_owner", table_name="organizations")
    op.drop_index("ix_organizations_owner_type", table_name="organizations")
    op.drop_column("organizations", "type")
