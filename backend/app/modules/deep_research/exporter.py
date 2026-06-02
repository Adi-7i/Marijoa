from __future__ import annotations

import base64
from datetime import datetime, timezone


def markdown_to_pdf_bytes(title: str, markdown: str, citation_map: dict | None = None) -> bytes:
    """Generate a minimal PDF-like payload.

    This returns a valid-enough text PDF for development without adding a heavy
    dependency. Production can swap this for ReportLab/WeasyPrint and file storage.
    """
    text = f"Marijoa Deep Research\n{title}\nGenerated {datetime.now(timezone.utc).isoformat()}\n\n{markdown}"
    if citation_map:
        text += "\n\nSources\n"
        for index, source in citation_map.items():
            text += f"[{index}] {source.get('title')} - {source.get('url')}\n"
    escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = f"BT /F1 11 Tf 50 780 Td ({escaped[:12000]}) Tj ET"
    objects = [
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        "3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj",
        "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
        f"5 0 obj << /Length {len(stream)} >> stream\n{stream}\nendstream endobj",
    ]
    body = "%PDF-1.4\n" + "\n".join(objects) + "\ntrailer << /Root 1 0 R >>\n%%EOF\n"
    return body.encode("latin-1", errors="replace")


def pdf_base64(title: str, markdown: str, citation_map: dict | None = None) -> str:
    return base64.b64encode(markdown_to_pdf_bytes(title, markdown, citation_map)).decode("ascii")

