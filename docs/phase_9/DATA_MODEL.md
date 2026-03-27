# Phase 9 Data Model

## Overview

Phase 9 adds a single JSONB column (`tool_calls`) to the existing `ai_messages` table to store tool call metadata. No new tables are created. One Alembic migration handles the column addition.

---

## Modified Table: `ai_messages`

### New Column: `tool_calls`

```sql
ALTER TABLE ai_messages ADD COLUMN tool_calls JSONB;
```

### Updated Column Details

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `UUID` | NOT NULL | Primary key (Phase 8) |
| `conversation_id` | `UUID` (FK) | NOT NULL | Parent conversation (Phase 8) |
| `role` | `VARCHAR(20)` | NOT NULL | `"user"`, `"assistant"`, or `"tool"` (NEW: `"tool"` added) |
| `content` | `TEXT` | NOT NULL | Message content or tool result JSON (Phase 8) |
| `model` | `VARCHAR(200)` | YES | Model name (Phase 8) |
| `prompt_tokens` | `INTEGER` | YES | Input tokens (Phase 8) |
| `completion_tokens` | `INTEGER` | YES | Output tokens (Phase 8) |
| `tool_calls` | `JSONB` | YES | **NEW** — Tool call metadata (see below) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Timestamp (Phase 8) |

### `tool_calls` Column Usage

The column is used differently depending on the message `role`:

**For `role = "assistant"` messages with tool calls:**

Stores the list of tool calls the assistant made:

```json
[
  {
    "id": "call_abc123",
    "type": "function",
    "function": {
      "name": "search_tickets",
      "arguments": "{\"project_key\": \"PROJ\", \"query\": \"login bug\"}"
    }
  }
]
```

**For `role = "tool"` messages:**

Stores the tool call ID this result corresponds to:

```json
{
  "tool_call_id": "call_abc123",
  "name": "search_tickets"
}
```

**For `role = "user"` or regular `role = "assistant"` messages:**

`NULL` — no tool call data.

### Role Values (Updated)

| Role | Description | `tool_calls` |
|------|-------------|--------------|
| `user` | Human input | NULL |
| `assistant` | LLM response (text only) | NULL |
| `assistant` | LLM response (requesting tools) | Array of tool calls |
| `tool` | Tool execution result | Object with `tool_call_id` |

---

## Migration

### Migration: Add tool_calls to ai_messages

File: `backend/alembic/versions/xxx_add_tool_calls_to_ai_messages.py`

```python
"""add_tool_calls_to_ai_messages

Add JSONB tool_calls column to ai_messages for Phase 9 agent skills.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


def upgrade():
    op.add_column("ai_messages", sa.Column("tool_calls", JSONB, nullable=True))


def downgrade():
    op.drop_column("ai_messages", "tool_calls")
```

This is a non-destructive migration:
- Adds a nullable column — existing rows are unaffected
- No data migration needed
- Fully reversible

---

## Entity Relationship Diagram (Updated)

```
┌──────────────┐         ┌───────────────────┐
│    users      │         │  ai_conversations  │
├──────────────┤         ├───────────────────┤
│ id (PK)      │◄────────│ user_id (FK)      │
│ email        │  CASCADE│ id (PK)           │
│ display_name │         │ title             │
│ ...          │         │ model             │
└──────────────┘         │ is_archived       │
                         │ created_at        │
                         │ updated_at        │
                         └────────┬──────────┘
                                  │
                                  │ CASCADE
                                  │
                         ┌────────┴──────────┐
                         │   ai_messages      │
                         ├───────────────────┤
                         │ id (PK)           │
                         │ conversation_id   │
                         │   (FK)            │
                         │ role              │  ← "user" | "assistant" | "tool"
                         │ content           │
                         │ model             │
                         │ prompt_tokens     │
                         │ completion_tokens │
                         │ tool_calls (JSONB)│  ← NEW (Phase 9)
                         │ created_at        │
                         └───────────────────┘
```

---

## Data Flow: Chat Message with Tool Calls

```
User sends "What tickets are in Sprint 5 of PROJ?" in flyout
       │
       ▼
POST /ai/chat { conversation_id: null, message: "What tickets..." }
       │
       ▼
INSERT INTO ai_conversations (user_id, title, model)
  VALUES ('user-uuid', 'What tickets are in Sprint 5 of PROJ?', 'kimi-k2.5')
       │
       ▼
INSERT INTO ai_messages (conversation_id, role, content)
  VALUES ('conv-uuid', 'user', 'What tickets are in Sprint 5 of PROJ?')
       │
       ▼
Agent Executor: chat_completion(messages, tools=[...])
  → LLM returns: tool_calls: [get_sprint_status(project_key="PROJ")]
       │
       ▼
Yield SSE: tool_start
       │
       ▼
Execute GetSprintStatusSkill:
  1. Resolve "PROJ" → project_id
  2. Check user has GUEST role on project
  3. Call sprint_service.list_sprints(project_id, status_filter="active")
  4. Call sprint_service.get_sprint_stats(sprint_id)
  5. Return structured result dict
       │
       ▼
Yield SSE: tool_result
       │
       ▼
Agent Executor: chat_completion_stream_with_usage(messages + tool_results)
  → Stream reasoning + content tokens via SSE
       │
       ▼
INSERT INTO ai_messages (conversation_id, role, content, tool_calls)
  VALUES ('conv-uuid', 'assistant', null, '[{"id":"call_1","function":{"name":"get_sprint_status",...}}]')

INSERT INTO ai_messages (conversation_id, role, content, tool_calls)
  VALUES ('conv-uuid', 'tool', '{"sprint":{"name":"Sprint 5",...},"stats":{...}}',
          '{"tool_call_id":"call_1","name":"get_sprint_status"}')

INSERT INTO ai_messages (conversation_id, role, content, model, prompt_tokens, completion_tokens)
  VALUES ('conv-uuid', 'assistant', '<full response text>', 'kimi-k2.5', 850, 120)
       │
       ▼
UPDATE ai_conversations SET updated_at = now() WHERE id = 'conv-uuid'
```

---

## Data Flow: Chat Message without Tool Calls

Identical to Phase 8 — no tool-related messages are created:

```
User sends "How do I use sprints?" in flyout
       │
       ▼
Agent Executor: chat_completion(messages, tools=[...])
  → LLM returns: finish_reason="stop", no tool_calls
       │
       ▼
Agent Executor: chat_completion_stream_with_usage(messages)
  → Stream reasoning + content tokens via SSE
       │
       ▼
INSERT INTO ai_messages (conversation_id, role, content, model, prompt_tokens, completion_tokens)
  VALUES ('conv-uuid', 'assistant', '<response>', 'kimi-k2.5', 245, 89)
```

No intermediate `assistant` (with tool_calls) or `tool` messages are created.
