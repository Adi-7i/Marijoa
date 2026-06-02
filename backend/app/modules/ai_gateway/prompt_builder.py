from __future__ import annotations

from typing import TYPE_CHECKING

from app.modules.ai_gateway.response_presentation import (
    build_response_presentation_instruction,
)
from app.modules.ai_gateway.schemas import ProviderMessage
from app.modules.web_search.citations import (
    NO_WEB_SEARCH_POLICY,
    build_web_search_context,
)

if TYPE_CHECKING:
    from app.modules.messages.model import Message
    from app.modules.web_search.schemas import CitationSource

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
    web_citations: list[CitationSource] | None = None,
    web_search_attempted: bool = False,
) -> list[ProviderMessage]:
    """Assemble an ordered list of :class:`ProviderMessage` objects for the AI provider.

    The resulting list follows this structure:

    1. **System instruction** (optional) — prepended with the ``developer``
       role so the model treats it as a high-priority directive.
    2. **Web search context** (optional) — when citations are supplied, a
       second developer message lists them with [1]..[N] markers and the
       grounding policy. When no search was performed for a turn that the
       user may have intended to be live, a short "no web search used"
       policy is appended instead so the model does not fabricate freshness.
    3. **Recent history** — at most *max_history* previous turns from the
       conversation, in chronological order.
    4. **Current user message** — appended only when it is not already the
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
        web_citations: Optional numbered web search citations to inject into
            the developer context for this turn.
        web_search_attempted: When ``True`` and *web_citations* is empty,
            a "no web search used" policy is appended so the model never
            fakes citation behaviour.

    Returns:
        List of :class:`ProviderMessage` ready to be passed to a provider's
        ``generate_response`` method.
    """
    messages: list[ProviderMessage] = []

    # 1. System / developer instruction.
    #
    # The Marijoa Response Presentation Layer (MRPL) wraps every workspace
    # instruction with a global presentation policy so the assistant has
    # consistent formatting and tone across all chats.  The policy is always
    # present (workspace-less chats still receive it); a workspace's own
    # ``system_instruction`` is appended as an additional section when set.
    developer_content = build_response_presentation_instruction(
        workspace_instruction=system_instruction,
    )
    if developer_content:
        messages.append(
            ProviderMessage(role=_SYSTEM_ROLE, content=developer_content)
        )

    # 2. Web search developer context (optional, per-turn).
    if web_citations:
        web_block = build_web_search_context(web_citations)
        if web_block:
            messages.append(ProviderMessage(role=_SYSTEM_ROLE, content=web_block))
    elif web_search_attempted:
        # Search was attempted but produced no usable citations — tell the
        # model not to pretend it has live evidence.
        messages.append(
            ProviderMessage(role=_SYSTEM_ROLE, content=NO_WEB_SEARCH_POLICY)
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
