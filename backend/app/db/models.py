"""Central model registry for Alembic autogenerate discovery.

Import every SQLAlchemy model module here so that `Base.metadata` is fully
populated when `alembic/env.py` imports this module.

Keep imports ordered alphabetically by module path as the list grows.
"""

from app.db.base import Base  # noqa: F401
from app.modules.artifacts.model import Artifact  # noqa: F401
from app.modules.audit_logs.model import AuditLog  # noqa: F401
from app.modules.auth.model import RefreshToken  # noqa: F401
from app.modules.chats.model import Chat  # noqa: F401
from app.modules.files.model import File  # noqa: F401
from app.modules.invitations.model import OrganizationInvitation  # noqa: F401
from app.modules.messages.model import Message  # noqa: F401
from app.modules.organizations.model import Organization, OrganizationMember  # noqa: F401
from app.modules.users.model import User  # noqa: F401
from app.modules.workspaces.model import Workspace, WorkspaceMember  # noqa: F401

__all__ = [
    "Artifact",
    "AuditLog",
    "Base",
    "Chat",
    "File",
    "Message",
    "Organization",
    "OrganizationInvitation",
    "OrganizationMember",
    "RefreshToken",
    "User",
    "Workspace",
    "WorkspaceMember",
]
