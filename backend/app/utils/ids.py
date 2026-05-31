from __future__ import annotations

from uuid import UUID, uuid4


def new_uuid() -> UUID:
    """Generate a new random UUID v4.

    Centralised here so the generation strategy can be changed in one place
    if the project ever moves to ordered UUIDs (e.g. UUIDv7) for index locality.
    """
    return uuid4()
