"""LLM provider abstraction layer.

Supports OpenAI, Azure OpenAI, Ollama (local and cloud), and Anthropic.
"""
from app.services.llm.base import (
    BaseLLMProvider,
    BaseEmbeddingProvider,
    ChatResponse,
    StreamEvent,
    LLMError,
    LLMConfigError,
    LLMConnectionError,
    LLMRateLimitError,
    LLMResponseError,
)
from app.services.llm.factory import (
    get_llm_provider,
    get_embedding_provider,
    is_llm_configured,
    is_embedding_configured,
)

__all__ = [
    "BaseLLMProvider",
    "BaseEmbeddingProvider",
    "ChatResponse",
    "StreamEvent",
    "LLMError",
    "LLMConfigError",
    "LLMConnectionError",
    "LLMRateLimitError",
    "LLMResponseError",
    "get_llm_provider",
    "get_embedding_provider",
    "is_llm_configured",
    "is_embedding_configured",
]
