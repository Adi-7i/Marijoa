"""Tests for result normalisation and citation projection."""

from __future__ import annotations

from app.modules.web_search.result_normalizer import normalize_results
from app.modules.web_search.schemas import SearchResult


def _r(title: str, url: str, snippet: str | None = None) -> SearchResult:
    return SearchResult(title=title, url=url, snippet=snippet)


def test_drops_results_with_empty_fields() -> None:
    results = [
        _r("Valid", "https://example.com/a"),
        SearchResult(title="", url="https://example.com/b"),
    ]
    citations = normalize_results(results)
    assert len(citations) == 1
    assert citations[0].index == 1
    assert citations[0].title == "Valid"


def test_deduplicates_by_canonical_url() -> None:
    results = [
        _r("First", "https://Example.com/a?utm=1"),
        _r("Second", "https://example.com/a"),
        _r("Third", "http://example.com/a"),  # scheme differs → kept
    ]
    citations = normalize_results(results)
    # The two https URLs (with and without utm) collapse to one canonical key;
    # the http variant is a different scheme and survives.
    assert len(citations) == 2
    assert citations[0].title == "First"
    assert citations[1].title == "Third"


def test_rejects_non_http_urls() -> None:
    results = [
        _r("File", "file:///etc/passwd"),
        _r("FTP", "ftp://example.com/x"),
        _r("Http", "http://example.com/x"),
    ]
    citations = normalize_results(results)
    assert len(citations) == 1
    assert citations[0].url == "http://example.com/x"


def test_truncates_long_snippets() -> None:
    long_snippet = "x" * 1000
    results = [_r("T", "https://example.com/a", snippet=long_snippet)]
    citations = normalize_results(results, snippet_max_chars=50)
    assert citations[0].snippet is not None
    assert len(citations[0].snippet) <= 50
    assert citations[0].snippet.endswith("…")


def test_extracts_domain_without_www() -> None:
    results = [
        _r("A", "https://www.example.com/path"),
        _r("B", "https://news.example.org/x"),
    ]
    citations = normalize_results(results)
    assert citations[0].domain == "example.com"
    assert citations[1].domain == "news.example.org"


def test_indexes_are_one_based_and_sequential() -> None:
    results = [
        _r("a", "https://example.com/1"),
        _r("b", "https://example.com/2"),
        _r("c", "https://example.com/3"),
    ]
    citations = normalize_results(results)
    assert [c.index for c in citations] == [1, 2, 3]


def test_respects_total_context_budget() -> None:
    big = "x" * 400
    results = [
        _r("a", "https://example.com/1", snippet=big),
        _r("b", "https://example.com/2", snippet=big),
        _r("c", "https://example.com/3", snippet=big),
    ]
    citations = normalize_results(
        results,
        snippet_max_chars=400,
        context_max_chars=500,
    )
    # All citations should still appear, but later snippets get trimmed/dropped
    # once the total budget is exhausted.
    assert len(citations) == 3
    total_chars = sum(len(c.snippet or "") for c in citations)
    assert total_chars <= 500
