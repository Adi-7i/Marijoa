from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest

from app.modules.admin.schemas import (
    AdminAuditLogListResponse,
    AdminAuditLogRead,
    AdminUsageSummary,
    AdminUserListResponse,
    AdminUserRead,
)


def _user_read(**overrides) -> dict:
    base = {
        "id": uuid.uuid4(),
        "full_name": "Alice Admin",
        "email": "alice@example.com",
        "avatar_url": None,
        "is_active": True,
        "is_verified": True,
        "org_role": "OWNER",
        "org_member_status": "ACTIVE",
        "joined_at": datetime.now(tz=timezone.utc),
    }
    base.update(overrides)
    return base


def _audit_log_read(**overrides) -> dict:
    base = {
        "id": uuid.uuid4(),
        "organization_id": uuid.uuid4(),
        "workspace_id": None,
        "user_id": uuid.uuid4(),
        "action": "USER_LOGIN",
        "entity_type": "user",
        "entity_id": None,
        "ip_address": None,
        "user_agent": None,
        "metadata_json": None,
        "created_at": datetime.now(tz=timezone.utc),
    }
    base.update(overrides)
    return base


class TestAdminUserRead:
    def test_valid_user_read(self):
        schema = AdminUserRead(**_user_read())
        assert schema.email == "alice@example.com"
        assert schema.org_role == "OWNER"

    def test_does_not_include_password_hash_field(self):
        fields = AdminUserRead.model_fields
        assert "password_hash" not in fields

    def test_does_not_include_refresh_token_fields(self):
        fields = AdminUserRead.model_fields
        assert "refresh_token" not in fields
        assert "token_hash" not in fields

    def test_avatar_url_nullable(self):
        schema = AdminUserRead(**_user_read(avatar_url=None))
        assert schema.avatar_url is None

    def test_is_active_is_bool(self):
        schema = AdminUserRead(**_user_read(is_active=False))
        assert schema.is_active is False


class TestAdminUserListResponse:
    def test_empty_list(self):
        r = AdminUserListResponse(items=[], total=0, page=1, page_size=20, pages=1)
        assert r.total == 0
        assert r.items == []

    def test_with_items(self):
        user = AdminUserRead(**_user_read())
        r = AdminUserListResponse(items=[user], total=1, page=1, page_size=20, pages=1)
        assert len(r.items) == 1


class TestAdminAuditLogRead:
    def test_valid_log_read(self):
        schema = AdminAuditLogRead(**_audit_log_read())
        assert schema.action == "USER_LOGIN"

    def test_metadata_json_nullable(self):
        schema = AdminAuditLogRead(**_audit_log_read(metadata_json=None))
        assert schema.metadata_json is None

    def test_metadata_json_dict(self):
        schema = AdminAuditLogRead(**_audit_log_read(metadata_json={"page": 1}))
        assert schema.metadata_json == {"page": 1}


class TestAdminUsageSummary:
    def test_valid_summary(self):
        org_id = uuid.uuid4()
        summary = AdminUsageSummary(
            organization_id=org_id,
            users_count=5,
            active_users_count=4,
            workspaces_count=3,
            chats_count=20,
            messages_count=150,
            artifacts_count=8,
            files_count=2,
            storage_bytes=1024 * 1024,
        )
        assert summary.users_count == 5
        assert summary.storage_bytes == 1024 * 1024

    def test_zero_counts_valid(self):
        org_id = uuid.uuid4()
        summary = AdminUsageSummary(
            organization_id=org_id,
            users_count=0,
            active_users_count=0,
            workspaces_count=0,
            chats_count=0,
            messages_count=0,
            artifacts_count=0,
            files_count=0,
            storage_bytes=0,
        )
        assert summary.users_count == 0

    def test_negative_count_rejected(self):
        org_id = uuid.uuid4()
        with pytest.raises(Exception):
            AdminUsageSummary(
                organization_id=org_id,
                users_count=-1,
                active_users_count=0,
                workspaces_count=0,
                chats_count=0,
                messages_count=0,
                artifacts_count=0,
                files_count=0,
                storage_bytes=0,
            )

    def test_does_not_include_connection_string(self):
        fields = AdminUsageSummary.model_fields
        assert "connection_string" not in fields
        assert "azure_storage" not in fields
        assert "redis_url" not in fields
