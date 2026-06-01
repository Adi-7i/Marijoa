from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.organizations import permissions as org_permissions
from app.modules.organizations.model import OrgRole
from app.modules.workspaces import repository
from app.modules.workspaces.model import WorkspaceMember, WorkspaceMemberStatus, WorkspaceRole

# ---------------------------------------------------------------------------
# Role ranking
# ---------------------------------------------------------------------------

_ROLE_RANK: dict[WorkspaceRole, int] = {
    WorkspaceRole.OWNER: 5,
    WorkspaceRole.ADMIN: 4,
    WorkspaceRole.MANAGER: 3,
    WorkspaceRole.MEMBER: 2,
    WorkspaceRole.VIEWER: 1,
}


def get_role_rank(role: WorkspaceRole) -> int:
    """Return a numeric rank for comparing workspace roles. Higher = more privileged."""
    return _ROLE_RANK.get(role, 0)


def has_role_at_least(role: WorkspaceRole, minimum: WorkspaceRole) -> bool:
    return get_role_rank(role) >= get_role_rank(minimum)


def can_create_workspace(org_role: OrgRole) -> bool:
    """OWNER, ADMIN, and MANAGER can create workspaces. MEMBER cannot.

    This is the enterprise-safe default — workspace creation is a privileged
    operation. MEMBER access can be relaxed via a future org-level setting.
    """
    return org_permissions.has_role_at_least(org_role, OrgRole.MANAGER)


def can_manage_workspace(ws_role: WorkspaceRole) -> bool:
    """OWNER and ADMIN can update workspace settings and member list."""
    return has_role_at_least(ws_role, WorkspaceRole.ADMIN)


# ---------------------------------------------------------------------------
# Dependency-style permission helpers
# ---------------------------------------------------------------------------

def require_workspace_member(
    db: Session, *, user_id: UUID, workspace_id: UUID
) -> WorkspaceMember:
    """Return the active membership or raise ResourceNotFoundError.

    Returns not-found (not 403) so the workspace's existence is not
    revealed to non-members — consistent with org permission policy.
    """
    member = repository.get_active_workspace_member(db, workspace_id, user_id)
    if member is None:
        raise ResourceNotFoundError("Workspace")
    return member


def require_workspace_role(
    db: Session,
    *,
    user_id: UUID,
    workspace_id: UUID,
    minimum_role: WorkspaceRole,
) -> WorkspaceMember:
    """Return the membership or raise AuthorizationError if role is insufficient."""
    member = require_workspace_member(db, user_id=user_id, workspace_id=workspace_id)
    if not has_role_at_least(WorkspaceRole(member.role), minimum_role):
        raise AuthorizationError("Insufficient workspace permissions")
    return member


def guard_workspace_member_update(
    db: Session,
    *,
    acting_member: WorkspaceMember,
    target_member: WorkspaceMember,
    new_role: WorkspaceRole | None,
    new_status: WorkspaceMemberStatus | None,
) -> None:
    """Validate that the acting member may apply the given changes to target_member.

    Rules:
    - Only OWNER/ADMIN can make any changes.
    - Only OWNER can promote someone to OWNER.
    - Only OWNER can modify an existing OWNER's membership.
    - Removing/suspending/demoting the last active OWNER is prohibited.
    """
    acting_role = WorkspaceRole(acting_member.role)
    target_role = WorkspaceRole(target_member.role)

    if not can_manage_workspace(acting_role):
        raise AuthorizationError("Insufficient workspace permissions")

    if new_role == WorkspaceRole.OWNER and acting_role != WorkspaceRole.OWNER:
        raise AuthorizationError("Only a workspace owner can grant the OWNER role")

    if target_role == WorkspaceRole.OWNER and acting_role != WorkspaceRole.OWNER:
        raise AuthorizationError("Cannot modify a workspace owner's membership")

    if target_role == WorkspaceRole.OWNER:
        removing = new_status in (WorkspaceMemberStatus.REMOVED, WorkspaceMemberStatus.SUSPENDED)
        demoting = new_role is not None and new_role != WorkspaceRole.OWNER
        if removing or demoting:
            active_owners = repository.count_active_owners(db, target_member.workspace_id)
            if active_owners <= 1:
                raise AuthorizationError(
                    "Cannot remove or demote the last workspace owner"
                )
