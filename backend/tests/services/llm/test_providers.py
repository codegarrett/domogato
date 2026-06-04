from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.llm.azure_provider import AzureEmbeddingProvider, AzureOpenAIProvider
from app.services.llm.openai_provider import OpenAIEmbeddingProvider, OpenAIProvider


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
async def test_openai_embedding_requests_configured_dimensions():
    provider = OpenAIEmbeddingProvider(
        api_key="test-key",
        model="text-embedding-3-large",
        dimensions=1536,
    )
    provider.client = MagicMock()
    item = MagicMock()
    item.embedding = [0.0] * 1536
    resp = MagicMock()
    resp.data = [item]
    provider.client.embeddings.create = AsyncMock(return_value=resp)

    await provider.create_embeddings(["hello"])

    kwargs = provider.client.embeddings.create.await_args.kwargs
    assert kwargs["model"] == "text-embedding-3-large"
    assert kwargs["dimensions"] == 1536


@pytest.mark.asyncio
async def test_openai_embedding_skips_dimensions_for_legacy_models():
    provider = OpenAIEmbeddingProvider(
        api_key="test-key",
        model="text-embedding-ada-002",
    )
    provider.client = MagicMock()
    item = MagicMock()
    item.embedding = [0.0] * 1536
    resp = MagicMock()
    resp.data = [item]
    provider.client.embeddings.create = AsyncMock(return_value=resp)

    await provider.create_embeddings(["hello"])

    kwargs = provider.client.embeddings.create.await_args.kwargs
    assert "dimensions" not in kwargs


@pytest.mark.asyncio
async def test_azure_embedding_requests_configured_dimensions():
    provider = AzureEmbeddingProvider(
        api_key="test-key",
        azure_endpoint="https://example.openai.azure.com",
        api_version="2024-06-01",
        deployment="embed-v3",
        dimensions=1536,
    )
    provider.client = MagicMock()
    item = MagicMock()
    item.embedding = [0.0] * 1536
    resp = MagicMock()
    resp.data = [item]
    provider.client.embeddings.create = AsyncMock(return_value=resp)

    await provider.create_embeddings(["hello"])

    kwargs = provider.client.embeddings.create.await_args.kwargs
    assert kwargs["dimensions"] == 1536


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
