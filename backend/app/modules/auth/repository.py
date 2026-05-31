from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.auth.model import RefreshToken
from app.utils.datetime_utils import utc_now


def create_refresh_token(
    db: Session,
    *,
    user_id: UUID,
    token_hash: str,
    expires_at: datetime,
    created_by_ip: str | None = None,
    user_agent: str | None = None,
) -> RefreshToken:
    token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        created_by_ip=created_by_ip,
        user_agent=user_agent,
    )
    db.add(token)
    db.flush()
    return token


def get_token_by_hash(db: Session, token_hash: str) -> RefreshToken | None:
    return db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))


def revoke_token(db: Session, token: RefreshToken) -> RefreshToken:
    token.revoked_at = utc_now()
    db.flush()
    return token
