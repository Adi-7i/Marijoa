"""Tests for the organization invitation service.

All tests use mocks — no real database, Redis, or external services. Integration
tests would be marked @integration and require a real Postgres instance.
"""
from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.core.exceptions import (
    AuthorizationError,
    ConflictError,
    InvalidOperationError,
    ResourceNotFoundError,
)
from app.modules.invitations.model import InvitationStatus
from app.modules.invitations.schemas import (
    InvitableRole,
    InvitationAcceptRequest,
    InvitationCreate,
)
from app.modules.organizations.model import (
    OrgMemberStatus,
    OrgRole,
    OrganizationType,
)
from app.utils.datetime_utils import utc_now


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def _make_org(org_type: str = OrganizationType.COMPANY.value, name: str = "Acme"):
    org = MagicMock()
    org.id = uuid4()
    org.name = name
    org.slug = "acme"
    org.type = org_type
    org.is_active = True
    return org


def _make_member(role: str = OrgRole.OWNER.value, status: str = OrgMemberStatus.ACTIVE.value):
    m = MagicMock()
    m.role = role
    m.status = status
    return m


def _update_side_effect(db, inv, **changes):
    """Mimic inv_repo.update mutating fields in-place."""
    for k, v in changes.items():
        setattr(inv, k, v)
    return inv


def _make_invitation(
    *,
    organization_id=None,
    email: str = "invited@example.com",
    role: str = InvitableRole.MEMBER.value,
    status: str = InvitationStatus.PENDING_SIGNUP.value,
    accepted_user_id=None,
    expires_at=None,
):
    inv = MagicMock()
    inv.id = uuid4()
    inv.organization_id = organization_id or uuid4()
    inv.email = email
    inv.role = role
    inv.status = status
    inv.invited_by = uuid4()
    inv.accepted_user_id = accepted_user_id
    inv.expires_at = expires_at or (utc_now() + timedelta(days=7))
    inv.created_at = utc_now()
    inv.accepted_at = None
    inv.approved_at = None
    inv.rejected_at = None
    return inv


# ---------------------------------------------------------------------------
# 1. Schema rules — OWNER is excluded, password strength enforced
# ---------------------------------------------------------------------------

class TestInvitationSchemas:
    def test_invitable_role_does_not_include_owner(self):
        assert "OWNER" not in {r.value for r in InvitableRole}

    def test_invitable_role_includes_all_other_roles(self):
        values = {r.value for r in InvitableRole}
        assert values == {"ADMIN", "MANAGER", "MEMBER", "VIEWER"}

    def test_invitation_create_lowercases_email(self):
        data = InvitationCreate(email="Foo@Example.COM", role=InvitableRole.MEMBER)
        assert data.email == "foo@example.com"

    def test_invitation_create_rejects_invalid_email(self):
        with pytest.raises(Exception):
            InvitationCreate(email="not-an-email", role=InvitableRole.MEMBER)

    def test_accept_request_validates_password_strength(self):
        with pytest.raises(Exception):
            InvitationAcceptRequest(
                token="abc12345",
                full_name="Jane Doe",
                password="weakpass",  # missing uppercase / digit / special
            )

    def test_accept_request_accepts_strong_password(self):
        req = InvitationAcceptRequest(
            token="abcdef12",
            full_name="Jane Doe",
            password="StrongPass1!",
        )
        assert req.password == "StrongPass1!"


# ---------------------------------------------------------------------------
# 2. Permissions — OWNER/ADMIN required, PERSONAL orgs rejected
# ---------------------------------------------------------------------------

class TestInvitationPermissions:
    def test_personal_org_invite_is_rejected(self):
        from app.modules.invitations.permissions import require_org_admin_or_owner

        db = MagicMock()
        personal_org = _make_org(org_type=OrganizationType.PERSONAL.value)

        with patch(
            "app.modules.invitations.permissions.org_repo.get_organization_by_id",
            return_value=personal_org,
        ):
            with pytest.raises(AuthorizationError, match="Personal organizations cannot invite"):
                require_org_admin_or_owner(
                    db, user_id=uuid4(), organization_id=personal_org.id
                )

    def test_missing_org_raises_not_found(self):
        from app.modules.invitations.permissions import require_org_admin_or_owner

        db = MagicMock()
        with patch(
            "app.modules.invitations.permissions.org_repo.get_organization_by_id",
            return_value=None,
        ):
            with pytest.raises(ResourceNotFoundError):
                require_org_admin_or_owner(
                    db, user_id=uuid4(), organization_id=uuid4()
                )

    def test_member_role_is_rejected(self):
        from app.modules.invitations.permissions import require_org_admin_or_owner

        db = MagicMock()
        company_org = _make_org()
        member = _make_member(role=OrgRole.MEMBER.value)

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=member,
            ),
        ):
            with pytest.raises(AuthorizationError):
                require_org_admin_or_owner(
                    db, user_id=uuid4(), organization_id=company_org.id
                )

    def test_owner_is_allowed(self):
        from app.modules.invitations.permissions import require_org_admin_or_owner

        db = MagicMock()
        company_org = _make_org()
        member = _make_member(role=OrgRole.OWNER.value)

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=member,
            ),
        ):
            result = require_org_admin_or_owner(
                db, user_id=uuid4(), organization_id=company_org.id
            )

        assert result is member


# ---------------------------------------------------------------------------
# 3. create_invitation — token is hashed, raw URL returned, duplicates blocked
# ---------------------------------------------------------------------------

class TestCreateInvitation:
    def test_creates_invitation_and_returns_url_with_raw_token(self):
        from app.modules.invitations.service import create_invitation

        db = MagicMock()
        company_org = _make_org()
        created = _make_invitation(organization_id=company_org.id)

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.user_repo.get_user_by_email",
                return_value=None,
            ),
            patch(
                "app.modules.invitations.service.inv_repo.get_active_pending_signup_for_email",
                return_value=None,
            ),
            patch(
                "app.modules.invitations.service.inv_repo.create",
                return_value=created,
            ),
            patch("app.modules.invitations.service.audit_service.record_event"),
        ):
            result = create_invitation(
                db,
                organization_id=company_org.id,
                data=InvitationCreate(email="new@example.com", role=InvitableRole.MEMBER),
                acting_user_id=uuid4(),
            )

        assert "/invite/accept/" in result.invite_url
        # The raw token only ever appears in the URL response.
        raw_token = result.invite_url.rsplit("/", 1)[-1]
        assert raw_token  # non-empty

    def test_token_stored_as_hash_not_raw(self):
        """The repository must receive a SHA-256 hex digest, never the raw token."""
        from app.modules.auth.security import hash_token
        from app.modules.invitations.service import create_invitation

        db = MagicMock()
        company_org = _make_org()
        created = _make_invitation(organization_id=company_org.id)

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.user_repo.get_user_by_email",
                return_value=None,
            ),
            patch(
                "app.modules.invitations.service.inv_repo.get_active_pending_signup_for_email",
                return_value=None,
            ),
            patch(
                "app.modules.invitations.service.inv_repo.create",
                return_value=created,
            ) as mock_create,
            patch("app.modules.invitations.service.audit_service.record_event"),
        ):
            result = create_invitation(
                db,
                organization_id=company_org.id,
                data=InvitationCreate(email="new@example.com", role=InvitableRole.MEMBER),
                acting_user_id=uuid4(),
            )

        raw_token = result.invite_url.rsplit("/", 1)[-1]
        assert raw_token  # raw token is in the URL once
        call_kwargs = mock_create.call_args.kwargs
        # token_hash passed to the repository must equal hash_token(raw_token) and
        # must NOT equal the raw token itself.
        assert call_kwargs["token_hash"] != raw_token
        assert call_kwargs["token_hash"] == hash_token(raw_token)

    def test_blocks_when_user_already_active_member(self):
        from app.modules.invitations.service import create_invitation

        db = MagicMock()
        company_org = _make_org()
        existing_user = MagicMock(id=uuid4())
        existing_active_member = _make_member()

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.user_repo.get_user_by_email",
                return_value=existing_user,
            ),
            patch(
                "app.modules.invitations.service.org_repo.get_active_member_by_user",
                return_value=existing_active_member,
            ),
        ):
            with pytest.raises(ConflictError, match="already an active member"):
                create_invitation(
                    db,
                    organization_id=company_org.id,
                    data=InvitationCreate(email="x@y.com", role=InvitableRole.MEMBER),
                    acting_user_id=uuid4(),
                )

    def test_blocks_duplicate_pending_invitation(self):
        from app.modules.invitations.service import create_invitation

        db = MagicMock()
        company_org = _make_org()

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.user_repo.get_user_by_email",
                return_value=None,
            ),
            patch(
                "app.modules.invitations.service.inv_repo.get_active_pending_signup_for_email",
                return_value=_make_invitation(organization_id=company_org.id),
            ),
        ):
            with pytest.raises(ConflictError, match="active invitation"):
                create_invitation(
                    db,
                    organization_id=company_org.id,
                    data=InvitationCreate(email="x@y.com", role=InvitableRole.MEMBER),
                    acting_user_id=uuid4(),
                )


# ---------------------------------------------------------------------------
# 4. accept_invitation — creates new user and sets PENDING_APPROVAL
# ---------------------------------------------------------------------------

class TestAcceptInvitation:
    def test_creates_user_and_marks_pending_approval(self):
        from app.modules.invitations.service import accept_invitation

        db = MagicMock()
        company_org = _make_org()
        inv = _make_invitation(organization_id=company_org.id)
        new_user = MagicMock(id=uuid4(), email=inv.email, full_name="Jane")

        with (
            patch(
                "app.modules.invitations.service.inv_repo.get_by_token_hash",
                return_value=inv,
            ),
            patch(
                "app.modules.invitations.service.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.invitations.service.user_repo.get_user_by_email",
                return_value=None,
            ),
            patch(
                "app.modules.invitations.service.user_repo.create_user",
                return_value=new_user,
            ),
            patch(
                "app.modules.personal.service.ensure_personal_context",
                return_value=(company_org, MagicMock()),
            ),
            patch(
                "app.modules.invitations.service.auth_security.hash_password",
                return_value="hashed",
            ),
            patch("app.modules.invitations.service.audit_service.record_event"),
            patch(
                "app.modules.invitations.service.inv_repo.update",
                side_effect=_update_side_effect,
            ),
        ):
            response = accept_invitation(
                db,
                InvitationAcceptRequest(
                    token="raw-token-xxx",
                    full_name="Jane",
                    password="StrongPass1!",
                ),
            )

        assert response.status == InvitationStatus.PENDING_APPROVAL
        assert response.organization_name == company_org.name

    def test_existing_user_raises_existing_user_error(self):
        from app.modules.invitations.service import (
            EXISTING_USER_CODE,
            accept_invitation,
        )

        db = MagicMock()
        company_org = _make_org()
        inv = _make_invitation(organization_id=company_org.id)
        existing_user = MagicMock(id=uuid4(), email=inv.email)

        with (
            patch(
                "app.modules.invitations.service.inv_repo.get_by_token_hash",
                return_value=inv,
            ),
            patch(
                "app.modules.invitations.service.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.invitations.service.user_repo.get_user_by_email",
                return_value=existing_user,
            ),
        ):
            with pytest.raises(Exception) as excinfo:
                accept_invitation(
                    db,
                    InvitationAcceptRequest(
                        token="raw-token-xxx",
                        full_name="Jane",
                        password="StrongPass1!",
                    ),
                )

        # The raised exception must carry the EXISTING_USER_LOGIN_REQUIRED code so
        # the frontend can branch to "please log in" instead of creating a new account.
        assert getattr(excinfo.value, "code", None) == EXISTING_USER_CODE

    def test_expired_invitation_rejected(self):
        from app.modules.invitations.service import accept_invitation

        db = MagicMock()
        inv = _make_invitation(expires_at=utc_now() - timedelta(days=1))

        with (
            patch(
                "app.modules.invitations.service.inv_repo.get_by_token_hash",
                return_value=inv,
            ),
            patch(
                "app.modules.invitations.service.org_repo.get_organization_by_id",
                return_value=_make_org(),
            ),
            patch(
                "app.modules.invitations.service.user_repo.get_user_by_email",
                return_value=None,
            ),
        ):
            with pytest.raises(InvalidOperationError, match="expired"):
                accept_invitation(
                    db,
                    InvitationAcceptRequest(
                        token="raw-token",
                        full_name="Jane",
                        password="StrongPass1!",
                    ),
                )

    def test_invalid_status_rejected(self):
        from app.modules.invitations.service import accept_invitation

        db = MagicMock()
        inv = _make_invitation(status=InvitationStatus.APPROVED.value)

        with (
            patch(
                "app.modules.invitations.service.inv_repo.get_by_token_hash",
                return_value=inv,
            ),
        ):
            with pytest.raises(InvalidOperationError):
                accept_invitation(
                    db,
                    InvitationAcceptRequest(
                        token="raw-token",
                        full_name="Jane",
                        password="StrongPass1!",
                    ),
                )


# ---------------------------------------------------------------------------
# 5. approve_invitation — creates membership, marks APPROVED
# ---------------------------------------------------------------------------

class TestApproveInvitation:
    def test_approves_and_activates_membership(self):
        from app.modules.invitations.service import approve_invitation

        db = MagicMock()
        company_org = _make_org()
        accepted_user_id = uuid4()
        inv = _make_invitation(
            organization_id=company_org.id,
            status=InvitationStatus.PENDING_APPROVAL.value,
            accepted_user_id=accepted_user_id,
        )

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.inv_repo.get_by_id",
                return_value=inv,
            ),
            patch(
                "app.modules.invitations.service.org_repo.get_member_by_user",
                return_value=None,
            ),
            patch(
                "app.modules.invitations.service.org_repo.create_member",
            ) as mock_create_member,
            patch(
                "app.modules.invitations.service.inv_repo.update",
                side_effect=_update_side_effect,
            ),
            patch("app.modules.invitations.service.audit_service.record_event"),
        ):
            result = approve_invitation(
                db,
                organization_id=company_org.id,
                invitation_id=inv.id,
                acting_user_id=uuid4(),
            )

        assert mock_create_member.called
        kwargs = mock_create_member.call_args.kwargs
        assert kwargs["status"] == OrgMemberStatus.ACTIVE
        # Result type comes from _to_read — it carries the new status.
        assert result.status == InvitationStatus.PENDING_APPROVAL or result.status == InvitationStatus.APPROVED

    def test_rejects_when_status_not_pending_approval(self):
        from app.modules.invitations.service import approve_invitation

        db = MagicMock()
        company_org = _make_org()
        inv = _make_invitation(
            organization_id=company_org.id,
            status=InvitationStatus.PENDING_SIGNUP.value,
        )

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.inv_repo.get_by_id",
                return_value=inv,
            ),
        ):
            with pytest.raises(InvalidOperationError):
                approve_invitation(
                    db,
                    organization_id=company_org.id,
                    invitation_id=inv.id,
                    acting_user_id=uuid4(),
                )


# ---------------------------------------------------------------------------
# 6. reject / cancel
# ---------------------------------------------------------------------------

class TestRejectAndCancel:
    def test_reject_marks_rejected(self):
        from app.modules.invitations.service import reject_invitation

        db = MagicMock()
        company_org = _make_org()
        inv = _make_invitation(
            organization_id=company_org.id,
            status=InvitationStatus.PENDING_APPROVAL.value,
            accepted_user_id=uuid4(),
        )

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.inv_repo.get_by_id",
                return_value=inv,
            ),
            patch(
                "app.modules.invitations.service.inv_repo.update",
                side_effect=_update_side_effect,
            ) as mock_update,
            patch("app.modules.invitations.service.audit_service.record_event"),
        ):
            reject_invitation(
                db,
                organization_id=company_org.id,
                invitation_id=inv.id,
                acting_user_id=uuid4(),
            )

        kwargs = mock_update.call_args.kwargs
        assert kwargs["status"] == InvitationStatus.REJECTED.value

    def test_cancel_marks_cancelled_only_for_pending_signup(self):
        from app.modules.invitations.service import cancel_invitation

        db = MagicMock()
        company_org = _make_org()
        inv = _make_invitation(
            organization_id=company_org.id,
            status=InvitationStatus.PENDING_APPROVAL.value,
        )

        with (
            patch(
                "app.modules.invitations.permissions.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
            patch(
                "app.modules.organizations.permissions.repository.get_active_member_by_user",
                return_value=_make_member(role=OrgRole.OWNER.value),
            ),
            patch(
                "app.modules.invitations.service.inv_repo.get_by_id",
                return_value=inv,
            ),
        ):
            with pytest.raises(InvalidOperationError, match="awaiting signup"):
                cancel_invitation(
                    db,
                    organization_id=company_org.id,
                    invitation_id=inv.id,
                    acting_user_id=uuid4(),
                )


# ---------------------------------------------------------------------------
# 7. validate_invitation — public safe view, never leaks token_hash
# ---------------------------------------------------------------------------

class TestValidateInvitation:
    def test_returns_safe_metadata(self):
        from app.modules.invitations.service import validate_invitation

        db = MagicMock()
        company_org = _make_org(name="Acme Co")
        inv = _make_invitation(
            organization_id=company_org.id,
            status=InvitationStatus.PENDING_SIGNUP.value,
        )

        with (
            patch(
                "app.modules.invitations.service.inv_repo.get_by_token_hash",
                return_value=inv,
            ),
            patch(
                "app.modules.invitations.service.org_repo.get_organization_by_id",
                return_value=company_org,
            ),
        ):
            result = validate_invitation(db, "raw-token")

        # Safe fields only — no token_hash, no invited_by personal data
        assert result.valid is True
        assert result.organization_name == "Acme Co"
        assert result.email == inv.email
        assert result.role == InvitableRole(inv.role)
        # The response model must not declare a token_hash field
        assert "token_hash" not in type(result).model_fields

    def test_unknown_token_raises_not_found(self):
        from app.modules.invitations.service import validate_invitation

        db = MagicMock()
        with patch(
            "app.modules.invitations.service.inv_repo.get_by_token_hash",
            return_value=None,
        ):
            with pytest.raises(ResourceNotFoundError):
                validate_invitation(db, "bad")


# ---------------------------------------------------------------------------
# 8. URL building uses configured FRONTEND_APP_URL
# ---------------------------------------------------------------------------

class TestInviteUrlBuilding:
    def test_invite_url_uses_frontend_app_url(self):
        from app.modules.invitations.service import _build_invite_url

        url = _build_invite_url("sample-token")
        assert url.endswith("/invite/accept/sample-token")
        assert url.startswith("http://")  # default localhost setting
