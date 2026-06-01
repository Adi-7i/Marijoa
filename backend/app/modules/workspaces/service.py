from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AuthorizationError, ConflictError, ResourceNotFoundError
from app.modules.organizations import permissions as org_permissions
from app.modules.organizations.model import OrgRole
from app.modules.users import repository as user_repo
from app.modules.users.model import User
from app.modules.workspaces import permissions, repository
from app.modules.workspaces.model import (
    Workspace,
    WorkspaceMember,
    WorkspaceMemberStatus,
    WorkspaceRole,
)
from app.modules.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceMemberCreate,
    WorkspaceMemberRead,
    WorkspaceMemberUpdate,
    WorkspaceUpdate,
    WorkspaceWithRoleRead,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_member_read(member: WorkspaceMember, user: User) -> WorkspaceMemberRead:
    return WorkspaceMemberRead(
        id=member.id,
        workspace_id=member.workspace_id,
        user_id=member.user_id,
        role=WorkspaceRole(member.role),
        status=WorkspaceMemberStatus(member.status),
        created_at=member.created_at,
        updated_at=member.updated_at,
        user_full_name=user.full_name,
        user_email=user.email,
        user_avatar_url=user.avatar_url,
    )


def _to_workspace_with_role(
    ws: Workspace, member: WorkspaceMember
) -> WorkspaceWithRoleRead:
    return WorkspaceWithRoleRead(
        id=ws.id,
        organization_id=ws.organization_id,
        name=ws.name,
        description=ws.description,
        system_instruction=ws.system_instruction,
        created_by=ws.created_by,
        is_active=ws.is_active,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        current_user_role=WorkspaceRole(member.role),
    )


# ---------------------------------------------------------------------------
# Workspace operations
# ---------------------------------------------------------------------------

def create_workspace(
    db: Session, data: WorkspaceCreate, creator_id: UUID
) -> Workspace:
    """Create workspace and owner membership atomically.

    Both inserts are flushed in the same transaction and committed together
    so a workspace without an owner can never persist.
    """
    org_member = org_permissions.require_org_member(
        db, user_id=creator_id, org_id=data.organization_id
    )
    if not permissions.can_create_workspace(OrgRole(org_member.role)):
        raise AuthorizationError(
            "Organization OWNER, ADMIN, or MANAGER role is required to create workspaces"
        )

    try:
        ws = repository.create_workspace(
            db,
            organization_id=data.organization_id,
            name=data.name,
            description=data.description,
            system_instruction=data.system_instruction,
            created_by=creator_id,
        )
        repository.create_workspace_member(
            db,
            workspace_id=ws.id,
            user_id=creator_id,
            role=WorkspaceRole.OWNER,
            status=WorkspaceMemberStatus.ACTIVE,
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(
            "A workspace with this name already exists in the organization"
        )

    db.refresh(ws)
    return ws


def get_workspace(
    db: Session, workspace_id: UUID, user_id: UUID
) -> tuple[Workspace, WorkspaceRole]:
    """Return (workspace, user_role) or raise ResourceNotFoundError if no access."""
    member = permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=workspace_id
    )
    ws = repository.get_workspace_by_id(db, workspace_id)
    if ws is None:
        raise ResourceNotFoundError("Workspace", workspace_id)
    return ws, WorkspaceRole(member.role)


def list_workspaces(
    db: Session, user_id: UUID, organization_id: UUID | None = None
) -> list[WorkspaceWithRoleRead]:
    rows = repository.list_workspaces_for_user(db, user_id, organization_id=organization_id)
    return [_to_workspace_with_role(ws, member) for ws, member in rows]


def update_workspace(
    db: Session, workspace_id: UUID, data: WorkspaceUpdate, user_id: UUID
) -> Workspace:
    member = permissions.require_workspace_member(
        db, user_id=user_id, workspace_id=workspace_id
    )
    ws_role = WorkspaceRole(member.role)

    if not permissions.can_manage_workspace(ws_role):
        raise AuthorizationError(
            "Workspace OWNER or ADMIN role is required to update workspace settings"
        )

    ws = repository.get_workspace_by_id(db, workspace_id)
    if ws is None:
        raise ResourceNotFoundError("Workspace", workspace_id)

    changes: dict[str, object] = {}

    if data.name is not None and data.name != ws.name:
        existing = repository.get_workspace_by_org_and_name(
            db, ws.organization_id, data.name
        )
        if existing is not None and existing.id != workspace_id:
            raise ConflictError(
                "A workspace with this name already exists in the organization"
            )
        changes["name"] = data.name

    if data.description is not None:
        changes["description"] = data.description

    if data.system_instruction is not None:
        changes["system_instruction"] = data.system_instruction

    if data.is_active is not None:
        if ws_role != WorkspaceRole.OWNER:
            raise AuthorizationError(
                "Only the workspace OWNER can change workspace active status"
            )
        changes["is_active"] = data.is_active

    if changes:
        repository.update_workspace(db, ws, **changes)
        db.commit()
        db.refresh(ws)

    return ws


def deactivate_workspace(db: Session, workspace_id: UUID, user_id: UUID) -> None:
    """Soft-delete a workspace by setting is_active=False. Requires ADMIN+."""
    permissions.require_workspace_role(
        db, user_id=user_id, workspace_id=workspace_id, minimum_role=WorkspaceRole.ADMIN
    )
    ws = repository.get_workspace_by_id(db, workspace_id)
    if ws is None:
        raise ResourceNotFoundError("Workspace", workspace_id)

    if not ws.is_active:
        return  # Idempotent

    repository.update_workspace(db, ws, is_active=False)
    db.commit()


# ---------------------------------------------------------------------------
# Workspace member operations
# ---------------------------------------------------------------------------

def list_workspace_members(
    db: Session, workspace_id: UUID, user_id: UUID
) -> list[WorkspaceMemberRead]:
    """All active members may view the member list."""
    permissions.require_workspace_member(db, user_id=user_id, workspace_id=workspace_id)
    rows = repository.list_workspace_members_with_users(db, workspace_id)
    return [_to_member_read(m, u) for m, u in rows]


def add_workspace_member(
    db: Session,
    workspace_id: UUID,
    data: WorkspaceMemberCreate,
    acting_user_id: UUID,
) -> WorkspaceMemberRead:
    """Add an existing user to the workspace by email. Requires ADMIN+."""
    permissions.require_workspace_role(
        db, user_id=acting_user_id, workspace_id=workspace_id, minimum_role=WorkspaceRole.ADMIN
    )

    target_user = user_repo.get_user_by_email(db, str(data.email))
    if target_user is None:
        raise ResourceNotFoundError("User with this email")

    existing = repository.get_workspace_member(db, workspace_id, target_user.id)
    if existing is not None and existing.status != WorkspaceMemberStatus.REMOVED.value:
        raise ConflictError("User is already a member of this workspace")

    if existing is not None:
        # Re-activate a previously removed member
        repository.update_workspace_member(
            db, existing, role=data.role.value, status=WorkspaceMemberStatus.ACTIVE.value
        )
        db.commit()
        db.refresh(existing)
        return _to_member_read(existing, target_user)

    member = repository.create_workspace_member(
        db,
        workspace_id=workspace_id,
        user_id=target_user.id,
        role=data.role,
        status=WorkspaceMemberStatus.ACTIVE,
    )
    db.commit()
    db.refresh(member)
    return _to_member_read(member, target_user)


def update_workspace_member(
    db: Session,
    workspace_id: UUID,
    member_id: UUID,
    data: WorkspaceMemberUpdate,
    acting_user_id: UUID,
) -> WorkspaceMemberRead:
    acting_member = permissions.require_workspace_member(
        db, user_id=acting_user_id, workspace_id=workspace_id
    )
    target_member = repository.get_workspace_member_by_id(db, member_id)

    if target_member is None or target_member.workspace_id != workspace_id:
        raise ResourceNotFoundError("Workspace member", member_id)

    permissions.guard_workspace_member_update(
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
        repository.update_workspace_member(db, target_member, **changes)
        db.commit()
        db.refresh(target_member)

    target_user = db.get(User, target_member.user_id)
    return _to_member_read(target_member, target_user)  # type: ignore[arg-type]
