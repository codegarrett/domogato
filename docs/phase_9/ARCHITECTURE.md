# Phase 9 Architecture

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                       Frontend (Vue 3)                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 ChatFlyout (PrimeVue Drawer)              │   │
│  │                 External embed: /embed/agent (iframe)     │   │
│  │                                                          │   │
│  │  Messages:                                               │   │
│  │  [User] "What tickets are assigned to me in PROJ?"       │   │
│  │                                                          │   │
│  │  [Tool] 🔍 Searching tickets...                          │   │
│  │                                                          │   │
│  │  [Thinking] collapsible reasoning block                  │   │
│  │                                                          │   │
│  │  [Assistant] "Found 5 tickets assigned to you:           │   │
│  │   - PROJ-42: Fix login bug (High, In Progress)           │   │
│  │   - PROJ-38: Update docs (Medium, Open)                  │   │
│  │   ..."                                                   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                    │
│  ┌───────────────────────────┴──────────────────────────────┐   │
│  │                  API Layer (fetch + SSE)                   │   │
│  │  POST /ai/chat → SSE stream:                             │   │
│  │    conversation → tool_start → tool_result →             │   │
│  │    reasoning → chunk → done                              │   │
│  └───────────────────────────┬──────────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTP / SSE
┌──────────────────────────────┼──────────────────────────────────┐
│                       Backend (FastAPI)                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AI Endpoints (ai.py)                         │   │
│  │  POST /ai/chat → StreamingResponse (SSE)                 │   │
│  │  GET  /ai/config → Provider status + available skills     │   │
│  └──────────────┬───────────────────────────────────────────┘   │
│                 │                                                │
│  ┌──────────────┴───────────────────────────────────────────┐   │
│  │              AI Service (ai_service.py)                    │   │
│  │  - Conversation CRUD (unchanged from Phase 8)             │   │
│  │  - Delegates to Agent Executor for tool-enabled turns     │   │
│  └──────────────┬───────────────────────────────────────────┘   │
│                 │                                                │
│  ┌──────────────┴───────────────────────────────────────────┐   │
│  │              Agent Executor (executor.py)                  │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────┐        │   │
│  │  │  LOOP (max 6 rounds):                        │        │   │
│  │  │                                              │        │   │
│  │  │  1. chat_completion(messages, tools=schemas)  │        │   │
│  │  │  2. If tool_calls → execute skills            │        │   │
│  │  │     → check permissions                       │        │   │
│  │  │     → call service layer                      │        │   │
│  │  │     → add results to messages                 │        │   │
│  │  │     → yield SSE tool events                   │        │   │
│  │  │     → continue loop                           │        │   │
│  │  │  3. If no tool_calls → break                  │        │   │
│  │  └──────────────────────────────────────────────┘        │   │
│  │                                                          │   │
│  │  STREAM: chat_completion_stream_with_usage(messages)      │   │
│  │  → yield reasoning / chunk / done SSE events             │   │
│  └──────────────┬────────────────────┬──────────────────────┘   │
│                 │                    │                            │
│  ┌──────────────┴──────┐  ┌─────────┴────────────────────────┐  │
│  │  Skill Registry     │  │  LLM Provider Layer              │  │
│  │                     │  │                                   │  │
│  │  ┌───────────────┐  │  │  OpenAI / Ollama / Azure /       │  │
│  │  │ list_projects  │  │  │  Anthropic                       │  │
│  │  │ search_tickets │  │  │                                   │  │
│  │  │ get_ticket     │  │  │  + tools param in chat_completion │  │
│  │  │ sprint_status  │  │  │  + tool_calls in ChatResponse     │  │
│  │  │ search_kb      │  │  └───────────────────────────────────┘  │
│  │  └───────┬────────┘  │                                        │
│  │          │            │                                        │
│  │  ┌───────┴───────────────────────────────────────────┐        │
│  │  │            Existing Service Layer                  │        │
│  │  │                                                   │        │
│  │  │  project_service  ticket_service  sprint_service  │        │
│  │  │  kb_service       permissions.py                  │        │
│  │  └───────────────────────────────────────────────────┘        │
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
```

## Agent Executor Loop

The executor implements a ReAct-style loop where the LLM decides which tools to call, tools are executed server-side, and results are fed back for further reasoning.

```
User message arrives
       │
       ▼
Build messages (system prompt + history + user message)
       │
       ▼
Load tool schemas from SkillRegistry.to_openai_tools()
       │
       ▼
┌──── Non-streaming LLM call (with tools) ◄──────────────┐
│            │                                             │
│            ▼                                             │
│     Response has tool_calls?                             │
│      │              │                                    │
│     YES             NO                                   │
│      │              │                                    │
│      ▼              ▼                                    │
│  For each tool_call:    Break loop                       │
│  │                                                       │
│  ├─ Yield SSE: tool_start                                │
│  ├─ Look up skill in registry                            │
│  ├─ Check user permissions                               │
│  ├─ Execute skill with service layer                     │
│  ├─ Yield SSE: tool_result                               │
│  └─ Add to messages: role=assistant (tool_calls)         │
│     + role=tool (result per tool_call_id)                │
│                         │                                │
│                         └────────────────────────────────┘
│
│  (max 6 rounds — error if exceeded)
│
▼
Streaming LLM call (without tools, with reasoning support)
       │
       ▼
Yield SSE events: reasoning → chunk → done
       │
       ▼
Save assistant message + tool_calls metadata to DB
```

### Why Non-Streaming for Tool Rounds

Tool-selection rounds use `chat_completion()` (non-streaming) because:
1. The response is small (just tool call JSON, not long text)
2. We need the complete `tool_calls` array before executing skills
3. Parsing tool calls from a stream requires complex accumulation logic

The final response uses streaming to preserve the Phase 8 UX (token-by-token display with reasoning support for models like Kimi K2.5).

## Skill Framework

### Registered Skills (25 total)

| Category | Skill | Min Role | Mutating |
|----------|-------|----------|----------|
| projects | `list_my_projects` | Org membership | No |
| tickets | `search_tickets` | GUEST | No |
| tickets | `get_ticket_details` | GUEST | No |
| tickets | `create_ticket` | DEVELOPER | Yes |
| tickets | `update_ticket` | DEVELOPER | Yes |
| tickets | `transition_ticket_status` | DEVELOPER | Yes |
| tickets | `get_ticket_transitions` | GUEST | No |
| tickets | `list_ticket_comments` | GUEST | No |
| tickets | `add_ticket_comment` | DEVELOPER | Yes |
| sprints | `get_sprint_status` | GUEST | No |
| knowledge_base | `search_knowledge_base` | GUEST | No |
| knowledge_base | `semantic_search_kb` | GUEST | No |
| issue_reports | `search_issue_reports` | GUEST | No |
| issue_reports | `create_issue_report` | GUEST | Yes |
| issue_reports | `add_reporter_to_issue_report` | GUEST | Yes |
| issue_reports | `create_ticket_from_issue_reports` | DEVELOPER | Yes |
| search | `global_search` | Authenticated | No |
| productivity | `get_my_dashboard` | Authenticated | No |
| productivity | `watch_ticket` | GUEST | Yes |
| productivity | `unwatch_ticket` | GUEST | Yes |
| files | `list_conversation_attachments` | Conversation owner | No |
| files | `attach_file_to_ticket` | DEVELOPER | Yes |
| files | `attach_file_to_issue_report` | GUEST | Yes |
| interaction | `present_choices` | Authenticated | No |
| interaction | `request_approval` | Authenticated | No |

Mutating skills require `request_approval` before execution (except `watch_ticket` / `unwatch_ticket`).

### Class Hierarchy

```
BaseSkill (ABC)
├── builtin_skills.py       → projects, tickets, sprints, KB
├── workflow_skills.py      → get_ticket_transitions
├── issue_report_skills.py  → issue report triage
├── productivity_skills.py  → search, dashboard, comments, watchers
├── file_skills.py          → conversation file list/attach
└── interaction_skills.py   → present_choices, request_approval

SkillRegistry
├── register(skill)
├── get(name) → BaseSkill | None
├── list_all() → list[BaseSkill]
└── to_openai_tools() → list[dict]     # OpenAI function-calling format
```

### Skill Execution Context

```python
@dataclass
class SkillContext:
    db: AsyncSession     # Current database session
    user: User           # Authenticated user from get_current_user
    params: dict         # Parsed tool call arguments
    conversation_id: UUID | None = None  # Active AI chat conversation
```

Each skill receives a `SkillContext` and returns a plain `dict` with structured results. The executor serializes the dict to JSON for the LLM's `role: "tool"` message.

### OpenAI Tool Format

Skills are converted to the OpenAI function-calling format:

```json
{
  "type": "function",
  "function": {
    "name": "search_tickets",
    "description": "Search for tickets in a project by keyword, status, priority, or assignee.",
    "parameters": {
      "type": "object",
      "properties": {
        "project_key": {
          "type": "string",
          "description": "The project key (e.g., 'PROJ', 'DEMO')"
        },
        "query": {
          "type": "string",
          "description": "Search text to match against ticket titles"
        }
      },
      "required": ["project_key"]
    }
  }
}
```

## Permission Model

### How Skills Enforce User Permissions

Skills use the same permission resolution as API endpoints. The flow for a project-scoped skill:

```
Skill receives project_key from LLM tool call
       │
       ▼
Look up Project by key (SELECT ... WHERE key = $1)
       │
       ├── Not found → SkillPermissionError("Project not found")
       │
       ▼
resolve_effective_project_role(
    user_id, project_id, org_id,
    project_visibility, is_system_admin, db
)
       │
       ├── None → SkillPermissionError("No access to this project")
       │
       ├── Role < min_role → SkillPermissionError("Insufficient permissions")
       │
       ▼
Execute skill with full service-layer access
```

All five project-scoped read skills require at minimum `ProjectRole.GUEST`. Write skills require `DEVELOPER` or higher. The `list_my_projects` and `get_my_dashboard` skills use built-in permission filtering. See the skill table above for the full RBAC matrix.

### Security Properties

1. **Data isolation:** The agent can only return data the authenticated user has access to
2. **No privilege escalation:** Skills use the same permission checks as REST endpoints
3. **Approval gate:** Mutating skills require explicit user approval via `request_approval`
4. **Tool result sanitization:** Skill results are serialized as JSON strings in tool messages; the LLM summarizes them in natural language for the user

## SSE Event Flow (with Tools)

Phase 9 adds two new SSE event types to the Phase 8 protocol:

```
data: {"type": "conversation", "conversation_id": "uuid"}\n\n

data: {"type": "tool_start", "name": "search_tickets", "arguments": {"project_key": "PROJ", "query": "login bug"}}\n\n

data: {"type": "tool_result", "name": "search_tickets", "summary": "Found 3 tickets"}\n\n

data: {"type": "reasoning", "content": "The user asked about..."}\n\n

data: {"type": "chunk", "content": "I found 3 tickets"}\n\n
data: {"type": "chunk", "content": " matching your query..."}\n\n

data: {"type": "done", "message_id": "uuid", "model": "kimi-k2.5", "prompt_tokens": 850, "completion_tokens": 120}\n\n
```

Event types (complete list):
- `conversation` — conversation ID (Phase 8)
- `tool_start` — agent is calling a tool
- `tool_result` — tool execution completed
- `reasoning` — chain-of-thought tokens (Phase 8)
- `chunk` — content tokens (Phase 8)
- `done` — final event with message ID and usage (Phase 8)
- `error` — error event (Phase 8)

## System Prompt Design

Phase 9+ extends the Phase 8 system prompt with tool awareness, issue report triage, approval rules, KB search guidance, subtask creation, and productivity tools. The prompt is defined in `backend/app/services/ai_service.py` as `SYSTEM_PROMPT` and prepended to every conversation.

Key sections:
- **Tools** — Always call tools immediately; use `list_my_projects` + `present_choices` when project is ambiguous
- **Approval Required** — All mutating ticket, issue report, and comment tools
- **Issue Reports** — Search → dedupe → create flow
- **Subtasks** — `create_ticket` with `parent_ticket_number`
- **Knowledge Base Search** — Semantic vs keyword search guidance
- **Productivity Tools** — Global search, dashboard, comments, watchers, transitions

## Access Control Summary

| Endpoint | Auth Required | Min Role |
|----------|--------------|----------|
| `GET /ai/config` | No | Public |
| `POST /ai/chat` | Yes | Authenticated |
| `GET /ai/conversations` | Yes | Authenticated (own only) |
| `GET /ai/conversations/{id}` | Yes | Authenticated (own only) |
| `DELETE /ai/conversations/{id}` | Yes | Authenticated (own only) |

| Skill | Min Project Role |
|-------|-----------------|
| `list_my_projects` | Org membership (filtered by access) |
| `search_tickets`, `get_ticket_details`, `get_ticket_transitions`, `list_ticket_comments` | GUEST |
| `create_ticket`, `update_ticket`, `transition_ticket_status`, `add_ticket_comment`, `create_ticket_from_issue_reports` | DEVELOPER |
| `get_sprint_status`, `search_knowledge_base`, `semantic_search_kb`, `search_issue_reports`, `create_issue_report`, `add_reporter_to_issue_report`, `watch_ticket`, `unwatch_ticket` | GUEST |
| `global_search`, `get_my_dashboard`, `present_choices`, `request_approval` | Authenticated |
