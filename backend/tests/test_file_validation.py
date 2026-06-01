"""Unit tests for filename sanitization and blob name generation helpers.

Imports the private helper functions directly from service.py so no database
or Azure calls are needed.
"""
from __future__ import annotations

from uuid import uuid4

import pytest

from app.modules.files.service import _generate_blob_name, _sanitize_filename


# ---------------------------------------------------------------------------
# _sanitize_filename
# ---------------------------------------------------------------------------


def test_sanitize_filename_normal() -> None:
    assert _sanitize_filename("report.pdf") == "report.pdf"


def test_sanitize_filename_removes_path_traversal() -> None:
    result = _sanitize_filename("../../etc/passwd")
    assert "/" not in result
    assert ".." not in result


def test_sanitize_filename_handles_special_chars() -> None:
    result = _sanitize_filename("my file (1).pdf")
    # All characters in the result must be word chars, dash, dot, parens, or space
    assert result  # non-empty
    # No shell-dangerous characters like `;`, `&`, `|`, `$`, etc.
    for ch in (";", "&", "|", "$", "`", "\\"):
        assert ch not in result


def test_sanitize_filename_empty_becomes_file() -> None:
    assert _sanitize_filename("") == "file"


def test_sanitize_filename_strips_leading_dots() -> None:
    result = _sanitize_filename(".hidden.txt")
    assert not result.startswith(".")


def test_sanitize_filename_absolute_path() -> None:
    result = _sanitize_filename("/etc/shadow")
    assert "/" not in result


def test_sanitize_filename_max_length() -> None:
    long_name = "a" * 300 + ".pdf"
    result = _sanitize_filename(long_name)
    assert len(result) <= 200


# ---------------------------------------------------------------------------
# _generate_blob_name
# ---------------------------------------------------------------------------


def test_generate_blob_name_format() -> None:
    org_id = uuid4()
    ws_id = uuid4()
    file_id = uuid4()
    filename = "report.pdf"

    result = _generate_blob_name(org_id, ws_id, file_id, filename)

    assert str(org_id) in result
    assert str(ws_id) in result
    assert str(file_id) in result
    assert filename in result


def test_generate_blob_name_safe_path() -> None:
    org_id = uuid4()
    ws_id = uuid4()
    file_id = uuid4()

    result = _generate_blob_name(org_id, ws_id, file_id, "safe.txt")
    assert ".." not in result


def test_generate_blob_name_includes_hierarchy() -> None:
    org_id = uuid4()
    ws_id = uuid4()
    file_id = uuid4()

    result = _generate_blob_name(org_id, ws_id, file_id, "data.csv")
    assert "organizations/" in result
    assert "workspaces/" in result
    assert "files/" in result
