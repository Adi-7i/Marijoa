"""Search Decision Layer.

Given a user message and a requested :class:`~app.modules.web_search.schemas.WebMode`,
returns a :class:`SearchDecision` describing whether to call the web search
provider and, if so, with which queries.

Strategy:

1. ``WebMode.OFF`` → never search.
2. ``WebMode.SEARCH`` → always search; query defaults to the user message.
3. ``WebMode.AUTO`` →
   * Run cheap regex/keyword rules. If they fire strongly, search.
   * If they reject strongly, skip search.
   * If neither (ambiguous), optionally ask the LLM to decide. If LLM is
     disabled or fails, default to no search — the AI can always answer
     without it.

The decider deliberately keeps the LLM decision payload small: only the
user's current message is passed in, not the entire chat history. This
limits cost, latency, and the surface for prompt injection.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.modules.web_search.schemas import SearchDecision, WebMode

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Rule-based triggers
# ---------------------------------------------------------------------------

# Strong "search" signals — case-insensitive whole-word matches. Includes
# English, Hindi (romanised), and a few common Hinglish phrases. The product
# spec is the source of truth for the vocabulary; expanding here is cheap.
_SEARCH_TRIGGER_KEYWORDS: tuple[str, ...] = (
    # Time-sensitive English
    "latest",
    "current",
    "currently",
    "recent",
    "recently",
    "today",
    "tonight",
    "yesterday",
    "this week",
    "this month",
    "this year",
    "right now",
    # News / live
    "news",
    "headline",
    "headlines",
    "breaking",
    "live",
    "live score",
    "scoreboard",
    # Finance / markets
    "price",
    "prices",
    "stock",
    "stocks",
    "market",
    "ticker",
    "exchange rate",
    "forex",
    # Product / version / release
    "release",
    "released",
    "version",
    "changelog",
    "patch notes",
    "new feature",
    "newly released",
    "just announced",
    "announced",
    # Status / current state
    "current ceo",
    "current founder",
    "current law",
    "current rule",
    "current regulation",
    "is this still true",
    "still relevant",
    "still valid",
    # Verification language
    "verify",
    "citation",
    "cite",
    "source",
    "sources",
    "with source",
    "with sources",
    # Weather / events
    "weather",
    "forecast",
    "temperature today",
    # Sports
    "score",
    "match result",
    "fixture",
    # Availability
    "in stock",
    "availability",
    "available now",
    # Explicit web intent (English)
    "web search",
    "internet search",
    "search the web",
    "search the internet",
    "search online",
    "look up online",
    "look it up",
    "check online",
    "google it",
    # Hindi / Hinglish triggers
    "abhi",
    "naya",
    "aaj",
    "kal",
    "is week",
    "is month",
    "is hafte",
    "is mahine",
    "internet se",
    "web pe",
    "web par",
    "search karo",
    "check karo",
    "verify karo",
    "source ke sath",
    "dekho",
    "dekh",
)

# Patterns that say "do NOT search" — usually a request to ignore the
# internet or focus on user-provided text. Matching one of these vetoes the
# decision even if a trigger keyword also fires.
_SEARCH_VETO_KEYWORDS: tuple[str, ...] = (
    "don't search",
    "do not search",
    "no search",
    "without search",
    "without internet",
    "without web",
    "offline",
    "from memory",
    "from your knowledge",
    "from your training",
)

# Topics that almost never need the web (coding concepts, math, etc.). When
# one of these appears AND no positive trigger fires, we skip search even in
# auto mode without going through the LLM.
_LOW_PRIORITY_TOPICS: tuple[str, ...] = (
    "explain",
    "define",
    "what is",
    "what's the",
    "how does",
    "how do i",
    "what does",
    "translate",
    "summari",  # summarise/summarize
    "rewrite",
    "paraphrase",
    "edit this",
    "proofread",
    "solve",
    "compute",
    "calculate",
)


# Year references that strongly imply "current state matters" — flagged
# only when a current-sensitive word is also present (handled in the rule
# function so we don't trigger on historical questions).
_YEAR_PATTERN = re.compile(r"\b(202[5-9])\b")


@dataclass(frozen=True)
class _RuleVerdict:
    """Internal rule outcome — three-valued (yes / no / ambiguous)."""

    should_search: bool | None
    reason: str


def _normalise(text: str) -> str:
    return (text or "").strip().lower()


def _contains_any(haystack: str, needles: tuple[str, ...]) -> str | None:
    """Return the first needle found in *haystack* or ``None``.

    Uses substring matching rather than regex word boundaries because most
    triggers are multi-word phrases. Callers normalise both sides to lower
    case first.
    """
    for needle in needles:
        if needle in haystack:
            return needle
    return None


def evaluate_rules(message: str) -> _RuleVerdict:
    """Pure-function rule decider.

    Exposed for unit testing — the public entry point is :func:`decide`.
    """
    text = _normalise(message)

    if not text:
        return _RuleVerdict(should_search=False, reason="Empty message")

    veto = _contains_any(text, _SEARCH_VETO_KEYWORDS)
    if veto is not None:
        return _RuleVerdict(
            should_search=False,
            reason=f"User explicitly opted out of search ('{veto}')",
        )

    trigger = _contains_any(text, _SEARCH_TRIGGER_KEYWORDS)
    if trigger is not None:
        return _RuleVerdict(
            should_search=True,
            reason=f"Detected current-information trigger '{trigger}'",
        )

    # Year-only mentions are ambiguous unless combined with a current-state
    # phrase. The trigger list already covers most of those phrasings, so a
    # bare year mention falls through to the ambiguous path.
    if _YEAR_PATTERN.search(text):
        return _RuleVerdict(
            should_search=None,
            reason="Mentions a recent year — current relevance unclear",
        )

    low_priority = _contains_any(text, _LOW_PRIORITY_TOPICS)
    if low_priority is not None:
        return _RuleVerdict(
            should_search=False,
            reason=(
                f"Looks like a stable concept question ('{low_priority}') — "
                "no current information needed"
            ),
        )

    return _RuleVerdict(should_search=None, reason="No clear search signals")


# ---------------------------------------------------------------------------
# Optional LLM decider for ambiguous queries
# ---------------------------------------------------------------------------


_LLM_DECIDER_INSTRUCTION = """You are a router that decides whether a user query needs a live web search to be answered correctly.

Return ONLY a strict JSON object with this shape:
{"should_search": <true|false>, "reason": <short string>, "queries": [<up to 3 concise search-engine-friendly queries>]}

Rules:
- should_search must be true ONLY if answering well requires current, recent, or live information from the web.
- If the query is a stable concept (e.g. math, definitions, general code, historical fact, rewriting, translation), set should_search=false and queries=[].
- Generate at most 3 short search queries (5-12 words each). No URLs, no quotes around the whole string.
- Do NOT include any explanation outside the JSON. No prose, no markdown."""


def _llm_decide(message: str, max_queries: int) -> SearchDecision | None:
    """Ask the configured LLM to decide. Returns ``None`` on any failure.

    Failure modes (provider unreachable, invalid JSON, schema mismatch) are
    swallowed by design — the caller falls back to a safe default. The
    decision payload contains only the user's current message, never chat
    history or workspace data.
    """
    try:
        # Imported lazily so the decider module can be unit-tested without
        # initialising the OpenAI client.
        from app.modules.ai_gateway.providers.openai_compatible_provider import (
            OpenAICompatibleProvider,
        )
        from app.modules.ai_gateway.schemas import ProviderMessage
    except Exception:  # noqa: BLE001
        logger.debug("LLM decider: gateway imports failed", exc_info=True)
        return None

    try:
        provider = OpenAICompatibleProvider()
    except Exception:  # noqa: BLE001
        # AIConfigurationError or anything else — skip the LLM step.
        logger.debug("LLM decider: provider init failed", exc_info=True)
        return None

    user_payload = json.dumps({"message": message[:4000]}, ensure_ascii=False)

    messages = [
        ProviderMessage(role="developer", content=_LLM_DECIDER_INSTRUCTION),
        ProviderMessage(role="user", content=user_payload),
    ]

    try:
        result = provider.generate_response(messages)
    except Exception:  # noqa: BLE001
        logger.debug("LLM decider: provider call failed", exc_info=True)
        return None

    raw = (result.content or "").strip()
    if not raw:
        return None

    # The model is instructed to return ONLY JSON; be tolerant of a leading
    # code fence in case the provider wraps it.
    if raw.startswith("```"):
        raw = raw.strip("`")
        # Strip an optional language tag like ```json
        if raw.lower().startswith("json"):
            raw = raw[4:].lstrip()

    try:
        parsed: Any = json.loads(raw)
    except json.JSONDecodeError:
        logger.debug("LLM decider: invalid JSON: %r", raw[:200])
        return None

    if not isinstance(parsed, dict):
        return None

    should_search = bool(parsed.get("should_search"))
    reason = str(parsed.get("reason") or "LLM decision").strip() or "LLM decision"

    raw_queries = parsed.get("queries") or []
    if not isinstance(raw_queries, list):
        raw_queries = []
    queries: list[str] = []
    for q in raw_queries:
        if isinstance(q, str):
            cleaned = q.strip()
            if cleaned:
                queries.append(cleaned)
        if len(queries) >= max_queries:
            break

    if should_search and not queries:
        # The LLM said "yes" but gave no queries — fall back to the raw
        # message so the caller can still run a search.
        queries.append(message.strip())

    return SearchDecision(
        should_search=should_search,
        reason=reason,
        queries=queries if should_search else [],
        mode=WebMode.AUTO,
        decision_source="llm",
    )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def _build_forced_decision(message: str, max_queries: int) -> SearchDecision:
    """Construct a decision for ``WebMode.SEARCH`` (user-forced search)."""
    cleaned = (message or "").strip()
    queries: list[str] = [cleaned] if cleaned else []
    queries = queries[:max_queries]
    return SearchDecision(
        should_search=True,
        reason="User explicitly requested a web search",
        queries=queries,
        mode=WebMode.SEARCH,
        decision_source="forced",
    )


def _build_off_decision() -> SearchDecision:
    return SearchDecision(
        should_search=False,
        reason="Web search is turned off for this request",
        queries=[],
        mode=WebMode.OFF,
        decision_source="off",
    )


def decide(
    *,
    message: str,
    mode: WebMode,
) -> SearchDecision:
    """Top-level decider for the AI gateway.

    Args:
        message: The current user message text.
        mode: Requested web mode (auto/off/search).

    Returns:
        A :class:`SearchDecision` describing whether to search and with which
        queries. The result is always returned synchronously and never raises
        — search is optional, so any failure inside the decider falls back to
        a deterministic "do not search" outcome.
    """
    settings = get_settings()
    max_queries = max(1, int(settings.WEB_SEARCH_MAX_QUERIES))

    if mode == WebMode.OFF:
        return _build_off_decision()

    if mode == WebMode.SEARCH:
        return _build_forced_decision(message, max_queries)

    # Auto mode -------------------------------------------------------------
    rule_enabled = bool(settings.WEB_SEARCH_RULE_BASED_ENABLED)
    if rule_enabled:
        verdict = evaluate_rules(message)
    else:
        verdict = _RuleVerdict(should_search=None, reason="Rule decider disabled")

    if verdict.should_search is True:
        cleaned = (message or "").strip()
        queries = [cleaned] if cleaned else []
        return SearchDecision(
            should_search=True,
            reason=verdict.reason,
            queries=queries[:max_queries],
            mode=WebMode.AUTO,
            decision_source="rule",
        )

    if verdict.should_search is False:
        return SearchDecision(
            should_search=False,
            reason=verdict.reason,
            queries=[],
            mode=WebMode.AUTO,
            decision_source="rule",
        )

    # Ambiguous -------------------------------------------------------------
    llm_enabled = (
        settings.WEB_SEARCH_LLM_DECIDER_ENABLED
        and settings.WEB_SEARCH_AMBIGUOUS_DECIDER_ENABLED
    )
    if llm_enabled:
        llm_decision = _llm_decide(message, max_queries=max_queries)
        if llm_decision is not None:
            return llm_decision

    # Safe default for ambiguous queries when no LLM is available.
    return SearchDecision(
        should_search=False,
        reason=verdict.reason + " — defaulting to no search",
        queries=[],
        mode=WebMode.AUTO,
        decision_source="rule",
    )
