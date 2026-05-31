from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.organizations import repository as org_repo
from app.modules.organizations.model import OrgRole, OrganizationMember

_ADMIN_ROLES: frozenset[OrgRole] = frozenset({OrgRole.OWNER, OrgRole.ADMIN})


def require_org_admin_or_owner(
    db: Session,
    *,
    user_id: UUID,
    organization_id: UUID,
) -> OrganizationMember:
    """Verify the caller is an active OWNER or ADMIN of the organization.

    Returns not-found rather than forbidden when the user has no membership,
    so the organization's existence is not revealed to non-members.
    """
    member = org_repo.get_active_member_by_user(db, organization_id, user_id)
    if member is None:
        raise ResourceNotFoundError("Organization")

    if OrgRole(member.role) not in _ADMIN_ROLES:
        raise AuthorizationError("Organization Owner or Admin role required")

    return member
