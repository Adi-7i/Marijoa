from __future__ import annotations

import json
import re

from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider
from app.modules.ai_gateway.schemas import ProviderMessage
from app.modules.deep_research.schemas import ResearchPlan, ResearchStepPlan


DEFAULT_STEPS = [
    ("searching", "Search for authoritative sources"),
    ("ranking_sources", "Rank and select sources"),
    ("reading_sources", "Read selected sources"),
    ("extracting", "Extract source content"),
    ("embedding", "Embed and index evidence"),
    ("analyzing", "Select relevant evidence"),
    ("writing_report", "Write cited report"),
]


def fallback_plan(query: str) -> ResearchPlan:
    cleaned = " ".join(query.split())
    title = f"Research: {cleaned[:80]}"
    objectives = [
        f"Explain the key facts and context for {cleaned}.",
        "Identify authoritative sources and areas of agreement.",
        "Surface important caveats, limitations, and unresolved questions.",
    ]
    search_queries = [
        cleaned,
        f"{cleaned} official sources",
        f"{cleaned} academic overview",
        f"{cleaned} recent analysis",
    ]
    return ResearchPlan(
        title=title,
        objectives=objectives,
        search_queries=dedupe(search_queries)[:4],
        steps=[
            ResearchStepPlan(step_key=key, title=title, order_index=index + 1)
            for index, (key, title) in enumerate(DEFAULT_STEPS)
        ],
    )


def create_plan(query: str, *, mode: str = "standard") -> ResearchPlan:
    try:
        provider = OpenAICompatibleProvider()
        result = provider.generate_response(
            [
                ProviderMessage(
                    role="system",
                    content=(
                        "Create a concise Deep Research plan. Do not answer the question. "
                        "Return strict JSON with title, objectives, search_queries, and steps. "
                        "Use 3-5 objectives, 3-5 search queries, and 5-7 steps."
                    ),
                ),
                ProviderMessage(role="user", content=f"Mode: {mode}\nQuery: {query}"),
            ]
        )
        payload = json.loads(extract_json(result.content))
        steps = [
            ResearchStepPlan(
                step_key=str(item.get("step_key") or slugify(item.get("title", f"step_{i}"))),
                title=str(item.get("title") or f"Step {i}"),
                description=item.get("description"),
                order_index=i,
            )
            for i, item in enumerate(payload.get("steps", []), start=1)
        ]
        plan = ResearchPlan(
            title=str(payload["title"])[:240],
            objectives=[str(x) for x in payload["objectives"]][:5],
            search_queries=dedupe([str(x) for x in payload["search_queries"]])[:5],
            steps=steps[:7] or fallback_plan(query).steps,
        )
        if not plan.objectives or not plan.search_queries:
            raise ValueError("Incomplete plan")
        return plan
    except Exception:
        return fallback_plan(query)


def extract_json(text: str) -> str:
    match = re.search(r"\{.*\}", text, flags=re.S)
    return match.group(0) if match else text


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")[:60] or "step"


def dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        cleaned = " ".join(value.split())
        key = cleaned.lower()
        if cleaned and key not in seen:
            seen.add(key)
            output.append(cleaned)
    return output

