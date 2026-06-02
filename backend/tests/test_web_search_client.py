"""Tests for the SearXNG HTTP client.

All network access is mocked via :mod:`unittest.mock` — no real HTTP calls
are made. The client must:

* Reject missing configuration cleanly.
* Map httpx timeouts and transport errors to a sanitised
  :class:`WebSearchProviderError`.
* Parse SearXNG's ``results`` list, normalising ``content`` → ``snippet``
  and ``publishedDate`` → ``published_date``.
* Drop rows that lack title or URL.
* Respect the ``SEARXNG_MAX_RESULTS`` cap.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.modules.web_search import search_client
from app.modules.web_search.exceptions import (
    WebSearchConfigurationError,
    WebSearchProviderError,
)


def _make_response(payload, status_code: int = 200) -> MagicMock:
    response = MagicMock()
    response.status_code = status_code
    if isinstance(payload, Exception):
        response.json.side_effect = payload
    else:
        response.json.return_value = payload
    return response


@pytest.fixture
def configured_settings(monkeypatch):
    settings = search_client.get_settings()
    monkeypatch.setattr(settings, "WEB_SEARCH_ENABLED", True)
    monkeypatch.setattr(settings, "SEARXNG_BASE_URL", "https://searxng.example.com")
    monkeypatch.setattr(settings, "SEARXNG_SEARCH_PATH", "/search")
    monkeypatch.setattr(settings, "SEARXNG_TIMEOUT_SECONDS", 5)
    monkeypatch.setattr(settings, "SEARXNG_MAX_RESULTS", 4)
    monkeypatch.setattr(settings, "SEARXNG_SAFESEARCH", 1)
    return settings


def test_missing_base_url_raises_configuration_error(monkeypatch) -> None:
    settings = search_client.get_settings()
    monkeypatch.setattr(settings, "WEB_SEARCH_ENABLED", True)
    monkeypatch.setattr(settings, "SEARXNG_BASE_URL", "")

    with pytest.raises(WebSearchConfigurationError):
        search_client.search("hello")


def test_disabled_search_raises_configuration_error(monkeypatch) -> None:
    settings = search_client.get_settings()
    monkeypatch.setattr(settings, "WEB_SEARCH_ENABLED", False)

    with pytest.raises(WebSearchConfigurationError):
        search_client.search("hello")


def test_empty_query_returns_empty_list(configured_settings) -> None:
    with patch.object(httpx, "get") as mock_get:
        results = search_client.search("   ")
    assert results == []
    mock_get.assert_not_called()


def test_parses_searxng_json_payload(configured_settings) -> None:
    payload = {
        "results": [
            {
                "title": "FastAPI 0.115 released",
                "url": "https://fastapi.tiangolo.com/release-notes/",
                "content": "Snippet about the release",
                "engine": "google",
                "score": 0.92,
                "publishedDate": "2026-05-01",
            },
            {
                "title": "Another article",
                "url": "https://example.com/article",
                "content": "More info",
            },
        ]
    }

    with patch.object(httpx, "get", return_value=_make_response(payload)) as mock_get:
        results = search_client.search("fastapi release")

    assert len(results) == 2
    first = results[0]
    assert first.title == "FastAPI 0.115 released"
    assert first.url == "https://fastapi.tiangolo.com/release-notes/"
    assert first.snippet == "Snippet about the release"
    assert first.engine == "google"
    assert first.score == pytest.approx(0.92)
    assert first.published_date == "2026-05-01"

    # The client sends the configured params
    args, kwargs = mock_get.call_args
    assert args[0] == "https://searxng.example.com/search"
    assert kwargs["params"]["q"] == "fastapi release"
    assert kwargs["params"]["format"] == "json"
    assert kwargs["params"]["safesearch"] == "1"


def test_drops_rows_missing_title_or_url(configured_settings) -> None:
    payload = {
        "results": [
            {"title": "Valid", "url": "https://a.example.com"},
            {"title": "", "url": "https://b.example.com"},  # missing title
            {"title": "No URL", "url": ""},
            {"url": "https://c.example.com"},  # missing title field entirely
        ]
    }
    with patch.object(httpx, "get", return_value=_make_response(payload)):
        results = search_client.search("hello")

    assert len(results) == 1
    assert results[0].title == "Valid"


def test_respects_max_results_cap(configured_settings) -> None:
    payload = {
        "results": [
            {"title": f"Result {i}", "url": f"https://example.com/{i}"}
            for i in range(10)
        ]
    }
    with patch.object(httpx, "get", return_value=_make_response(payload)):
        results = search_client.search("hello")

    # configured_settings sets SEARXNG_MAX_RESULTS=4
    assert len(results) == 4


def test_timeout_maps_to_provider_error(configured_settings) -> None:
    with patch.object(
        httpx,
        "get",
        side_effect=httpx.TimeoutException("slow"),
    ):
        with pytest.raises(WebSearchProviderError):
            search_client.search("hello")


def test_transport_error_maps_to_provider_error(configured_settings) -> None:
    with patch.object(httpx, "get", side_effect=httpx.HTTPError("boom")):
        with pytest.raises(WebSearchProviderError):
            search_client.search("hello")


def test_http_5xx_maps_to_provider_error(configured_settings) -> None:
    response = _make_response({"results": []}, status_code=503)
    with patch.object(httpx, "get", return_value=response):
        with pytest.raises(WebSearchProviderError):
            search_client.search("hello")


def test_non_dict_payload_returns_empty(configured_settings) -> None:
    response = _make_response(["not", "a", "dict"])
    with patch.object(httpx, "get", return_value=response):
        results = search_client.search("hello")
    assert results == []


def test_invalid_json_maps_to_provider_error(configured_settings) -> None:
    response = _make_response(ValueError("bad json"))
    with patch.object(httpx, "get", return_value=response):
        with pytest.raises(WebSearchProviderError):
            search_client.search("hello")
