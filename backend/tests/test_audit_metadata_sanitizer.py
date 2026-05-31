"""Unit tests for audit log metadata sanitization.

Pure function tests — no database or network access needed.
"""
from __future__ import annotations

import pytest

from app.modules.audit_logs.service import sanitize_metadata


def test_sanitize_removes_password() -> None:
    result = sanitize_metadata({'password': 'secret123', 'name': 'test'})
    assert result is not None
    assert result['password'] == '[REDACTED]'
    assert result['name'] == 'test'


def test_sanitize_removes_token() -> None:
    result = sanitize_metadata({'token': 'abc'})
    assert result is not None
    assert result['token'] == '[REDACTED]'


def test_sanitize_removes_api_key() -> None:
    result = sanitize_metadata({'api_key': 'sk-123'})
    assert result is not None
    assert result['api_key'] == '[REDACTED]'


def test_sanitize_removes_authorization() -> None:
    result = sanitize_metadata({'authorization': 'Bearer xyz'})
    assert result is not None
    assert result['authorization'] == '[REDACTED]'


def test_sanitize_removes_connection_string() -> None:
    result = sanitize_metadata({'connection_string': 'DefaultEndpoints...'})
    assert result is not None
    assert result['connection_string'] == '[REDACTED]'


def test_sanitize_removes_sas() -> None:
    result = sanitize_metadata({'sas': 'token123'})
    assert result is not None
    assert result['sas'] == '[REDACTED]'


def test_sanitize_removes_access_token() -> None:
    result = sanitize_metadata({'access_token': 'abc'})
    assert result is not None
    assert result['access_token'] == '[REDACTED]'


def test_sanitize_preserves_safe_keys() -> None:
    result = sanitize_metadata({'filename': 'report.pdf', 'size': 1024})
    assert result == {'filename': 'report.pdf', 'size': 1024}


def test_sanitize_none_returns_none() -> None:
    # The implementation returns the falsy value as-is, so None -> None
    result = sanitize_metadata(None)
    assert result is None


def test_sanitize_empty_dict() -> None:
    # Empty dict is falsy; implementation returns it as-is
    result = sanitize_metadata({})
    assert result == {}


def test_sanitize_case_insensitive() -> None:
    # Implementation uses k.lower() before matching sensitive keys
    result = sanitize_metadata({'PASSWORD': 'secret'})
    assert result is not None
    assert result['PASSWORD'] == '[REDACTED]'
