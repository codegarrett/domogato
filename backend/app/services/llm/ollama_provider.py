"""Ollama LLM and embedding providers (local and cloud).

Ollama exposes an OpenAI-compatible API, so we extend OpenAIProvider
with the appropriate base_url configuration.
"""
from __future__ import annotations

from app.services.llm.openai_provider import OpenAIProvider, OpenAIEmbeddingProvider


class OllamaProvider(OpenAIProvider):
    def __init__(self, model: str, base_url: str, api_key: str = ""):
        super().__init__(
            api_key=api_key or "ollama",
            model=model,
            base_url=base_url,
        )


class OllamaEmbeddingProvider(OpenAIEmbeddingProvider):
    def __init__(self, model: str, base_url: str, api_key: str = ""):
        super().__init__(
            api_key=api_key or "ollama",
            model=model,
            base_url=base_url,
        )
