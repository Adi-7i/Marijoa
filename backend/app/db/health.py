from __future__ import annotations

import logging

from sqlalchemy import text

from app.db.session import SessionLocal

logger = logging.getLogger(__name__)


def check_database_connectivity() -> bool:
    """Execute a lightweight SELECT 1 probe against the configured database.

    Returns True when the database is reachable, False otherwise.
    The error type is logged but never propagated to callers — this function
    must not raise and must never leak credentials in log output.
    """
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error(
            "Database connectivity check failed: %s",
            type(exc).__name__,
        )
        return False
