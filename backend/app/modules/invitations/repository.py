from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.invitations.model import InvitationStatus, OrganizationInvitation


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

def get_by_id(db: Session, invitation_id: UUID) -> OrganizationInvitation | None:
    return db.get(OrganizationInvitation, invitation_id)


def get_by_token_hash(db: Session, token_hash: str) -> OrganizationInvitation | None:
    return db.scalar(
        select(OrganizationInvitation).where(
            OrganizationInvitation.token_hash == token_hash
        )
    )


def get_active_pending_signup_for_email(
    db: Session, organization_id: UUID, email: str
) -> OrganizationInvitation | None:
    """Return an open invitation (PENDING_SIGNUP/PENDING_APPROVAL) for this email/org."""
    return db.scalar(
        select(OrganizationInvitation)
        .where(OrganizationInvitation.organization_id == organization_id)
        .where(OrganizationInvitation.email == email.lower())
        .where(
            OrganizationInvitation.status.in_(
                [
                    InvitationStatus.PENDING_SIGNUP.value,
                    InvitationStatus.PENDING_APPROVAL.value,
                ]
            )
        )
    )


def list_for_organization(
    db: Session,
    organization_id: UUID,
    *,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[OrganizationInvitation]:
    stmt = (
        select(OrganizationInvitation)
        .where(OrganizationInvitation.organization_id == organization_id)
        .order_by(OrganizationInvitation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status is not None:
        stmt = stmt.where(OrganizationInvitation.status == status)
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------

def create(
    db: Session,
    *,
    organization_id: UUID,
    email: str,
    role: str,
    token_hash: str,
    invited_by: UUID,
    expires_at: datetime,
) -> OrganizationInvitation:
    inv = OrganizationInvitation(
        organization_id=organization_id,
        email=email.lower(),
        role=role,
        token_hash=token_hash,
        status=InvitationStatus.PENDING_SIGNUP.value,
        invited_by=invited_by,
        expires_at=expires_at,
    )
    db.add(inv)
    db.flush()
    return inv


def update(
    db: Session, inv: OrganizationInvitation, **changes: object
) -> OrganizationInvitation:
    for field, value in changes.items():
        setattr(inv, field, value)
    db.flush()
    return inv
