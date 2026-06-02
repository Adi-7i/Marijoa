from __future__ import annotations

import hashlib
import html
import re
from dataclasses import dataclass


@dataclass
class ExtractedContent:
    title: str | None
    text: str
    content_hash: str
    char_count: int


SCRIPT_STYLE_RE = re.compile(r"<(script|style|noscript|nav|footer|header|aside)\b.*?</\1>", re.I | re.S)
TAG_RE = re.compile(r"<[^>]+>")
TITLE_RE = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)


def extract_content(
    body: str | bytes,
    *,
    content_type: str | None = None,
    max_chars: int = 30000,
    min_chars: int = 200,
) -> ExtractedContent | None:
    if isinstance(body, bytes):
        raw = body.decode("utf-8", errors="replace")
    else:
        raw = body

    title: str | None = None
    match = TITLE_RE.search(raw)
    if match:
        title = normalize_text(match.group(1))[:240] or None

    if content_type and "html" not in content_type and "text/plain" in content_type:
        text = normalize_text(raw)
    else:
        stripped = SCRIPT_STYLE_RE.sub(" ", raw)
        stripped = re.sub(r"<br\s*/?>", "\n", stripped, flags=re.I)
        stripped = re.sub(r"</(p|div|section|article|li|h[1-6])>", "\n", stripped, flags=re.I)
        text = normalize_text(TAG_RE.sub(" ", stripped))

    text = html.unescape(text)
    if len(text) < min_chars:
        return None
    text = text[:max_chars]
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return ExtractedContent(title=title, text=text, content_hash=digest, char_count=len(text))


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()

