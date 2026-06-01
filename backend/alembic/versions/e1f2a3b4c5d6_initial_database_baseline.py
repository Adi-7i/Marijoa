"""initial_database_baseline

Establishes the Alembic revision chain. No tables are created here —
business tables will be added in subsequent migrations as modules are built.

Revision ID: e1f2a3b4c5d6
Revises:
Create Date: 2026-05-31 00:00:00.000000

"""
from __future__ import annotations

from typing import Sequence, Union

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
