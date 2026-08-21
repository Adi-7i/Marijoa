"""High-level web search service used by the AI Gateway.

This is the only entry point the gateway needs:

* :func:`run_search_for_message` — given a user message and a web mode,
  decide whether to search, run the search if so, normalise the results,
  and return a structured outcome.

The service intentionally catches search-provider failures and returns a
structured failure (``search_error``) rather than raising — the AI can still
answer without web context, and the SSE stream must keep flowing.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.modules.web_search import search_client, search_decider
from app.modules.web_search.exceptions import (
    WebSearchConfigurationError,
    WebSearchProviderError,
)
from app.modules.web_search.result_normalizer import normalize_results
from app.modules.web_search.schemas import (
    CitationSource,
    SearchDecision,
    SearchResult,
    WebMode,
)

logger = logging.getLogger(__name__)


@dataclass
class WebSearchOutcome:
    """Result of running the search pipeline for a single user turn."""

    decision: SearchDecision
    citations: list[CitationSource]
    raw_results: list[SearchResult]
    search_error: str | None = None

    @property
    def used(self) -> bool:
        """``True`` when at least one citation made it through the pipeline."""
        return bool(self.citations)


def _safe_search(query: str) -> tuple[list[SearchResult], str | None]:
    """Run the provider call, swallowing handled errors.

    Returns ``(results, error_message)``. ``error_message`` is ``None`` on
    success. Configuration errors propagate the message as-is so callers can
    distinguish "search is off" from "search failed".
    """
    try:
        results = search_client.search(query)
    except WebSearchConfigurationError as exc:
        return [], exc.message
    except WebSearchProviderError as exc:
        return [], exc.message
    except Exception:  # noqa: BLE001
        logger.exception("Unexpected error in web search client")
        return [], "Web search service is temporarily unavailable."
    return results, None


def run_search_for_message(
    *,
    message: str,
    mode: WebMode,
) -> WebSearchOutcome:
    """Decide and (optionally) execute a web search for a user message.

    Args:
        message: The user's current message text.
        mode: Requested web access mode (auto/off/search).

    Returns:
        A :class:`WebSearchOutcome` containing the decision, any retrieved
        citations, the raw results (for logging/debugging), and a
        ``search_error`` message when the provider failed.
    """
    decision = search_decider.decide(message=message, mode=mode)

    # Developer observability logging (never exposed to UI)
    intent_guess = "UNKNOWN"
    freshness = "UNKNOWN"
    tool = "UNKNOWN"

    if decision.mode == WebMode.OFF:
        intent_guess = "STATIC"
        freshness = "NOT_REQUESTED"
        tool = "NONE"
    elif "System utility" in decision.reason:
        intent_guess = "CURRENT_TIME"
        freshness = "LIVE"
        tool = "TIME"
    elif not decision.should_search:
        intent_guess = "STATIC_KNOWLEDGE"
        freshness = "STATIC"
        tool = "NONE"
    else:
        intent_guess = "CURRENT_RESEARCH"
        freshness = "LIVE"
        tool = "SEARXNG"

    log_block = (
        "\n--- ROUTING DECISION ---\n"
        f"Query:\n{message!r}\n\n"
        f"Intent:\n{intent_guess}\n\n"
        f"Freshness:\n{freshness}\n\n"
        f"Tool:\n{tool}\n\n"
        f"Web search:\n{'REQUIRED' if decision.should_search else 'NOT REQUIRED'}\n"
        "------------------------"
    )
    logger.info(log_block)

    if not decision.should_search or not decision.queries:
        return WebSearchOutcome(
            decision=decision,
            citations=[],
            raw_results=[],
            search_error=None,
        )

    aggregated: list[SearchResult] = []
    last_error: str | None = None

    for query in decision.queries:
        results, err = _safe_search(query)
        if err:
            last_error = err
            # Keep trying additional queries — one engine being unreachable
            # shouldn't kill the whole search round.
            continue
        aggregated.extend(results)

    if not aggregated:
        return WebSearchOutcome(
            decision=decision,
            citations=[],
            raw_results=[],
            search_error=last_error,
        )

    citations = normalize_results(aggregated)
    return WebSearchOutcome(
        decision=decision,
        citations=citations,
        raw_results=aggregated,
        search_error=None if citations else last_error,
    )


def admin_search(query: str) -> tuple[str, list[SearchResult]]:
    """Run a one-off search for the admin diagnostic endpoint.

    Re-raises :class:`WebSearchConfigurationError` /
    :class:`WebSearchProviderError` unchanged so the FastAPI exception
    handler can map them to 503 responses with stable error codes.
    """
    cleaned = (query or "").strip()
    if not cleaned:
        return cleaned, []
    results = search_client.search(cleaned)
    return cleaned, results
