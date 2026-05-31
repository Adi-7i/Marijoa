"""Unit tests for organization permission helpers.

No database required — uses mocked sessions and member objects.
"""
from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.organizations.model import OrgMemberStatus, OrgRole
from app.modules.organizations.permissions import (
    can_manage_members,
    get_role_rank,
    guard_member_update,
    has_role_at_least,
    require_org_member,
    require_org_role,
)


# ---------------------------------------------------------------------------
# Role ranking
# ---------------------------------------------------------------------------

def test_owner_has_highest_rank() -> None:
    assert get_role_rank(OrgRole.OWNER) > get_role_rank(OrgRole.ADMIN)


def test_admin_outranks_manager() -> None:
    assert get_role_rank(OrgRole.ADMIN) > get_role_rank(OrgRole.MANAGER)


def test_manager_outranks_member() -> None:
    assert get_role_rank(OrgRole.MANAGER) > get_role_rank(OrgRole.MEMBER)


def test_member_has_lowest_rank() -> None:
    assert get_role_rank(OrgRole.MEMBER) == 1


@pytest.mark.parametrize(
    "role,minimum,expected",
    [
        (OrgRole.OWNER, OrgRole.OWNER, True),
        (OrgRole.OWNER, OrgRole.MEMBER, True),
        (OrgRole.ADMIN, OrgRole.ADMIN, True),
        (OrgRole.ADMIN, OrgRole.OWNER, False),
        (OrgRole.MEMBER, OrgRole.ADMIN, False),
    ],
)
def test_has_role_at_least(role: OrgRole, minimum: OrgRole, expected: bool) -> None:
    assert has_role_at_least(role, minimum) is expected


# ---------------------------------------------------------------------------
# can_manage_members
# ---------------------------------------------------------------------------

def test_owner_can_manage_members() -> None:
    assert can_manage_members(OrgRole.OWNER) is True


def test_admin_can_manage_members() -> None:
    assert can_manage_members(OrgRole.ADMIN) is True


def test_manager_cannot_manage_members() -> None:
    assert can_manage_members(OrgRole.MANAGER) is False


def test_member_cannot_manage_members() -> None:
    assert can_manage_members(OrgRole.MEMBER) is False


# ---------------------------------------------------------------------------
# require_org_member
# ---------------------------------------------------------------------------

def _make_member(role: OrgRole, status: OrgMemberStatus = OrgMemberStatus.ACTIVE) -> MagicMock:
    m = MagicMock()
    m.role = role.value
    m.status = status.value
    m.organization_id = uuid4()
    m.user_id = uuid4()
    return m


def test_require_org_member_returns_member_when_active() -> None:
    member = _make_member(OrgRole.MEMBER)
    db = MagicMock()

    with pytest.MonkeyPatch().context() as mp:
        import app.modules.organizations.repository as repo
        mp.setattr(repo, "get_active_member_by_user", lambda *_: member)
        result = require_org_member(db, user_id=uuid4(), org_id=uuid4())

    assert result is member


def test_require_org_member_raises_not_found_when_absent() -> None:
    db = MagicMock()

    with pytest.MonkeyPatch().context() as mp:
        import app.modules.organizations.repository as repo
        mp.setattr(repo, "get_active_member_by_user", lambda *_: None)
        with pytest.raises(ResourceNotFoundError):
            require_org_member(db, user_id=uuid4(), org_id=uuid4())


# ---------------------------------------------------------------------------
# guard_member_update
# ---------------------------------------------------------------------------

def test_guard_allows_owner_to_change_member_role() -> None:
    db = MagicMock()
    acting = _make_member(OrgRole.OWNER)
    target = _make_member(OrgRole.MEMBER)

    # Should not raise
    guard_member_update(db, acting_member=acting, target_member=target, new_role=OrgRole.ADMIN, new_status=None)


def test_guard_prevents_admin_from_promoting_to_owner() -> None:
    db = MagicMock()
    acting = _make_member(OrgRole.ADMIN)
    target = _make_member(OrgRole.MEMBER)

    with pytest.raises(AuthorizationError):
        guard_member_update(db, acting_member=acting, target_member=target, new_role=OrgRole.OWNER, new_status=None)


def test_guard_prevents_member_from_making_any_changes() -> None:
    db = MagicMock()
    acting = _make_member(OrgRole.MEMBER)
    target = _make_member(OrgRole.MEMBER)

    with pytest.raises(AuthorizationError):
        guard_member_update(db, acting_member=acting, target_member=target, new_role=OrgRole.ADMIN, new_status=None)


def test_guard_prevents_removing_last_owner(monkeypatch: pytest.MonkeyPatch) -> None:
    db = MagicMock()
    acting = _make_member(OrgRole.OWNER)
    target = _make_member(OrgRole.OWNER)

    import app.modules.organizations.repository as repo
    monkeypatch.setattr(repo, "count_active_owners", lambda db, org_id: 1)

    with pytest.raises(AuthorizationError, match="last"):
        guard_member_update(
            db,
            acting_member=acting,
            target_member=target,
            new_role=None,
            new_status=OrgMemberStatus.REMOVED,
        )
