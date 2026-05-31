"""Unit tests for workspace Pydantic schemas.

No database or network access required.
"""
from __future__ import annotations

import pytest

from app.modules.workspaces.model import WorkspaceMemberStatus, WorkspaceRole
from app.modules.workspaces.schemas import (
    WorkspaceCreate,
    WorkspaceMemberCreate,
    WorkspaceMemberUpdate,
    WorkspaceUpdate,
)


# ---------------------------------------------------------------------------
# WorkspaceCreate
# ---------------------------------------------------------------------------

def test_workspace_create_accepts_valid_data() -> None:
    ws = WorkspaceCreate(
        organization_id="12345678-1234-5678-1234-567812345678",
        name="Sales Team",
    )
    assert ws.name == "Sales Team"
    assert ws.description is None
    assert ws.system_instruction is None


def test_workspace_create_rejects_name_too_short() -> None:
    with pytest.raises(Exception):
        WorkspaceCreate(
            organization_id="12345678-1234-5678-1234-567812345678",
            name="A",
        )


def test_workspace_create_rejects_empty_name() -> None:
    with pytest.raises(Exception):
        WorkspaceCreate(
            organization_id="12345678-1234-5678-1234-567812345678",
            name="",
        )


def test_workspace_create_rejects_name_over_160_chars() -> None:
    with pytest.raises(Exception):
        WorkspaceCreate(
            organization_id="12345678-1234-5678-1234-567812345678",
            name="A" * 161,
        )


def test_workspace_create_accepts_description() -> None:
    ws = WorkspaceCreate(
        organization_id="12345678-1234-5678-1234-567812345678",
        name="HR Team",
        description="Human Resources workspace",
    )
    assert ws.description == "Human Resources workspace"


def test_workspace_create_rejects_description_over_1000_chars() -> None:
    with pytest.raises(Exception):
        WorkspaceCreate(
            organization_id="12345678-1234-5678-1234-567812345678",
            name="HR Team",
            description="X" * 1001,
        )


def test_workspace_create_accepts_system_instruction() -> None:
    instruction = "You are an HR assistant. Be professional and concise."
    ws = WorkspaceCreate(
        organization_id="12345678-1234-5678-1234-567812345678",
        name="HR Team",
        system_instruction=instruction,
    )
    assert ws.system_instruction == instruction


def test_workspace_create_rejects_system_instruction_over_8000_chars() -> None:
    with pytest.raises(Exception):
        WorkspaceCreate(
            organization_id="12345678-1234-5678-1234-567812345678",
            name="HR Team",
            system_instruction="X" * 8001,
        )


def test_workspace_create_accepts_system_instruction_at_limit() -> None:
    ws = WorkspaceCreate(
        organization_id="12345678-1234-5678-1234-567812345678",
        name="HR Team",
        system_instruction="X" * 8000,
    )
    assert len(ws.system_instruction) == 8000  # type: ignore[arg-type]


def test_workspace_create_requires_valid_uuid_for_org_id() -> None:
    with pytest.raises(Exception):
        WorkspaceCreate(organization_id="not-a-uuid", name="Team")


# ---------------------------------------------------------------------------
# WorkspaceUpdate
# ---------------------------------------------------------------------------

def test_workspace_update_all_fields_optional() -> None:
    u = WorkspaceUpdate()
    assert u.name is None
    assert u.description is None
    assert u.system_instruction is None
    assert u.is_active is None


def test_workspace_update_accepts_name_only() -> None:
    u = WorkspaceUpdate(name="Renamed Team")
    assert u.name == "Renamed Team"


def test_workspace_update_rejects_name_too_short() -> None:
    with pytest.raises(Exception):
        WorkspaceUpdate(name="X")


def test_workspace_update_accepts_is_active_false() -> None:
    u = WorkspaceUpdate(is_active=False)
    assert u.is_active is False


# ---------------------------------------------------------------------------
# WorkspaceMemberCreate
# ---------------------------------------------------------------------------

def test_member_create_normalises_email() -> None:
    m = WorkspaceMemberCreate(email="ALICE@EXAMPLE.COM")
    assert m.email == "alice@example.com"


def test_member_create_default_role_is_member() -> None:
    m = WorkspaceMemberCreate(email="user@example.com")
    assert m.role == WorkspaceRole.MEMBER


def test_member_create_accepts_viewer_role() -> None:
    m = WorkspaceMemberCreate(email="user@example.com", role=WorkspaceRole.VIEWER)
    assert m.role == WorkspaceRole.VIEWER


def test_member_create_rejects_invalid_email() -> None:
    with pytest.raises(Exception):
        WorkspaceMemberCreate(email="not-an-email")


def test_member_create_rejects_invalid_role() -> None:
    with pytest.raises(Exception):
        WorkspaceMemberCreate(email="user@example.com", role="SUPERUSER")  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# WorkspaceMemberUpdate
# ---------------------------------------------------------------------------

def test_member_update_all_optional() -> None:
    u = WorkspaceMemberUpdate()
    assert u.role is None
    assert u.status is None


def test_member_update_accepts_role_only() -> None:
    u = WorkspaceMemberUpdate(role=WorkspaceRole.ADMIN)
    assert u.role == WorkspaceRole.ADMIN


def test_member_update_accepts_status_only() -> None:
    u = WorkspaceMemberUpdate(status=WorkspaceMemberStatus.SUSPENDED)
    assert u.status == WorkspaceMemberStatus.SUSPENDED


def test_member_update_rejects_invalid_role() -> None:
    with pytest.raises(Exception):
        WorkspaceMemberUpdate(role="GOD")  # type: ignore[arg-type]
