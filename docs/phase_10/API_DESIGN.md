# Phase 10 API Design

## New Endpoint: Recent KB Pages

### `GET /api/v1/projects/{project_id}/kb/recent-pages`

Returns recently updated KB pages across all spaces in a project.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Number of pages to return (1-25) |

**Response (200):**

```json
[
  {
    "id": "uuid",
    "title": "API Authentication Guide",
    "slug": "api-authentication-guide",
    "space_name": "Engineering Docs",
    "space_slug": "engineering-docs",
    "updated_at": "2026-03-26T10:30:00Z",
    "last_edited_by_name": "Jane Smith"
  }
]
```

**Authorization:** Requires `GUEST` project role.

---

## Updated Endpoint: List KB Spaces

### `GET /api/v1/projects/{project_id}/kb/spaces`

Now includes additional statistics per space.

**Response (200) — additional fields:**

```json
[
  {
    "id": "uuid",
    "name": "Engineering Docs",
    "slug": "engineering-docs",
    "description": "Technical documentation",
    "icon": "code",
    "page_count": 24,
    "last_updated_at": "2026-03-26T10:30:00Z",
    "contributor_count": 5
  }
]
```

| New Field | Type | Description |
|-----------|------|-------------|
| `last_updated_at` | datetime (nullable) | Most recent `updated_at` of any page in the space |
| `contributor_count` | integer | Count of distinct users who have edited pages in the space |

---

## Updated Agent Skill: `semantic_search_kb`

Added to the AI agent's tool repertoire. Not a REST endpoint — invoked via the `POST /ai/chat` tool-calling flow.

**Parameters (OpenAI function schema):**

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
      "description": "Natural language search query"
    },
    "limit": {
      "type": "integer",
      "description": "Maximum results (default 5, max 10)",
      "default": 5
    }
  },
  "required": ["project_key", "query"]
}
```

**Tool Result:**

```json
{
  "results": [
    {
      "title": "API Authentication Guide",
      "space": "Engineering Docs",
      "content": "...chunk text with relevant context...",
      "similarity": 0.89,
      "page_slug": "api-authentication-guide",
      "space_slug": "engineering-docs",
      "breadcrumb": "Getting Started > API Reference > API Authentication Guide"
    }
  ],
  "total": 3,
  "project": "PROJ",
  "query": "how does authentication work"
}
```

---

## Updated: `GET /api/v1/ai/config`

The `available_skills` list now includes the new semantic search skill:

```json
{
  "available_skills": [
    {
      "name": "semantic_search_kb",
      "description": "Search the knowledge base using semantic/meaning-based search for conceptually related content",
      "category": "knowledge_base"
    }
  ]
}
```

---

## SSE Events

No new SSE event types. The existing `tool_start` and `tool_result` events from Phase 9 cover the semantic search skill:

```
data: {"type": "tool_start", "name": "semantic_search_kb", "arguments": {"project_key": "PROJ", "query": "authentication flow"}}

data: {"type": "tool_result", "name": "semantic_search_kb", "summary": "Found 3 result(s)"}
```
