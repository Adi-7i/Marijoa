"""Normalisation and citation projection for raw search results.

Pipeline:

1. Drop results with empty title or URL — already enforced by the client but
   we double-check here so callers can normalise hand-crafted lists too.
2. Reject anything that isn't an ``http(s)://`` URL.
3. De-duplicate by URL (case-insensitive on scheme + host + path).
4. Truncate snippets to keep the prompt budget under control.
5. Extract a friendly ``domain`` for display.
6. Re-number into ``[1..N]`` :class:`CitationSource` entries while preserving
   the original ranking order.
"""

from __future__ import annotations

from urllib.parse import urlparse

from app.core.config import get_settings
from app.modules.web_search.schemas import CitationSource, SearchResult

_ALLOWED_SCHEMES: frozenset[str] = frozenset({"http", "https"})


def _truncate(text: str | None, limit: int) -> str | None:
    if text is None:
        return None
    stripped = text.strip()
    if not stripped:
        return None
    if len(stripped) <= limit:
        return stripped
    if limit <= 1:
        return stripped[:limit]
    return stripped[: limit - 1].rstrip() + "…"


def _canonical_url_key(url: str) -> str | None:
    """Lowercased ``scheme://host/path`` used for dedup.

    Strips query strings and fragments so two near-identical links pointing
    at the same page (e.g. with tracking params) collapse to one. Returns
    ``None`` for URLs we wouldn't surface anyway (non-http(s), missing host).
    """
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    scheme = (parsed.scheme or "").lower()
    if scheme not in _ALLOWED_SCHEMES:
        return None
    host = (parsed.hostname or "").lower()
    if not host:
        return None
    path = parsed.path or "/"
    return f"{scheme}://{host}{path}"


def _domain_of(url: str) -> str | None:
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    host = (parsed.hostname or "").lower()
    if not host:
        return None
    if host.startswith("www."):
        host = host[4:]
    return host or None


def normalize_results(
    results: list[SearchResult],
    *,
    snippet_max_chars: int | None = None,
    context_max_chars: int | None = None,
) -> list[CitationSource]:
    """Turn raw search results into numbered :class:`CitationSource` items.

    Args:
        results: Raw, possibly noisy results from the search provider.
        snippet_max_chars: Override for the per-snippet truncation cap.
        context_max_chars: Override for the total snippet-character budget
            across all surviving citations.

    Returns:
        Citations with 1-based indices, in original ranking order.
    """
    settings = get_settings()
    snippet_cap = (
        snippet_max_chars
        if snippet_max_chars is not None
        else settings.WEB_SEARCH_RESULT_MAX_SNIPPET_CHARS
    )
    context_cap = (
        context_max_chars
        if context_max_chars is not None
        else settings.WEB_SEARCH_CONTEXT_MAX_CHARS
    )

    seen: set[str] = set()
    citations: list[CitationSource] = []
    total_chars = 0
    next_index = 1

    for result in results:
        if not result.title or not result.url:
            continue

        key = _canonical_url_key(result.url)
        if key is None or key in seen:
            continue
        seen.add(key)

        snippet = _truncate(result.snippet, snippet_cap)
        snippet_len = len(snippet) if snippet else 0

        # Enforce the global character budget. If a snippet would push us
        # over, drop the snippet but keep the citation — the link is still
        # useful even when the body is omitted.
        if context_cap and snippet_len + total_chars > context_cap:
            remaining = max(0, context_cap - total_chars)
            if remaining <= 0:
                snippet = None
                snippet_len = 0
            else:
                snippet = _truncate(snippet, remaining)
                snippet_len = len(snippet) if snippet else 0

        total_chars += snippet_len

        citations.append(
            CitationSource(
                index=next_index,
                title=result.title.strip(),
                url=result.url.strip(),
                snippet=snippet,
                domain=_domain_of(result.url),
            )
        )
        next_index += 1

    return citations
