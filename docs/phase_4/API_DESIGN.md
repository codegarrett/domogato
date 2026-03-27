# Phase 4 API Design

## Overview

This document specifies all new API endpoints introduced in Phase 4 for User Story page types, customizable story workflows, ticket linking, and reverse lookups. These build on the existing `/api/v1` convention and KB endpoints from Phase 3.

For the original API specification, see `docs/phase_1/API_DESIGN.md`. For Phase 2 additions, see `docs/phase_2/API_DESIGN.md`. For Phase 3 KB endpoints, see `docs/phase_3/API_DESIGN.md`.

All endpoints use the existing project role-based access control.

---

## New Endpoints

### Story Workflows (Phase 4.2)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/kb/story-workflow` | Get project's story workflow with statuses | Yes | Guest |
| `POST` | `/api/v1/projects/{project_id}/kb/story-workflow/statuses` | Add a status to the workflow | Yes | Maintainer |
| `PATCH` | `/api/v1/projects/{project_id}/kb/story-workflow/statuses/{status_id}` | Update a status | Yes | Maintainer |
| `DELETE` | `/api/v1/projects/{project_id}/kb/story-workflow/statuses/{status_id}` | Delete a status | Yes | Owner |

**Get story workflow response:**

The workflow is auto-seeded with default statuses on first access if none exist.

```json
{
    "id": "uuid",
    "project_id": "uuid",
    "name": "User Story Workflow",
    "statuses": [
        {
            "id": "uuid",
            "workflow_id": "uuid",
            "name": "Draft",
            "category": "draft",
            "color": "#6B7280",
            "position": 0,
            "is_initial": true,
            "is_terminal": false,
            "created_at": "2026-03-24T10:00:00Z",
            "updated_at": "2026-03-24T10:00:00Z"
        },
        {
            "id": "uuid",
            "name": "Pending Review",
            "category": "review",
            "color": "#F59E0B",
            "position": 1,
            "is_initial": false,
            "is_terminal": false
        },
        {
            "id": "uuid",
            "name": "Ready for Ticketing",
            "category": "ready",
            "color": "#3B82F6",
            "position": 2,
            "is_initial": false,
            "is_terminal": false
        },
        {
            "id": "uuid",
            "name": "Ticketed",
            "category": "ticketed",
            "color": "#10B981",
            "position": 3,
            "is_initial": false,
            "is_terminal": true
        }
    ],
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
}
```

**Create status request:**

```json
{
    "name": "Blocked",
    "category": "blocked",
    "color": "#EF4444",
    "position": 2,
    "is_initial": false,
    "is_terminal": false
}
```

**Update status request (partial):**

```json
{
    "name": "In Review",
    "color": "#8B5CF6"
}
```

**Validation rules:**
- `name` is required on create, max 100 characters, must be unique within the workflow
- `category` max 20 characters, defaults to `"draft"`
- `color` must be a valid 7-character hex code (e.g., `#3B82F6`)
- `position` must be >= 0
- Cannot delete a status that is currently assigned to any page (returns 409 Conflict)
- At least one status must remain in a workflow (returns 400 if attempting to delete the last one)

---

### Page Metadata (Phase 4.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/kb/pages/{page_id}/meta` | Get page metadata | Yes | Guest |
| `PATCH` | `/api/v1/kb/pages/{page_id}/meta` | Update page metadata (transition status) | Yes | Developer |

**Get page meta response:**

Returns `null` (204 No Content) if the page has no metadata.

```json
{
    "id": "uuid",
    "page_id": "uuid",
    "page_type": "user_story",
    "story_workflow_status_id": "uuid",
    "story_status": {
        "id": "uuid",
        "name": "Draft",
        "category": "draft",
        "color": "#6B7280",
        "position": 0,
        "is_initial": true,
        "is_terminal": false
    },
    "project_id": "uuid",
    "ticket_link_count": 3,
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
}
```

**Update page meta request (transition status):**

```json
{
    "story_workflow_status_id": "uuid-of-new-status"
}
```

**Validation rules:**
- `story_workflow_status_id` must reference a status in the same project's story workflow
- Cannot set status on a page that has `page_type` other than `"user_story"`

---

### Page Metadata in PageRead (Phase 4.3)

The existing `GET /api/v1/kb/pages/{page_id}` response is extended with an optional `meta` field:

```json
{
    "id": "uuid",
    "space_id": "uuid",
    "title": "User login should support SSO",
    "slug": "user-login-should-support-sso",
    "content_markdown": "...",
    "content_html": "...",
    "meta": {
        "id": "uuid",
        "page_type": "user_story",
        "story_workflow_status_id": "uuid",
        "story_status": {
            "id": "uuid",
            "name": "Ready for Ticketing",
            "color": "#3B82F6"
        },
        "ticket_link_count": 2
    }
}
```

When a page has no metadata, `meta` is `null`.

---

### Ticket Links (Phase 4.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/kb/pages/{page_id}/ticket-links` | List tickets linked to this page | Yes | Guest |
| `POST` | `/api/v1/kb/pages/{page_id}/ticket-links` | Link a ticket to this page | Yes | Developer |
| `DELETE` | `/api/v1/kb/pages/{page_id}/ticket-links/{link_id}` | Remove a ticket link | Yes | Developer |

**List ticket links response:**

```json
[
    {
        "id": "uuid",
        "ticket_id": "uuid",
        "ticket_key": "PROJ-42",
        "ticket_title": "Implement SSO login endpoint",
        "ticket_priority": "high",
        "ticket_status": "In Progress",
        "ticket_status_color": "#3B82F6",
        "ticket_assignee_name": "Jane Smith",
        "ticket_assignee_id": "uuid",
        "note": "Covers the backend API",
        "created_by": "uuid",
        "created_at": "2026-03-24T10:00:00Z"
    }
]
```

**Create ticket link request:**

```json
{
    "ticket_id": "uuid",
    "note": "Covers the backend API"
}
```

**Create ticket link response:**

Returns the full `PageTicketLinkRead` object (same shape as list items).

**Validation rules:**
- `ticket_id` must reference an existing, non-deleted ticket in the same project
- Duplicate link (same page + ticket) returns `409 Conflict`
- `note` is optional, max 500 characters
- Page must have metadata (`kb_page_meta` must exist); returns 400 if not

---

### Reverse Lookup: Ticket to User Stories (Phase 4.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/tickets/{ticket_id}/user-stories` | List user story pages linked to this ticket | Yes | Guest |

**Response:**

```json
[
    {
        "page_id": "uuid",
        "page_title": "User login should support SSO",
        "page_slug": "user-login-should-support-sso",
        "space_id": "uuid",
        "space_name": "Product Requirements",
        "space_slug": "product-requirements",
        "story_status_name": "Ready for Ticketing",
        "story_status_color": "#3B82F6",
        "story_status_category": "ready"
    }
]
```

**Notes:**
- Returns an empty array if the ticket has no linked user stories
- Includes space info so the frontend can construct navigation links to the KB page

---

### Template Page Type (Phase 4.4)

The existing template endpoints are unchanged, but the response now includes `page_type`:

**Updated template response:**

```json
{
    "id": "uuid",
    "name": "User Story",
    "description": "Capture a user story with acceptance criteria.",
    "content_markdown": "...",
    "content_html": "...",
    "icon": "clipboard",
    "is_builtin": true,
    "page_type": "user_story",
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
}
```

**Extended page creation:**

The existing `POST /api/v1/kb/spaces/{space_id}/pages` now accepts an optional `page_type`:

```json
{
    "title": "User login should support SSO",
    "content_markdown": "...",
    "content_html": "...",
    "page_type": "user_story"
}
```

When `page_type` is provided:
1. The page is created as normal
2. `kb_page_meta` is auto-created with the given type
3. For `"user_story"` type, the project's story workflow is auto-seeded if needed, and the initial status is assigned

---

## Error Responses

All endpoints follow the existing error envelope format:

```json
{
    "error": {
        "code": "HTTP_409",
        "message": "This ticket is already linked to this page.",
        "details": {},
        "request_id": "uuid"
    }
}
```

| Status | Code | When |
|--------|------|------|
| 400 | `HTTP_400` | Invalid request (e.g., setting story status on non-user-story page) |
| 403 | `HTTP_403` | Insufficient permissions |
| 404 | `HTTP_404` | Page, ticket, status, or link not found |
| 409 | `HTTP_409` | Duplicate ticket link, or deleting status that is in use |

---

## Summary of All New Endpoints

| # | Method | Path | Phase |
|---|--------|------|-------|
| 1 | `GET` | `/projects/{pid}/kb/story-workflow` | 4.2 |
| 2 | `POST` | `/projects/{pid}/kb/story-workflow/statuses` | 4.2 |
| 3 | `PATCH` | `/projects/{pid}/kb/story-workflow/statuses/{sid}` | 4.2 |
| 4 | `DELETE` | `/projects/{pid}/kb/story-workflow/statuses/{sid}` | 4.2 |
| 5 | `GET` | `/kb/pages/{pid}/meta` | 4.3 |
| 6 | `PATCH` | `/kb/pages/{pid}/meta` | 4.3 |
| 7 | `GET` | `/kb/pages/{pid}/ticket-links` | 4.3 |
| 8 | `POST` | `/kb/pages/{pid}/ticket-links` | 4.3 |
| 9 | `DELETE` | `/kb/pages/{pid}/ticket-links/{lid}` | 4.3 |
| 10 | `GET` | `/tickets/{tid}/user-stories` | 4.3 |
