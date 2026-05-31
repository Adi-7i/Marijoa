from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.organizations.model import (
    OrgMemberStatus,
    OrgRole,
    Organization,
    OrganizationMember,
)
from app.modules.users.model import User


# ---------------------------------------------------------------------------
# Organization queries
# ---------------------------------------------------------------------------

def create_organization(
    db: Session,
    *,
    name: str,
    slug: str,
    owner_id: UUID,
) -> Organization:
    org = Organization(name=name, slug=slug, owner_id=owner_id)
    db.add(org)
    db.flush()
    return org


def get_organization_by_id(db: Session, org_id: UUID) -> Organization | None:
    return db.get(Organization, org_id)


def get_organization_by_slug(db: Session, slug: str) -> Organization | None:
    return db.scalar(select(Organization).where(Organization.slug == slug))


def get_user_organizations(
    db: Session, user_id: UUID
) -> list[tuple[Organization, OrganizationMember]]:
    """Return all active organizations the user is an active member of."""
    rows = db.execute(
        select(Organization, OrganizationMember)
        .join(
            OrganizationMember,
            OrganizationMember.organization_id == Organization.id,
        )
        .where(OrganizationMember.user_id == user_id)
        .where(OrganizationMember.status == OrgMemberStatus.ACTIVE.value)
        .where(Organization.is_active.is_(True))
        .order_by(Organization.name)
    ).all()
    return [(row[0], row[1]) for row in rows]


# ---------------------------------------------------------------------------
# Member queries
# ---------------------------------------------------------------------------

def create_member(
    db: Session,
    *,
    organization_id: UUID,
    user_id: UUID,
    role: OrgRole,
    status: OrgMemberStatus,
) -> OrganizationMember:
    member = OrganizationMember(
        organization_id=organization_id,
        user_id=user_id,
        role=role.value,
        status=status.value,
    )
    db.add(member)
    db.flush()
    return member


def get_member_by_id(db: Session, member_id: UUID) -> OrganizationMember | None:
    return db.get(OrganizationMember, member_id)


def get_member_by_user(
    db: Session, org_id: UUID, user_id: UUID
) -> OrganizationMember | None:
    return db.scalar(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == org_id)
        .where(OrganizationMember.user_id == user_id)
    )


def get_active_member_by_user(
    db: Session, org_id: UUID, user_id: UUID
) -> OrganizationMember | None:
    return db.scalar(
        select(OrganizationMember)
        .where(OrganizationMember.organization_id == org_id)
        .where(OrganizationMember.user_id == user_id)
        .where(OrganizationMember.status == OrgMemberStatus.ACTIVE.value)
    )


def list_members_with_users(
    db: Session, org_id: UUID
) -> list[tuple[OrganizationMember, User]]:
    rows = db.execute(
        select(OrganizationMember, User)
        .join(User, OrganizationMember.user_id == User.id)
        .where(OrganizationMember.organization_id == org_id)
        .where(OrganizationMember.status != OrgMemberStatus.REMOVED.value)
        .order_by(OrganizationMember.created_at)
    ).all()
    return [(row[0], row[1]) for row in rows]


def count_active_owners(db: Session, org_id: UUID) -> int:
    result = db.scalar(
        select(func.count())
        .select_from(OrganizationMember)
        .where(OrganizationMember.organization_id == org_id)
        .where(OrganizationMember.role == OrgRole.OWNER.value)
        .where(OrganizationMember.status == OrgMemberStatus.ACTIVE.value)
    )
    return result or 0


def update_member(db: Session, member: OrganizationMember, **changes: object) -> OrganizationMember:
    for field, value in changes.items():
        setattr(member, field, value)
    db.flush()
    return member
