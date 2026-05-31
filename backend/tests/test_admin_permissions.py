from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.admin.permissions import require_org_admin_or_owner
from app.modules.organizations.model import OrgMemberStatus, OrgRole


def _make_member(role: OrgRole, status: OrgMemberStatus = OrgMemberStatus.ACTIVE) -> MagicMock:
    m = MagicMock()
    m.role = role.value
    m.status = status.value
    return m


class TestRequireOrgAdminOrOwner:
    def _call(self, db, member_return, user_id=None, org_id=None):
        with patch(
            "app.modules.admin.permissions.org_repo.get_active_member_by_user",
            return_value=member_return,
        ):
            return require_org_admin_or_owner(
                db,
                user_id=user_id or uuid.uuid4(),
                organization_id=org_id or uuid.uuid4(),
            )

    def test_owner_allowed(self):
        db = MagicMock()
        member = _make_member(OrgRole.OWNER)
        result = self._call(db, member)
        assert result is member

    def test_admin_allowed(self):
        db = MagicMock()
        member = _make_member(OrgRole.ADMIN)
        result = self._call(db, member)
        assert result is member

    def test_manager_rejected(self):
        db = MagicMock()
        member = _make_member(OrgRole.MANAGER)
        with pytest.raises(AuthorizationError):
            self._call(db, member)

    def test_member_rejected(self):
        db = MagicMock()
        member = _make_member(OrgRole.MEMBER)
        with pytest.raises(AuthorizationError):
            self._call(db, member)

    def test_no_membership_raises_not_found(self):
        db = MagicMock()
        with pytest.raises(ResourceNotFoundError):
            self._call(db, None)

    def test_error_code_is_not_found_for_non_member(self):
        db = MagicMock()
        with pytest.raises(ResourceNotFoundError) as exc_info:
            self._call(db, None)
        assert exc_info.value.code == "NOT_FOUND"

    def test_error_code_is_forbidden_for_wrong_role(self):
        db = MagicMock()
        member = _make_member(OrgRole.MEMBER)
        with pytest.raises(AuthorizationError) as exc_info:
            self._call(db, member)
        assert exc_info.value.code == "FORBIDDEN"
