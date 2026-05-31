from __future__ import annotations

import re
from unicodedata import normalize
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.modules.organizations import permissions, repository
from app.modules.organizations.model import (
    OrgMemberStatus,
    OrgRole,
    Organization,
    OrganizationMember,
)
from app.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationMemberCreate,
    OrganizationMemberRead,
    OrganizationMemberUpdate,
    OrganizationWithRoleRead,
)
from app.modules.users import repository as user_repo
from app.modules.users.model import User


# ---------------------------------------------------------------------------
# Slug utilities
# ---------------------------------------------------------------------------

def generate_slug(name: str) -> str:
    """Derive a URL-safe lowercase slug from an organization name."""
    # Normalize unicode to ASCII
    slug = normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    slug = slug.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = slug.strip("-")
    return slug[:120] or "org"


def _ensure_unique_slug(db: Session, base_slug: str) -> str:
    """Return base_slug if unused, otherwise append incrementing suffix."""
    slug = base_slug
    counter = 1
    while repository.get_organization_by_slug(db, slug) is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


# ---------------------------------------------------------------------------
# Organization operations
# ---------------------------------------------------------------------------

def create_organization(
    db: Session, data: OrganizationCreate, owner_id: UUID
) -> Organization:
    """Create organization and owner membership atomically.

    Both inserts are flushed within the same transaction and committed together,
    so a partial state (org without owner) can never persist.
    """
    slug = data.slug if data.slug else generate_slug(data.name)
    slug = _ensure_unique_slug(db, slug)

    try:
        org = repository.create_organization(db, name=data.name, slug=slug, owner_id=owner_id)
        repository.create_member(
            db,
            organization_id=org.id,
            user_id=owner_id,
            role=OrgRole.OWNER,
            status=OrgMemberStatus.ACTIVE,
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError("Organization slug already exists; try a different name")

    db.refresh(org)
    return org


def get_organization(db: Session, org_id: UUID, user_id: UUID) -> Organization:
    """Return the organization if the user is an active member."""
    permissions.require_org_member(db, user_id=user_id, org_id=org_id)
    org = repository.get_organization_by_id(db, org_id)
    if org is None:
        raise ResourceNotFoundError("Organization", org_id)
    return org


def list_my_organizations(
    db: Session, user_id: UUID
) -> list[OrganizationWithRoleRead]:
    rows = repository.get_user_organizations(db, user_id)
    result: list[OrganizationWithRoleRead] = []
    for org, member in rows:
        result.append(
            OrganizationWithRoleRead(
                **OrganizationWithRoleRead.model_validate(org).model_dump(),
                current_user_role=OrgRole(member.role),
            )
        )
    return result


# ---------------------------------------------------------------------------
# Member operations
# ---------------------------------------------------------------------------

def _to_member_read(member: OrganizationMember, user: User) -> OrganizationMemberRead:
    return OrganizationMemberRead(
        id=member.id,
        organization_id=member.organization_id,
        user_id=member.user_id,
        role=OrgRole(member.role),
        status=OrgMemberStatus(member.status),
        created_at=member.created_at,
        updated_at=member.updated_at,
        user_full_name=user.full_name,
        user_email=user.email,
        user_avatar_url=user.avatar_url,
    )


def list_members(
    db: Session, org_id: UUID, requesting_user_id: UUID
) -> list[OrganizationMemberRead]:
    """All active members may view the member list."""
    permissions.require_org_member(db, user_id=requesting_user_id, org_id=org_id)
    rows = repository.list_members_with_users(db, org_id)
    return [_to_member_read(m, u) for m, u in rows]


def add_member(
    db: Session,
    org_id: UUID,
    data: OrganizationMemberCreate,
    acting_user_id: UUID,
) -> OrganizationMemberRead:
    """Add an existing user to the organization by email. Requires ADMIN+."""
    permissions.require_org_role(db, user_id=acting_user_id, org_id=org_id, minimum_role=OrgRole.ADMIN)

    target_user = user_repo.get_user_by_email(db, str(data.email))
    if target_user is None:
        raise ResourceNotFoundError("User with this email")

    existing = repository.get_member_by_user(db, org_id, target_user.id)
    if existing is not None and existing.status != OrgMemberStatus.REMOVED.value:
        raise ConflictError("User is already a member of this organization")

    if existing is not None:
        # Re-activate a previously removed member
        repository.update_member(
            db, existing, role=data.role.value, status=OrgMemberStatus.ACTIVE.value
        )
        db.commit()
        db.refresh(existing)
        return _to_member_read(existing, target_user)

    member = repository.create_member(
        db,
        organization_id=org_id,
        user_id=target_user.id,
        role=data.role,
        status=OrgMemberStatus.ACTIVE,
    )
    db.commit()
    db.refresh(member)
    return _to_member_read(member, target_user)


def update_member(
    db: Session,
    org_id: UUID,
    member_id: UUID,
    data: OrganizationMemberUpdate,
    acting_user_id: UUID,
) -> OrganizationMemberRead:
    acting_member = permissions.require_org_member(db, user_id=acting_user_id, org_id=org_id)
    target_member = repository.get_member_by_id(db, member_id)

    if target_member is None or target_member.organization_id != org_id:
        raise ResourceNotFoundError("Organization member", member_id)

    permissions.guard_member_update(
        db,
        acting_member=acting_member,
        target_member=target_member,
        new_role=data.role,
        new_status=data.status,
    )

    changes: dict[str, str] = {}
    if data.role is not None:
        changes["role"] = data.role.value
    if data.status is not None:
        changes["status"] = data.status.value

    if changes:
        repository.update_member(db, target_member, **changes)
        db.commit()
        db.refresh(target_member)

    target_user = db.get(User, target_member.user_id)
    return _to_member_read(target_member, target_user)  # type: ignore[arg-type]
