"""Unit tests for workspace permission helpers.

No database or network access required.
"""
from __future__ import annotations

import pytest

from app.modules.organizations.model import OrgRole
from app.modules.workspaces.model import WorkspaceRole
from app.modules.workspaces.permissions import (
    can_create_workspace,
    can_manage_workspace,
    get_role_rank,
    has_role_at_least,
)


# ---------------------------------------------------------------------------
# Role rank ordering
# ---------------------------------------------------------------------------

def test_owner_has_highest_rank() -> None:
    owner_rank = get_role_rank(WorkspaceRole.OWNER)
    for role in (WorkspaceRole.ADMIN, WorkspaceRole.MANAGER, WorkspaceRole.MEMBER, WorkspaceRole.VIEWER):
        assert owner_rank > get_role_rank(role)


def test_admin_outranks_manager_member_viewer() -> None:
    admin_rank = get_role_rank(WorkspaceRole.ADMIN)
    for role in (WorkspaceRole.MANAGER, WorkspaceRole.MEMBER, WorkspaceRole.VIEWER):
        assert admin_rank > get_role_rank(role)


def test_manager_outranks_member_and_viewer() -> None:
    assert get_role_rank(WorkspaceRole.MANAGER) > get_role_rank(WorkspaceRole.MEMBER)
    assert get_role_rank(WorkspaceRole.MANAGER) > get_role_rank(WorkspaceRole.VIEWER)


def test_member_outranks_viewer() -> None:
    assert get_role_rank(WorkspaceRole.MEMBER) > get_role_rank(WorkspaceRole.VIEWER)


def test_viewer_has_lowest_positive_rank() -> None:
    assert get_role_rank(WorkspaceRole.VIEWER) >= 1


# ---------------------------------------------------------------------------
# has_role_at_least
# ---------------------------------------------------------------------------

def test_owner_satisfies_all_minimums() -> None:
    for minimum in WorkspaceRole:
        assert has_role_at_least(WorkspaceRole.OWNER, minimum)


def test_viewer_only_satisfies_viewer_minimum() -> None:
    assert has_role_at_least(WorkspaceRole.VIEWER, WorkspaceRole.VIEWER)
    assert not has_role_at_least(WorkspaceRole.VIEWER, WorkspaceRole.MEMBER)
    assert not has_role_at_least(WorkspaceRole.VIEWER, WorkspaceRole.MANAGER)


def test_member_satisfies_member_and_viewer() -> None:
    assert has_role_at_least(WorkspaceRole.MEMBER, WorkspaceRole.MEMBER)
    assert has_role_at_least(WorkspaceRole.MEMBER, WorkspaceRole.VIEWER)
    assert not has_role_at_least(WorkspaceRole.MEMBER, WorkspaceRole.MANAGER)


def test_role_satisfies_itself() -> None:
    for role in WorkspaceRole:
        assert has_role_at_least(role, role)


# ---------------------------------------------------------------------------
# can_create_workspace — requires org MANAGER+
# ---------------------------------------------------------------------------

def test_org_owner_can_create_workspace() -> None:
    assert can_create_workspace(OrgRole.OWNER) is True


def test_org_admin_can_create_workspace() -> None:
    assert can_create_workspace(OrgRole.ADMIN) is True


def test_org_manager_can_create_workspace() -> None:
    assert can_create_workspace(OrgRole.MANAGER) is True


def test_org_member_cannot_create_workspace() -> None:
    assert can_create_workspace(OrgRole.MEMBER) is False


# ---------------------------------------------------------------------------
# can_manage_workspace — requires workspace ADMIN+
# ---------------------------------------------------------------------------

def test_workspace_owner_can_manage() -> None:
    assert can_manage_workspace(WorkspaceRole.OWNER) is True


def test_workspace_admin_can_manage() -> None:
    assert can_manage_workspace(WorkspaceRole.ADMIN) is True


def test_workspace_manager_cannot_manage_settings() -> None:
    assert can_manage_workspace(WorkspaceRole.MANAGER) is False


def test_workspace_member_cannot_manage() -> None:
    assert can_manage_workspace(WorkspaceRole.MEMBER) is False


def test_workspace_viewer_cannot_manage() -> None:
    assert can_manage_workspace(WorkspaceRole.VIEWER) is False
