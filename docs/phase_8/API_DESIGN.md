# Phase 8 API Design

## AI Chat Endpoints

All chat endpoints require authentication unless otherwise noted. Users can only access their own conversations.

---

### `GET /api/v1/ai/config`

Returns the current AI configuration status so the frontend knows whether to show the chat button. **No authentication required.**

**Response (200):**
```json
{
  "is_configured": true,
  "provider": "ollama",
  "model": "kimi-k2.5",
  "embedding_configured": true,
  "embedding_provider": "ollama",
  "embedding_model": "nomic-embed-text"
}
```

When LLM is not configured (`LLM_PROVIDER` or `LLM_MODEL` is empty):
```json
{
  "is_configured": false,
  "provider": null,
  "model": null,
  "embedding_configured": false,
  "embedding_provider": null,
  "embedding_model": null
}
```

API keys are never included in the response.

---

### `POST /api/v1/ai/chat`

Send a message and receive a streaming SSE response. Creates a new conversation if `conversation_id` is not provided.

**Min Role:** Authenticated user

**Request:**
```json
{
  "conversation_id": "uuid-or-null",
  "message": "How do I create a new sprint?"
}
```

- `conversation_id` (UUID, optional): Existing conversation to continue. If `null`, a new conversation is created.
- `message` (string, required): The user's message. Min 1 character, max 32,000 characters.

**Response (200, `text/event-stream`):**

The response is a Server-Sent Events stream. Each event is a `data:` line containing a JSON object.

**Event: `conversation`** — sent first, provides the conversation ID (especially useful for new conversations):
```
data: {"type": "conversation", "conversation_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}

```

**Event: `chunk`** — individual tokens from the LLM stream:
```
data: {"type": "chunk", "content": "To create"}

data: {"type": "chunk", "content": " a new sprint"}

data: {"type": "chunk", "content": ", navigate to"}

```

**Event: `done`** — final event after streaming completes:
```
data: {"type": "done", "message_id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210", "model": "kimi-k2.5", "prompt_tokens": 245, "completion_tokens": 89}

```

**Event: `error`** — sent if an error occurs during streaming:
```
data: {"type": "error", "message": "The AI provider returned an error. Please try again."}

```

**Response Headers:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Error (400):**
```json
{
  "detail": "Message is required"
}
```

**Error (404):**
```json
{
  "detail": "Conversation not found"
}
```

**Error (503):**
```json
{
  "detail": "AI is not configured. Set LLM_PROVIDER and LLM_MODEL environment variables."
}
```

---

### `GET /api/v1/ai/conversations`

List the authenticated user's conversations, sorted by most recent activity.

**Min Role:** Authenticated user

**Query Parameters:**
- `offset` (int, default 0): Pagination offset
- `limit` (int, default 20, max 100): Number of conversations to return

**Response (200):**
```json
{
  "items": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "How to create sprints",
      "model": "kimi-k2.5",
      "message_count": 4,
      "is_archived": false,
      "created_at": "2026-03-25T10:30:00Z",
      "updated_at": "2026-03-25T10:35:00Z"
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Bug triage workflow",
      "model": "kimi-k2.5",
      "message_count": 8,
      "is_archived": false,
      "created_at": "2026-03-24T14:00:00Z",
      "updated_at": "2026-03-24T14:20:00Z"
    }
  ],
  "total": 12,
  "offset": 0,
  "limit": 20
}
```

---

### `GET /api/v1/ai/conversations/{conversation_id}`

Get a single conversation with all its messages.

**Min Role:** Authenticated user (own conversations only)

**Response (200):**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "How to create sprints",
  "model": "kimi-k2.5",
  "message_count": 4,
  "is_archived": false,
  "created_at": "2026-03-25T10:30:00Z",
  "updated_at": "2026-03-25T10:35:00Z",
  "messages": [
    {
      "id": "msg-uuid-1",
      "role": "user",
      "content": "How do I create a new sprint?",
      "model": null,
      "prompt_tokens": null,
      "completion_tokens": null,
      "created_at": "2026-03-25T10:30:00Z"
    },
    {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "To create a new sprint in ProjectHub, follow these steps:\n\n1. Navigate to your project\n2. Click on **Sprints** in the sidebar\n3. Click the **New Sprint** button\n4. Set the sprint name, start date, and end date\n5. Click **Create**\n\nYou can then drag tickets from the backlog into the sprint during planning.",
      "model": "kimi-k2.5",
      "prompt_tokens": 245,
      "completion_tokens": 89,
      "created_at": "2026-03-25T10:30:05Z"
    },
    {
      "id": "msg-uuid-3",
      "role": "user",
      "content": "Can I have multiple active sprints?",
      "model": null,
      "prompt_tokens": null,
      "completion_tokens": null,
      "created_at": "2026-03-25T10:32:00Z"
    },
    {
      "id": "msg-uuid-4",
      "role": "assistant",
      "content": "No, ProjectHub enforces a **single active sprint** per project at a time. You can have multiple sprints in the *planned* state, but only one can be *active*.\n\nTo start a new sprint, you must first complete or cancel the current active sprint.",
      "model": "kimi-k2.5",
      "prompt_tokens": 380,
      "completion_tokens": 62,
      "created_at": "2026-03-25T10:32:03Z"
    }
  ]
}
```

**Error (404):**
```json
{
  "detail": "Conversation not found"
}
```

---

### `DELETE /api/v1/ai/conversations/{conversation_id}`

Delete a conversation and all its messages.

**Min Role:** Authenticated user (own conversations only)

**Response (204):** No content.

**Error (404):**
```json
{
  "detail": "Conversation not found"
}
```

---

## Message Context Strategy

When sending messages to the LLM, the full conversation history is included as context:

```json
[
  {"role": "system", "content": "You are ProjectHub Assistant..."},
  {"role": "user", "content": "First user message"},
  {"role": "assistant", "content": "First assistant response"},
  {"role": "user", "content": "Second user message"},
  {"role": "assistant", "content": "Second assistant response"},
  {"role": "user", "content": "Current user message"}
]
```

### Context Window Management

For Phase 8, the full conversation history is sent to the LLM. If the conversation exceeds the model's context window, the oldest messages (excluding the system prompt and the current user message) are dropped. This simple truncation strategy will be replaced with smarter context management (summarization, embedding-based retrieval) in future phases.

### Token Tracking

Token counts are provided by the LLM provider in the streaming response metadata:
- `prompt_tokens`: Tokens used by the input messages (system + history + user message)
- `completion_tokens`: Tokens generated in the assistant's response

These are stored on the assistant message for monitoring and future quota enforcement.

---

## Auto-Title Generation

When a new conversation is created (first message), a title is automatically generated:

**Strategy:** Simple truncation of the first user message to 80 characters, trimmed at a word boundary. This avoids an extra LLM call for title generation.

Example:
- Input: `"How do I create a new sprint in my project and assign tickets to it?"`
- Title: `"How do I create a new sprint in my project and assign tickets to it?"`

- Input: `"I'm having trouble understanding the difference between the Kanban board view and the Scrum board view. Can you explain the key differences and when I should use each one?"`
- Title: `"I'm having trouble understanding the difference between the Kanban board view and the..."`

---

## OpenAPI Tags

Phase 8 adds the following OpenAPI tag:

```python
{"name": "ai", "description": "AI chat, conversations, and configuration"}
```
