from __future__ import annotations

from typing import Annotated, Generic, Sequence, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")

# Reasonable upper bound prevents abusive page_size values in future API usage.
MAX_PAGE_SIZE = 100


class PageParams(BaseModel):
    """Query parameter model for paginated endpoints.

    Usage as a FastAPI dependency:

        @router.get("/items")
        def list_items(params: Annotated[PageParams, Depends()]) -> Page[ItemRead]:
            ...
    """

    page: Annotated[int, Field(ge=1, default=1, description="1-based page number")]
    page_size: Annotated[
        int,
        Field(ge=1, le=MAX_PAGE_SIZE, default=20, description="Items per page"),
    ]

    def limit(self) -> int:
        return self.page_size

    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class Page(BaseModel, Generic[T]):
    """Generic paginated response wrapper.

    Usage:

        return Page[UserRead].create(items=users, total=count, params=page_params)
    """

    items: Sequence[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def create(
        cls,
        *,
        items: Sequence[T],
        total: int,
        params: PageParams,
    ) -> "Page[T]":
        pages = max(1, -(-total // params.page_size))  # ceiling division
        return cls(
            items=items,
            total=total,
            page=params.page,
            page_size=params.page_size,
            pages=pages,
        )
