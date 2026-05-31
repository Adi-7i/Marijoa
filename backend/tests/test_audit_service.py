"""Unit tests for audit log service layer.

All repository calls are mocked — no database or network access needed.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from app.modules.audit_logs.model import AuditAction
from app.modules.audit_logs.service import record_event, sanitize_metadata


_REPO_PATH = 'app.modules.audit_logs.service.repo'


def _mock_db() -> MagicMock:
    return MagicMock()


# ---------------------------------------------------------------------------
# record_event — repository interaction
# ---------------------------------------------------------------------------

def test_record_event_calls_repository() -> None:
    db = _mock_db()

    with patch(_REPO_PATH) as mock_repo:
        mock_repo.create_audit_log.return_value = MagicMock()

        record_event(
            db,
            action=AuditAction.FILE_UPLOADED,
            entity_type='file',
            entity_id=uuid4(),
            user_id=uuid4(),
        )

    mock_repo.create_audit_log.assert_called_once()


def test_record_event_sanitizes_metadata() -> None:
    db = _mock_db()

    with patch(_REPO_PATH) as mock_repo:
        mock_repo.create_audit_log.return_value = MagicMock()

        record_event(
            db,
            action=AuditAction.FILE_UPLOADED,
            entity_type='file',
            metadata={'password': 'secret', 'filename': 'test.pdf'},
        )

    _, kwargs = mock_repo.create_audit_log.call_args
    assert kwargs['metadata_json']['password'] == '[REDACTED]'
    assert kwargs['metadata_json']['filename'] == 'test.pdf'


# ---------------------------------------------------------------------------
# record_event — non-blocking on failure
# ---------------------------------------------------------------------------

def test_record_event_does_not_raise_on_repo_failure() -> None:
    db = _mock_db()

    with patch(_REPO_PATH) as mock_repo:
        mock_repo.create_audit_log.side_effect = Exception('DB error')

        # Must not raise
        result = record_event(
            db,
            action=AuditAction.FILE_UPLOADED,
            entity_type='file',
        )

    assert result is None


def test_record_event_does_not_raise_on_any_exception() -> None:
    db = _mock_db()

    with patch(_REPO_PATH) as mock_repo:
        mock_repo.create_audit_log.side_effect = RuntimeError('unexpected')

        result = record_event(
            db,
            action=AuditAction.FILE_UPLOADED,
            entity_type='file',
        )

    assert result is None


# ---------------------------------------------------------------------------
# AuditAction constants
# ---------------------------------------------------------------------------

def test_audit_action_constants_exist() -> None:
    assert AuditAction.USER_REGISTERED == 'USER_REGISTERED'
    assert AuditAction.FILE_UPLOADED == 'FILE_UPLOADED'
    assert AuditAction.FILE_DELETED == 'FILE_DELETED'
    assert hasattr(AuditAction, 'USER_LOGIN')
    assert hasattr(AuditAction, 'WORKSPACE_CREATED')


# ---------------------------------------------------------------------------
# Import check
# ---------------------------------------------------------------------------

def test_sanitize_metadata_import() -> None:
    # Verify the function can be imported and is callable
    assert callable(sanitize_metadata)
