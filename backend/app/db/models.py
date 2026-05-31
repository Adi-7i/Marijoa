"""Central model registry for Alembic autogenerate discovery.

Import every SQLAlchemy model module here so that `Base.metadata` is fully
populated when `alembic/env.py` imports this module.

Keep imports ordered alphabetically by module path as the list grows.
"""

from app.db.base import Base  # noqa: F401 — ensures Base registry is imported
from app.modules.users.model import User  # noqa: F401

__all__ = ["Base", "User"]
