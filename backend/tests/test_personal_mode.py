"""Tests for MVP 1.1 — Personal User Mode.

All tests use mocks — no real database, Redis, or external services required
for the default pytest run. Integration tests (real DB) must be marked @integration.
"""
from __future__ import annotations

from unittest.mock import MagicMock, call, patch
from uuid import uuid4

import pytest

from app.modules.organizations.model import (
    OrgMemberStatus,
    OrgRole,
    Organization,
    OrganizationMember,
    OrganizationType,
)
from app.modules.workspaces.model import (
    Workspace,
    WorkspaceMember,
    WorkspaceMemberStatus,
    WorkspaceRole,
)


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def _make_user(full_name: str = "Aditya Kumar", email: str = "adi@example.com"):
    user = MagicMock()
    user.id = uuid4()
    user.full_name = full_name
    user.email = email
    user.avatar_url = None
    user.is_active = True
    user.is_verified = False
    user.created_at = MagicMock()
    return user


def _make_org(
    owner_id=None,
    org_type: str = OrganizationType.PERSONAL.value,
    name: str = "Aditya's Personal Workspace",
):
    org = MagicMock(spec=Organization)
    org.id = uuid4()
    org.owner_id = owner_id or uuid4()
    org.type = org_type
    org.name = name
    org.slug = "aditya-personal"
    org.is_active = True
    return org


def _make_workspace(org_id=None, name: str = "Personal Chat"):
    ws = MagicMock(spec=Workspace)
    ws.id = uuid4()
    ws.organization_id = org_id or uuid4()
    ws.name = name
    ws.description = "Personal AI workspace"
    ws.is_active = True
    return ws


# ---------------------------------------------------------------------------
# 1. OrganizationType enum
# ---------------------------------------------------------------------------

class TestOrganizationType:
    def test_personal_value(self):
        assert OrganizationType.PERSONAL.value == "PERSONAL"

    def test_company_value(self):
        assert OrganizationType.COMPANY.value == "COMPANY"

    def test_is_str_enum(self):
        assert isinstance(OrganizationType.PERSONAL, str)

    def test_distinct_values(self):
        assert OrganizationType.PERSONAL != OrganizationType.COMPANY


# ---------------------------------------------------------------------------
# 2. Organization schemas include type
# ---------------------------------------------------------------------------

class TestOrganizationSchemas:
    def test_organization_read_includes_type(self):
        from app.modules.organizations.schemas import OrganizationRead

        assert "type" in OrganizationRead.model_fields

    def test_organization_with_role_read_includes_type(self):
        from app.modules.organizations.schemas import OrganizationWithRoleRead

        assert "type" in OrganizationWithRoleRead.model_fields

    def test_organization_create_has_no_type_field(self):
        """Public clients cannot specify organization type."""
        from app.modules.organizations.schemas import OrganizationCreate

        assert "type" not in OrganizationCreate.model_fields

    def test_organization_read_validates_from_orm(self):
        from app.modules.organizations.schemas import OrganizationRead

        org = MagicMock()
        org.id = uuid4()
        org.name = "Acme Corp"
        org.slug = "acme-corp"
        org.owner_id = uuid4()
        org.type = OrganizationType.COMPANY.value
        org.is_active = True
        org.created_at = MagicMock()
        org.updated_at = MagicMock()

        result = OrganizationRead.model_validate(org)
        assert result.type == OrganizationType.COMPANY


# ---------------------------------------------------------------------------
# 3. Personal schemas
# ---------------------------------------------------------------------------

class TestPersonalSchemas:
    def test_personal_context_response_fields(self):
        from app.modules.personal.schemas import PersonalContextResponse

        fields = PersonalContextResponse.model_fields
        assert "user" in fields
        assert "personal_organization" in fields
        assert "personal_workspace" in fields

    def test_personal_org_read_has_type(self):
        from app.modules.personal.schemas import PersonalOrganizationRead

        assert "type" in PersonalOrganizationRead.model_fields

    def test_personal_workspace_read_has_org_id(self):
        from app.modules.personal.schemas import PersonalWorkspaceRead

        assert "organization_id" in PersonalWorkspaceRead.model_fields


# ---------------------------------------------------------------------------
# 4. Personal service — ensure_personal_context (idempotent)
# ---------------------------------------------------------------------------

class TestEnsurePersonalContext:
    def _run(self, db, user, existing_org=None, existing_ws=None):
        """Helper to call ensure_personal_context with controlled mocks."""
        with (
            patch("app.modules.personal.service.org_repo.get_personal_organization_by_owner", return_value=existing_org),
            patch("app.modules.personal.service.ws_repo.get_workspace_by_org_and_name", return_value=existing_ws),
            patch("app.modules.personal.service.org_repo.get_organization_by_slug", return_value=None),
            patch("app.modules.personal.service.audit_service.record_event"),
        ):
            from app.modules.personal.service import ensure_personal_context
            return ensure_personal_context(db, user)

    def test_creates_org_and_workspace_when_both_missing(self):
        db = MagicMock()
        user = _make_user()

        org, ws = self._run(db, user, existing_org=None, existing_ws=None)

        # db.add was called for org, member, workspace, ws_member
        assert db.add.call_count == 4
        assert db.flush.call_count == 4

    def test_idempotent_when_org_and_workspace_exist(self):
        db = MagicMock()
        user = _make_user()
        existing_org = _make_org(owner_id=user.id)
        existing_ws = _make_workspace(org_id=existing_org.id)

        org, ws = self._run(db, user, existing_org=existing_org, existing_ws=existing_ws)

        # Nothing added to db when both already exist
        db.add.assert_not_called()
        assert org is existing_org
        assert ws is existing_ws

    def test_creates_workspace_when_only_org_exists(self):
        db = MagicMock()
        user = _make_user()
        existing_org = _make_org(owner_id=user.id)

        with (
            patch("app.modules.personal.service.org_repo.get_personal_organization_by_owner", return_value=existing_org),
            patch("app.modules.personal.service.ws_repo.get_workspace_by_org_and_name", return_value=None),
            patch("app.modules.personal.service.audit_service.record_event"),
        ):
            from app.modules.personal.service import ensure_personal_context
            org, ws = ensure_personal_context(db, user)

        # Only workspace + ws_member added
        assert db.add.call_count == 2

    def test_does_not_commit(self):
        """ensure_personal_context must not commit — caller is responsible."""
        db = MagicMock()
        user = _make_user()

        self._run(db, user, existing_org=None, existing_ws=None)

        db.commit.assert_not_called()

    def test_returns_tuple_of_org_and_workspace(self):
        db = MagicMock()
        user = _make_user()
        existing_org = _make_org(owner_id=user.id)
        existing_ws = _make_workspace(org_id=existing_org.id)

        result = self._run(db, user, existing_org=existing_org, existing_ws=existing_ws)

        assert isinstance(result, tuple)
        assert len(result) == 2


# ---------------------------------------------------------------------------
# 5. Personal org name generation
# ---------------------------------------------------------------------------

class TestPersonalOrgNameGeneration:
    def test_name_with_full_name(self):
        from app.modules.personal.service import _build_personal_org_name

        user = _make_user(full_name="Aditya Kumar")
        assert _build_personal_org_name(user) == "Aditya Kumar's Personal Workspace"

    def test_name_ends_with_s(self):
        from app.modules.personal.service import _build_personal_org_name

        user = _make_user(full_name="James")
        assert _build_personal_org_name(user) == "James' Personal Workspace"

    def test_name_fallback_when_empty(self):
        from app.modules.personal.service import _build_personal_org_name

        user = _make_user(full_name="")
        assert _build_personal_org_name(user) == "Personal Workspace"

    def test_name_fallback_when_whitespace(self):
        from app.modules.personal.service import _build_personal_org_name

        user = _make_user(full_name="   ")
        assert _build_personal_org_name(user) == "Personal Workspace"


# ---------------------------------------------------------------------------
# 6. Personal slug generation
# ---------------------------------------------------------------------------

class TestPersonalSlugGeneration:
    def test_slug_contains_personal_suffix(self):
        from app.modules.personal.service import _build_personal_slug

        user = _make_user(full_name="Aditya Kumar")
        db = MagicMock()

        with patch("app.modules.personal.service.org_repo.get_organization_by_slug", return_value=None):
            slug = _build_personal_slug(db, user)

        assert "personal" in slug

    def test_slug_unique_when_conflict(self):
        from app.modules.personal.service import _build_personal_slug

        user = _make_user(full_name="Aditya")
        db = MagicMock()
        existing = MagicMock()

        # First call (base slug) returns conflict; second call returns None (free)
        with patch(
            "app.modules.personal.service.org_repo.get_organization_by_slug",
            side_effect=[existing, None],
        ):
            slug = _build_personal_slug(db, user)

        assert slug.endswith("-1")


# ---------------------------------------------------------------------------
# 7. Registration creates personal context
# ---------------------------------------------------------------------------

class TestRegistrationCreatesPersonalContext:
    def test_register_calls_ensure_personal_context(self):
        db = MagicMock()
        mock_user = _make_user()
        mock_user.id = uuid4()
        mock_user.email = "new@example.com"

        mock_org = _make_org(owner_id=mock_user.id)
        mock_ws = _make_workspace(org_id=mock_org.id)

        with (
            patch("app.modules.auth.service.user_repo.get_user_by_email", return_value=None),
            patch("app.modules.auth.service.security.hash_password", return_value="hashed"),
            patch("app.modules.auth.service.user_repo.create_user", return_value=mock_user),
            patch("app.modules.auth.service.security.create_access_token", return_value="access"),
            patch("app.modules.auth.service.security.create_refresh_token_value", return_value="refresh_raw"),
            patch("app.modules.auth.service.security.hash_token", return_value="hash"),
            patch("app.modules.auth.service.auth_repo.create_refresh_token"),
            patch("app.modules.auth.service.audit_service.record_event"),
            patch("app.modules.personal.service.org_repo.get_personal_organization_by_owner", return_value=None),
            patch("app.modules.personal.service.ws_repo.get_workspace_by_org_and_name", return_value=None),
            patch("app.modules.personal.service.org_repo.get_organization_by_slug", return_value=None),
            patch("app.modules.personal.service.audit_service.record_event"),
        ):
            from app.modules.auth.schemas import RegisterRequest
            from app.modules.auth.service import register

            request = RegisterRequest(
                full_name="New User",
                email="new@example.com",
                password="Secret1!",
            )
            user, access, refresh = register(db, request)

        assert user is mock_user
        assert access == "access"
        # db.add called for org, org_member, workspace, ws_member
        assert db.add.call_count >= 4

    def test_register_commits_once_for_user_and_personal_context(self):
        """All entities (user + personal org + workspace) must be in one commit."""
        db = MagicMock()
        mock_user = _make_user()

        with (
            patch("app.modules.auth.service.user_repo.get_user_by_email", return_value=None),
            patch("app.modules.auth.service.security.hash_password", return_value="hashed"),
            patch("app.modules.auth.service.user_repo.create_user", return_value=mock_user),
            patch("app.modules.auth.service.security.create_access_token", return_value="access"),
            patch("app.modules.auth.service.security.create_refresh_token_value", return_value="raw"),
            patch("app.modules.auth.service.security.hash_token", return_value="hash"),
            patch("app.modules.auth.service.auth_repo.create_refresh_token"),
            patch("app.modules.auth.service.audit_service.record_event"),
            patch("app.modules.personal.service.org_repo.get_personal_organization_by_owner", return_value=None),
            patch("app.modules.personal.service.ws_repo.get_workspace_by_org_and_name", return_value=None),
            patch("app.modules.personal.service.org_repo.get_organization_by_slug", return_value=None),
            patch("app.modules.personal.service.audit_service.record_event"),
        ):
            from app.modules.auth.schemas import RegisterRequest
            from app.modules.auth.service import register

            register(db, RegisterRequest(
                full_name="User",
                email="user@example.com",
                password="Secret1!",
            ))

        # First commit includes user + personal org + workspace; second is the audit log
        assert db.commit.call_count == 2


# ---------------------------------------------------------------------------
# 8. Organization service — public create defaults to COMPANY
# ---------------------------------------------------------------------------

class TestOrganizationCreateDefaultsToCompany:
    def test_create_organization_creates_company_type(self):
        db = MagicMock()
        user_id = uuid4()
        created_org = _make_org(owner_id=user_id, org_type=OrganizationType.COMPANY.value)

        with (
            patch("app.modules.organizations.service.repository.get_organization_by_slug", return_value=None),
            patch("app.modules.organizations.service.repository.create_organization", return_value=created_org),
            patch("app.modules.organizations.service.repository.create_member"),
        ):
            from app.modules.organizations.schemas import OrganizationCreate
            from app.modules.organizations.service import create_organization

            org = create_organization(db, OrganizationCreate(name="Acme Corp"), owner_id=user_id)

        assert org.type == OrganizationType.COMPANY.value

    def test_create_organization_repo_called_with_company_type(self):
        db = MagicMock()
        user_id = uuid4()
        created_org = _make_org(owner_id=user_id, org_type=OrganizationType.COMPANY.value)

        with (
            patch("app.modules.organizations.service.repository.get_organization_by_slug", return_value=None),
            patch("app.modules.organizations.service.repository.create_organization", return_value=created_org) as mock_create,
            patch("app.modules.organizations.service.repository.create_member"),
        ):
            from app.modules.organizations.schemas import OrganizationCreate
            from app.modules.organizations.service import create_organization

            create_organization(db, OrganizationCreate(name="Acme"), owner_id=user_id)

        _, kwargs = mock_create.call_args
        assert kwargs["org_type"] == OrganizationType.COMPANY


# ---------------------------------------------------------------------------
# 9. Organization member add — PERSONAL org guard
# ---------------------------------------------------------------------------

class TestPersonalOrgMemberGuard:
    def test_add_member_to_personal_org_raises(self):
        db = MagicMock()
        org_id = uuid4()
        acting_user_id = uuid4()
        personal_org = _make_org(org_type=OrganizationType.PERSONAL.value)

        with (
            patch("app.modules.organizations.service.permissions.require_org_role"),
            patch("app.modules.organizations.service.repository.get_organization_by_id", return_value=personal_org),
        ):
            from app.modules.organizations.schemas import OrganizationMemberCreate
            from app.modules.organizations.service import add_member
            from app.core.exceptions import AuthorizationError

            with pytest.raises(AuthorizationError, match="Personal organizations do not support members"):
                add_member(
                    db,
                    org_id,
                    OrganizationMemberCreate(email="other@example.com"),
                    acting_user_id=acting_user_id,
                )

    def test_add_member_to_company_org_allowed(self):
        db = MagicMock()
        org_id = uuid4()
        acting_user_id = uuid4()
        company_org = _make_org(org_type=OrganizationType.COMPANY.value)
        target_user = _make_user(email="target@example.com")
        mock_member = MagicMock()
        mock_member.id = uuid4()
        mock_member.organization_id = org_id
        mock_member.user_id = target_user.id
        mock_member.role = OrgRole.MEMBER.value
        mock_member.status = OrgMemberStatus.ACTIVE.value
        mock_member.created_at = MagicMock()
        mock_member.updated_at = MagicMock()

        with (
            patch("app.modules.organizations.service.permissions.require_org_role"),
            patch("app.modules.organizations.service.repository.get_organization_by_id", return_value=company_org),
            patch("app.modules.organizations.service.user_repo.get_user_by_email", return_value=target_user),
            patch("app.modules.organizations.service.repository.get_member_by_user", return_value=None),
            patch("app.modules.organizations.service.repository.create_member", return_value=mock_member),
        ):
            from app.modules.organizations.schemas import OrganizationMemberCreate
            from app.modules.organizations.service import add_member

            result = add_member(
                db,
                org_id,
                OrganizationMemberCreate(email="target@example.com"),
                acting_user_id=acting_user_id,
            )

        assert result is not None


# ---------------------------------------------------------------------------
# 10. Organization list includes type
# ---------------------------------------------------------------------------

class TestOrganizationListIncludesType:
    def test_list_my_organizations_includes_type(self):
        db = MagicMock()
        user_id = uuid4()

        personal_org = MagicMock()
        personal_org.id = uuid4()
        personal_org.name = "My Personal Workspace"
        personal_org.slug = "my-personal"
        personal_org.owner_id = user_id
        personal_org.type = OrganizationType.PERSONAL.value
        personal_org.is_active = True
        personal_org.created_at = MagicMock()
        personal_org.updated_at = MagicMock()

        personal_member = MagicMock()
        personal_member.role = OrgRole.OWNER.value

        company_org = MagicMock()
        company_org.id = uuid4()
        company_org.name = "Acme Corp"
        company_org.slug = "acme-corp"
        company_org.owner_id = user_id
        company_org.type = OrganizationType.COMPANY.value
        company_org.is_active = True
        company_org.created_at = MagicMock()
        company_org.updated_at = MagicMock()

        company_member = MagicMock()
        company_member.role = OrgRole.OWNER.value

        with patch(
            "app.modules.organizations.service.repository.get_user_organizations",
            return_value=[(personal_org, personal_member), (company_org, company_member)],
        ):
            from app.modules.organizations.service import list_my_organizations

            results = list_my_organizations(db, user_id)

        types = {r.type for r in results}
        assert OrganizationType.PERSONAL in types
        assert OrganizationType.COMPANY in types


# ---------------------------------------------------------------------------
# 11. Admin permissions block PERSONAL org
# ---------------------------------------------------------------------------

class TestAdminPermissionsBlockPersonalOrg:
    def test_admin_endpoint_rejects_personal_org(self):
        db = MagicMock()
        org_id = uuid4()
        user_id = uuid4()

        mock_member = MagicMock()
        mock_member.role = OrgRole.OWNER.value

        personal_org = _make_org(org_type=OrganizationType.PERSONAL.value)

        with (
            patch("app.modules.admin.permissions.org_repo.get_active_member_by_user", return_value=mock_member),
            patch("app.modules.admin.permissions.org_repo.get_organization_by_id", return_value=personal_org),
        ):
            from app.modules.admin.permissions import require_org_admin_or_owner
            from app.core.exceptions import AuthorizationError

            with pytest.raises(AuthorizationError, match="Admin APIs are not available for personal organizations"):
                require_org_admin_or_owner(db, user_id=user_id, organization_id=org_id)

    def test_admin_endpoint_allows_company_org(self):
        db = MagicMock()
        org_id = uuid4()
        user_id = uuid4()

        mock_member = MagicMock()
        mock_member.role = OrgRole.OWNER.value

        company_org = _make_org(org_type=OrganizationType.COMPANY.value)

        with (
            patch("app.modules.admin.permissions.org_repo.get_active_member_by_user", return_value=mock_member),
            patch("app.modules.admin.permissions.org_repo.get_organization_by_id", return_value=company_org),
        ):
            from app.modules.admin.permissions import require_org_admin_or_owner

            result = require_org_admin_or_owner(db, user_id=user_id, organization_id=org_id)

        assert result is mock_member


# ---------------------------------------------------------------------------
# 12. get_personal_context endpoint service
# ---------------------------------------------------------------------------

class TestGetPersonalContext:
    def test_returns_personal_context_response(self):
        db = MagicMock()
        user = _make_user()

        org = _make_org(owner_id=user.id, org_type=OrganizationType.PERSONAL.value)
        org.id = uuid4()
        ws = _make_workspace(org_id=org.id)
        ws.organization_id = org.id

        with (
            patch("app.modules.personal.service.ensure_personal_context", return_value=(org, ws)),
        ):
            from app.modules.personal.service import get_personal_context

            result = get_personal_context(db, user)

        db.commit.assert_called_once()
        assert result.user.email == user.email
        assert result.personal_organization.id == org.id
        assert result.personal_workspace.id == ws.id
        assert result.personal_organization.type == OrganizationType.PERSONAL

    def test_requires_authentication_via_dependency(self):
        """Verify the /me/personal-context route uses an auth dependency.

        require_authenticated_user is an alias for get_current_active_user.
        FastAPI stores parameter-level dependencies in route.dependant.dependencies.
        """
        from app.modules.personal.router import router
        from app.modules.auth.dependencies import require_authenticated_user

        personal_context_route = next(
            r for r in router.routes if "/personal-context" in str(r.path)
        )
        dep_callables = {d.call for d in personal_context_route.dependant.dependencies}
        # require_authenticated_user is an alias of get_current_active_user
        assert require_authenticated_user in dep_callables


# ---------------------------------------------------------------------------
# 13. Repository — get_personal_organization_by_owner
# ---------------------------------------------------------------------------

class TestPersonalOrgRepository:
    def test_get_personal_organization_by_owner_returns_none_when_not_found(self):
        from app.modules.organizations.repository import get_personal_organization_by_owner

        db = MagicMock()
        db.scalar.return_value = None

        result = get_personal_organization_by_owner(db, uuid4())
        assert result is None

    def test_get_personal_organization_by_owner_returns_org(self):
        from app.modules.organizations.repository import get_personal_organization_by_owner

        db = MagicMock()
        expected = _make_org()
        db.scalar.return_value = expected

        result = get_personal_organization_by_owner(db, uuid4())
        assert result is expected
