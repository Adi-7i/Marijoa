"""Central model registry for Alembic autogenerate discovery.

Import every SQLAlchemy model module here so that `Base.metadata` is fully
populated when `alembic/env.py` imports this module.

Usage pattern (add as modules are created):

    from app.modules.user.models import User          # noqa: F401
    from app.modules.organization.models import Org   # noqa: F401
    from app.modules.workspace.models import Workspace  # noqa: F401
"""

from app.db.base import Base  # noqa: F401 — ensures Base registry is imported

__all__ = ["Base"]
