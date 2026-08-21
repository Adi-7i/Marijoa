"""Unit tests for the AI Gateway prompt builder.

No database or network access required. A simple FakeMessage dataclass
is used to represent ORM Message objects without touching SQLAlchemy.
"""
from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.modules.ai_gateway.prompt_builder import build_provider_messages
from app.modules.ai_gateway.response_presentation import (
    GLOBAL_RESPONSE_PRESENTATION_POLICY,
)
from app.modules.ai_gateway.schemas import ProviderMessage


@dataclass
class FakeMessage:
    """Minimal stand-in for the SQLAlchemy Message ORM object."""

    role: str
    content: str


# ---------------------------------------------------------------------------
# System instruction handling
# ---------------------------------------------------------------------------


def test_system_instruction_included_as_first_message() -> None:
    messages = build_provider_messages(
        system_instruction="Be helpful.",
        history=[],
        current_content="Hi",
    )
    assert len(messages) >= 1
    assert messages[0].role == "developer"
    # The MRPL global policy is always prepended, with the workspace
    # instruction appended in its own section.
    assert "Be helpful." in messages[0].content
    assert "Marijoa AI" in messages[0].content


def test_global_policy_present_even_when_system_instruction_is_none() -> None:
    """The MRPL policy is always sent as the developer message."""
    messages = build_provider_messages(
        system_instruction=None,
        history=[],
        current_content="Hello",
    )
    assert messages[0].role == "developer"
    assert "Marijoa AI" in messages[0].content


def test_global_policy_present_when_system_instruction_is_empty() -> None:
    messages = build_provider_messages(
        system_instruction="",
        history=[],
        current_content="Hello",
    )
    assert messages[0].role == "developer"
    assert GLOBAL_RESPONSE_PRESENTATION_POLICY.strip() in messages[0].content


def test_global_policy_present_when_system_instruction_is_whitespace() -> None:
    messages = build_provider_messages(
        system_instruction="   \n\t  ",
        history=[],
        current_content="Hello",
    )
    assert messages[0].role == "developer"
    assert GLOBAL_RESPONSE_PRESENTATION_POLICY.strip() in messages[0].content


def test_system_instruction_stripped_before_use() -> None:
    messages = build_provider_messages(
        system_instruction="  Be concise.  ",
        history=[],
        current_content="Ping",
    )
    assert messages[0].role == "developer"
    # Workspace instruction text is trimmed and appears verbatim alongside
    # the global policy.
    assert "Be concise." in messages[0].content
    assert "  Be concise.  " not in messages[0].content


# ---------------------------------------------------------------------------
# Message order preservation
# ---------------------------------------------------------------------------


def test_message_order_preserved_chronologically() -> None:
    history = [
        FakeMessage(role="user", content="first"),
        FakeMessage(role="assistant", content="second"),
        FakeMessage(role="user", content="third"),
    ]
    messages = build_provider_messages(
        system_instruction=None,
        history=history,  # type: ignore[arg-type]
        current_content="fourth",
    )
    # Expect: developer policy, first, second, third (history), fourth (current)
    contents = [m.content for m in messages]
    assert contents.index("first") < contents.index("second")
    assert contents.index("second") < contents.index("third")
    assert contents.index("third") < contents.index("fourth")
    # The developer policy always precedes conversation messages.
    assert messages[0].role == "developer"


def test_message_order_with_system_instruction() -> None:
    history = [
        FakeMessage(role="user", content="msg1"),
        FakeMessage(role="assistant", content="msg2"),
    ]
    messages = build_provider_messages(
        system_instruction="System prompt",
        history=history,  # type: ignore[arg-type]
        current_content="msg3",
    )
    assert messages[0].role == "developer"
    assert messages[1].content == "msg1"
    assert messages[2].content == "msg2"
    assert messages[3].content == "msg3"


# ---------------------------------------------------------------------------
# max_history limiting
# ---------------------------------------------------------------------------


def test_max_history_limits_older_messages() -> None:
    history = [FakeMessage(role="user", content=f"msg{i}") for i in range(10)]
    messages = build_provider_messages(
        system_instruction=None,
        history=history,  # type: ignore[arg-type]
        current_content="new",
        max_history=3,
    )
    # Filter to only the conversation history messages (exclude the developer
    # policy message and the current "new" turn).
    history_contents = [
        m.content
        for m in messages
        if m.role != "developer" and m.content != "new"
    ]
    assert len(history_contents) == 3
    # Should be the last 3: msg7, msg8, msg9
    assert "msg7" in history_contents
    assert "msg8" in history_contents
    assert "msg9" in history_contents
    assert "msg0" not in history_contents


def test_max_history_of_one_keeps_only_last_message() -> None:
    history = [
        FakeMessage(role="user", content="old"),
        FakeMessage(role="assistant", content="recent"),
    ]
    messages = build_provider_messages(
        system_instruction=None,
        history=history,  # type: ignore[arg-type]
        current_content="current",
        max_history=1,
    )
    contents = [m.content for m in messages]
    assert "old" not in contents
    assert "recent" in contents
    assert "current" in contents


def test_max_history_larger_than_history_keeps_all() -> None:
    history = [
        FakeMessage(role="user", content="a"),
        FakeMessage(role="assistant", content="b"),
    ]
    messages = build_provider_messages(
        system_instruction=None,
        history=history,  # type: ignore[arg-type]
        current_content="c",
        max_history=100,
    )
    contents = [m.content for m in messages]
    assert "a" in contents
    assert "b" in contents
    assert "c" in contents


# ---------------------------------------------------------------------------
# Empty history
# ---------------------------------------------------------------------------


def test_empty_history_works() -> None:
    messages = build_provider_messages(
        system_instruction=None,
        history=[],
        current_content="Hello!",
    )
    # MRPL adds the global policy developer message, then the user turn.
    assert len(messages) == 2
    assert messages[0].role == "developer"
    assert messages[1].role == "user"
    assert messages[1].content == "Hello!"


def test_empty_history_with_system_instruction() -> None:
    messages = build_provider_messages(
        system_instruction="Be helpful.",
        history=[],
        current_content="Hi",
    )
    assert len(messages) == 2
    assert messages[0].role == "developer"
    assert "Be helpful." in messages[0].content
    assert messages[1].role == "user"
    assert messages[1].content == "Hi"


# ---------------------------------------------------------------------------
# Deduplication: current message not added when already last in history
# ---------------------------------------------------------------------------


def test_current_message_not_duplicated_when_already_last_in_history() -> None:
    history = [
        FakeMessage(role="assistant", content="prev response"),
        FakeMessage(role="user", content="my question"),
    ]
    messages = build_provider_messages(
        system_instruction=None,
        history=history,  # type: ignore[arg-type]
        current_content="my question",
    )
    user_messages = [m for m in messages if m.content == "my question"]
    assert len(user_messages) == 1


def test_current_message_added_when_history_is_empty() -> None:
    messages = build_provider_messages(
        system_instruction=None,
        history=[],
        current_content="Brand new message",
    )
    assert any(m.content == "Brand new message" for m in messages)


def test_current_message_added_when_last_history_differs() -> None:
    history = [
        FakeMessage(role="user", content="different content"),
    ]
    messages = build_provider_messages(
        system_instruction=None,
        history=history,  # type: ignore[arg-type]
        current_content="new content",
    )
    contents = [m.content for m in messages]
    assert "different content" in contents
    assert "new content" in contents


def test_current_message_added_when_last_history_is_assistant() -> None:
    """Current user message is always appended when last history turn is assistant."""
    history = [
        FakeMessage(role="user", content="question"),
        FakeMessage(role="assistant", content="answer"),
    ]
    messages = build_provider_messages(
        system_instruction=None,
        history=history,  # type: ignore[arg-type]
        current_content="follow up",
    )
    contents = [m.content for m in messages]
    assert "follow up" in contents


# ---------------------------------------------------------------------------
# Return type validation
# ---------------------------------------------------------------------------


def test_build_returns_provider_message_instances() -> None:
    messages = build_provider_messages(
        system_instruction="Sys",
        history=[FakeMessage(role="user", content="hi")],  # type: ignore[arg-type]
        current_content="hello",
    )
    for msg in messages:
        assert isinstance(msg, ProviderMessage)
