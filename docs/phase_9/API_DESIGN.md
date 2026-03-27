# Phase 9 API Design

## Changes from Phase 8

Phase 9 does not add new REST endpoints. It extends the existing `POST /ai/chat` SSE stream with new event types for tool activity, and extends `GET /ai/config` to include available skills.

---

## Updated: `GET /api/v1/ai/config`

Now includes the list of available skills.

**Response (200):**
```json
{
  "is_configured": true,
  "provider": "ollama",
  "model": "kimi-k2.5",
  "embedding_configured": false,
  "embedding_provider": null,
  "embedding_model": null,
  "available_skills": [
    {
      "name": "list_my_projects",
      "description": "List projects you have access to",
      "category": "projects"
    },
    {
      "name": "search_tickets",
      "description": "Search for tickets in a project by keyword, status, priority, or assignee",
      "category": "tickets"
    },
    {
      "name": "get_ticket_details",
      "description": "Get full details of a specific ticket by project key and ticket number",
      "category": "tickets"
    },
    {
      "name": "get_sprint_status",
      "description": "Get the active sprint status and completion statistics for a project",
      "category": "sprints"
    },
    {
      "name": "search_knowledge_base",
      "description": "Search published knowledge base pages in a project",
      "category": "knowledge_base"
    }
  ]
}
```

---

## Updated: `POST /api/v1/ai/chat` SSE Events

### New Event: `tool_start`

Sent when the agent decides to call a tool. Allows the frontend to show activity.

```
data: {"type": "tool_start", "name": "search_tickets", "arguments": {"project_key": "PROJ", "query": "login bug"}}

```

Fields:
- `name` (string): The skill name being invoked
- `arguments` (object): The arguments the LLM passed to the tool

### New Event: `tool_result`

Sent when tool execution completes (before the next LLM call).

```
data: {"type": "tool_result", "name": "search_tickets", "summary": "Found 3 tickets"}

```

Fields:
- `name` (string): The skill name that completed
- `summary` (string): A brief summary of the result

### Complete SSE Event Sequence (with tools)

A typical tool-using conversation:

```
data: {"type": "conversation", "conversation_id": "a1b2c3d4-..."}

data: {"type": "tool_start", "name": "search_tickets", "arguments": {"project_key": "PROJ", "query": "login"}}

data: {"type": "tool_result", "name": "search_tickets", "summary": "Found 3 tickets"}

data: {"type": "reasoning", "content": "The user asked about"}

data: {"type": "reasoning", "content": " login-related tickets..."}

data: {"type": "chunk", "content": "I found **3 tickets**"}

data: {"type": "chunk", "content": " related to login in PROJ:\n\n"}

data: {"type": "chunk", "content": "1. **PROJ-42**: Fix login timeout..."}

data: {"type": "done", "message_id": "f9e8d7c6-...", "model": "kimi-k2.5", "prompt_tokens": 850, "completion_tokens": 120}

```

### SSE Event Sequence (without tools)

When no tools are needed, the flow is identical to Phase 8:

```
data: {"type": "conversation", "conversation_id": "a1b2c3d4-..."}

data: {"type": "reasoning", "content": "The user is asking a general question..."}

data: {"type": "chunk", "content": "Sure! Here's how..."}

data: {"type": "done", "message_id": "f9e8d7c6-...", "model": "kimi-k2.5", "prompt_tokens": 245, "completion_tokens": 89}

```

### Multi-Tool Event Sequence

The agent may call multiple tools in a single turn:

```
data: {"type": "conversation", "conversation_id": "a1b2c3d4-..."}

data: {"type": "tool_start", "name": "get_sprint_status", "arguments": {"project_key": "PROJ"}}

data: {"type": "tool_result", "name": "get_sprint_status", "summary": "Sprint 'Sprint 5' is active (60% complete)"}

data: {"type": "tool_start", "name": "search_tickets", "arguments": {"project_key": "PROJ", "status": "in_progress"}}

data: {"type": "tool_result", "name": "search_tickets", "summary": "Found 8 in-progress tickets"}

data: {"type": "chunk", "content": "## Sprint 5 Status\n\n..."}

data: {"type": "done", "message_id": "...", "model": "kimi-k2.5", "prompt_tokens": 1200, "completion_tokens": 180}

```

---

## Message Context Strategy (Updated)

With tool calling, the message history sent to the LLM includes tool interactions:

```json
[
  {"role": "system", "content": "You are ProjectHub Assistant..."},
  {"role": "user", "content": "What tickets are assigned to me in PROJ?"},
  {"role": "assistant", "content": null, "tool_calls": [
    {"id": "call_1", "type": "function", "function": {"name": "search_tickets", "arguments": "{\"project_key\": \"PROJ\", \"assignee\": \"me\"}"}}
  ]},
  {"role": "tool", "tool_call_id": "call_1", "content": "{\"tickets\": [...], \"total\": 5}"},
  {"role": "assistant", "content": "You have 5 tickets assigned to you in PROJ:\n\n1. ..."}
]
```

Tool messages (`role: "tool"`) are included in the history so the LLM has context for follow-up questions. They are persisted in the database with the `tool_calls` JSONB column.

---

## Skill Parameter Schemas

### `list_my_projects`

```json
{
  "type": "object",
  "properties": {},
  "required": []
}
```

### `search_tickets`

```json
{
  "type": "object",
  "properties": {
    "project_key": {
      "type": "string",
      "description": "The project key (e.g., 'PROJ')"
    },
    "query": {
      "type": "string",
      "description": "Search text to match against ticket titles"
    },
    "status": {
      "type": "string",
      "description": "Filter by workflow status name"
    },
    "priority": {
      "type": "string",
      "enum": ["critical", "high", "medium", "low"],
      "description": "Filter by priority level"
    },
    "assignee": {
      "type": "string",
      "description": "Filter by assignee email or 'me' for the current user"
    },
    "ticket_type": {
      "type": "string",
      "enum": ["task", "bug", "story", "epic"],
      "description": "Filter by ticket type"
    }
  },
  "required": ["project_key"]
}
```

### `get_ticket_details`

```json
{
  "type": "object",
  "properties": {
    "project_key": {
      "type": "string",
      "description": "The project key (e.g., 'PROJ')"
    },
    "ticket_number": {
      "type": "integer",
      "description": "The ticket number (e.g., 42 for PROJ-42)"
    }
  },
  "required": ["project_key", "ticket_number"]
}
```

### `get_sprint_status`

```json
{
  "type": "object",
  "properties": {
    "project_key": {
      "type": "string",
      "description": "The project key (e.g., 'PROJ')"
    }
  },
  "required": ["project_key"]
}
```

### `search_knowledge_base`

```json
{
  "type": "object",
  "properties": {
    "project_key": {
      "type": "string",
      "description": "The project key (e.g., 'PROJ')"
    },
    "query": {
      "type": "string",
      "description": "Search query for knowledge base articles"
    },
    "limit": {
      "type": "integer",
      "description": "Maximum number of results (default 5, max 20)",
      "default": 5
    }
  },
  "required": ["project_key", "query"]
}
```
