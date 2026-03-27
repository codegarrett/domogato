"""Anthropic LLM provider.

Handles the Anthropic Messages API which differs from the OpenAI format:
- System messages are passed as a separate `system` parameter
- Message format is otherwise similar but uses Anthropic-specific types
"""
from __future__ import annotations

from collections.abc import AsyncIterator

import structlog
from anthropic import AsyncAnthropic, APIConnectionError, APITimeoutError, RateLimitError, APIStatusError

from app.services.llm.base import (
    BaseLLMProvider,
    ChatResponse,
    StreamEvent,
    LLMConnectionError,
    LLMRateLimitError,
    LLMResponseError,
)

logger = structlog.get_logger()


def _map_anthropic_error(exc: Exception) -> Exception:
    if isinstance(exc, (APIConnectionError, APITimeoutError)):
        return LLMConnectionError(str(exc))
    if isinstance(exc, RateLimitError):
        return LLMRateLimitError(str(exc))
    if isinstance(exc, APIStatusError):
        return LLMResponseError(f"Anthropic API error {exc.status_code}: {exc.message}")
    return LLMResponseError(str(exc))


def _split_system_messages(messages: list[dict]) -> tuple[str | None, list[dict]]:
    """Extract system messages into the separate `system` parameter.

    Anthropic expects system content as a top-level parameter, not in the
    messages list.
    """
    system_parts: list[str] = []
    chat_messages: list[dict] = []

    for msg in messages:
        if msg.get("role") == "system":
            system_parts.append(msg["content"])
        else:
            chat_messages.append({"role": msg["role"], "content": msg["content"]})

    system = "\n\n".join(system_parts) if system_parts else None
    return system, chat_messages


def _convert_tools_to_anthropic(openai_tools: list[dict]) -> list[dict]:
    """Convert OpenAI-format tool schemas to Anthropic format."""
    anthropic_tools = []
    for tool in openai_tools:
        func = tool.get("function", {})
        anthropic_tools.append({
            "name": func.get("name", ""),
            "description": func.get("description", ""),
            "input_schema": func.get("parameters", {"type": "object", "properties": {}}),
        })
    return anthropic_tools


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        self.model = model
        self.client = AsyncAnthropic(api_key=api_key)

    async def chat_completion(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
        tools: list[dict] | None = None,
    ) -> ChatResponse:
        system, chat_messages = _split_system_messages(messages)
        kwargs: dict = {
            "model": self.model,
            "messages": chat_messages,
            "max_tokens": max_tokens or 4096,
        }
        if system:
            kwargs["system"] = system
        if temperature is not None:
            kwargs["temperature"] = temperature
        if tools:
            kwargs["tools"] = _convert_tools_to_anthropic(tools)

        try:
            resp = await self.client.messages.create(**kwargs)
            content = ""
            tool_calls = None
            for block in resp.content:
                if block.type == "text":
                    content += block.text
                elif block.type == "tool_use":
                    if tool_calls is None:
                        tool_calls = []
                    import json
                    tool_calls.append({
                        "id": block.id,
                        "type": "function",
                        "function": {
                            "name": block.name,
                            "arguments": json.dumps(block.input),
                        },
                    })

            finish_reason = "tool_calls" if resp.stop_reason == "tool_use" else "stop"

            return ChatResponse(
                content=content,
                model=resp.model,
                prompt_tokens=resp.usage.input_tokens,
                completion_tokens=resp.usage.output_tokens,
                tool_calls=tool_calls,
                finish_reason=finish_reason,
            )
        except Exception as exc:
            raise _map_anthropic_error(exc) from exc

    async def chat_completion_stream(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        system, chat_messages = _split_system_messages(messages)
        kwargs: dict = {
            "model": self.model,
            "messages": chat_messages,
            "max_tokens": max_tokens or 4096,
        }
        if system:
            kwargs["system"] = system
        if temperature is not None:
            kwargs["temperature"] = temperature

        try:
            async with self.client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as exc:
            raise _map_anthropic_error(exc) from exc

    async def chat_completion_stream_with_usage(
        self,
        messages: list[dict],
        *,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[StreamEvent]:
        system, chat_messages = _split_system_messages(messages)
        kwargs: dict = {
            "model": self.model,
            "messages": chat_messages,
            "max_tokens": max_tokens or 4096,
        }
        if system:
            kwargs["system"] = system
        if temperature is not None:
            kwargs["temperature"] = temperature

        try:
            async with self.client.messages.stream(**kwargs) as stream:
                async for text in stream.text_stream:
                    yield StreamEvent(content=text)

                final_message = await stream.get_final_message()
                yield StreamEvent(
                    is_done=True,
                    model=final_message.model,
                    prompt_tokens=final_message.usage.input_tokens,
                    completion_tokens=final_message.usage.output_tokens,
                )
        except Exception as exc:
            raise _map_anthropic_error(exc) from exc
