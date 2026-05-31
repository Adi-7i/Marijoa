from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.audit_logs import repository as repo

logger = logging.getLogger(__name__)

_SENSITIVE_KEYS = frozenset([
    'password',
    'token',
    'secret',
    'api_key',
    'authorization',
    'connection_string',
    'sas',
    'key',
    'access_token',
    'refresh_token',
    'password_hash',
    'api_secret',
])


def sanitize_metadata(metadata: dict | None) -> dict | None:
    if not metadata:
        return metadata
    return {
        k: '[REDACTED]' if any(s in k.lower() for s in _SENSITIVE_KEYS) else v
        for k, v in metadata.items()
        if isinstance(k, str)
    }


def record_event(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    user_id: UUID | None = None,
    organization_id: UUID | None = None,
    workspace_id: UUID | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    try:
        safe_meta = sanitize_metadata(metadata)
        repo.create_audit_log(
            db,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            organization_id=organization_id,
            workspace_id=workspace_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata_json=safe_meta,
        )
    except Exception as exc:
        logger.warning('Audit log creation failed for action %s: %s', action, type(exc).__name__)
        # Non-blocking: do not re-raise. Audit failure must not crash the main request.


def list_events(
    db: Session,
    *,
    workspace_id: UUID | None = None,
    user_id: UUID | None = None,
    action: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list:
    return repo.list_audit_logs(
        db,
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        limit=limit,
        offset=offset,
    )
