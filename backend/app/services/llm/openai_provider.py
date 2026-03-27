"""OpenAI-compatible LLM and embedding providers.

Handles standard OpenAI API as well as any OpenAI-compatible endpoint
(e.g., Ollama) by accepting a custom base_url.
"""
from __future__ import annotations

from collections.abc import AsyncIterator

import structlog
from openai import AsyncOpenAI, APIConnectionError, APITimeoutError, RateLimitError, APIStatusError

from app.services.llm.base import (
    BaseLLMProvider,
    BaseEmbeddingProvider,
    ChatResponse,
    StreamEvent,
    LLMConnectionError,
    LLMRateLimitError,
    LLMResponseError,
)

logger = structlog.get_logger()


def _map_openai_error(exc: Exception) -> Exception:
    if isinstance(exc, (APIConnectionError, APITimeoutError)):
        return LLMConnectionError(str(exc))
    if isinstance(exc, RateLimitError):
        return LLMRateLimitError(str(exc))
    if isinstance(exc, APIStatusError):
        return LLMResponseError(f"API error {exc.status_code}: {exc.message}")
    return LLMResponseError(str(exc))


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str, base_url: str | None = None):
        self.model = model
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or None,
        )

    async def chat_completion(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
        tools: list[dict] | None = None,
    ) -> ChatResponse:
        try:
            kwargs: dict = dict(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            if tools:
                kwargs["tools"] = tools
            resp = await self.client.chat.completions.create(**kwargs)
            choice = resp.choices[0]

            tool_calls = None
            if choice.message.tool_calls:
                tool_calls = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in choice.message.tool_calls
                ]

            return ChatResponse(
                content=choice.message.content or "",
                model=resp.model,
                prompt_tokens=resp.usage.prompt_tokens if resp.usage else None,
                completion_tokens=resp.usage.completion_tokens if resp.usage else None,
                tool_calls=tool_calls,
                finish_reason=choice.finish_reason,
            )
        except Exception as exc:
            raise _map_openai_error(exc) from exc

    async def chat_completion_stream(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
        except Exception as exc:
            raise _map_openai_error(exc) from exc

    async def chat_completion_stream_with_usage(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[StreamEvent]:
        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
                stream_options={"include_usage": True},
            )
            async for chunk in stream:
                if chunk.choices:
                    delta = chunk.choices[0].delta
                    reasoning_text = getattr(delta, "reasoning", None) or getattr(delta, "reasoning_content", None) or ""
                    if delta.content or reasoning_text:
                        yield StreamEvent(
                            content=delta.content or "",
                            reasoning=reasoning_text,
                        )

                if chunk.usage:
                    yield StreamEvent(
                        is_done=True,
                        model=chunk.model or self.model,
                        prompt_tokens=chunk.usage.prompt_tokens,
                        completion_tokens=chunk.usage.completion_tokens,
                    )
        except Exception as exc:
            raise _map_openai_error(exc) from exc


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self, api_key: str, model: str, base_url: str | None = None):
        self.model = model
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url or None,
        )

    async def create_embeddings(self, texts: list[str]) -> list[list[float]]:
        try:
            resp = await self.client.embeddings.create(
                model=self.model,
                input=texts,
            )
            return [item.embedding for item in resp.data]
        except Exception as exc:
            raise _map_openai_error(exc) from exc
