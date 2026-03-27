"""Azure OpenAI LLM and embedding providers."""
from __future__ import annotations

from collections.abc import AsyncIterator

from openai import AsyncAzureOpenAI, APIConnectionError, APITimeoutError, RateLimitError, APIStatusError

from app.services.llm.base import (
    BaseLLMProvider,
    BaseEmbeddingProvider,
    ChatResponse,
    StreamEvent,
    LLMConnectionError,
    LLMRateLimitError,
    LLMResponseError,
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
    ) -> ChatResponse:
        try:
            resp = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            choice = resp.choices[0]
            return ChatResponse(
                content=choice.message.content or "",
                model=resp.model,
                prompt_tokens=resp.usage.prompt_tokens if resp.usage else None,
                completion_tokens=resp.usage.completion_tokens if resp.usage else None,
            )
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
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )
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
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
                stream_options={"include_usage": True},
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield StreamEvent(content=chunk.choices[0].delta.content)

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
    ):
        self.model = deployment
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
            )
            return [item.embedding for item in resp.data]
        except Exception as exc:
            raise _map_azure_error(exc) from exc
