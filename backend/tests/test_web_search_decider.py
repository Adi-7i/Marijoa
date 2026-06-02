"""Unit tests for the Search Decision Layer.

The decider is the safety boundary between user intent and the search
provider. Tests cover:

* Forced modes (off/search) — no rule logic, deterministic outputs.
* Rule-based triggers — English + Hindi/Hinglish + low-priority topics.
* Ambiguous queries — when the rule layer abstains, the LLM decider is
  invoked iff enabled, and falls back to "no search" on any failure.

No real LLM calls are made. The OpenAI compatible provider is patched at the
import path used inside ``_llm_decide``.
"""

from __future__ import annotations

import sys
from types import ModuleType
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Stub the 'openai' package before any gateway import
# ---------------------------------------------------------------------------


def _stub_openai() -> None:
    if "openai" not in sys.modules:
        fake_openai = ModuleType("openai")
        fake_openai.OpenAI = MagicMock()  # type: ignore[attr-defined]
        sys.modules["openai"] = fake_openai
        sys.modules.setdefault("openai.types", ModuleType("openai.types"))


_stub_openai()


from app.modules.web_search import search_decider  # noqa: E402
from app.modules.web_search.schemas import WebMode  # noqa: E402


# ---------------------------------------------------------------------------
# Mode forcing
# ---------------------------------------------------------------------------


def test_off_mode_never_searches() -> None:
    decision = search_decider.decide(
        message="give me the latest AI news right now",
        mode=WebMode.OFF,
    )
    assert decision.should_search is False
    assert decision.mode == WebMode.OFF
    assert decision.queries == []
    assert decision.decision_source == "off"


def test_search_mode_always_searches() -> None:
    decision = search_decider.decide(
        message="Explain Python decorators",
        mode=WebMode.SEARCH,
    )
    assert decision.should_search is True
    assert decision.mode == WebMode.SEARCH
    assert decision.decision_source == "forced"
    assert decision.queries == ["Explain Python decorators"]


def test_search_mode_strips_whitespace() -> None:
    decision = search_decider.decide(message="   ", mode=WebMode.SEARCH)
    assert decision.should_search is True
    assert decision.queries == []


# ---------------------------------------------------------------------------
# Rule-based positive triggers
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "message",
    [
        "What is the latest FastAPI version?",
        "Tell me today's news about AI agents",
        "Show me the current CEO of OpenAI",
        "I need the price of Bitcoin right now",
        "Please verify this with sources",
        "Aaj ka latest cricket score batao",
        "Internet se search karo ChatGPT latest features",
        "Naya iPhone abhi release hua kya?",
        "web pe check karo current stock market",
        "Give me the changelog for the new release",
    ],
)
def test_auto_mode_triggers_on_strong_signals(message: str) -> None:
    decision = search_decider.decide(message=message, mode=WebMode.AUTO)
    assert decision.should_search is True, message
    assert decision.mode == WebMode.AUTO
    assert decision.decision_source == "rule"
    assert decision.queries == [message]


# ---------------------------------------------------------------------------
# Rule-based negative triggers
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "message",
    [
        "Explain how a Python decorator works",
        "Rewrite this paragraph to be more concise",
        "Solve 12 * 7 - 5",
        "What does this regex do: ^foo$",
        "Translate hello to French",
        "Summarize the text I just pasted",
        "Don't search the web, just answer from memory",
    ],
)
def test_auto_mode_skips_low_priority_topics(message: str) -> None:
    decision = search_decider.decide(message=message, mode=WebMode.AUTO)
    assert decision.should_search is False, message
    assert decision.decision_source == "rule"
    assert decision.queries == []


def test_veto_overrides_trigger() -> None:
    """An explicit "don't search" veto wins over a positive trigger."""
    decision = search_decider.decide(
        message="latest news today but please don't search the web",
        mode=WebMode.AUTO,
    )
    assert decision.should_search is False


# ---------------------------------------------------------------------------
# Ambiguous queries — LLM decider path
# ---------------------------------------------------------------------------


def _ambiguous_message() -> str:
    """A query that doesn't hit any keyword rule but mentions a recent year."""
    return "Tell me about the 2026 product launch"


def test_ambiguous_query_with_disabled_llm_defaults_to_no_search(monkeypatch) -> None:
    settings = search_decider.get_settings()
    monkeypatch.setattr(settings, "WEB_SEARCH_LLM_DECIDER_ENABLED", False)
    monkeypatch.setattr(settings, "WEB_SEARCH_AMBIGUOUS_DECIDER_ENABLED", False)

    decision = search_decider.decide(message=_ambiguous_message(), mode=WebMode.AUTO)
    assert decision.should_search is False
    assert decision.decision_source == "rule"


def test_ambiguous_query_invokes_llm_when_enabled() -> None:
    """LLM decider returns valid JSON → its decision is used."""
    fake_result = MagicMock()
    fake_result.content = (
        '{"should_search": true, "reason": "current product info needed", '
        '"queries": ["2026 product launch news"]}'
    )

    fake_provider = MagicMock()
    fake_provider.generate_response.return_value = fake_result

    with patch(
        "app.modules.ai_gateway.providers.openai_compatible_provider.OpenAICompatibleProvider",
        return_value=fake_provider,
    ):
        decision = search_decider.decide(
            message=_ambiguous_message(), mode=WebMode.AUTO
        )

    assert decision.should_search is True
    assert decision.decision_source == "llm"
    assert decision.queries == ["2026 product launch news"]


def test_llm_failure_falls_back_to_no_search() -> None:
    """Provider raising or returning garbage → safe default kicks in."""
    fake_provider = MagicMock()
    fake_provider.generate_response.side_effect = RuntimeError("boom")

    with patch(
        "app.modules.ai_gateway.providers.openai_compatible_provider.OpenAICompatibleProvider",
        return_value=fake_provider,
    ):
        decision = search_decider.decide(
            message=_ambiguous_message(), mode=WebMode.AUTO
        )

    assert decision.should_search is False
    assert decision.decision_source == "rule"


def test_llm_garbage_json_falls_back_to_no_search() -> None:
    fake_result = MagicMock()
    fake_result.content = "not valid json at all"

    fake_provider = MagicMock()
    fake_provider.generate_response.return_value = fake_result

    with patch(
        "app.modules.ai_gateway.providers.openai_compatible_provider.OpenAICompatibleProvider",
        return_value=fake_provider,
    ):
        decision = search_decider.decide(
            message=_ambiguous_message(), mode=WebMode.AUTO
        )

    assert decision.should_search is False


def test_llm_strips_code_fence_around_json() -> None:
    fake_result = MagicMock()
    fake_result.content = (
        "```json\n"
        '{"should_search": true, "reason": "needs current data", '
        '"queries": ["a", "b", "c", "d"]}\n'
        "```"
    )

    fake_provider = MagicMock()
    fake_provider.generate_response.return_value = fake_result

    with patch(
        "app.modules.ai_gateway.providers.openai_compatible_provider.OpenAICompatibleProvider",
        return_value=fake_provider,
    ):
        decision = search_decider.decide(
            message=_ambiguous_message(), mode=WebMode.AUTO
        )

    assert decision.should_search is True
    # Max queries respected — defaults to 3.
    assert len(decision.queries) == 3
