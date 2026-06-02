from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import Field

from app.schemas.base import AppSchema


class WebMode(str, Enum):
    """Per-request web access mode for the AI gateway.

    * ``AUTO`` (default) — backend decides whether to search based on rule
      triggers and an optional LLM decider for ambiguous queries.
    * ``OFF`` — never search, even if the message clearly requests current
      information. Useful for fully private answers.
    * ``SEARCH`` — force a web search regardless of triggers; the user
      explicitly wants the model grounded in current sources.
    """

    AUTO = "auto"
    OFF = "off"
    SEARCH = "search"


DecisionSource = Literal["rule", "llm", "forced", "off"]


class SearchDecision(AppSchema):
    """Result of the Search Decision Layer.

    Lives entirely server-side. Stored verbatim into assistant message
    metadata so the UI can later show *why* (or why not) the model used the
    web — useful for auditing and debugging.
    """

    should_search: bool
    reason: str
    queries: list[str] = Field(default_factory=list)
    mode: WebMode
    decision_source: DecisionSource


class SearchResult(AppSchema):
    """A single raw result returned by the search provider.

    All fields except ``title`` and ``url`` are optional because different
    SearXNG engines populate different subsets. Snippets, dates, scores, and
    engine names are best-effort.
    """

    title: str
    url: str
    snippet: str | None = None
    source: str | None = None
    engine: str | None = None
    score: float | None = None
    published_date: str | None = None


class WebSearchResponse(AppSchema):
    """Payload returned by the optional admin /web/search endpoint."""

    query: str
    results: list[SearchResult]


class CitationSource(AppSchema):
    """A numbered source attached to an assistant answer.

    The ``index`` is 1-based and matches the ``[1]``, ``[2]`` markers the
    model is instructed to use inline. The ``domain`` is computed by the
    backend and surfaced so the frontend can render cleanly without parsing
    URLs again.
    """

    index: int
    title: str
    url: str
    snippet: str | None = None
    domain: str | None = None
