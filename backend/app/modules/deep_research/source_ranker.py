from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse, urlunparse

from app.modules.web_search.schemas import SearchResult


@dataclass
class RankedSource:
    title: str
    url: str
    domain: str | None
    snippet: str | None
    search_query: str | None
    rank: int
    score: float


LOW_QUALITY_HINTS = ("coupon", "casino", "clickbait", "top10", "best-", "ads")


def normalize_url(url: str) -> str:
    parsed = urlparse(url.strip())
    scheme = parsed.scheme.lower() or "https"
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/") or "/"
    return urlunparse((scheme, netloc, path, "", parsed.query, ""))


def rank_sources(
    results_by_query: list[tuple[str, SearchResult]],
    *,
    max_sources: int = 6,
) -> list[RankedSource]:
    seen: dict[str, RankedSource] = {}
    for index, (query, result) in enumerate(results_by_query):
        url = normalize_url(result.url)
        parsed = urlparse(url)
        domain = parsed.netloc.removeprefix("www.") or None
        haystack = f"{result.title} {result.snippet or ''}".lower()
        score = float(result.score or 1.0)
        if domain and (domain.endswith(".gov") or ".gov." in domain or domain.endswith(".edu")):
            score += 3.0
        if domain and any(part in domain for part in ("docs.", "who.int", "worldbank.org", "un.org")):
            score += 2.0
        if any(term.lower() in haystack for term in query.split()[:8]):
            score += 1.0
        if any(hint in url.lower() for hint in LOW_QUALITY_HINTS):
            score -= 2.0
        score -= index * 0.01
        candidate = RankedSource(
            title=result.title,
            url=url,
            domain=domain,
            snippet=result.snippet,
            search_query=query,
            rank=0,
            score=score,
        )
        existing = seen.get(url)
        if existing is None or candidate.score > existing.score:
            seen[url] = candidate

    domain_counts: dict[str, int] = {}
    selected: list[RankedSource] = []
    for source in sorted(seen.values(), key=lambda s: s.score, reverse=True):
        domain = source.domain or ""
        if domain_counts.get(domain, 0) >= 2:
            continue
        domain_counts[domain] = domain_counts.get(domain, 0) + 1
        source.rank = len(selected) + 1
        selected.append(source)
        if len(selected) >= max_sources:
            break
    return selected

