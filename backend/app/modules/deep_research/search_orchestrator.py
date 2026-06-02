from __future__ import annotations

from app.core.config import get_settings
from app.modules.web_search import search_client
from app.modules.web_search.schemas import SearchResult


def run_multi_query_search(search_queries: list[str]) -> list[tuple[str, SearchResult]]:
    settings = get_settings()
    aggregated: list[tuple[str, SearchResult]] = []
    for query in search_queries[: settings.DEEP_RESEARCH_MAX_SEARCH_QUERIES]:
        try:
            results = search_client.search(query, max_results=settings.DEEP_RESEARCH_RESULTS_PER_QUERY)
        except Exception:
            continue
        aggregated.extend((query, result) for result in results)
    return aggregated

