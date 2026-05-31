from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.users.model import User
from app.modules.workspaces.model import (
    Workspace,
    WorkspaceMember,
    WorkspaceMemberStatus,
    WorkspaceRole,
)


# ---------------------------------------------------------------------------
# Workspace queries
# ---------------------------------------------------------------------------

def create_workspace(
    db: Session,
    *,
    organization_id: UUID,
    name: str,
    description: str | None,
    system_instruction: str | None,
    created_by: UUID,
) -> Workspace:
    ws = Workspace(
        organization_id=organization_id,
        name=name,
        description=description,
        system_instruction=system_instruction,
        created_by=created_by,
    )
    db.add(ws)
    db.flush()
    return ws


def get_workspace_by_id(db: Session, workspace_id: UUID) -> Workspace | None:
    return db.get(Workspace, workspace_id)


def get_workspace_by_org_and_name(
    db: Session, organization_id: UUID, name: str
) -> Workspace | None:
    return db.scalar(
        select(Workspace)
        .where(Workspace.organization_id == organization_id)
        .where(Workspace.name == name)
    )


def list_workspaces_for_user(
    db: Session,
    user_id: UUID,
    *,
    organization_id: UUID | None = None,
) -> list[tuple[Workspace, WorkspaceMember]]:
    """Return workspaces the user has an active membership in.

    Optionally scoped to a single organization.
    """
    stmt = (
        select(Workspace, WorkspaceMember)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == user_id)
        .where(WorkspaceMember.status == WorkspaceMemberStatus.ACTIVE.value)
        .where(Workspace.is_active.is_(True))
    )
    if organization_id is not None:
        stmt = stmt.where(Workspace.organization_id == organization_id)
    stmt = stmt.order_by(Workspace.name)
    rows = db.execute(stmt).all()
    return [(row[0], row[1]) for row in rows]


def update_workspace(
    db: Session, workspace: Workspace, **changes: object
) -> Workspace:
    for field, value in changes.items():
        setattr(workspace, field, value)
    db.flush()
    return workspace


# ---------------------------------------------------------------------------
# Workspace member queries
# ---------------------------------------------------------------------------

def create_workspace_member(
    db: Session,
    *,
    workspace_id: UUID,
    user_id: UUID,
    role: WorkspaceRole,
    status: WorkspaceMemberStatus,
) -> WorkspaceMember:
    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user_id,
        role=role.value,
        status=status.value,
    )
    db.add(member)
    db.flush()
    return member


def get_workspace_member(
    db: Session, workspace_id: UUID, user_id: UUID
) -> WorkspaceMember | None:
    return db.scalar(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .where(WorkspaceMember.user_id == user_id)
    )


def get_active_workspace_member(
    db: Session, workspace_id: UUID, user_id: UUID
) -> WorkspaceMember | None:
    return db.scalar(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .where(WorkspaceMember.user_id == user_id)
        .where(WorkspaceMember.status == WorkspaceMemberStatus.ACTIVE.value)
    )


def get_workspace_member_by_id(
    db: Session, member_id: UUID
) -> WorkspaceMember | None:
    return db.get(WorkspaceMember, member_id)


def list_workspace_members_with_users(
    db: Session, workspace_id: UUID
) -> list[tuple[WorkspaceMember, User]]:
    rows = db.execute(
        select(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .where(WorkspaceMember.status != WorkspaceMemberStatus.REMOVED.value)
        .order_by(WorkspaceMember.created_at)
    ).all()
    return [(row[0], row[1]) for row in rows]


def count_active_owners(db: Session, workspace_id: UUID) -> int:
    result = db.scalar(
        select(func.count())
        .select_from(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace_id)
        .where(WorkspaceMember.role == WorkspaceRole.OWNER.value)
        .where(WorkspaceMember.status == WorkspaceMemberStatus.ACTIVE.value)
    )
    return result or 0


def update_workspace_member(
    db: Session, member: WorkspaceMember, **changes: object
) -> WorkspaceMember:
    for field, value in changes.items():
        setattr(member, field, value)
    db.flush()
    return member
