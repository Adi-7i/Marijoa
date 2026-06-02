"""Tests for the citation context builder used in the AI prompt."""

from __future__ import annotations

import sys
from types import ModuleType
from unittest.mock import MagicMock


def _stub_openai() -> None:
    if "openai" not in sys.modules:
        fake_openai = ModuleType("openai")
        fake_openai.OpenAI = MagicMock()  # type: ignore[attr-defined]
        sys.modules["openai"] = fake_openai
        sys.modules.setdefault("openai.types", ModuleType("openai.types"))


_stub_openai()


from app.modules.ai_gateway.prompt_builder import build_provider_messages  # noqa: E402
from app.modules.web_search.citations import (  # noqa: E402
    NO_WEB_SEARCH_POLICY,
    build_web_search_context,
)
from app.modules.web_search.schemas import CitationSource  # noqa: E402


def _cite(idx: int, title: str = "Title", url: str = "https://example.com/") -> CitationSource:
    return CitationSource(
        index=idx,
        title=title,
        url=f"{url}{idx}",
        snippet=f"Snippet {idx}",
        domain="example.com",
    )


def test_empty_citations_produces_empty_string() -> None:
    assert build_web_search_context([]) == ""


def test_renders_numbered_sources_and_policy() -> None:
    citations = [_cite(1, "Alpha"), _cite(2, "Beta")]
    block = build_web_search_context(citations)
    assert "[1] Alpha" in block
    assert "[2] Beta" in block
    assert "URL: https://example.com/1" in block
    assert "URL: https://example.com/2" in block
    # Policy hints
    assert "Cite supporting sources" in block
    assert "Do not invent" in block


def test_prompt_builder_includes_web_context_when_citations_present() -> None:
    citations = [_cite(1, "Alpha")]
    messages = build_provider_messages(
        system_instruction=None,
        history=[],
        current_content="What's new?",
        web_citations=citations,
        web_search_attempted=True,
    )

    developer_contents = [m.content for m in messages if m.role == "developer"]
    assert any("[1] Alpha" in c for c in developer_contents)
    assert any("Cite supporting sources" in c for c in developer_contents)


def test_prompt_builder_omits_web_context_when_no_citations() -> None:
    messages = build_provider_messages(
        system_instruction=None,
        history=[],
        current_content="Explain Python",
        web_citations=[],
        web_search_attempted=False,
    )
    developer_contents = [m.content for m in messages if m.role == "developer"]
    assert all("[1]" not in c for c in developer_contents)
    assert all("Web search results" not in c for c in developer_contents)


def test_prompt_builder_includes_no_search_policy_when_attempted_but_empty() -> None:
    messages = build_provider_messages(
        system_instruction=None,
        history=[],
        current_content="Tell me the latest news",
        web_citations=[],
        web_search_attempted=True,
    )
    developer_contents = [m.content for m in messages if m.role == "developer"]
    assert any(NO_WEB_SEARCH_POLICY in c for c in developer_contents)
