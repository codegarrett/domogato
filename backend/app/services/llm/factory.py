"""Provider factory functions for LLM and embedding providers."""
from __future__ import annotations

import structlog

from app.core.config import settings
from app.services.llm.base import (
    BaseLLMProvider,
    BaseEmbeddingProvider,
    LLMConfigError,
)

logger = structlog.get_logger()


def is_llm_configured() -> bool:
    return bool(settings.LLM_PROVIDER and settings.LLM_MODEL)


def is_embedding_configured() -> bool:
    provider = settings.EMBEDDING_PROVIDER or settings.LLM_PROVIDER
    model = settings.EMBEDDING_MODEL
    return bool(provider and model)


def get_llm_provider() -> BaseLLMProvider:
    """Return a configured LLM provider based on settings."""
    provider_name = settings.LLM_PROVIDER.lower().strip()
    model = settings.LLM_MODEL

    if not provider_name or not model:
        raise LLMConfigError(
            "LLM is not configured. Set LLM_PROVIDER and LLM_MODEL environment variables."
        )

    if provider_name == "openai":
        from app.services.llm.openai_provider import OpenAIProvider

        if not settings.LLM_API_KEY:
            raise LLMConfigError("LLM_API_KEY is required for the OpenAI provider.")
        return OpenAIProvider(
            api_key=settings.LLM_API_KEY,
            model=model,
            base_url=settings.LLM_BASE_URL or None,
        )

    if provider_name == "ollama":
        from app.services.llm.ollama_provider import OllamaProvider

        if not settings.LLM_BASE_URL:
            raise LLMConfigError("LLM_BASE_URL is required for the Ollama provider.")
        return OllamaProvider(
            model=model,
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
        )

    if provider_name == "azure_openai":
        from app.services.llm.azure_provider import AzureOpenAIProvider

        if not settings.LLM_API_KEY:
            raise LLMConfigError("LLM_API_KEY is required for the Azure OpenAI provider.")
        if not settings.AZURE_OPENAI_ENDPOINT:
            raise LLMConfigError("AZURE_OPENAI_ENDPOINT is required for the Azure OpenAI provider.")
        return AzureOpenAIProvider(
            api_key=settings.LLM_API_KEY,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            deployment=settings.AZURE_OPENAI_DEPLOYMENT or model,
        )

    if provider_name == "anthropic":
        from app.services.llm.anthropic_provider import AnthropicProvider

        if not settings.LLM_API_KEY:
            raise LLMConfigError("LLM_API_KEY is required for the Anthropic provider.")
        return AnthropicProvider(api_key=settings.LLM_API_KEY, model=model)

    raise LLMConfigError(
        f"Unknown LLM provider: '{provider_name}'. "
        f"Supported: openai, ollama, azure_openai, anthropic."
    )


def get_embedding_provider() -> BaseEmbeddingProvider:
    """Return a configured embedding provider based on settings."""
    provider_name = (settings.EMBEDDING_PROVIDER or settings.LLM_PROVIDER).lower().strip()
    model = settings.EMBEDDING_MODEL
    uses_same_provider = provider_name == (settings.LLM_PROVIDER or "").lower().strip()
    api_key = settings.EMBEDDING_API_KEY or (settings.LLM_API_KEY if uses_same_provider else "")
    base_url = settings.EMBEDDING_BASE_URL or (settings.LLM_BASE_URL if uses_same_provider else "")

    if not provider_name or not model:
        raise LLMConfigError(
            "Embedding provider is not configured. Set EMBEDDING_PROVIDER and EMBEDDING_MODEL."
        )

    if provider_name == "openai":
        from app.services.llm.openai_provider import OpenAIEmbeddingProvider

        if not api_key:
            raise LLMConfigError("API key is required for the OpenAI embedding provider.")
        return OpenAIEmbeddingProvider(api_key=api_key, model=model, base_url=base_url or None)

    if provider_name == "ollama":
        from app.services.llm.ollama_provider import OllamaEmbeddingProvider

        if not base_url:
            raise LLMConfigError("Base URL is required for the Ollama embedding provider.")
        return OllamaEmbeddingProvider(model=model, base_url=base_url, api_key=api_key)

    if provider_name == "azure_openai":
        from app.services.llm.azure_provider import AzureEmbeddingProvider

        if not api_key:
            raise LLMConfigError("API key is required for the Azure embedding provider.")
        if not settings.AZURE_OPENAI_ENDPOINT:
            raise LLMConfigError("AZURE_OPENAI_ENDPOINT is required for the Azure embedding provider.")
        return AzureEmbeddingProvider(
            api_key=api_key,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            deployment=model,
        )

    if provider_name == "anthropic":
        raise LLMConfigError(
            "Anthropic does not provide an embedding API. "
            "Set EMBEDDING_PROVIDER to 'openai' or 'ollama' for embeddings."
        )

    raise LLMConfigError(
        f"Unknown embedding provider: '{provider_name}'. "
        f"Supported: openai, ollama, azure_openai."
    )
