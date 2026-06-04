"""Shared helpers for OpenAI-compatible chat completion APIs (OpenAI, Azure, Ollama)."""
from __future__ import annotations

from app.services.llm.base import ChatResponse, StreamEvent


def build_chat_completion_kwargs(
    model: str,
    messages: list[dict],
    *,
    max_tokens: int | None = None,
    temperature: float | None = None,
    tools: list[dict] | None = None,
    stream: bool = False,
    stream_options: dict | None = None,
) -> dict:
    kwargs: dict = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if tools:
        kwargs["tools"] = tools
    if stream:
        kwargs["stream"] = True
    if stream_options:
        kwargs["stream_options"] = stream_options
    return kwargs


def parse_chat_completion_response(resp, *, fallback_model: str) -> ChatResponse:
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
        model=resp.model or fallback_model,
        prompt_tokens=resp.usage.prompt_tokens if resp.usage else None,
        completion_tokens=resp.usage.completion_tokens if resp.usage else None,
        tool_calls=tool_calls,
        finish_reason=choice.finish_reason,
    )


def parse_stream_delta(delta) -> StreamEvent | None:
    reasoning_text = (
        getattr(delta, "reasoning", None)
        or getattr(delta, "reasoning_content", None)
        or ""
    )
    if delta.content or reasoning_text:
        return StreamEvent(content=delta.content or "", reasoning=reasoning_text)
    return None
