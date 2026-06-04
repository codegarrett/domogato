from __future__ import annotations

from unittest.mock import MagicMock

from app.services.llm.openai_compat import (
    build_chat_completion_kwargs,
    parse_chat_completion_response,
)


def test_build_chat_completion_kwargs_includes_tools():
    kwargs = build_chat_completion_kwargs(
        "gpt-4o",
        [{"role": "user", "content": "hi"}],
        max_tokens=100,
        temperature=0.5,
        tools=[{"type": "function"}],
        stream=True,
        stream_options={"include_usage": True},
    )
    assert kwargs["model"] == "gpt-4o"
    assert kwargs["tools"] == [{"type": "function"}]
    assert kwargs["stream"] is True
    assert kwargs["stream_options"] == {"include_usage": True}


def test_parse_chat_completion_response_tool_calls():
    tool_call = MagicMock()
    tool_call.id = "call_1"
    tool_call.function.name = "create_ticket"
    tool_call.function.arguments = '{"title": "Test"}'

    message = MagicMock()
    message.content = "Creating ticket"
    message.tool_calls = [tool_call]

    choice = MagicMock()
    choice.message = message
    choice.finish_reason = "tool_calls"

    usage = MagicMock()
    usage.prompt_tokens = 12
    usage.completion_tokens = 8

    resp = MagicMock()
    resp.choices = [choice]
    resp.model = "gpt-4.1"
    resp.usage = usage

    result = parse_chat_completion_response(resp, fallback_model="fallback")
    assert result.content == "Creating ticket"
    assert result.model == "gpt-4.1"
    assert result.prompt_tokens == 12
    assert result.finish_reason == "tool_calls"
    assert result.tool_calls[0]["function"]["name"] == "create_ticket"
