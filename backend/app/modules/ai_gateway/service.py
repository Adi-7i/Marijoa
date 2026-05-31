from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.ai_gateway.exceptions import AIConfigurationError, AIProviderError
from app.modules.ai_gateway.prompt_builder import build_provider_messages
from app.modules.ai_gateway.providers.openai_compatible_provider import OpenAICompatibleProvider
from app.modules.ai_gateway.schemas import AIRespondResponse
from app.modules.chats.service import get_chat
from app.modules.messages import service as message_service
from app.modules.messages.schemas import MessageRead
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
# Public service function
# ---------------------------------------------------------------------------


def ai_respond(
    db: Session,
    *,
    chat_id: UUID,
    content: str,
    user_id: UUID,
) -> AIRespondResponse:
    """Process a user message and generate an AI assistant reply.

    Steps:
    1. Verify the chat exists and the user has access.
    2. Persist the user message.
    3. Fetch recent conversation history for LLM context.
    4. Resolve the workspace system instruction (if any).
    5. Build the provider message list.
    6. Call the AI provider.
    7. Persist the assistant message with provider metadata.
    8. Return both messages to the caller.

    Args:
        db: Active SQLAlchemy database session.
        chat_id: UUID of the target chat.
        content: Text of the new user message.
        user_id: UUID of the authenticated user sending the message.

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

    # 1. Verify chat access — raises ResourceNotFoundError / AuthorizationError
    chat = get_chat(db, chat_id, user_id)

    # 2. Persist the incoming user message
    user_msg = message_service.save_user_message(
        db,
        chat_id=chat_id,
        content=content,
        user_id=user_id,
    )

    # 3. Fetch recent conversation history (includes the just-saved user message)
    history = message_service.get_recent_for_ai(
        db,
        chat_id,
        limit=settings.AI_MAX_HISTORY_MESSAGES,
    )

    # 4. Resolve the workspace system instruction
    workspace = ws_repo.get_workspace_by_id(db, chat.workspace_id)
    system_instruction: str | None = workspace.system_instruction if workspace else None

    # 5. Build the ordered provider message list
    provider_messages = build_provider_messages(
        system_instruction=system_instruction,
        history=history,
        current_content=content,
        max_history=settings.AI_MAX_HISTORY_MESSAGES,
    )

    # 6. Call the AI provider
    provider = _get_provider()
    result = provider.generate_response(provider_messages)

    logger.info(
        "AI response generated: chat=%s provider=%s model=%s latency_ms=%s",
        chat_id,
        result.provider,
        result.model,
        result.latency_ms,
    )

    # 7. Persist the assistant message with provider metadata
    meta: dict = {
        "provider": result.provider,
        "usage": result.usage,
        "latency_ms": result.latency_ms,
    }
    assistant_msg = message_service.save_assistant_message(
        db,
        chat_id=chat_id,
        content=result.content,
        model=result.model,
        metadata_json=meta,
    )

    # 8. Return the exchange
    return AIRespondResponse(
        user_message=MessageRead.model_validate(user_msg),
        assistant_message=MessageRead.model_validate(assistant_msg),
    )
