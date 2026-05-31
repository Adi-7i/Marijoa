from __future__ import annotations

from abc import ABC, abstractmethod

from app.modules.ai_gateway.schemas import AICompletionResult, ProviderMessage


class AIProvider(ABC):
    """Abstract base class for AI provider integrations.

    All concrete providers must implement :meth:`generate_response` and return a
    fully populated :class:`~app.modules.ai_gateway.schemas.AICompletionResult`.
    """

    @abstractmethod
    def generate_response(
        self,
        messages: list[ProviderMessage],
    ) -> AICompletionResult:
        """Send *messages* to the provider and return the generated completion.

        Implementations are responsible for:
        - Converting :class:`ProviderMessage` objects into the provider wire format.
        - Measuring request latency.
        - Mapping provider-specific errors to the appropriate gateway exceptions.

        Args:
            messages: Ordered list of conversation turns, including any system
                instruction prepended by the prompt builder.

        Returns:
            A populated :class:`AICompletionResult` instance.

        Raises:
            AIConfigurationError: If the provider is misconfigured.
            AIProviderError: If the provider is unreachable or returns an error.
            AIResponseError: If the provider response cannot be parsed.
        """
