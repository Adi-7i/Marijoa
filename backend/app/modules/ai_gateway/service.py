from __future__ import annotations

import logging
from collections.abc import Generator
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.ai_gateway.exceptions import (
    AIConfigurationError,
    AIProviderError,
    AIResponseError,
)
from app.modules.ai_gateway.prompt_builder import build_provider_messages
from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider
from app.modules.ai_gateway.schemas import AIRespondResponse
from app.modules.chats.service import get_chat
from app.modules.messages import service as message_service
from app.modules.messages.schemas import MessageRead
from app.modules.web_search import service as web_search_service
from app.modules.web_search.schemas import WebMode
from app.modules.web_search.service import WebSearchOutcome
from app.modules.workspaces import repository as ws_repo

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Provider factory
# ---------------------------------------------------------------------------


def _get_provider() -> OpenAICompatibleProvider:
    """Instantiate and return the configured AI provider.

    :class:`AIConfigurationError` propagates to the caller unchanged so the
    global exception handler can return a 503 response.
    """
    return OpenAICompatibleProvider()


# ---------------------------------------------------------------------------
# Web search integration helpers
# ---------------------------------------------------------------------------


def _resolve_web_mode(value: WebMode | str | None) -> WebMode:
    """Coerce a request value into a :class:`WebMode`, defaulting to settings."""
    if isinstance(value, WebMode):
        return value
    if isinstance(value, str) and value:
        try:
            return WebMode(value)
        except ValueError:
            pass
    default = get_settings().WEB_SEARCH_DEFAULT_MODE
    try:
        return WebMode(default)
    except ValueError:
        return WebMode.AUTO


def _build_search_metadata(outcome: WebSearchOutcome) -> dict:
    """Project a :class:`WebSearchOutcome` into stored message metadata."""
    decision = outcome.decision
    base: dict = {
        "web_search_used": outcome.used,
        "web_mode": decision.mode.value,
        "search_decision": {
            "should_search": decision.should_search,
            "reason": decision.reason,
            "queries": list(decision.queries),
            "decision_source": decision.decision_source,
        },
        "search_queries": list(decision.queries),
        "sources": [c.model_dump() for c in outcome.citations],
    }
    if outcome.search_error:
        base["search_error"] = outcome.search_error
    return base


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


def ai_respond(
    db: Session,
    *,
    chat_id: UUID,
    content: str,
    user_id: UUID,
    web_mode: WebMode | str | None = None,
) -> AIRespondResponse:
    """Process a user message and generate an AI assistant reply.

    Steps:
    1. Verify the chat exists and the user has access.
    2. Persist the user message.
    3. Run the web-search decision layer and (optionally) the provider.
    4. Fetch recent conversation history for LLM context.
    5. Resolve the workspace system instruction (if any).
    6. Build the provider message list with optional web context.
    7. Call the AI provider.
    8. Persist the assistant message with provider + search metadata.
    9. Return both messages to the caller.

    Args:
        db: Active SQLAlchemy database session.
        chat_id: UUID of the target chat.
        content: Text of the new user message.
        user_id: UUID of the authenticated user sending the message.
        web_mode: Web access mode for this turn (auto/off/search).

    Returns:
        :class:`AIRespondResponse` containing the persisted user message and
        the AI-generated assistant message.

    Raises:
        ResourceNotFoundError: If the chat does not exist.
        AuthorizationError: If the user is not a member of the chat's workspace.
        AIConfigurationError: If the AI provider is misconfigured.
        AIProviderError: If the AI provider returns an error or is unreachable.
        AIResponseError: If the AI provider response cannot be parsed.
    """
    settings = get_settings()
    mode = _resolve_web_mode(web_mode)

    # 1. Verify chat access — raises ResourceNotFoundError / AuthorizationError
    chat = get_chat(db, chat_id, user_id)

    # 2. Persist the incoming user message
    user_msg = message_service.save_user_message(
        db,
        chat_id=chat_id,
        content=content,
        user_id=user_id,
    )

    # 3. Web search decision + (optional) execution
    web_outcome = web_search_service.run_search_for_message(
        message=content,
        mode=mode,
    )

    # 4. Fetch recent conversation history (includes the just-saved user message)
    history = message_service.get_recent_for_ai(
        db,
        chat_id,
        limit=settings.AI_MAX_HISTORY_MESSAGES,
    )

    # 5. Resolve the workspace system instruction
    workspace = ws_repo.get_workspace_by_id(db, chat.workspace_id)
    system_instruction: str | None = workspace.system_instruction if workspace else None

    # 6. Build the ordered provider message list
    provider_messages = build_provider_messages(
        system_instruction=system_instruction,
        history=history,
        current_content=content,
        max_history=settings.AI_MAX_HISTORY_MESSAGES,
        web_citations=web_outcome.citations,
        web_search_attempted=web_outcome.decision.should_search,
    )

    # 7. Call the AI provider
    provider = _get_provider()
    result = provider.generate_response(provider_messages)

    logger.info(
        "AI response generated: chat=%s provider=%s model=%s latency_ms=%s web_search_used=%s",
        chat_id,
        result.provider,
        result.model,
        result.latency_ms,
        web_outcome.used,
    )

    # 8. Persist the assistant message with provider + search metadata
    meta: dict = {
        "provider": result.provider,
        "usage": result.usage,
        "latency_ms": result.latency_ms,
        **_build_search_metadata(web_outcome),
    }
    assistant_msg = message_service.save_assistant_message(
        db,
        chat_id=chat_id,
        content=result.content,
        model=result.model,
        metadata_json=meta,
    )

    # 9. Return the exchange
    return AIRespondResponse(
        user_message=MessageRead.model_validate(user_msg),
        assistant_message=MessageRead.model_validate(assistant_msg),
    )


def ai_stream(
    db: Session,
    *,
    chat_id: UUID,
    content: str,
    user_id: UUID,
    web_mode: WebMode | str | None = None,
) -> Generator[str, None, None]:
    """Stream an AI assistant reply for a user message as SSE events.

    Validation (chat access check + user message persistence) runs synchronously
    before the first yield so FastAPI exception handlers can still return proper
    HTTP error responses.

    Yields SSE-formatted strings with event types:
    ``start``, ``web_search_start``, ``web_sources``, ``token``, ``done``, ``error``.

    Args:
        db: Active SQLAlchemy database session.
        chat_id: UUID of the target chat.
        content: Text of the new user message.
        user_id: UUID of the authenticated user sending the message.
        web_mode: Web access mode for this turn (auto/off/search).

    Returns:
        A generator that yields SSE-formatted event strings.

    Raises:
        ResourceNotFoundError: If the chat does not exist (before first yield).
        AuthorizationError: If the user lacks access (before first yield).
        AIConfigurationError: If the AI provider is misconfigured (before first yield).
    """
    from app.modules.ai_gateway.streaming import (
        EVENT_DONE,
        EVENT_ERROR,
        EVENT_START,
        EVENT_TOKEN,
        EVENT_WEB_SEARCH_START,
        EVENT_WEB_SOURCES,
        format_sse_event,
    )

    settings = get_settings()
    mode = _resolve_web_mode(web_mode)

    # Validation runs synchronously before any yield so HTTP errors are raised
    # before StreamingResponse starts sending bytes.
    chat = get_chat(db, chat_id, user_id)
    user_msg = message_service.save_user_message(
        db,
        chat_id=chat_id,
        content=content,
        user_id=user_id,
    )

    def _generate() -> Generator[str, None, None]:
        yield format_sse_event(
            EVENT_START,
            {"chat_id": str(chat_id), "user_message_id": str(user_msg.id)},
        )

        # Run web search BEFORE token streaming begins so the model gets the
        # full grounding context. Failures are non-fatal: the stream continues
        # with whatever evidence we managed to collect.
        web_outcome = web_search_service.run_search_for_message(
            message=content,
            mode=mode,
        )

        if web_outcome.decision.should_search:
            yield format_sse_event(
                EVENT_WEB_SEARCH_START,
                {
                    "mode": web_outcome.decision.mode.value,
                    "queries": list(web_outcome.decision.queries),
                },
            )

        if web_outcome.citations:
            yield format_sse_event(
                EVENT_WEB_SOURCES,
                {"sources": [c.model_dump() for c in web_outcome.citations]},
            )

        history = message_service.get_recent_for_ai(
            db, chat_id, limit=settings.AI_MAX_HISTORY_MESSAGES
        )
        workspace = ws_repo.get_workspace_by_id(db, chat.workspace_id)
        system_instruction: str | None = (
            workspace.system_instruction if workspace else None
        )

        provider_messages = build_provider_messages(
            system_instruction=system_instruction,
            history=history,
            current_content=content,
            max_history=settings.AI_MAX_HISTORY_MESSAGES,
            web_citations=web_outcome.citations,
            web_search_attempted=web_outcome.decision.should_search,
        )

        provider = _get_provider()
        accumulated: list[str] = []

        try:
            for chunk in provider.stream_response(provider_messages):
                accumulated.append(chunk)
                yield format_sse_event(EVENT_TOKEN, {"content": chunk})

            full_content = "".join(accumulated)
            search_meta = _build_search_metadata(web_outcome)
            if full_content.strip():
                assistant_msg = message_service.save_assistant_message(
                    db,
                    chat_id=chat_id,
                    content=full_content,
                    model=settings.OPENAI_COMPATIBLE_MODEL,
                    metadata_json={
                        "provider": "openai_compatible",
                        "streaming": True,
                        **search_meta,
                    },
                )
                yield format_sse_event(
                    EVENT_DONE,
                    {
                        "message_id": str(assistant_msg.id),
                        "chat_id": str(chat_id),
                        "web_search_used": web_outcome.used,
                    },
                )
            else:
                yield format_sse_event(
                    EVENT_DONE,
                    {
                        "message_id": None,
                        "chat_id": str(chat_id),
                        "web_search_used": web_outcome.used,
                    },
                )
        except (AIProviderError, AIConfigurationError, AIResponseError) as exc:
            logger.warning(
                "AI stream ended with handled provider error: chat=%s code=%s",
                chat_id,
                exc.code,
            )
            yield format_sse_event(
                EVENT_ERROR, {"code": exc.code, "message": exc.message}
            )
        except Exception:
            logger.exception(
                "AI stream raised an unexpected error: chat=%s",
                chat_id,
            )
            yield format_sse_event(
                EVENT_ERROR,
                {
                    "code": "AI_SERVICE_UNAVAILABLE",
                    "message": "AI service is temporarily unavailable",
                },
            )

    return _generate()
