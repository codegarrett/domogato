"""Azure OpenAI LLM and embedding providers."""
from __future__ import annotations

from collections.abc import AsyncIterator

from openai import AsyncAzureOpenAI, APIConnectionError, APITimeoutError, RateLimitError, APIStatusError

from app.services.llm.base import (
    BaseLLMProvider,
    BaseEmbeddingProvider,
    StreamEvent,
    LLMConnectionError,
    LLMRateLimitError,
    LLMResponseError,
)
from app.services.llm.openai_compat import (
    build_chat_completion_kwargs,
    parse_chat_completion_response,
    parse_stream_delta,
)


def _map_azure_error(exc: Exception) -> Exception:
    if isinstance(exc, (APIConnectionError, APITimeoutError)):
        return LLMConnectionError(str(exc))
    if isinstance(exc, RateLimitError):
        return LLMRateLimitError(str(exc))
    if isinstance(exc, APIStatusError):
        return LLMResponseError(f"Azure API error {exc.status_code}: {exc.message}")
    return LLMResponseError(str(exc))


class AzureOpenAIProvider(BaseLLMProvider):
    def __init__(
        self,
        api_key: str,
        azure_endpoint: str,
        api_version: str,
        deployment: str,
    ):
        self.model = deployment
        self.client = AsyncAzureOpenAI(
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            api_version=api_version,
        )

    async def chat_completion(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
        tools: list[dict] | None = None,
    ):
        try:
            kwargs = build_chat_completion_kwargs(
                self.model,
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                tools=tools,
            )
            resp = await self.client.chat.completions.create(**kwargs)
            return parse_chat_completion_response(resp, fallback_model=self.model)
        except Exception as exc:
            raise _map_azure_error(exc) from exc

    async def chat_completion_stream(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        try:
            kwargs = build_chat_completion_kwargs(
                self.model,
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
            stream = await self.client.chat.completions.create(**kwargs)
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as exc:
            raise _map_azure_error(exc) from exc

    async def chat_completion_stream_with_usage(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[StreamEvent]:
        try:
            kwargs = build_chat_completion_kwargs(
                self.model,
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
                stream_options={"include_usage": True},
            )
            stream = await self.client.chat.completions.create(**kwargs)
            async for chunk in stream:
                if chunk.choices:
                    event = parse_stream_delta(chunk.choices[0].delta)
                    if event:
                        yield event

                if chunk.usage:
                    yield StreamEvent(
                        is_done=True,
                        model=chunk.model or self.model,
                        prompt_tokens=chunk.usage.prompt_tokens,
                        completion_tokens=chunk.usage.completion_tokens,
                    )
        except Exception as exc:
            raise _map_azure_error(exc) from exc


class AzureEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(
        self,
        api_key: str,
        azure_endpoint: str,
        api_version: str,
        deployment: str,
        *,
        dimensions: int | None = None,
    ):
        from app.core.config import settings

        self.model = deployment
        self.dimensions = dimensions if dimensions is not None else settings.EMBEDDING_DIMENSIONS
        self.client = AsyncAzureOpenAI(
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            api_version=api_version,
        )

    async def create_embeddings(self, texts: list[str]) -> list[list[float]]:
        try:
            resp = await self.client.embeddings.create(
                model=self.model,
                input=texts,
                dimensions=self.dimensions,
            )
            return [item.embedding for item in resp.data]
        except Exception as exc:
            raise _map_azure_error(exc) from exc
