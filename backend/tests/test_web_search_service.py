"""Tests for the high-level web search service.

The service is the glue between the decider, the provider client, and the
normaliser. These tests verify that:

* When the decider says "no search", the provider is never called.
* When the provider raises, the failure is captured in ``search_error``
  rather than propagated.
* The full pipeline produces numbered citations with extracted domains.
* Forced mode is honoured even when the rule layer would skip.
"""

from __future__ import annotations

import sys
from types import ModuleType
from unittest.mock import MagicMock, patch


def _stub_openai() -> None:
    if "openai" not in sys.modules:
        fake_openai = ModuleType("openai")
        fake_openai.OpenAI = MagicMock()  # type: ignore[attr-defined]
        sys.modules["openai"] = fake_openai
        sys.modules.setdefault("openai.types", ModuleType("openai.types"))


_stub_openai()


from app.modules.web_search import service  # noqa: E402
from app.modules.web_search.exceptions import (  # noqa: E402
    WebSearchConfigurationError,
    WebSearchProviderError,
)
from app.modules.web_search.schemas import SearchResult, WebMode  # noqa: E402


def test_off_mode_does_not_call_provider() -> None:
    with patch.object(service.search_client, "search") as mock_search:
        outcome = service.run_search_for_message(
            message="latest news please",
            mode=WebMode.OFF,
        )
    mock_search.assert_not_called()
    assert outcome.used is False
    assert outcome.decision.should_search is False
    assert outcome.citations == []


def test_decider_no_search_does_not_call_provider() -> None:
    with patch.object(service.search_client, "search") as mock_search:
        outcome = service.run_search_for_message(
            message="Explain Python decorators",
            mode=WebMode.AUTO,
        )
    mock_search.assert_not_called()
    assert outcome.used is False


def test_forced_mode_runs_search_even_for_stable_topic() -> None:
    fake_result = SearchResult(
        title="Python docs",
        url="https://docs.python.org/3/",
        snippet="Tutorial",
    )
    with patch.object(service.search_client, "search", return_value=[fake_result]) as mock_search:
        outcome = service.run_search_for_message(
            message="Explain Python decorators",
            mode=WebMode.SEARCH,
        )

    mock_search.assert_called_once()
    assert outcome.used is True
    assert outcome.decision.decision_source == "forced"
    assert len(outcome.citations) == 1
    assert outcome.citations[0].index == 1
    assert outcome.citations[0].domain == "docs.python.org"


def test_provider_failure_is_captured_not_raised() -> None:
    with patch.object(
        service.search_client,
        "search",
        side_effect=WebSearchProviderError("Web search timed out."),
    ):
        outcome = service.run_search_for_message(
            message="latest FastAPI release",
            mode=WebMode.AUTO,
        )

    assert outcome.used is False
    assert outcome.decision.should_search is True
    assert outcome.search_error is not None
    assert "Web search" in outcome.search_error


def test_provider_configuration_error_is_captured() -> None:
    with patch.object(
        service.search_client,
        "search",
        side_effect=WebSearchConfigurationError("SearXNG not configured"),
    ):
        outcome = service.run_search_for_message(
            message="latest FastAPI release",
            mode=WebMode.AUTO,
        )

    assert outcome.used is False
    assert outcome.search_error == "SearXNG not configured"


def test_pipeline_produces_numbered_citations() -> None:
    fake_results = [
        SearchResult(
            title="FastAPI 0.115",
            url="https://fastapi.tiangolo.com/release-notes/",
            snippet="Release notes",
        ),
        SearchResult(
            title="Reddit thread",
            url="https://www.reddit.com/r/Python/comments/abc",
            snippet="Discussion",
        ),
    ]
    with patch.object(service.search_client, "search", return_value=fake_results):
        outcome = service.run_search_for_message(
            message="latest FastAPI release",
            mode=WebMode.AUTO,
        )

    assert outcome.used is True
    assert [c.index for c in outcome.citations] == [1, 2]
    assert outcome.citations[0].domain == "fastapi.tiangolo.com"
    assert outcome.citations[1].domain == "reddit.com"
