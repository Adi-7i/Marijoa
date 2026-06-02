from __future__ import annotations

from urllib.parse import urlparse


def build_citation_map(sources: list) -> dict[str, dict]:
    citation_map: dict[str, dict] = {}
    seen: dict[str, str] = {}
    for source in sources:
        url = getattr(source, "url", "") or ""
        normalized = url.rstrip("/")
        if normalized in seen:
            continue
        index = str(len(citation_map) + 1)
        seen[normalized] = index
        citation_map[index] = {
            "source_id": str(getattr(source, "id", "")),
            "title": getattr(source, "title", "Untitled source"),
            "url": url,
            "domain": getattr(source, "domain", None) or urlparse(url).netloc.removeprefix("www."),
        }
    return citation_map


def sources_markdown(citation_map: dict[str, dict]) -> str:
    lines = ["## Sources"]
    for index, source in citation_map.items():
        title = source.get("title") or "Untitled source"
        url = source.get("url") or ""
        domain = source.get("domain") or ""
        lines.append(f"[{index}] {title} ({domain}) - {url}")
    return "\n".join(lines)

