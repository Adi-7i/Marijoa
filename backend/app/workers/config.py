from __future__ import annotations

from app.core.config import get_settings


def get_worker_settings():
    """Return settings relevant to background workers."""
    return get_settings()
