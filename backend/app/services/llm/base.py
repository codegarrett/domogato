"""Abstract base classes for LLM and embedding providers."""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field


class LLMError(Exception):
    """Base exception for LLM operations."""


class LLMConfigError(LLMError):
    """Invalid or missing LLM configuration."""


class LLMConnectionError(LLMError):
    """Network/timeout issues communicating with the LLM provider."""


class LLMRateLimitError(LLMError):
    """Rate limiting from the LLM provider."""


class LLMResponseError(LLMError):
    """Invalid or unexpected response from the LLM provider."""


@dataclass
class ChatResponse:
    content: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    tool_calls: list[dict] | None = None
    finish_reason: str | None = None


@dataclass
class StreamEvent:
    """A single event from a streaming chat completion."""
    content: str = ""
    reasoning: str = ""
    is_done: bool = False
    model: str = ""
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class BaseLLMProvider(ABC):
    """Abstract interface for chat LLM providers."""

    model: str

    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
        tools: list[dict] | None = None,
    ) -> ChatResponse:
        """Non-streaming chat completion. Returns the full response."""
        ...

    @abstractmethod
    async def chat_completion_stream(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        """Streaming chat completion. Yields individual content tokens/chunks."""
        ...

    @abstractmethod
    async def chat_completion_stream_with_usage(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """Streaming chat with usage info in the final event."""
        ...


class BaseEmbeddingProvider(ABC):
    """Abstract interface for embedding providers."""

    model: str

    @abstractmethod
    async def create_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Create embeddings for a list of texts."""
        ...
