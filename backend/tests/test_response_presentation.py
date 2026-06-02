"""Tests for the Marijoa Response Presentation Layer (MRPL).

These tests cover the global policy module
(``app.modules.ai_gateway.response_presentation``) and its integration with
the prompt builder.  No database or network access is required — a tiny
FakeMessage dataclass stands in for the ORM Message object.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.modules.ai_gateway.prompt_builder import build_provider_messages
from app.modules.ai_gateway.response_presentation import (
    GLOBAL_RESPONSE_PRESENTATION_POLICY,
    build_response_presentation_instruction,
)


@dataclass
class FakeMessage:
    """Minimal stand-in for the SQLAlchemy Message ORM object."""

    role: str
    content: str


# ---------------------------------------------------------------------------
# Policy text shape
# ---------------------------------------------------------------------------


def test_policy_string_contains_marker() -> None:
    """The policy must identify the assistant and include a known rule phrase."""
    assert "Marijoa AI" in GLOBAL_RESPONSE_PRESENTATION_POLICY
    assert "Use markdown only when" in GLOBAL_RESPONSE_PRESENTATION_POLICY


def test_policy_string_is_non_trivial() -> None:
    """Sanity check: the policy is not accidentally truncated to an empty string."""
    assert len(GLOBAL_RESPONSE_PRESENTATION_POLICY.strip()) > 200


# ---------------------------------------------------------------------------
# build_response_presentation_instruction behaviour
# ---------------------------------------------------------------------------


def test_build_with_no_workspace_returns_policy_only() -> None:
    """With no extra context, the builder returns just the global policy."""
    result = build_response_presentation_instruction()
    assert result == GLOBAL_RESPONSE_PRESENTATION_POLICY.strip()
    # No section headers should appear.
    assert "Workspace context" not in result
    assert "Module context" not in result


def test_build_with_none_workspace_returns_policy_only() -> None:
    result = build_response_presentation_instruction(workspace_instruction=None)
    assert "Marijoa AI" in result
    assert "Workspace context" not in result


def test_build_with_empty_workspace_returns_policy_only() -> None:
    result = build_response_presentation_instruction(workspace_instruction="")
    assert "Workspace context" not in result


def test_build_with_whitespace_workspace_returns_policy_only() -> None:
    result = build_response_presentation_instruction(workspace_instruction="   \n\t  ")
    assert "Workspace context" not in result


def test_build_with_workspace_includes_both_sections() -> None:
    """A non-empty workspace instruction is appended in its own section."""
    workspace = "You are a legal assistant. Cite statutes."
    result = build_response_presentation_instruction(workspace_instruction=workspace)
    assert "Marijoa AI" in result
    assert "Workspace context" in result
    assert workspace in result
    # Global policy comes before the workspace section.
    assert result.index("Marijoa AI") < result.index("Workspace context")


def test_build_with_module_instruction_includes_module_section() -> None:
    result = build_response_presentation_instruction(
        module_instruction="Reply only with JSON."
    )
    assert "Module context" in result
    assert "Reply only with JSON." in result


def test_build_with_workspace_and_module_includes_all_sections() -> None:
    result = build_response_presentation_instruction(
        workspace_instruction="WS prompt",
        module_instruction="MOD prompt",
    )
    assert "Marijoa AI" in result
    assert "Workspace context" in result
    assert "Module context" in result
    # Ordering: global -> workspace -> module
    assert result.index("Marijoa AI") < result.index("Workspace context")
    assert result.index("Workspace context") < result.index("Module context")


def test_build_strips_workspace_whitespace() -> None:
    result = build_response_presentation_instruction(
        workspace_instruction="  Trim me.  "
    )
    assert "Trim me." in result
    # The padded form must not survive into the output.
    assert "  Trim me.  " not in result


def test_build_does_not_duplicate_policy_when_called_twice() -> None:
    """Calling the builder twice must NOT produce two policy blocks."""
    first = build_response_presentation_instruction(workspace_instruction="WS")
    second = build_response_presentation_instruction(workspace_instruction="WS")
    assert first == second
    # The unique marker phrase appears exactly once in each result.
    assert first.count("Marijoa AI") == 1
    assert second.count("Marijoa AI") == 1
    # Workspace section is also not duplicated.
    assert first.count("Workspace context") == 1


def test_build_has_no_trailing_whitespace() -> None:
    """Output must not pollute the developer message with trailing whitespace."""
    result = build_response_presentation_instruction(workspace_instruction="hello")
    assert result == result.rstrip()
    result_no_ws = build_response_presentation_instruction()
    assert result_no_ws == result_no_ws.rstrip()


# ---------------------------------------------------------------------------
# Integration: prompt builder uses the MRPL policy as the developer message
# ---------------------------------------------------------------------------


def test_prompt_builder_includes_policy_exactly_once() -> None:
    """The prompt builder must inject the global policy a single time."""
    messages = build_provider_messages(
        system_instruction="Workspace says hi.",
        history=[],
        current_content="Hello",
    )
    # Concatenate all message contents — the marker phrase should appear once.
    blob = "\n".join(m.content for m in messages)
    assert blob.count("Marijoa AI") == 1
    # And the developer message is the first one.
    assert messages[0].role == "developer"
    assert "Marijoa AI" in messages[0].content
    assert "Workspace says hi." in messages[0].content


def test_prompt_builder_includes_policy_when_no_workspace() -> None:
    messages = build_provider_messages(
        system_instruction=None,
        history=[],
        current_content="Hi there",
    )
    assert messages[0].role == "developer"
    assert "Marijoa AI" in messages[0].content
    # No workspace section header when workspace is absent.
    assert "Workspace context" not in messages[0].content


def test_prompt_builder_preserves_recent_messages() -> None:
    """History turns must survive the policy injection unchanged."""
    history = [
        FakeMessage(role="user", content="first question"),
        FakeMessage(role="assistant", content="first answer"),
        FakeMessage(role="user", content="second question"),
        FakeMessage(role="assistant", content="second answer"),
    ]
    messages = build_provider_messages(
        system_instruction="WS",
        history=history,  # type: ignore[arg-type]
        current_content="third question",
    )
    contents = [m.content for m in messages]
    # All original history contents survive.
    assert "first question" in contents
    assert "first answer" in contents
    assert "second question" in contents
    assert "second answer" in contents
    assert "third question" in contents
    # Order preserved.
    assert contents.index("first question") < contents.index("first answer")
    assert contents.index("first answer") < contents.index("second question")
    assert contents.index("second question") < contents.index("second answer")
    assert contents.index("second answer") < contents.index("third question")


def test_prompt_builder_developer_message_is_a_single_string() -> None:
    """The developer message is one consolidated string, not split into multiples."""
    messages = build_provider_messages(
        system_instruction="WS",
        history=[],
        current_content="Hello",
    )
    developer_messages = [m for m in messages if m.role == "developer"]
    assert len(developer_messages) == 1
