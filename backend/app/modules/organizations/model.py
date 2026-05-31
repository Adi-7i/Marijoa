from __future__ import annotations

from enum import Enum
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class OrgRole(str, Enum):
    """Role a member holds within an organization.

    Hierarchy (highest to lowest): OWNER > ADMIN > MANAGER > MEMBER
    """

    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    MEMBER = "MEMBER"


class OrgMemberStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    SUSPENDED = "SUSPENDED"
    REMOVED = "REMOVED"


class Organization(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Top-level tenant boundary. Every workspace/chat belongs to an organization."""

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(160), nullable=False)

    slug: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
        unique=True,  # backed by a unique index in PostgreSQL
    )

    owner_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    def __repr__(self) -> str:
        return f"<Organization slug={self.slug!r} name={self.name!r}>"


class OrganizationMember(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Membership record linking a user to an organization with a role."""

    __tablename__ = "organization_members"

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # OrgRole.value stored as string; validated at the schema/service layer
    role: Mapped[str] = mapped_column(String(20), nullable=False)

    # OrgMemberStatus.value stored as string
    status: Mapped[str] = mapped_column(String(20), nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "user_id",
            name="uq_organization_members_org_user",
        ),
    )

    def __repr__(self) -> str:
        return f"<OrgMember org={self.organization_id} user={self.user_id} role={self.role}>"
