from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.model import User
from app.modules.users.schemas import UserCreateInternal, UserUpdateInternal


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.scalar(select(User).where(User.id == user_id))


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def create_user(db: Session, data: UserCreateInternal) -> User:
    """Persist a new user row and flush to apply DB-level defaults.

    The caller is responsible for committing the session after this returns.
    Email is stored in the form received from `data` — schema validation
    guarantees it is already normalised to lowercase.
    """
    user = User(
        full_name=data.full_name,
        email=data.email,
        password_hash=data.password_hash,
        avatar_url=data.avatar_url,
    )
    db.add(user)
    db.flush()  # pushes SQL within the open transaction; no commit yet
    return user


def update_user(db: Session, user: User, data: UserUpdateInternal) -> User:
    """Apply a partial update to an existing user.

    Only fields that were explicitly provided in `data` are written.
    The caller is responsible for committing the session.
    """
    changes = data.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(user, field, value)
    db.flush()
    return user
