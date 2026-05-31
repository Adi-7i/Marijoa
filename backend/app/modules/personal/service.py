"""Personal context service.

Responsible for:
- Idempotent creation of a user's personal organization + workspace (ensure_personal_context).
- Returning the personal context response for the /me/personal-context endpoint.

Design rules:
- ensure_personal_context() flushes but does NOT commit — caller is responsible.
- get_personal_context() commits after ensure so the endpoint gets fresh data.
- Never creates duplicates — idempotent by design.
- Never passes DB sessions or secrets into background jobs.
- No circular imports: does not import from auth.service.
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.audit_logs import service as audit_service
from app.modules.audit_logs.model import AuditAction
from app.modules.organizations import repository as org_repo
from app.modules.organizations.model import (
    OrgMemberStatus,
    OrgRole,
    Organization,
    OrganizationMember,
    OrganizationType,
)
from app.modules.organizations.service import generate_slug
from app.modules.personal.schemas import (
    PersonalContextResponse,
    PersonalOrganizationRead,
    PersonalUserRead,
    PersonalWorkspaceRead,
)
from app.modules.users.model import User
from app.modules.workspaces import repository as ws_repo
from app.modules.workspaces.model import (
    Workspace,
    WorkspaceMember,
    WorkspaceMemberStatus,
    WorkspaceRole,
)

logger = logging.getLogger(__name__)

_PERSONAL_WORKSPACE_NAME = "Personal Chat"
_PERSONAL_WORKSPACE_DESCRIPTION = "Personal AI workspace"


# ---------------------------------------------------------------------------
# Name / slug helpers
# ---------------------------------------------------------------------------

def _build_personal_org_name(user: User) -> str:
    name = (user.full_name or "").strip()
    if name:
        # "James" → "James'", "Aditya" → "Aditya's"
        possessive = f"{name}'" if name.endswith("s") else f"{name}'s"
        return f"{possessive} Personal Workspace"
    return "Personal Workspace"


def _build_personal_slug(db: Session, user: User) -> str:
    """Generate a unique slug for the personal org based on the user's name."""
    base = generate_slug(user.full_name or "personal")
    base = f"{base}-personal"[:120]
    slug = base
    counter = 1
    while org_repo.get_organization_by_slug(db, slug) is not None:
        slug = f"{base}-{counter}"
        counter += 1
    return slug


# ---------------------------------------------------------------------------
# Internal creation helpers (flush only — caller commits)
# ---------------------------------------------------------------------------

def _create_personal_org(db: Session, user: User) -> Organization:
    name = _build_personal_org_name(user)
    slug = _build_personal_slug(db, user)
    org = Organization(
        name=name,
        slug=slug,
        owner_id=user.id,
        type=OrganizationType.PERSONAL.value,
    )
    db.add(org)
    db.flush()

    member = OrganizationMember(
        organization_id=org.id,
        user_id=user.id,
        role=OrgRole.OWNER.value,
        status=OrgMemberStatus.ACTIVE.value,
    )
    db.add(member)
    db.flush()
    return org


def _create_personal_workspace(db: Session, org: Organization, user: User) -> Workspace:
    ws = Workspace(
        organization_id=org.id,
        name=_PERSONAL_WORKSPACE_NAME,
        description=_PERSONAL_WORKSPACE_DESCRIPTION,
        system_instruction=None,
        created_by=user.id,
    )
    db.add(ws)
    db.flush()

    ws_member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=user.id,
        role=WorkspaceRole.OWNER.value,
        status=WorkspaceMemberStatus.ACTIVE.value,
    )
    db.add(ws_member)
    db.flush()
    return ws


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def ensure_personal_context(db: Session, user: User) -> tuple[Organization, Workspace]:
    """Idempotent: ensure the user has a PERSONAL organization and default workspace.

    Flushes all inserts within the caller's active transaction — does NOT commit.
    Safe to call from registration (where the transaction is committed atomically
    together with user creation) and from the personal-context endpoint (which
    commits after calling this function).

    Never creates duplicates regardless of how many times it is called.
    """
    org = org_repo.get_personal_organization_by_owner(db, user.id)

    if org is None:
        org = _create_personal_org(db, user)
        logger.info("Created personal organization for user_id=%s", user.id)
        audit_service.record_event(
            db,
            action=AuditAction.PERSONAL_ORGANIZATION_CREATED,
            entity_type="organization",
            entity_id=org.id,
            user_id=user.id,
            organization_id=org.id,
        )

    ws = ws_repo.get_workspace_by_org_and_name(db, org.id, _PERSONAL_WORKSPACE_NAME)
    if ws is None:
        ws = _create_personal_workspace(db, org, user)
        logger.info("Created personal workspace for user_id=%s org_id=%s", user.id, org.id)
        audit_service.record_event(
            db,
            action=AuditAction.PERSONAL_WORKSPACE_CREATED,
            entity_type="workspace",
            entity_id=ws.id,
            user_id=user.id,
            organization_id=org.id,
        )

    return org, ws


def get_personal_context(db: Session, user: User) -> PersonalContextResponse:
    """Return the personal context for the authenticated user.

    Creates missing personal org/workspace (legacy repair for pre-1.1 users).
    Commits the session to persist any newly created entities.
    """
    org, ws = ensure_personal_context(db, user)
    db.commit()
    db.refresh(org)
    db.refresh(ws)

    return PersonalContextResponse(
        user=PersonalUserRead.model_validate(user),
        personal_organization=PersonalOrganizationRead(
            id=org.id,
            name=org.name,
            type=OrganizationType(org.type),
        ),
        personal_workspace=PersonalWorkspaceRead(
            id=ws.id,
            name=ws.name,
            organization_id=ws.organization_id,
        ),
    )
