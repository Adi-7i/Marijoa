from __future__ import annotations

from typing import TYPE_CHECKING

from app.modules.ai_gateway.schemas import ProviderMessage

if TYPE_CHECKING:
    from app.modules.messages.model import Message

# The Responses API uses "developer" as the system-level role (equivalent to
# "system" in the Chat Completions API).  Using the correct role name ensures
# the model honours instructions with the expected priority.
_SYSTEM_ROLE = "developer"


def build_provider_messages(
    *,
    system_instruction: str | None,
    history: list[Message],
    current_content: str,
    max_history: int = 20,
) -> list[ProviderMessage]:
    """Assemble an ordered list of :class:`ProviderMessage` objects for the AI provider.

    The resulting list follows this structure:

    1. **System instruction** (optional) — prepended with the ``developer``
       role so the model treats it as a high-priority directive.
    2. **Recent history** — at most *max_history* previous turns from the
       conversation, in chronological order.
    3. **Current user message** — appended only when it is not already the
       last item in *history* (prevents duplication when the caller has
       already saved the message and included it in the history snapshot).

    Args:
        system_instruction: Optional workspace-level prompt injected before
            the conversation turns.  Whitespace-only values are ignored.
        history: Ordered list of :class:`~app.modules.messages.model.Message`
            ORM objects representing previous turns in the chat.
        current_content: The text of the new user message being processed.
        max_history: Maximum number of history turns to include.  Older turns
            are silently dropped to keep the context window manageable.

    Returns:
        List of :class:`ProviderMessage` ready to be passed to a provider's
        ``generate_response`` method.
    """
    messages: list[ProviderMessage] = []

    # 1. System / developer instruction
    if system_instruction and system_instruction.strip():
        messages.append(
            ProviderMessage(role=_SYSTEM_ROLE, content=system_instruction.strip())
        )

    # 2. Truncated conversation history
    recent = history[-max_history:] if len(history) > max_history else history
    for msg in recent:
        messages.append(ProviderMessage(role=msg.role, content=msg.content))

    # 3. Current user turn — skip if already at the tail of history to avoid
    #    sending the same message twice (the service saves the user message
    #    before calling this builder, so it may already appear in *history*).
    already_present = (
        bool(history)
        and history[-1].role == "user"
        and history[-1].content == current_content
    )
    if not already_present:
        messages.append(ProviderMessage(role="user", content=current_content))

    return messages
