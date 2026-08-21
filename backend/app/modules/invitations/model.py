from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class InvitationStatus(str, Enum):
    PENDING_SIGNUP = "PENDING_SIGNUP"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class OrganizationInvitation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Secure invitation to join a COMPANY organization.

    Flow:
    - Admin/Owner creates invitation → status=PENDING_SIGNUP, raw token returned once.
    - Invited user submits name/password via /invitations/accept → status=PENDING_APPROVAL.
    - Admin approves → organization membership activated; status=APPROVED.

    Only the SHA-256 hash of the invite token is persisted. The raw token is
    returned exactly once in the create response and is never stored.
    """

    __tablename__ = "organization_invitations"

    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # OrgRole stored as string (ADMIN/MANAGER/MEMBER/VIEWER). OWNER never persisted here.
    role: Mapped[str] = mapped_column(String(20), nullable=False)

    # SHA-256 hex digest of the raw token. Unique so a leaked hash cannot match multiple invites.
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)

    # InvitationStatus.value
    status: Mapped[str] = mapped_column(String(30), nullable=False, index=True)

    invited_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    accepted_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    approved_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    rejected_by: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    rejected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_organization_invitations_org_email", "organization_id", "email"),
        Index("ix_organization_invitations_org_status", "organization_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<OrganizationInvitation org={self.organization_id} "
            f"email={self.email!r} status={self.status!r}>"
        )
