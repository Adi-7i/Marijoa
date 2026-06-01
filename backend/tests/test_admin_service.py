from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.modules.admin.schemas import (
    AdminAuditLogListResponse,
    AdminUsageSummary,
    AdminUserListResponse,
)


def _active_owner_member():
    m = MagicMock()
    m.role = "OWNER"
    m.status = "ACTIVE"
    m.created_at = datetime.now(tz=timezone.utc)
    return m


def _mock_user():
    u = MagicMock()
    u.id = uuid.uuid4()
    u.full_name = "Alice"
    u.email = "alice@example.com"
    u.avatar_url = None
    u.is_active = True
    u.is_verified = True
    return u


def _mock_audit_log():
    log = MagicMock()
    log.id = uuid.uuid4()
    log.organization_id = uuid.uuid4()
    log.workspace_id = None
    log.user_id = uuid.uuid4()
    log.action = "USER_LOGIN"
    log.entity_type = "user"
    log.entity_id = None
    log.ip_address = None
    log.user_agent = None
    log.metadata_json = None
    log.created_at = datetime.now(tz=timezone.utc)
    return log


class TestListOrganizationUsers:
    def test_returns_user_list_for_admin(self):
        from app.modules.admin import service

        db = MagicMock()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        member = _active_owner_member()
        user = _mock_user()

        with (
            patch("app.modules.admin.service.require_org_admin_or_owner", return_value=member),
            patch("app.modules.admin.service.repo.list_organization_users", return_value=[(member, user)]),
            patch("app.modules.admin.service.repo.count_organization_users", return_value=1),
            patch("app.modules.admin.service.audit_service.record_event"),
        ):
            result = service.list_organization_users(
                db,
                organization_id=org_id,
                current_user_id=user_id,
            )

        assert isinstance(result, AdminUserListResponse)
        assert result.total == 1
        assert len(result.items) == 1
        assert result.items[0].email == "alice@example.com"

    def test_page_count_calculated_correctly(self):
        from app.modules.admin import service

        db = MagicMock()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        member = _active_owner_member()
        user = _mock_user()

        with (
            patch("app.modules.admin.service.require_org_admin_or_owner", return_value=member),
            patch("app.modules.admin.service.repo.list_organization_users", return_value=[(member, user)] * 5),
            patch("app.modules.admin.service.repo.count_organization_users", return_value=55),
            patch("app.modules.admin.service.audit_service.record_event"),
        ):
            result = service.list_organization_users(
                db,
                organization_id=org_id,
                current_user_id=user_id,
                page=1,
                page_size=20,
            )

        assert result.pages == 3  # ceil(55/20)

    def test_page_size_capped_at_100(self):
        from app.modules.admin import service

        db = MagicMock()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        member = _active_owner_member()

        with (
            patch("app.modules.admin.service.require_org_admin_or_owner", return_value=member),
            patch("app.modules.admin.service.repo.list_organization_users", return_value=[]) as mock_list,
            patch("app.modules.admin.service.repo.count_organization_users", return_value=0),
            patch("app.modules.admin.service.audit_service.record_event"),
        ):
            service.list_organization_users(
                db,
                organization_id=org_id,
                current_user_id=user_id,
                page=1,
                page_size=999,
            )
            # limit passed to repo must be capped at 100
            call_kwargs = mock_list.call_args.kwargs
            assert call_kwargs["limit"] == 100

    def test_non_admin_raises_error(self):
        from app.modules.admin import service

        db = MagicMock()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()

        with patch(
            "app.modules.admin.service.require_org_admin_or_owner",
            side_effect=AuthorizationError(),
        ):
            with pytest.raises(AuthorizationError):
                service.list_organization_users(
                    db,
                    organization_id=org_id,
                    current_user_id=user_id,
                )


class TestListOrganizationAuditLogs:
    def test_returns_sanitized_logs(self):
        from app.modules.admin import service

        db = MagicMock()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        member = _active_owner_member()
        log = _mock_audit_log()
        log.metadata_json = {"password": "secret123", "page": 1}

        with (
            patch("app.modules.admin.service.require_org_admin_or_owner", return_value=member),
            patch("app.modules.admin.service.repo.list_organization_audit_logs", return_value=[log]),
            patch("app.modules.admin.service.repo.count_organization_audit_logs", return_value=1),
            patch("app.modules.admin.service.audit_service.record_event"),
        ):
            result = service.list_organization_audit_logs(
                db,
                organization_id=org_id,
                current_user_id=user_id,
            )

        assert isinstance(result, AdminAuditLogListResponse)
        assert result.total == 1
        # password key should be redacted by sanitize_metadata
        assert result.items[0].metadata_json["password"] == "[REDACTED]"
        assert result.items[0].metadata_json["page"] == 1


class TestGetOrganizationUsage:
    def test_returns_usage_summary(self):
        from app.modules.admin import service

        db = MagicMock()
        org_id = uuid.uuid4()
        user_id = uuid.uuid4()
        member = _active_owner_member()

        summary_data = {
            "organization_id": org_id,
            "users_count": 10,
            "active_users_count": 8,
            "workspaces_count": 3,
            "chats_count": 25,
            "messages_count": 200,
            "artifacts_count": 5,
            "files_count": 4,
            "storage_bytes": 1024000,
        }

        with (
            patch("app.modules.admin.service.require_org_admin_or_owner", return_value=member),
            patch("app.modules.admin.service.repo.get_organization_usage_summary", return_value=summary_data),
            patch("app.modules.admin.service.audit_service.record_event"),
        ):
            result = service.get_organization_usage(
                db,
                organization_id=org_id,
                current_user_id=user_id,
            )

        assert isinstance(result, AdminUsageSummary)
        assert result.users_count == 10
        assert result.storage_bytes == 1024000
        assert result.active_users_count == 8
