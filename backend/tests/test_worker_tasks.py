from __future__ import annotations

import pytest

from app.workers.tasks.health import background_health_check
from app.workers.tasks.files import process_uploaded_file


class TestBackgroundHealthCheck:
    def test_returns_ok_status(self):
        result = background_health_check()
        assert result["status"] == "ok"

    def test_returns_worker_alive(self):
        result = background_health_check()
        assert result["worker"] == "alive"

    def test_returns_dict(self):
        result = background_health_check()
        assert isinstance(result, dict)


class TestProcessUploadedFile:
    def test_returns_skipped_status(self):
        result = process_uploaded_file("550e8400-e29b-41d4-a716-446655440000")
        assert result["status"] == "skipped"

    def test_returns_file_id(self):
        file_id = "550e8400-e29b-41d4-a716-446655440000"
        result = process_uploaded_file(file_id)
        assert result["file_id"] == file_id

    def test_returns_mvp_reason(self):
        result = process_uploaded_file("550e8400-e29b-41d4-a716-446655440000")
        assert "MVP" in result["reason"] or "not implemented" in result["reason"]

    def test_handles_empty_string(self):
        result = process_uploaded_file("")
        assert result["status"] == "error"

    def test_handles_valid_uuid_string(self):
        result = process_uploaded_file("00000000-0000-0000-0000-000000000001")
        assert result["status"] == "skipped"
        assert result["file_id"] == "00000000-0000-0000-0000-000000000001"
