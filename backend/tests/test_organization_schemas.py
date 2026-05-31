"""Unit tests for organization Pydantic schemas and slug utility."""
from __future__ import annotations

import pytest

from app.modules.organizations.model import OrgRole
from app.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
)
from app.modules.organizations.service import generate_slug


# ---------------------------------------------------------------------------
# Slug generation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "name,expected",
    [
        ("My Company", "my-company"),
        ("Hello World!", "hello-world"),
        ("  Acme  Corp  ", "acme-corp"),
        ("Café Racer", "cafe-racer"),  # é → NFKD → e (accent stripped, base letter kept)
        ("Already-Slug", "already-slug"),
        ("UPPERCASE NAME", "uppercase-name"),
        ("Multiple   Spaces", "multiple-spaces"),
    ],
)
def test_generate_slug(name: str, expected: str) -> None:
    assert generate_slug(name) == expected


def test_generate_slug_truncates_at_120_chars() -> None:
    long_name = "A" * 200
    assert len(generate_slug(long_name)) <= 120


def test_generate_slug_with_empty_string_returns_default() -> None:
    assert generate_slug("") == "org"


# ---------------------------------------------------------------------------
# OrganizationCreate
# ---------------------------------------------------------------------------

def test_org_create_accepts_valid_name() -> None:
    org = OrganizationCreate(name="Acme Corp")
    assert org.name == "Acme Corp"
    assert org.slug is None  # will be auto-generated in service


def test_org_create_rejects_too_short_name() -> None:
    with pytest.raises(Exception):
        OrganizationCreate(name="A")


def test_org_create_rejects_empty_name() -> None:
    with pytest.raises(Exception):
        OrganizationCreate(name="")


def test_org_create_accepts_valid_slug() -> None:
    org = OrganizationCreate(name="Acme", slug="acme-corp-2")
    assert org.slug == "acme-corp-2"


def test_org_create_rejects_invalid_slug_uppercase() -> None:
    with pytest.raises(Exception):
        OrganizationCreate(name="Acme", slug="Acme-Corp")


def test_org_create_rejects_slug_with_spaces() -> None:
    with pytest.raises(Exception):
        OrganizationCreate(name="Acme", slug="acme corp")


# ---------------------------------------------------------------------------
# OrganizationMemberCreate
# ---------------------------------------------------------------------------

def test_member_create_normalises_email() -> None:
    m = OrganizationMemberCreate(email="ALICE@EXAMPLE.COM")
    assert m.email == "alice@example.com"


def test_member_create_default_role_is_member() -> None:
    m = OrganizationMemberCreate(email="user@example.com")
    assert m.role == OrgRole.MEMBER


def test_member_create_rejects_invalid_email() -> None:
    with pytest.raises(Exception):
        OrganizationMemberCreate(email="not-an-email")


# ---------------------------------------------------------------------------
# OrganizationMemberUpdate
# ---------------------------------------------------------------------------

def test_member_update_accepts_all_optional() -> None:
    u = OrganizationMemberUpdate()
    assert u.role is None
    assert u.status is None


def test_member_update_accepts_role_only() -> None:
    u = OrganizationMemberUpdate(role=OrgRole.ADMIN)
    assert u.role == OrgRole.ADMIN
    assert u.status is None


def test_member_update_rejects_invalid_role_string() -> None:
    with pytest.raises(Exception):
        OrganizationMemberUpdate(role="SUPERUSER")
