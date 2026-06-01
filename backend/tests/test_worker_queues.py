from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.workers.queues import get_queue, get_default_queue, get_file_queue, get_ai_queue


class TestGetQueue:
    def test_returns_none_when_jobs_disabled(self):
        with patch("app.workers.queues.get_settings") as mock_settings:
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = False
            result = get_queue("default")
        assert result is None

    def test_returns_none_when_redis_disabled(self):
        with patch("app.workers.queues.get_settings") as mock_settings,              patch("app.workers.queues._build_connection", return_value=None):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            result = get_queue("default")
        assert result is None

    def test_returns_queue_with_correct_name(self):
        mock_conn = MagicMock()
        mock_queue_cls = MagicMock()
        mock_queue_instance = MagicMock()
        mock_queue_cls.return_value = mock_queue_instance

        with patch("app.workers.queues.get_settings") as mock_settings,              patch("app.workers.queues._build_connection", return_value=mock_conn),              patch("app.workers.queues._RQ_AVAILABLE", True),              patch("app.workers.queues.Queue", mock_queue_cls):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            mock_settings.return_value.RQ_JOB_TIMEOUT_SECONDS = 600
            mock_settings.return_value.RQ_JOB_RESULT_TTL_SECONDS = 3600
            mock_settings.return_value.RQ_JOB_FAILURE_TTL_SECONDS = 86400
            result = get_queue("files")

        assert result is mock_queue_instance
        mock_queue_cls.assert_called_once_with(
            "files",
            connection=mock_conn,
            default_timeout=600,
            result_ttl=3600,
            failure_ttl=86400,
        )

    def test_returns_none_when_rq_not_available(self):
        mock_conn = MagicMock()
        with patch("app.workers.queues.get_settings") as mock_settings,              patch("app.workers.queues._build_connection", return_value=mock_conn),              patch("app.workers.queues._RQ_AVAILABLE", False):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            result = get_queue("default")
        assert result is None


class TestQueueFactories:
    def test_get_default_queue_uses_default_queue_name(self):
        with patch("app.workers.queues.get_settings") as mock_settings,              patch("app.workers.queues.get_queue", return_value=None) as mock_gq:
            mock_settings.return_value.RQ_DEFAULT_QUEUE = "default"
            get_default_queue()
        mock_gq.assert_called_once_with("default")

    def test_get_file_queue_uses_file_queue_name(self):
        with patch("app.workers.queues.get_settings") as mock_settings,              patch("app.workers.queues.get_queue", return_value=None) as mock_gq:
            mock_settings.return_value.RQ_FILE_QUEUE = "files"
            get_file_queue()
        mock_gq.assert_called_once_with("files")

    def test_get_ai_queue_uses_ai_queue_name(self):
        with patch("app.workers.queues.get_settings") as mock_settings,              patch("app.workers.queues.get_queue", return_value=None) as mock_gq:
            mock_settings.return_value.RQ_AI_QUEUE = "ai"
            get_ai_queue()
        mock_gq.assert_called_once_with("ai")
