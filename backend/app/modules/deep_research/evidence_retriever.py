from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class EvidenceChunk:
    chunk_id: str
    source_id: str
    citation_index: str
    content: str
    score: float


def select_evidence(
    *,
    query: str,
    objectives: list[str],
    chunks: list,
    citation_map: dict[str, dict],
    top_k: int = 30,
    max_context_chars: int = 50000,
) -> list[EvidenceChunk]:
    terms = set(re.findall(r"[a-z0-9]{3,}", f"{query} {' '.join(objectives)}".lower()))
    source_to_citation = {v["source_id"]: k for k, v in citation_map.items()}
    ranked: list[EvidenceChunk] = []
    for chunk in chunks:
        text = getattr(chunk, "content", "")
        words = set(re.findall(r"[a-z0-9]{3,}", text.lower()))
        overlap = len(terms & words)
        score = overlap / max(1, len(terms))
        if score <= 0 and ranked:
            continue
        source_id = str(getattr(chunk, "source_id", ""))
        ranked.append(
            EvidenceChunk(
                chunk_id=str(getattr(chunk, "id", "")),
                source_id=source_id,
                citation_index=source_to_citation.get(source_id, "1"),
                content=text[:3000],
                score=score,
            )
        )
    selected: list[EvidenceChunk] = []
    chars = 0
    for item in sorted(ranked, key=lambda e: e.score, reverse=True)[:top_k]:
        if chars + len(item.content) > max_context_chars:
            break
        selected.append(item)
        chars += len(item.content)
    return selected

