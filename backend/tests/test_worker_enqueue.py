from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from app.workers.enqueue import enqueue_job, enqueue_file_processing_task, enqueue_health_check_task


class TestEnqueueJob:
    def test_returns_none_when_jobs_disabled(self):
        with patch("app.workers.enqueue.get_settings") as mock_settings:
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = False
            result = enqueue_job("default", lambda: None)
        assert result is None

    def test_returns_job_id_when_enqueued(self):
        mock_queue = MagicMock()
        mock_job = MagicMock()
        mock_job.id = "test-job-id-123"
        mock_queue.enqueue.return_value = mock_job

        with patch("app.workers.enqueue.get_settings") as mock_settings,              patch("app.workers.enqueue.get_queue", return_value=mock_queue):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            result = enqueue_job("default", lambda: None)

        assert result == "test-job-id-123"

    def test_returns_none_when_queue_unavailable(self):
        with patch("app.workers.enqueue.get_settings") as mock_settings,              patch("app.workers.enqueue.get_queue", return_value=None):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            result = enqueue_job("default", lambda: None)
        assert result is None

    def test_returns_none_on_rq_exception(self):
        mock_queue = MagicMock()
        mock_queue.enqueue.side_effect = RuntimeError("Redis connection failed")

        with patch("app.workers.enqueue.get_settings") as mock_settings,              patch("app.workers.enqueue.get_queue", return_value=mock_queue):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            result = enqueue_job("default", lambda: None)
        assert result is None

    def test_does_not_raise_on_failure(self):
        with patch("app.workers.enqueue.get_settings") as mock_settings,              patch("app.workers.enqueue.get_queue", side_effect=Exception("total failure")):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            # Must not raise
            result = enqueue_job("default", lambda: None)
        assert result is None


class TestEnqueueFileProcessingTask:
    def test_returns_none_when_disabled(self):
        with patch("app.workers.enqueue.get_settings") as mock_settings:
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = False
            mock_settings.return_value.RQ_FILE_QUEUE = "files"
            result = enqueue_file_processing_task("test-file-id")
        assert result is None

    def test_passes_file_id_as_string(self):
        mock_queue = MagicMock()
        mock_job = MagicMock()
        mock_job.id = "job-abc"
        mock_queue.enqueue.return_value = mock_job

        with patch("app.workers.enqueue.get_settings") as mock_settings,              patch("app.workers.enqueue.get_queue", return_value=mock_queue):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            mock_settings.return_value.RQ_FILE_QUEUE = "files"
            enqueue_file_processing_task("550e8400-e29b-41d4-a716-446655440000")

        call_args = mock_queue.enqueue.call_args
        assert isinstance(call_args.args[1], str)


class TestEnqueueHealthCheckTask:
    def test_returns_none_when_disabled(self):
        with patch("app.workers.enqueue.get_settings") as mock_settings:
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = False
            mock_settings.return_value.RQ_DEFAULT_QUEUE = "default"
            result = enqueue_health_check_task()
        assert result is None

    def test_returns_job_id_when_enabled(self):
        mock_queue = MagicMock()
        mock_job = MagicMock()
        mock_job.id = "health-job-id"
        mock_queue.enqueue.return_value = mock_job

        with patch("app.workers.enqueue.get_settings") as mock_settings,              patch("app.workers.enqueue.get_queue", return_value=mock_queue):
            mock_settings.return_value.BACKGROUND_JOBS_ENABLED = True
            mock_settings.return_value.RQ_DEFAULT_QUEUE = "default"
            result = enqueue_health_check_task()

        assert result == "health-job-id"
