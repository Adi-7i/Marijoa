from __future__ import annotations

from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider
from app.modules.ai_gateway.schemas import ProviderMessage
from app.modules.deep_research.citation_builder import sources_markdown
from app.modules.deep_research.evidence_retriever import EvidenceChunk


def synthesize_report(
    *,
    query: str,
    title: str,
    objectives: list[str],
    evidence: list[EvidenceChunk],
    citation_map: dict[str, dict],
) -> tuple[str, str]:
    evidence_context = "\n\n".join(
        f"[{item.citation_index}] {item.content}" for item in evidence
    )
    if not evidence_context:
        evidence_context = "No strong evidence chunks were available."
    try:
        provider = OpenAICompatibleProvider()
        result = provider.generate_response(
            [
                ProviderMessage(
                    role="system",
                    content=(
                        "Write a professional markdown Deep Research report. Use only the supplied evidence. "
                        "Use inline citations like [1]. Do not invent citations or sources. "
                        "If evidence is weak, state that limitation."
                    ),
                ),
                ProviderMessage(
                    role="user",
                    content=(
                        f"Question: {query}\nTitle: {title}\nObjectives: {objectives}\n"
                        f"Citation map: {citation_map}\nEvidence:\n{evidence_context}"
                    ),
                ),
            ]
        )
        markdown = result.content.strip()
    except Exception:
        markdown = fallback_report(query=query, title=title, objectives=objectives, evidence=evidence)
    if "## Sources" not in markdown:
        markdown = f"{markdown.rstrip()}\n\n{sources_markdown(citation_map)}"
    summary = first_summary(markdown)
    return markdown, summary


def fallback_report(*, query: str, title: str, objectives: list[str], evidence: list[EvidenceChunk]) -> str:
    lines = [f"# {title}", "", "## Executive Summary"]
    if evidence:
        lines.append(f"This report summarizes available evidence for: {query}.")
    else:
        lines.append("The backend could not retrieve enough source evidence to produce a fully grounded report.")
    lines.extend(["", "## Research Objectives"])
    lines.extend(f"- {objective}" for objective in objectives)
    lines.extend(["", "## Evidence-Based Notes"])
    for item in evidence[:10]:
        excerpt = item.content[:450].strip()
        lines.append(f"- {excerpt} [{item.citation_index}]")
    if not evidence:
        lines.append("- No evidence chunks were selected.")
    return "\n".join(lines)


def first_summary(markdown: str) -> str | None:
    for line in markdown.splitlines():
        cleaned = line.strip()
        if cleaned and not cleaned.startswith("#"):
            return cleaned[:1000]
    return None

