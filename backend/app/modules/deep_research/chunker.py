from __future__ import annotations


def chunk_text(
    text: str,
    *,
    chunk_size_chars: int = 5000,
    overlap_chars: int = 800,
    max_chunks: int = 120,
) -> list[str]:
    cleaned = " ".join((text or "").split())
    if not cleaned:
        return []
    chunk_size_chars = max(500, chunk_size_chars)
    overlap_chars = max(0, min(overlap_chars, chunk_size_chars // 2))

    chunks: list[str] = []
    start = 0
    while start < len(cleaned) and len(chunks) < max_chunks:
        end = min(len(cleaned), start + chunk_size_chars)
        if end < len(cleaned):
            sentence_break = max(cleaned.rfind(". ", start, end), cleaned.rfind("\n", start, end))
            if sentence_break > start + chunk_size_chars // 2:
                end = sentence_break + 1
        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(cleaned):
            break
        start = max(0, end - overlap_chars)
    return chunks

