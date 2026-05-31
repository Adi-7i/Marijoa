from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class AppSchema(BaseModel):
    """Common Pydantic base for all application schemas.

    - `from_attributes=True`  enables reading directly from SQLAlchemy ORM objects.
    - `populate_by_name=True` allows field aliases and original names interchangeably.
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
