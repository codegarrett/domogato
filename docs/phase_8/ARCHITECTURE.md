# Phase 8 Architecture

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Frontend (Vue 3)                            │
│                                                                  │
│  ┌─────────────┐  ┌──────────────────────────────────────────┐  │
│  │ AppLayout   │  │ ChatFlyout (PrimeVue Drawer)             │  │
│  │             │  │                                          │  │
│  │ [💬 button] │──│  ┌────────────────┐  ┌───────────────┐  │  │
│  │             │  │  │ Conversation   │  │ Active Chat   │  │  │
│  │             │  │  │ List           │  │               │  │  │
│  │             │  │  │ - title        │  │ Messages      │  │  │
│  │             │  │  │ - model        │  │ (markdown)    │  │  │
│  │             │  │  │ - timestamp    │  │               │  │  │
│  │             │  │  └────────────────┘  │ SSE streaming │  │  │
│  │             │  │                      │               │  │  │
│  │             │  │                      │ [Input area]  │  │  │
│  │             │  │                      └───────────────┘  │  │
│  └─────────────┘  └───────────────┬──────────────────────────┘  │
│                                   │                              │
│  ┌────────────────────────────────┴───────────────────────────┐  │
│  │                  API Layer (fetch + SSE)                    │  │
│  │  POST /ai/chat → ReadableStream → parse SSE data: lines   │  │
│  │  GET /ai/conversations, GET/DELETE /ai/conversations/{id}  │  │
│  └────────────────────────────────┬───────────────────────────┘  │
└───────────────────────────────────┼──────────────────────────────┘
                                    │ HTTP / SSE
┌───────────────────────────────────┼──────────────────────────────┐
│                        Backend (FastAPI)                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 AI Endpoints (ai.py)                      │   │
│  │                                                          │   │
│  │  POST /ai/chat          → StreamingResponse (SSE)        │   │
│  │  GET  /ai/conversations → Paginated list                 │   │
│  │  GET  /ai/conversations/{id} → Detail with messages      │   │
│  │  DELETE /ai/conversations/{id} → Cascade delete           │   │
│  │  GET  /ai/config        → Provider status (public)       │   │
│  └──────────────┬───────────────────────────────────────────┘   │
│                 │                                                │
│  ┌──────────────┴───────────────────────────────────────────┐   │
│  │                 AI Service (ai_service.py)                │   │
│  │                                                          │   │
│  │  - Conversation CRUD                                     │   │
│  │  - Load message history → build messages list            │   │
│  │  - Call LLM provider (stream) → yield SSE events        │   │
│  │  - Save assistant message + token counts                 │   │
│  │  - Auto-generate conversation title                      │   │
│  └──────────────┬────────────────────┬──────────────────────┘   │
│                 │                    │                            │
│  ┌──────────────┴──────┐  ┌─────────┴────────────────────────┐  │
│  │  LLM Provider Layer │  │        PostgreSQL                 │  │
│  │                     │  │                                   │  │
│  │  ┌───────────────┐  │  │  ai_conversations                │  │
│  │  │ Factory       │  │  │  ai_messages                     │  │
│  │  │               │  │  │  ai_embeddings (pgvector)        │  │
│  │  │ get_llm_      │  │  │                                   │  │
│  │  │ provider()    │  │  └───────────────────────────────────┘  │
│  │  └───┬───────────┘  │                                        │
│  │      │              │                                        │
│  │  ┌───┴───────────────────────────────────────────┐           │
│  │  │                                               │           │
│  │  │  OpenAI    Ollama    Azure    Anthropic       │           │
│  │  │  Provider  Provider  OpenAI   Provider        │           │
│  │  │  (openai   (openai   Provider (anthropic      │           │
│  │  │   SDK)      SDK)     (openai   SDK)           │           │
│  │  │                       SDK)                    │           │
│  │  └───────────────────────────────────────────────┘           │
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

## LLM Provider Abstraction

### Design Principles

1. **Raw SDKs over wrappers:** Direct use of `openai` and `anthropic` Python packages for maximum control, debugging clarity, and forward compatibility with new SDK features.
2. **OpenAI-compatible unification:** The `openai` SDK serves three providers by varying the client constructor and `base_url`. Only Anthropic requires a different SDK.
3. **Async-first:** All providers use async clients (`AsyncOpenAI`, `AsyncAzureOpenAI`, `AsyncAnthropic`) for non-blocking I/O.
4. **Streaming as default:** The primary chat method is streaming; non-streaming is a convenience wrapper that collects the full stream.

### Class Hierarchy

```
BaseLLMProvider (ABC)
├── OpenAIProvider        ← AsyncOpenAI(api_key, base_url?)
│   └── OllamaProvider    ← AsyncOpenAI(base_url=ollama_url, api_key="ollama")
├── AzureOpenAIProvider   ← AsyncAzureOpenAI(azure_endpoint, api_version)
└── AnthropicProvider     ← AsyncAnthropic(api_key)

BaseEmbeddingProvider (ABC)
├── OpenAIEmbeddingProvider    ← AsyncOpenAI (reuses chat client config)
└── AzureEmbeddingProvider     ← AsyncAzureOpenAI (reuses chat client config)
```

### Provider Selection

```
LLM_PROVIDER env var
       │
       ├── "openai"       → OpenAIProvider(api_key, base_url?)
       ├── "ollama"        → OllamaProvider(base_url)  [api_key defaults to "ollama"]
       ├── "azure_openai"  → AzureOpenAIProvider(api_key, endpoint, api_version, deployment)
       ├── "anthropic"     → AnthropicProvider(api_key)
       └── "" or unset     → is_llm_configured() returns False
```

### Anthropic Message Format Conversion

The Anthropic API uses a different message format than OpenAI:

```
OpenAI format:                      Anthropic format:
messages = [                        system = "You are a helpful..."
  {"role": "system", "content": "You are..."}, 
  {"role": "user", "content": "Hello"},         messages = [
  {"role": "assistant", "content": "Hi!"},        {"role": "user", "content": "Hello"},
  {"role": "user", "content": "How are you?"}     {"role": "assistant", "content": "Hi!"},
]                                                  {"role": "user", "content": "How?"}
                                                ]
```

The `AnthropicProvider` extracts `system` messages from the list and passes them via the separate `system` parameter. All other messages are passed as-is.

### Error Handling

```
LLMError (base)
├── LLMConfigError        ← Invalid/missing configuration
├── LLMConnectionError    ← Network/timeout issues
├── LLMRateLimitError     ← Rate limiting (429)
└── LLMResponseError      ← Invalid response from provider
```

Each provider catches SDK-specific exceptions and maps them to the common hierarchy, allowing the API layer to return appropriate HTTP status codes without knowing which provider is in use.

## SSE Streaming Flow

```
User sends message
       │
       ▼
POST /ai/chat
  { conversation_id: "uuid" | null, message: "Hello" }
       │
       ▼
┌──────────────────────────────────────────────┐
│ ai_service.send_message_stream()             │
│                                              │
│ 1. Create conversation if conversation_id    │
│    is null                                   │
│ 2. Save user message to DB                   │
│ 3. Load full message history                 │
│ 4. Build messages list for LLM              │
│    (system prompt + conversation history)    │
│ 5. Yield SSE: conversation event             │
│ 6. Call provider.chat_completion_stream()    │
│ 7. For each token:                           │
│    - Accumulate into full response           │
│    - Yield SSE: chunk event                  │
│ 8. Save assistant message with full content  │
│    and token counts                          │
│ 9. Yield SSE: done event                     │
└──────────────────────────────────────────────┘
       │
       ▼
StreamingResponse(media_type="text/event-stream")
       │
       ▼  (HTTP chunked transfer)
Frontend fetch() with ReadableStream
       │
       ▼
Parse "data: {...}" lines → update UI
```

### SSE Protocol Details

Each SSE event is a single `data:` line containing a JSON object, followed by two newlines:

```
data: {"type": "conversation", "conversation_id": "uuid"}\n\n
data: {"type": "chunk", "content": "Hello"}\n\n
data: {"type": "chunk", "content": " there"}\n\n
data: {"type": "done", "message_id": "uuid", "model": "kimi-k2.5", "prompt_tokens": 150, "completion_tokens": 42}\n\n
```

Event types:
- `conversation` — sent first, provides `conversation_id` (especially important for new conversations)
- `chunk` — individual token or token group from the LLM stream
- `done` — final event with the saved message ID and token usage
- `error` — sent if an error occurs mid-stream

### Frontend SSE Consumption

The frontend uses `fetch()` with a streaming `ReadableStream` reader rather than the native `EventSource` API. This is necessary because:
1. `EventSource` only supports GET requests (we need POST to send the message body)
2. `EventSource` doesn't support custom headers (we need `Authorization: Bearer`)

```typescript
const response = await fetch('/api/v1/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ conversation_id, message }),
})

const reader = response.body!.getReader()
const decoder = new TextDecoder()
let buffer = ''

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  // Parse complete "data: {...}\n\n" events from buffer
}
```

## Embedding Architecture

### Storage

Embeddings are stored in PostgreSQL using the pgvector extension:

```
┌─────────────────────────────────────┐
│          ai_embeddings              │
├─────────────────────────────────────┤
│ id            UUID (PK)             │
│ content_type  VARCHAR(50)           │ ← "ticket", "kb_page", "comment"
│ content_id    UUID                  │ ← FK to the source entity
│ chunk_index   INTEGER               │ ← for multi-chunk documents
│ chunk_text    TEXT                   │ ← original text for reference
│ embedding     VECTOR(1536)          │ ← pgvector column
│ metadata      JSONB                 │ ← flexible metadata
│ created_at    TIMESTAMPTZ           │
│ updated_at    TIMESTAMPTZ           │
├─────────────────────────────────────┤
│ INDEX: (content_type, content_id)   │
└─────────────────────────────────────┘
```

### Embedding Flow (Phase 8 Foundation)

In Phase 8, embedding creation is available as infrastructure but not yet automatically triggered. Future phases will add:
- Automatic embedding on ticket/page creation and update
- Similarity search for RAG (retrieval-augmented generation)
- Semantic search across the knowledge base

```
Content creation/update (future phases)
       │
       ▼
Chunk text into segments (if needed)
       │
       ▼
embedding_provider.create_embeddings(chunks)
       │
       ▼
Store in ai_embeddings table
       │
       ▼
Similarity search via pgvector operators:
  - <-> (L2 distance)
  - <=> (cosine distance)
  - <#> (inner product)
```

### Vector Dimensions

The default dimension is 1536 (matching OpenAI `text-embedding-3-small`), but this is configurable via `EMBEDDING_DIMENSIONS`. Common dimensions by model:

| Model | Dimensions |
|-------|-----------|
| OpenAI text-embedding-3-small | 1536 |
| OpenAI text-embedding-3-large | 3072 |
| Ollama nomic-embed-text | 768 |
| Ollama mxbai-embed-large | 1024 |

pgvector allows different-dimension vectors in the same column at insert time, but indexing performance is best with a consistent dimension.

## System Prompt Design

Phase 8 uses a simple system prompt that will be extended in Phase 9 with tool descriptions:

```
You are ProjectHub Assistant, an AI integrated into the ProjectHub 
project management platform. You help users with their projects, 
tickets, documentation, and workflows.

Be concise, helpful, and use markdown formatting in your responses 
when it improves readability.
```

The system prompt is defined as a constant in `ai_service.py` and is prepended to every conversation's message history before sending to the LLM.

## Security Considerations

### API Key Protection
- LLM API keys are stored only in environment variables, never in the database
- `GET /ai/config` returns only the provider name and model, never API keys
- Provider errors are sanitized before returning to the frontend (no key leakage in error messages)

### Conversation Isolation
- All conversation queries filter by `user_id` from the authenticated token
- A user cannot access, list, or delete another user's conversations
- Conversation IDs are UUIDs (not sequential) to prevent enumeration

### Rate Limiting (Future)
- Phase 8 does not implement rate limiting on the chat endpoint
- This should be added in a future phase to prevent abuse
- Token usage tracking provides the data needed for per-user quotas

### Input Sanitization
- User messages are passed to the LLM as-is (the LLM is responsible for content policy)
- Assistant responses are rendered as markdown in the frontend — the `marked` library should be configured with `sanitize: true` to prevent XSS from LLM-generated HTML

## Access Control Summary

| Endpoint | Auth Required | Min Role |
|----------|--------------|----------|
| `GET /ai/config` | No | Public |
| `POST /ai/chat` | Yes | Authenticated |
| `GET /ai/conversations` | Yes | Authenticated |
| `GET /ai/conversations/{id}` | Yes | Authenticated (own only) |
| `DELETE /ai/conversations/{id}` | Yes | Authenticated (own only) |
