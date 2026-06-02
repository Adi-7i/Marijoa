from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.organizations import permissions as org_permissions
from app.modules.organizations import repository as org_repo
from app.modules.organizations.model import (
    OrganizationType,
    OrgRole,
    OrganizationMember,
)


def require_org_admin_or_owner(
    db: Session, *, user_id: UUID, organization_id: UUID
) -> OrganizationMember:
    """Return the membership if the user is OWNER/ADMIN of a COMPANY org.

    Personal organizations cannot create or manage invitations.
    """
    org = org_repo.get_organization_by_id(db, organization_id)
    if org is None:
        raise ResourceNotFoundError("Organization", organization_id)

    if org.type == OrganizationType.PERSONAL.value:
        raise AuthorizationError(
            "Personal organizations cannot invite members"
        )

    return org_permissions.require_org_role(
        db,
        user_id=user_id,
        org_id=organization_id,
        minimum_role=OrgRole.ADMIN,
    )
