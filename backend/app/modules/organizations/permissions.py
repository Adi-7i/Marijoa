from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.organizations import repository
from app.modules.organizations.model import OrgMemberStatus, OrgRole, OrganizationMember

# ---------------------------------------------------------------------------
# Role ranking
# ---------------------------------------------------------------------------

_ROLE_RANK: dict[OrgRole, int] = {
    OrgRole.OWNER: 4,
    OrgRole.ADMIN: 3,
    OrgRole.MANAGER: 2,
    OrgRole.MEMBER: 1,
}


def get_role_rank(role: OrgRole) -> int:
    """Return a numeric rank for comparing roles. Higher = more privileged."""
    return _ROLE_RANK.get(role, 0)


def has_role_at_least(role: OrgRole, minimum: OrgRole) -> bool:
    return get_role_rank(role) >= get_role_rank(minimum)


def can_manage_members(role: OrgRole) -> bool:
    """OWNER and ADMIN can add/update members."""
    return has_role_at_least(role, OrgRole.ADMIN)


# ---------------------------------------------------------------------------
# Dependency-style permission helpers
# (return the member record so callers have access to role/status context)
# ---------------------------------------------------------------------------

def require_org_member(
    db: Session, *, user_id: UUID, org_id: UUID
) -> OrganizationMember:
    """Return the active membership or raise ResourceNotFoundError.

    Returns not-found (rather than forbidden) so the org's existence is
    not revealed to non-members.
    """
    member = repository.get_active_member_by_user(db, org_id, user_id)
    if member is None:
        raise ResourceNotFoundError("Organization")
    return member


def require_org_role(
    db: Session,
    *,
    user_id: UUID,
    org_id: UUID,
    minimum_role: OrgRole,
) -> OrganizationMember:
    """Return the membership or raise AuthorizationError if role is insufficient."""
    member = require_org_member(db, user_id=user_id, org_id=org_id)
    if not has_role_at_least(OrgRole(member.role), minimum_role):
        raise AuthorizationError("Insufficient organization permissions")
    return member


def guard_member_update(
    db: Session,
    *,
    acting_member: OrganizationMember,
    target_member: OrganizationMember,
    new_role: OrgRole | None,
    new_status: OrgMemberStatus | None,
) -> None:
    """Validate that the acting member is allowed to apply the given changes.

    Rules:
    - Only OWNER/ADMIN can make any changes.
    - Only an OWNER can promote someone to OWNER.
    - Removing/suspending the last active OWNER is prohibited.
    """
    acting_role = OrgRole(acting_member.role)
    target_role = OrgRole(target_member.role)

    if not can_manage_members(acting_role):
        raise AuthorizationError("Insufficient organization permissions")

    # Only OWNERs can promote to OWNER
    if new_role == OrgRole.OWNER and acting_role != OrgRole.OWNER:
        raise AuthorizationError("Only an organization owner can grant the OWNER role")

    # Prevent a non-OWNER from touching an existing OWNER's role/status
    if target_role == OrgRole.OWNER and acting_role != OrgRole.OWNER:
        raise AuthorizationError("Cannot modify an organization owner's membership")

    # Prevent orphaning the organization by removing/suspending the last active owner
    if target_role == OrgRole.OWNER:
        removing = new_status in (OrgMemberStatus.REMOVED, OrgMemberStatus.SUSPENDED)
        demoting = new_role is not None and new_role != OrgRole.OWNER
        if removing or demoting:
            active_owners = repository.count_active_owners(db, target_member.organization_id)
            if active_owners <= 1:
                raise AuthorizationError(
                    "Cannot remove or demote the last organization owner"
                )
