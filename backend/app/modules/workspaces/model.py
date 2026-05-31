from __future__ import annotations

from enum import Enum
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class WorkspaceRole(str, Enum):
    """Role a member holds within a workspace.

    Hierarchy (highest to lowest): OWNER > ADMIN > MANAGER > MEMBER > VIEWER
    """

    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    MEMBER = "MEMBER"
    VIEWER = "VIEWER"


class WorkspaceMemberStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    SUSPENDED = "SUSPENDED"
    REMOVED = "REMOVED"


class Workspace(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Project/team/client-level context area inside an organization.

    system_instruction is used by the AI Gateway to provide workspace-level
    context to the LLM — keep it clean and normalized.
    """

    __tablename__ = "workspaces"

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(160), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    system_instruction: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "name",
            name="uq_workspaces_org_name",
        ),
    )

    def __repr__(self) -> str:
        return f"<Workspace name={self.name!r} org={self.organization_id}>"


class WorkspaceMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Membership record linking a user to a workspace with a role."""

    __tablename__ = "workspace_members"

    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # WorkspaceRole.value stored as string; validated at the schema/service layer
    role: Mapped[str] = mapped_column(String(20), nullable=False)

    # WorkspaceMemberStatus.value stored as string
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "user_id",
            name="uq_workspace_members_ws_user",
        ),
    )

    def __repr__(self) -> str:
        return f"<WorkspaceMember ws={self.workspace_id} user={self.user_id} role={self.role}>"
