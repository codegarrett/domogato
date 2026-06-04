# LLM Provider Configuration

Domogato supports multiple LLM and embedding providers via environment variables. Switch providers by updating `.env` — no code changes required.

Supported chat providers: `openai`, `ollama`, `azure_openai` (alias: `azure`), `anthropic`

Supported embedding providers: `openai`, `ollama`, `azure_openai` (alias: `azure`)

## Local development (Ollama)

Typical setup when running Ollama locally or in Docker with a model such as Kimi:

```env
LLM_PROVIDER=ollama
LLM_MODEL=kimi-k2.5
LLM_BASE_URL=http://ollama:11434/v1
LLM_CONTEXT_WINDOW=131072
LLM_MAX_TOKENS=16384
LLM_TEMPERATURE=0.7

EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_BASE_URL=http://ollama:11434/v1
EMBEDDING_DIMENSIONS=768
```

Ollama uses an OpenAI-compatible API. The agent (tool calling), streaming, and vision all work when the model supports those features.

## Production (Azure OpenAI)

Typical setup for Azure OpenAI with GPT-4.1 chat and Azure embeddings:

```env
LLM_PROVIDER=azure_openai
LLM_MODEL=gpt-4.1
LLM_API_KEY=<azure-api-key>
AZURE_OPENAI_ENDPOINT=https://<resource-name>.openai.azure.com
AZURE_OPENAI_API_VERSION=2024-06-01
AZURE_OPENAI_DEPLOYMENT=<gpt-4.1-chat-deployment-name>
LLM_CONTEXT_WINDOW=128000
LLM_MAX_TOKENS=16384
LLM_TEMPERATURE=0.7

EMBEDDING_PROVIDER=azure_openai
EMBEDDING_MODEL=<text-embedding-3-small-deployment-name>
EMBEDDING_DIMENSIONS=1536
```

**Important:** Azure API calls use the **deployment name**, not the model SKU. Set `AZURE_OPENAI_DEPLOYMENT` to your chat deployment. `LLM_MODEL` is stored on conversations as a display label and used as a fallback deployment name if `AZURE_OPENAI_DEPLOYMENT` is empty.

For embeddings, `EMBEDDING_MODEL` is the Azure **embedding deployment name**. When chat and embeddings share the same provider, `LLM_API_KEY` and `AZURE_OPENAI_ENDPOINT` are reused automatically.

## OpenAI (direct)

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o
LLM_API_KEY=sk-...

EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

## Anthropic (chat only)

```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-sonnet-4-20250514
LLM_API_KEY=sk-ant-...

# Embeddings must use a different provider
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

## Docker Compose

The `api` and `celery-worker` services both need LLM and embedding env vars. Celery generates KB embeddings; the API runs the AI agent. When using Azure, ensure `AZURE_OPENAI_*` vars are set on **both** services (already wired in `docker-compose.yml` and `docker-compose.prod.yml`).

## Verification checklist

After deploying with a new provider:

1. `GET /api/v1/ai/config` returns `is_configured: true` with the expected provider/model
2. Simple chat message streams a response
3. Agent tool use works (e.g. "list my projects")
4. Mutating agent flow works (`request_approval` + create ticket/issue report)
5. KB semantic search works (embedding generation via Celery)
6. Optional: image attachment in chat if `LLM_VISION_ENABLED=true` and the model supports vision

## Implementation reference

- Factory: `backend/app/services/llm/factory.py`
- Providers: `backend/app/services/llm/`
- Agent consumer: `backend/app/services/agent/executor.py`
