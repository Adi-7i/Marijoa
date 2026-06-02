"""Thin HTTP client for a self-hosted SearXNG JSON endpoint.

The client deliberately stays minimal:

* Reads configuration from :class:`~app.core.config.Settings` — no hard-coded
  URLs or API keys live in the codebase.
* Surfaces a single :func:`search` function that returns a list of
  :class:`~app.modules.web_search.schemas.SearchResult` objects.
* Wraps every networking / parsing failure in
  :class:`~app.modules.web_search.exceptions.WebSearchProviderError` so
  callers can return a clean SSE error event without leaking provider
  internals.

SearXNG returns slightly different field names depending on the engines it
queried; this module normalises ``content``/``publishedDate`` etc. into the
stable schema used everywhere else in the codebase.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings
from app.modules.web_search.exceptions import (
    WebSearchConfigurationError,
    WebSearchProviderError,
)
from app.modules.web_search.schemas import SearchResult

logger = logging.getLogger(__name__)


def _coerce_str(value: Any) -> str | None:
    """Return *value* as a stripped string or ``None`` if not usable."""
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    try:
        return str(value)
    except Exception:  # noqa: BLE001
        return None


def _coerce_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_result(raw: dict[str, Any]) -> SearchResult | None:
    """Map a single SearXNG result dict into :class:`SearchResult`.

    Returns ``None`` if the result is missing both title and URL — these
    fields are required for the citation pipeline to do anything meaningful
    with them, so unusable rows are dropped early.
    """
    title = _coerce_str(raw.get("title"))
    url = _coerce_str(raw.get("url"))
    if not title or not url:
        return None

    # SearXNG uses ``content`` for snippets; some engines may already have
    # ``snippet`` set (e.g. via plugins) — accept either.
    snippet = _coerce_str(raw.get("snippet")) or _coerce_str(raw.get("content"))

    # SearXNG can expose a publishedDate (camelCase) on time-aware engines.
    published_date = _coerce_str(raw.get("publishedDate")) or _coerce_str(
        raw.get("published_date")
    )

    return SearchResult(
        title=title,
        url=url,
        snippet=snippet,
        source=_coerce_str(raw.get("source")),
        engine=_coerce_str(raw.get("engine")),
        score=_coerce_float(raw.get("score")),
        published_date=published_date,
    )


def search(query: str, *, max_results: int | None = None) -> list[SearchResult]:
    """Call SearXNG and return parsed :class:`SearchResult` objects.

    Args:
        query: Search-engine-ready query string.
        max_results: Optional override for the configured
            ``SEARXNG_MAX_RESULTS`` cap.

    Raises:
        WebSearchConfigurationError: If SearXNG base URL is missing.
        WebSearchProviderError: On network, timeout, or parse failure.
    """
    settings = get_settings()

    if not settings.WEB_SEARCH_ENABLED:
        raise WebSearchConfigurationError("Web search is disabled in configuration")

    base_url = (settings.SEARXNG_BASE_URL or "").strip().rstrip("/")
    if not base_url:
        raise WebSearchConfigurationError(
            "SEARXNG_BASE_URL is not set. Configure it in the backend environment."
        )

    cleaned_query = (query or "").strip()
    if not cleaned_query:
        # An empty query would just produce empty results from SearXNG; bail
        # early so callers see a deterministic empty list.
        return []

    limit = max_results if max_results is not None else settings.SEARXNG_MAX_RESULTS
    if limit < 1:
        limit = 1

    path = settings.SEARXNG_SEARCH_PATH
    if not path.startswith("/"):
        path = "/" + path
    url = base_url + path

    params = {
        "q": cleaned_query,
        "format": "json",
        "safesearch": str(settings.SEARXNG_SAFESEARCH),
    }

    timeout = float(settings.SEARXNG_TIMEOUT_SECONDS)

    try:
        response = httpx.get(
            url,
            params=params,
            timeout=timeout,
            headers={"Accept": "application/json"},
            follow_redirects=True,
        )
    except httpx.TimeoutException as exc:
        # Log full detail server-side; surface a clean error to callers.
        logger.warning("SearXNG request timed out after %ss", timeout)
        raise WebSearchProviderError(
            "Web search request timed out. Please try again."
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("SearXNG request failed: %s", type(exc).__name__)
        raise WebSearchProviderError(
            "Web search service is temporarily unavailable."
        ) from exc

    if response.status_code >= 400:
        logger.warning(
            "SearXNG returned HTTP %s for query length=%d",
            response.status_code,
            len(cleaned_query),
        )
        raise WebSearchProviderError(
            "Web search service is temporarily unavailable."
        )

    try:
        payload: Any = response.json()
    except ValueError as exc:
        logger.warning("SearXNG returned invalid JSON")
        raise WebSearchProviderError(
            "Web search service returned an unexpected response."
        ) from exc

    if not isinstance(payload, dict):
        logger.warning("SearXNG returned non-object payload: %s", type(payload).__name__)
        return []

    raw_results = payload.get("results")
    if not isinstance(raw_results, list):
        return []

    parsed: list[SearchResult] = []
    for raw in raw_results:
        if not isinstance(raw, dict):
            continue
        result = _parse_result(raw)
        if result is not None:
            parsed.append(result)
        if len(parsed) >= limit:
            break

    return parsed
