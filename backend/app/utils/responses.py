from __future__ import annotations

from typing import Any


def success(data: Any = None, message: str = "ok") -> dict[str, Any]:
    return {"status": "ok", "message": message, "data": data}
