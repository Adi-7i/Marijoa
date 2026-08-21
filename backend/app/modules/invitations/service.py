"""Organization invitation service.

Implements the secure invite-link flow described in the product spec:

  admin/owner → create invitation (PENDING_SIGNUP, token returned once)
       │
       ▼
  invited user → /invitations/accept with name+password
       │
       ▼  status=PENDING_APPROVAL, user account created (or existing)
  admin → approve / reject
       │
       ▼  on approval, organization membership becomes ACTIVE

Security:
- Raw token never persisted — only SHA-256 hash stored.
- Raw token returned exactly once at create time.
- Token hash never exposed to API consumers.
- Email of the invitation is canonical — public accept endpoint cannot override it.
- OWNER role rejected.
- PERSONAL orgs cannot invite.
- Existing user password never overwritten by accept flow.
"""
from __future__ import annotations

import secrets
from datetime import timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.exceptions import (
    AppException,
    AuthorizationError,
    ConflictError,
    InvalidOperationError,
    ResourceNotFoundError,
)
from app.modules.audit_logs import service as audit_service
from app.modules.auth import security as auth_security
from app.modules.invitations import permissions as inv_permissions
from app.modules.invitations import repository as inv_repo
from app.modules.invitations.model import InvitationStatus, OrganizationInvitation
from app.modules.invitations.schemas import (
    InvitableRole,
    InvitationAcceptRequest,
    InvitationAcceptResponse,
    InvitationCreate,
    InvitationCreateResponse,
    InvitationRead,
    InvitationValidateResponse,
)
from app.modules.organizations import permissions as org_permissions
from app.modules.organizations import repository as org_repo
from app.modules.organizations.model import (
    OrgMemberStatus,
    OrgRole,
    OrganizationType,
)
from app.modules.users import repository as user_repo
from app.modules.users.model import User
from app.modules.users.schemas import UserCreateInternal
from app.utils.datetime_utils import utc_now


# ---------------------------------------------------------------------------
# Audit action constants — local to this module so the audit_logs.AuditAction
# class doesn't need editing for every new domain.
# ---------------------------------------------------------------------------

class InvitationAuditAction:
    ORGANIZATION_INVITATION_CREATED = "ORGANIZATION_INVITATION_CREATED"
    ORGANIZATION_INVITATION_ACCEPTED = "ORGANIZATION_INVITATION_ACCEPTED"
    ORGANIZATION_INVITATION_APPROVED = "ORGANIZATION_INVITATION_APPROVED"
    ORGANIZATION_INVITATION_REJECTED = "ORGANIZATION_INVITATION_REJECTED"
    ORGANIZATION_INVITATION_CANCELLED = "ORGANIZATION_INVITATION_CANCELLED"
    ORGANIZATION_MEMBER_ACTIVATED = "ORGANIZATION_MEMBER_ACTIVATED"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_raw_token() -> str:
    """Generate a cryptographically random URL-safe invite token."""
    return secrets.token_urlsafe(32)


def _build_invite_url(raw_token: str) -> str:
    settings = get_settings()
    base = settings.FRONTEND_APP_URL.rstrip("/")
    return f"{base}/invite/accept/{raw_token}"


def _to_read(inv: OrganizationInvitation) -> InvitationRead:
    return InvitationRead(
        id=inv.id,
        organization_id=inv.organization_id,
        email=inv.email,
        role=InvitableRole(inv.role),
        status=InvitationStatus(inv.status),
        invited_by=inv.invited_by,
        accepted_user_id=inv.accepted_user_id,
        expires_at=inv.expires_at,
        created_at=inv.created_at,
        accepted_at=inv.accepted_at,
        approved_at=inv.approved_at,
        rejected_at=inv.rejected_at,
    )


def _ensure_not_expired(inv: OrganizationInvitation) -> None:
    if inv.expires_at < utc_now():
        # Mark expired lazily so the admin list reflects reality.
        if inv.status == InvitationStatus.PENDING_SIGNUP.value:
            inv.status = InvitationStatus.EXPIRED.value
        raise InvalidOperationError("Invitation has expired")


# ---------------------------------------------------------------------------
# Admin operations
# ---------------------------------------------------------------------------

def create_invitation(
    db: Session,
    *,
    organization_id: UUID,
    data: InvitationCreate,
    acting_user_id: UUID,
) -> InvitationCreateResponse:
    """Create an invitation for a company organization. Returns the raw invite URL once."""
    inv_permissions.require_org_admin_or_owner(
        db, user_id=acting_user_id, organization_id=organization_id
    )

    email = str(data.email).lower()

    # Reject if user already an active member.
    existing_user = user_repo.get_user_by_email(db, email)
    if existing_user is not None:
        existing_member = org_repo.get_active_member_by_user(
            db, organization_id, existing_user.id
        )
        if existing_member is not None:
            raise ConflictError("User is already an active member of this organization")

    # Reject duplicate open invite.
    existing_inv = inv_repo.get_active_pending_signup_for_email(
        db, organization_id, email
    )
    if existing_inv is not None:
        raise ConflictError(
            "An active invitation already exists for this email"
        )

    settings = get_settings()
    raw_token = _generate_raw_token()
    token_hash = auth_security.hash_token(raw_token)
    expires_at = utc_now() + timedelta(days=settings.INVITATION_TOKEN_EXPIRE_DAYS)

    inv = inv_repo.create(
        db,
        organization_id=organization_id,
        email=email,
        role=data.role.value,
        token_hash=token_hash,
        invited_by=acting_user_id,
        expires_at=expires_at,
    )
    db.commit()
    db.refresh(inv)

    audit_service.record_event(
        db,
        action=InvitationAuditAction.ORGANIZATION_INVITATION_CREATED,
        entity_type="organization_invitation",
        entity_id=inv.id,
        user_id=acting_user_id,
        organization_id=organization_id,
        metadata={"email": email, "role": data.role.value},
    )
    db.commit()

    read = _to_read(inv)
    return InvitationCreateResponse(
        **read.model_dump(),
        invite_url=_build_invite_url(raw_token),
    )


def list_invitations(
    db: Session,
    *,
    organization_id: UUID,
    acting_user_id: UUID,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[InvitationRead]:
    inv_permissions.require_org_admin_or_owner(
        db, user_id=acting_user_id, organization_id=organization_id
    )
    rows = inv_repo.list_for_organization(
        db, organization_id, status=status, limit=limit, offset=offset
    )
    return [_to_read(r) for r in rows]


def _get_invitation_in_org(
    db: Session, *, organization_id: UUID, invitation_id: UUID
) -> OrganizationInvitation:
    inv = inv_repo.get_by_id(db, invitation_id)
    if inv is None or inv.organization_id != organization_id:
        raise ResourceNotFoundError("Invitation", invitation_id)
    return inv


def approve_invitation(
    db: Session,
    *,
    organization_id: UUID,
    invitation_id: UUID,
    acting_user_id: UUID,
) -> InvitationRead:
    inv_permissions.require_org_admin_or_owner(
        db, user_id=acting_user_id, organization_id=organization_id
    )
    inv = _get_invitation_in_org(
        db, organization_id=organization_id, invitation_id=invitation_id
    )

    if inv.status != InvitationStatus.PENDING_APPROVAL.value:
        raise InvalidOperationError(
            "Invitation is not awaiting approval"
        )
    if inv.accepted_user_id is None:
        raise InvalidOperationError("Invitation has no accepting user")

    # Activate or create organization membership.
    existing_member = org_repo.get_member_by_user(
        db, organization_id, inv.accepted_user_id
    )
    if existing_member is None:
        org_repo.create_member(
            db,
            organization_id=organization_id,
            user_id=inv.accepted_user_id,
            role=OrgRole(inv.role),
            status=OrgMemberStatus.ACTIVE,
        )
    else:
        org_repo.update_member(
            db,
            existing_member,
            role=inv.role,
            status=OrgMemberStatus.ACTIVE.value,
        )

    now = utc_now()
    inv_repo.update(
        db,
        inv,
        status=InvitationStatus.APPROVED.value,
        approved_by=acting_user_id,
        approved_at=now,
    )
    db.commit()
    db.refresh(inv)

    audit_service.record_event(
        db,
        action=InvitationAuditAction.ORGANIZATION_INVITATION_APPROVED,
        entity_type="organization_invitation",
        entity_id=inv.id,
        user_id=acting_user_id,
        organization_id=organization_id,
        metadata={"email": inv.email, "role": inv.role},
    )
    audit_service.record_event(
        db,
        action=InvitationAuditAction.ORGANIZATION_MEMBER_ACTIVATED,
        entity_type="organization_member",
        entity_id=inv.accepted_user_id,
        user_id=acting_user_id,
        organization_id=organization_id,
        metadata={"email": inv.email, "role": inv.role},
    )
    db.commit()
    return _to_read(inv)


def reject_invitation(
    db: Session,
    *,
    organization_id: UUID,
    invitation_id: UUID,
    acting_user_id: UUID,
) -> InvitationRead:
    inv_permissions.require_org_admin_or_owner(
        db, user_id=acting_user_id, organization_id=organization_id
    )
    inv = _get_invitation_in_org(
        db, organization_id=organization_id, invitation_id=invitation_id
    )

    if inv.status != InvitationStatus.PENDING_APPROVAL.value:
        raise InvalidOperationError("Invitation is not awaiting approval")

    now = utc_now()
    inv_repo.update(
        db,
        inv,
        status=InvitationStatus.REJECTED.value,
        rejected_by=acting_user_id,
        rejected_at=now,
    )
    db.commit()
    db.refresh(inv)

    audit_service.record_event(
        db,
        action=InvitationAuditAction.ORGANIZATION_INVITATION_REJECTED,
        entity_type="organization_invitation",
        entity_id=inv.id,
        user_id=acting_user_id,
        organization_id=organization_id,
        metadata={"email": inv.email},
    )
    db.commit()
    return _to_read(inv)


def cancel_invitation(
    db: Session,
    *,
    organization_id: UUID,
    invitation_id: UUID,
    acting_user_id: UUID,
) -> InvitationRead:
    inv_permissions.require_org_admin_or_owner(
        db, user_id=acting_user_id, organization_id=organization_id
    )
    inv = _get_invitation_in_org(
        db, organization_id=organization_id, invitation_id=invitation_id
    )

    if inv.status != InvitationStatus.PENDING_SIGNUP.value:
        raise InvalidOperationError(
            "Only invitations awaiting signup can be cancelled"
        )

    now = utc_now()
    inv_repo.update(
        db,
        inv,
        status=InvitationStatus.CANCELLED.value,
        cancelled_at=now,
    )
    db.commit()
    db.refresh(inv)

    audit_service.record_event(
        db,
        action=InvitationAuditAction.ORGANIZATION_INVITATION_CANCELLED,
        entity_type="organization_invitation",
        entity_id=inv.id,
        user_id=acting_user_id,
        organization_id=organization_id,
        metadata={"email": inv.email},
    )
    db.commit()
    return _to_read(inv)


# ---------------------------------------------------------------------------
# Public operations
# ---------------------------------------------------------------------------

def _lookup_by_raw_token(db: Session, raw_token: str) -> OrganizationInvitation:
    token_hash = auth_security.hash_token(raw_token)
    inv = inv_repo.get_by_token_hash(db, token_hash)
    if inv is None:
        raise ResourceNotFoundError("Invitation")
    return inv


def validate_invitation(db: Session, raw_token: str) -> InvitationValidateResponse:
    """Public — safe metadata for the accept page. Does NOT mutate state."""
    inv = _lookup_by_raw_token(db, raw_token)

    if inv.status not in (
        InvitationStatus.PENDING_SIGNUP.value,
        InvitationStatus.PENDING_APPROVAL.value,
    ):
        raise InvalidOperationError("Invitation is no longer valid")
    if inv.expires_at < utc_now():
        raise InvalidOperationError("Invitation has expired")

    org = org_repo.get_organization_by_id(db, inv.organization_id)
    if org is None:
        raise ResourceNotFoundError("Organization")

    return InvitationValidateResponse(
        valid=True,
        organization_name=org.name,
        email=inv.email,
        role=InvitableRole(inv.role),
        status=InvitationStatus(inv.status),
        expires_at=inv.expires_at,
    )


# Returned to the public accept endpoint to signal that an existing account
# must log in instead of being created from scratch. The router maps this to
# HTTP 409 with the code EXISTING_USER_LOGIN_REQUIRED so the frontend can
# branch on it cleanly.
EXISTING_USER_CODE = "EXISTING_USER_LOGIN_REQUIRED"


class ExistingUserAcceptError(AppException):
    """Raised when an invited email already has an account.

    The frontend should prompt the user to log in and call the authenticated
    accept-existing endpoint.
    """

    def __init__(self) -> None:
        super().__init__(
            code=EXISTING_USER_CODE,
            message=(
                "This email already has an account. Please login to accept "
                "this invitation."
            ),
            status_code=409,
        )


def accept_invitation(
    db: Session, data: InvitationAcceptRequest
) -> InvitationAcceptResponse:
    """Public — invited user submits name/password and waits for admin approval.

    Email is always taken from the invitation, never the client.
    """
    inv = _lookup_by_raw_token(db, data.token)

    if inv.status != InvitationStatus.PENDING_SIGNUP.value:
        raise InvalidOperationError("Invitation is no longer awaiting signup")
    _ensure_not_expired(inv)

    org = org_repo.get_organization_by_id(db, inv.organization_id)
    if org is None:
        raise ResourceNotFoundError("Organization")

    existing_user = user_repo.get_user_by_email(db, inv.email)

    if existing_user is None:
        # Create a new user account. NEVER overwrite passwords for existing users.
        password_hash = auth_security.hash_password(data.password)
        user = user_repo.create_user(
            db,
            UserCreateInternal(
                full_name=data.full_name,
                email=inv.email,
                password_hash=password_hash,
            ),
        )

        # Personal context — mirror the standard registration onboarding.
        from app.modules.personal.service import ensure_personal_context
        ensure_personal_context(db, user)
        accepted_user_id = user.id
    else:
        # Existing account — DO NOT touch password or full_name. Refuse with
        # a specific error code so the frontend can route the user to login
        # and then call the authenticated accept-existing endpoint.
        raise ExistingUserAcceptError()

    now = utc_now()
    inv_repo.update(
        db,
        inv,
        accepted_user_id=accepted_user_id,
        accepted_at=now,
        status=InvitationStatus.PENDING_APPROVAL.value,
    )
    db.commit()
    db.refresh(inv)

    audit_service.record_event(
        db,
        action=InvitationAuditAction.ORGANIZATION_INVITATION_ACCEPTED,
        entity_type="organization_invitation",
        entity_id=inv.id,
        user_id=accepted_user_id,
        organization_id=inv.organization_id,
        metadata={"email": inv.email},
    )
    db.commit()

    return InvitationAcceptResponse(
        status=InvitationStatus(inv.status),
        organization_name=org.name,
        message=(
            "Your request has been submitted. An organization admin must "
            "approve your access before you can sign in to this organization."
        ),
    )


def accept_invitation_existing_user(
    db: Session, *, raw_token: str, current_user: User
) -> InvitationAcceptResponse:
    """Authenticated user accepts an invitation matching their own email."""
    inv = _lookup_by_raw_token(db, raw_token)

    if inv.status != InvitationStatus.PENDING_SIGNUP.value:
        raise InvalidOperationError("Invitation is no longer awaiting signup")
    _ensure_not_expired(inv)

    if inv.email.lower() != current_user.email.lower():
        raise AuthorizationError(
            "This invitation was sent to a different email address"
        )

    org = org_repo.get_organization_by_id(db, inv.organization_id)
    if org is None:
        raise ResourceNotFoundError("Organization")

    now = utc_now()
    inv_repo.update(
        db,
        inv,
        accepted_user_id=current_user.id,
        accepted_at=now,
        status=InvitationStatus.PENDING_APPROVAL.value,
    )
    db.commit()
    db.refresh(inv)

    audit_service.record_event(
        db,
        action=InvitationAuditAction.ORGANIZATION_INVITATION_ACCEPTED,
        entity_type="organization_invitation",
        entity_id=inv.id,
        user_id=current_user.id,
        organization_id=inv.organization_id,
        metadata={"email": inv.email, "existing_user": True},
    )
    db.commit()

    return InvitationAcceptResponse(
        status=InvitationStatus(inv.status),
        organization_name=org.name,
        message=(
            "Your request has been submitted. An organization admin must "
            "approve your access."
        ),
    )
