from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.llm.azure_provider import AzureOpenAIProvider
from app.services.llm.openai_provider import OpenAIProvider


def _mock_tool_call_response():
    tool_call = MagicMock()
    tool_call.id = "call_abc"
    tool_call.function.name = "list_my_projects"
    tool_call.function.arguments = "{}"

    message = MagicMock()
    message.content = ""
    message.tool_calls = [tool_call]

    choice = MagicMock()
    choice.message = message
    choice.finish_reason = "tool_calls"

    usage = MagicMock()
    usage.prompt_tokens = 10
    usage.completion_tokens = 5

    resp = MagicMock()
    resp.choices = [choice]
    resp.model = "gpt-4.1-deploy"
    resp.usage = usage
    return resp


@pytest.mark.asyncio
async def test_openai_chat_completion_forwards_tools():
    provider = OpenAIProvider(api_key="test-key", model="gpt-4o")
    provider.client = MagicMock()
    provider.client.chat.completions.create = AsyncMock(return_value=_mock_tool_call_response())

    tools = [{"type": "function", "function": {"name": "list_my_projects", "parameters": {}}}]
    result = await provider.chat_completion(
        [{"role": "user", "content": "list projects"}],
        tools=tools,
    )

    kwargs = provider.client.chat.completions.create.await_args.kwargs
    assert kwargs["tools"] == tools
    assert result.tool_calls is not None
    assert result.tool_calls[0]["function"]["name"] == "list_my_projects"
    assert result.finish_reason == "tool_calls"


@pytest.mark.asyncio
async def test_azure_chat_completion_forwards_tools():
    provider = AzureOpenAIProvider(
        api_key="test-key",
        azure_endpoint="https://example.openai.azure.com",
        api_version="2024-06-01",
        deployment="gpt-4.1-deploy",
    )
    provider.client = MagicMock()
    provider.client.chat.completions.create = AsyncMock(return_value=_mock_tool_call_response())

    tools = [{"type": "function", "function": {"name": "list_my_projects", "parameters": {}}}]
    result = await provider.chat_completion(
        [{"role": "user", "content": "list projects"}],
        tools=tools,
    )

    kwargs = provider.client.chat.completions.create.await_args.kwargs
    assert kwargs["tools"] == tools
    assert kwargs["model"] == "gpt-4.1-deploy"
    assert result.tool_calls is not None
    assert result.tool_calls[0]["function"]["name"] == "list_my_projects"
    assert result.finish_reason == "tool_calls"
