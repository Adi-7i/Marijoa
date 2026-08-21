"""Optional authenticated admin endpoint for verifying SearXNG integration.

Lives under ``/web/search`` (no ``/api/v1`` prefix — that's applied globally
by :func:`app.api.build_api_router`). Any authenticated user can call it, but
the route exists mainly for ops/dev verification — the AI gateway uses the
service module directly and never depends on this endpoint.

The route deliberately does NOT expose the configured SearXNG base URL or
any provider error details to clients beyond the sanitised messages already
defined in :mod:`app.modules.web_search.exceptions`.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import Field

from app.modules.auth.dependencies import require_authenticated_user
from app.modules.users.model import User
from app.modules.web_search import service
from app.modules.web_search.schemas import WebSearchResponse
from app.schemas.base import AppSchema

router = APIRouter(prefix="/web", tags=["web-search"])


class WebSearchAdminRequest(AppSchema):
    query: str = Field(min_length=1, max_length=500)


@router.post(
    "/search",
    response_model=WebSearchResponse,
    status_code=200,
    summary="Run a one-off web search via the configured provider",
    description=(
        "Authenticated diagnostic endpoint. Calls the configured search "
        "provider (SearXNG) and returns the normalised raw results. "
        "Intended for ops/dev verification; the AI gateway uses the search "
        "service directly. Returns 503 with a sanitised error code if the "
        "provider is unreachable or misconfigured."
    ),
)
async def admin_search(
    body: WebSearchAdminRequest,
    _current_user: Annotated[User, Depends(require_authenticated_user)],
) -> WebSearchResponse:
    query, results = service.admin_search(body.query)
    return WebSearchResponse(query=query, results=results)
