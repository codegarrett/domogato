from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.llm.base import LLMConfigError
from app.services.llm.factory import (
    _normalize_provider_name,
    get_embedding_provider,
    get_llm_provider,
)


def test_normalize_provider_name_azure_alias():
    assert _normalize_provider_name("azure") == "azure_openai"
    assert _normalize_provider_name("azure_openai") == "azure_openai"
    assert _normalize_provider_name("  Ollama ") == "ollama"


@patch("app.services.llm.factory.settings")
def test_get_llm_provider_unknown(mock_settings):
    mock_settings.LLM_PROVIDER = "unknown"
    mock_settings.LLM_MODEL = "test"
    with pytest.raises(LLMConfigError, match="Unknown LLM provider"):
        get_llm_provider()


@patch("app.services.llm.factory.settings")
def test_get_llm_provider_missing_config(mock_settings):
    mock_settings.LLM_PROVIDER = ""
    mock_settings.LLM_MODEL = ""
    with pytest.raises(LLMConfigError, match="LLM is not configured"):
        get_llm_provider()


@patch("app.services.llm.factory.settings")
def test_get_llm_provider_azure_alias(mock_settings):
    mock_settings.LLM_PROVIDER = "azure"
    mock_settings.LLM_MODEL = "gpt-4.1"
    mock_settings.LLM_API_KEY = "test-key"
    mock_settings.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com"
    mock_settings.AZURE_OPENAI_API_VERSION = "2024-06-01"
    mock_settings.AZURE_OPENAI_DEPLOYMENT = "gpt-4.1-deploy"

    provider = get_llm_provider()
    from app.services.llm.azure_provider import AzureOpenAIProvider

    assert isinstance(provider, AzureOpenAIProvider)
    assert provider.model == "gpt-4.1-deploy"


@patch("app.services.llm.factory.settings")
def test_get_llm_provider_ollama(mock_settings):
    mock_settings.LLM_PROVIDER = "ollama"
    mock_settings.LLM_MODEL = "kimi-k2.5"
    mock_settings.LLM_BASE_URL = "http://ollama:11434/v1"
    mock_settings.LLM_API_KEY = ""

    provider = get_llm_provider()
    from app.services.llm.ollama_provider import OllamaProvider

    assert isinstance(provider, OllamaProvider)
    assert provider.model == "kimi-k2.5"


@patch("app.services.llm.factory.settings")
def test_get_embedding_provider_azure_alias(mock_settings):
    mock_settings.EMBEDDING_PROVIDER = "azure"
    mock_settings.LLM_PROVIDER = "azure_openai"
    mock_settings.EMBEDDING_MODEL = "embed-deploy"
    mock_settings.EMBEDDING_API_KEY = ""
    mock_settings.LLM_API_KEY = "test-key"
    mock_settings.EMBEDDING_BASE_URL = ""
    mock_settings.LLM_BASE_URL = ""
    mock_settings.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com"
    mock_settings.AZURE_OPENAI_API_VERSION = "2024-06-01"

    provider = get_embedding_provider()
    from app.services.llm.azure_provider import AzureEmbeddingProvider

    assert isinstance(provider, AzureEmbeddingProvider)
    assert provider.model == "embed-deploy"
