"""Unit tests for SSE event formatting utilities.

Pure function tests — no mocks needed. Exercises format_sse_event and the
event-type constants exported from app.modules.ai_gateway.streaming.
"""
from __future__ import annotations

import json

from app.modules.ai_gateway.streaming import (
    EVENT_DONE,
    EVENT_ERROR,
    EVENT_START,
    EVENT_TOKEN,
    format_sse_event,
)


# ---------------------------------------------------------------------------
# Event-line presence
# ---------------------------------------------------------------------------


def test_token_event_contains_event_line() -> None:
    result = format_sse_event(EVENT_TOKEN, {"content": "hello"})
    assert "event: token" in result


def test_token_event_contains_data_line() -> None:
    result = format_sse_event(EVENT_TOKEN, {"content": "hello"})
    assert "data:" in result


def test_done_event_type() -> None:
    result = format_sse_event("done", {})
    assert "event: done" in result


def test_error_event_type() -> None:
    result = format_sse_event("error", {})
    assert "event: error" in result


def test_start_event_type() -> None:
    result = format_sse_event("start", {})
    assert "event: start" in result


# ---------------------------------------------------------------------------
# Data payload
# ---------------------------------------------------------------------------


def test_data_is_valid_json() -> None:
    result = format_sse_event(EVENT_TOKEN, {"content": "hello"})
    # Extract the data line value
    for line in result.split("\n"):
        if line.startswith("data:"):
            raw = line[len("data:"):].strip()
            parsed = json.loads(raw)
            assert isinstance(parsed, dict)
            return
    raise AssertionError("No data line found in SSE output")


def test_ends_with_double_newline() -> None:
    result = format_sse_event(EVENT_TOKEN, {"content": "hello"})
    assert result.endswith("\n\n")


def test_data_dict_values_in_output() -> None:
    result = format_sse_event(EVENT_TOKEN, {"content": "hello"})
    assert "hello" in result


# ---------------------------------------------------------------------------
# Constants sanity-check
# ---------------------------------------------------------------------------


def test_event_constants_have_expected_values() -> None:
    assert EVENT_TOKEN == "token"
    assert EVENT_DONE == "done"
    assert EVENT_ERROR == "error"
    assert EVENT_START == "start"
