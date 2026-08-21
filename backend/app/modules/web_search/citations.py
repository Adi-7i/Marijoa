"""Builders for the web-search context block injected into the LLM prompt
and the hallucination-reduction policy that goes with it.

Keeping this in a dedicated module makes it trivial to unit test that the
expected ``[1]``, ``[2]`` markers and section headers are present, without
having to fire a real LLM call.
"""

from __future__ import annotations

from app.modules.web_search.schemas import CitationSource


_WEB_SEARCH_SECTION_HEADER = "Web search results"
_WEB_SEARCH_USAGE_HEADER = "How to use the web search results"


WEB_SEARCH_USAGE_POLICY: str = """Use the web search results only when they directly support a claim in your answer.
- Cite supporting sources inline with numeric markers like [1], [2]. Only cite numbers that appear in the list above.
- Do not invent sources, URLs, or citation numbers.
- If the search results do not directly answer the question, say that the available web results are limited and answer cautiously.
- For current, recent, or live facts: only state them as current if the search results back them up. Otherwise note that you cannot verify the latest state.
- If the sources disagree, briefly note the disagreement instead of picking arbitrarily.
- Do not claim something has been verified unless it appears in the sources."""


NO_WEB_SEARCH_POLICY: str = """No live web search was used for this turn.
- Do not pretend to have checked the internet.
- If the user asks for current, recent, or live information, say you cannot verify the latest state without enabling web search.
- Do not fabricate citations."""


def build_web_search_context(citations: list[CitationSource]) -> str:
    """Render numbered citations as a developer-role section.

    Returns an empty string when *citations* is empty so callers can safely
    concatenate the result unconditionally.
    """
    if not citations:
        return ""

    lines: list[str] = [
        f"{_WEB_SEARCH_SECTION_HEADER}:",
        "Web search results were retrieved for this answer. Use them as evidence where relevant.",
        "",
    ]

    for source in citations:
        lines.append(f"[{source.index}] {source.title}")
        lines.append(f"URL: {source.url}")
        if source.snippet:
            lines.append(f"Snippet: {source.snippet}")
        lines.append("")

    lines.append(f"{_WEB_SEARCH_USAGE_HEADER}:")
    lines.append(WEB_SEARCH_USAGE_POLICY)

    return "\n".join(lines).rstrip()
