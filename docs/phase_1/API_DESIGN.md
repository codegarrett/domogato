# API Design

## Overview

The platform exposes a RESTful HTTP API (versioned as `/api/v1`) and a WebSocket endpoint (`/ws/`) for real-time events. Outbound webhooks deliver events to external systems.

## Conventions

### URL Structure

```
/api/v1/{resource}                         # Collection
/api/v1/{resource}/{id}                    # Single resource
/api/v1/{resource}/{id}/{sub-resource}     # Nested collection
```

Resources are **plural nouns** in **kebab-case** where multi-word:

```
/api/v1/organizations
/api/v1/organizations/{org_id}/projects
/api/v1/projects/{project_id}/tickets
/api/v1/projects/{project_id}/custom-fields
```

### HTTP Methods

| Method | Usage |
|---|---|
| `GET` | Retrieve resource(s). Never modifies state. |
| `POST` | Create a new resource. Body contains resource data. |
| `PATCH` | Partial update. Only fields present in body are changed. |
| `PUT` | Full replace (used sparingly, mainly for reordering/bulk replace). |
| `DELETE` | Remove resource. Returns 204 on success. |

### Versioning

API version is part of the URL path: `/api/v1/...`. Breaking changes increment the version. Non-breaking additions (new fields, new endpoints) do not.

### Authentication

All endpoints except health check require a valid JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

The access token is obtained via OIDC flow with Keycloak (see RBAC.md).

### Pagination

All list endpoints support cursor-based or offset-based pagination:

**Offset-based (default):**
```
GET /api/v1/projects/{id}/tickets?offset=0&limit=50
```

**Response envelope:**
```json
{
    "items": [...],
    "total": 1234,
    "offset": 0,
    "limit": 50
}
```

**Cursor-based (for real-time-safe lists like activity feeds):**
```
GET /api/v1/projects/{id}/activity?cursor=eyJ0IjoiMjAyNi0wMy0yNCJ9&limit=50
```

```json
{
    "items": [...],
    "next_cursor": "eyJ0IjoiMjAyNi0wMy0yMyJ9",
    "has_more": true
}
```

Default `limit` is 50. Maximum `limit` is 200.

### Filtering

Filter parameters are passed as query string key-value pairs:

```
GET /api/v1/projects/{id}/tickets?status=in_progress&priority=high,critical&assignee_id=uuid
```

Multi-value filters use comma-separated values (OR logic within a filter, AND logic across filters).

### Sorting

```
GET /api/v1/projects/{id}/tickets?sort_by=created_at&sort_order=desc
```

Allowed `sort_by` values are resource-specific and documented per endpoint. Default is typically `created_at` descending.

### Search

Full-text search uses the `q` parameter:

```
GET /api/v1/projects/{id}/tickets?q=login+bug
```

### Field Selection (Sparse Fields)

For performance, clients can request specific fields:

```
GET /api/v1/projects/{id}/tickets?fields=id,title,status,assignee
```

### Request/Response Format

- All request and response bodies are `application/json`
- Dates are ISO 8601: `2026-03-24T10:30:00Z`
- UUIDs are lowercase hyphenated: `550e8400-e29b-41d4-a716-446655440000`
- Empty collections return `[]`, not `null`
- Null fields are included in responses (not omitted)

### Error Response Format

All errors follow a consistent structure:

```json
{
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Human-readable description of the error",
        "details": {
            "field_errors": [
                {
                    "field": "title",
                    "message": "Title is required",
                    "code": "required"
                }
            ]
        },
        "request_id": "req_abc123"
    }
}
```

**Standard error codes:**

| HTTP Status | Error Code | Description |
|---|---|---|
| 400 | `BAD_REQUEST` | Malformed request |
| 400 | `VALIDATION_ERROR` | Field validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | JWT has expired |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g., project key) |
| 409 | `STATE_CONFLICT` | Invalid state transition |
| 422 | `UNPROCESSABLE_ENTITY` | Semantically invalid request |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Rate Limiting

Rate limits are enforced per-user via Redis token bucket:

| Tier | Limit | Window |
|---|---|---|
| Standard | 300 requests | 1 minute |
| Search | 30 requests | 1 minute |
| File Upload | 10 requests | 1 minute |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 297
X-RateLimit-Reset: 1711276800
```

---

## Endpoint Catalog

### Health

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/health` | Health check (DB + Redis connectivity) | No |

---

### Authentication

| Method | Path | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/auth/oidc-config` | Returns OIDC discovery info for the frontend | No |
| `POST` | `/api/v1/auth/token/exchange` | Exchange authorization code for session (if backend-mediated flow needed) | No |
| `POST` | `/api/v1/auth/token/refresh` | Refresh access token | Refresh token |
| `POST` | `/api/v1/auth/logout` | Invalidate session, revoke tokens at Keycloak | Yes |

---

### Users

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/users/me` | Current user profile + memberships | Yes | Any |
| `PATCH` | `/api/v1/users/me` | Update own profile/preferences | Yes | Any |
| `GET` | `/api/v1/users/me/notifications` | List notifications for current user | Yes | Any |
| `PATCH` | `/api/v1/users/me/notifications/{id}/read` | Mark notification as read | Yes | Any |
| `POST` | `/api/v1/users/me/notifications/read-all` | Mark all notifications as read | Yes | Any |
| `GET` | `/api/v1/users` | List all users (search by name/email) | Yes | System Admin |
| `GET` | `/api/v1/users/{user_id}` | Get user by ID | Yes | System Admin |
| `PATCH` | `/api/v1/users/{user_id}` | Update user (activate/deactivate, admin flag) | Yes | System Admin |

---

### Organizations

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/organizations` | List orgs for current user | Yes | Any (filtered) |
| `POST` | `/api/v1/organizations` | Create organization | Yes | System Admin |
| `GET` | `/api/v1/organizations/{org_id}` | Get org details | Yes | Org Member |
| `PATCH` | `/api/v1/organizations/{org_id}` | Update org profile/settings | Yes | Org Admin |
| `DELETE` | `/api/v1/organizations/{org_id}` | Delete organization (soft) | Yes | Org Owner |

**Organization Members:**

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/organizations/{org_id}/members` | List org members | Yes | Org Member |
| `POST` | `/api/v1/organizations/{org_id}/members` | Add member (by user ID or email) | Yes | Org Admin |
| `PATCH` | `/api/v1/organizations/{org_id}/members/{user_id}` | Change member role | Yes | Org Admin |
| `DELETE` | `/api/v1/organizations/{org_id}/members/{user_id}` | Remove member | Yes | Org Admin |

---

### Projects

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/organizations/{org_id}/projects` | List projects in org | Yes | Org Member (filtered by visibility) |
| `POST` | `/api/v1/organizations/{org_id}/projects` | Create project | Yes | Org Admin |
| `GET` | `/api/v1/projects/{project_id}` | Get project details | Yes | Project Guest |
| `PATCH` | `/api/v1/projects/{project_id}` | Update project settings | Yes | Project Owner |
| `DELETE` | `/api/v1/projects/{project_id}` | Delete project (soft) | Yes | Project Owner |
| `POST` | `/api/v1/projects/{project_id}/archive` | Archive project | Yes | Project Owner |
| `POST` | `/api/v1/projects/{project_id}/unarchive` | Unarchive project | Yes | Project Owner |

**Project Members:**

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/members` | List project members | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/members` | Add member | Yes | Project Owner |
| `PATCH` | `/api/v1/projects/{project_id}/members/{user_id}` | Change member role | Yes | Project Owner |
| `DELETE` | `/api/v1/projects/{project_id}/members/{user_id}` | Remove member | Yes | Project Owner |

---

### Workflows

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/organizations/{org_id}/workflows` | List org-level workflow templates | Yes | Org Member |
| `POST` | `/api/v1/organizations/{org_id}/workflows` | Create org-level workflow | Yes | Org Admin |
| `GET` | `/api/v1/projects/{project_id}/workflows` | List project workflows | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/workflows` | Create project workflow | Yes | Project Maintainer |
| `GET` | `/api/v1/workflows/{workflow_id}` | Get workflow with statuses and transitions | Yes | Project Guest |
| `PATCH` | `/api/v1/workflows/{workflow_id}` | Update workflow | Yes | Project Maintainer |
| `DELETE` | `/api/v1/workflows/{workflow_id}` | Delete workflow | Yes | Project Maintainer |

**Workflow Statuses:**

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `POST` | `/api/v1/workflows/{workflow_id}/statuses` | Add status | Yes | Project Maintainer |
| `PATCH` | `/api/v1/workflows/{workflow_id}/statuses/{status_id}` | Update status | Yes | Project Maintainer |
| `DELETE` | `/api/v1/workflows/{workflow_id}/statuses/{status_id}` | Remove status | Yes | Project Maintainer |
| `PUT` | `/api/v1/workflows/{workflow_id}/statuses/reorder` | Reorder statuses | Yes | Project Maintainer |

**Workflow Transitions:**

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `POST` | `/api/v1/workflows/{workflow_id}/transitions` | Add transition | Yes | Project Maintainer |
| `PATCH` | `/api/v1/workflows/{workflow_id}/transitions/{transition_id}` | Update transition | Yes | Project Maintainer |
| `DELETE` | `/api/v1/workflows/{workflow_id}/transitions/{transition_id}` | Remove transition | Yes | Project Maintainer |

---

### Epics

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/epics` | List epics | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/epics` | Create epic | Yes | Developer |
| `GET` | `/api/v1/epics/{epic_id}` | Get epic with progress stats | Yes | Project Guest |
| `PATCH` | `/api/v1/epics/{epic_id}` | Update epic | Yes | Developer |
| `DELETE` | `/api/v1/epics/{epic_id}` | Delete epic | Yes | Maintainer |

---

### Tickets

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/tickets` | List/search tickets (filterable, sortable, paginated) | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/tickets` | Create ticket | Yes | Reporter |
| `GET` | `/api/v1/tickets/{ticket_id}` | Get ticket detail (includes custom fields, labels) | Yes | Project Guest |
| `PATCH` | `/api/v1/tickets/{ticket_id}` | Update ticket fields | Yes | Reporter (own) / Developer (any) |
| `DELETE` | `/api/v1/tickets/{ticket_id}` | Soft delete ticket | Yes | Maintainer |
| `POST` | `/api/v1/tickets/{ticket_id}/transition` | Transition ticket status | Yes | Reporter (own) / Developer (any) |
| `GET` | `/api/v1/tickets/{ticket_id}/children` | List child tickets | Yes | Project Guest |
| `GET` | `/api/v1/tickets/{ticket_id}/ancestors` | List ancestor tickets (breadcrumb) | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/tickets/bulk` | Bulk update tickets | Yes | Developer |
| `GET` | `/api/v1/projects/{project_id}/tickets/export` | Export tickets as CSV | Yes | Project Guest |

**Transition request body:**
```json
{
    "to_status_id": "uuid",
    "resolution": "done",
    "comment": "Completed implementation"
}
```

**Ticket query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `q` | string | Full-text search |
| `status` | string (CSV) | Filter by workflow status IDs |
| `ticket_type` | string (CSV) | Filter by type (story, bug, task, etc.) |
| `priority` | string (CSV) | Filter by priority |
| `assignee_id` | UUID (CSV) | Filter by assignee |
| `reporter_id` | UUID | Filter by reporter |
| `epic_id` | UUID | Filter by epic |
| `sprint_id` | UUID | Filter by sprint |
| `label_id` | UUID (CSV) | Filter by labels |
| `parent_ticket_id` | UUID | Filter by parent (direct children) |
| `has_parent` | boolean | Filter root tickets only (false) or sub-tickets (true) |
| `created_after` | datetime | Created date range start |
| `created_before` | datetime | Created date range end |
| `due_before` | date | Due date filter |
| `is_overdue` | boolean | Due date < today and not resolved |
| `sort_by` | string | `created_at`, `updated_at`, `priority`, `due_date`, `ticket_number`, `board_rank`, `backlog_rank` |
| `sort_order` | string | `asc`, `desc` |
| `offset` | integer | Pagination offset |
| `limit` | integer | Pagination limit (default 50, max 200) |

---

### Ticket Dependencies

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/tickets/{ticket_id}/dependencies` | List dependencies (blocks, blocked by, relates to) | Yes | Project Guest |
| `POST` | `/api/v1/tickets/{ticket_id}/dependencies` | Add dependency | Yes | Developer |
| `DELETE` | `/api/v1/tickets/{ticket_id}/dependencies/{dep_id}` | Remove dependency | Yes | Developer |

---

### Comments

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/tickets/{ticket_id}/comments` | List comments | Yes | Project Guest |
| `POST` | `/api/v1/tickets/{ticket_id}/comments` | Add comment | Yes | Reporter |
| `PATCH` | `/api/v1/comments/{comment_id}` | Edit comment | Yes | Author / Maintainer |
| `DELETE` | `/api/v1/comments/{comment_id}` | Delete comment (soft) | Yes | Author / Maintainer |

---

### Attachments

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/tickets/{ticket_id}/attachments` | List attachments | Yes | Project Guest |
| `POST` | `/api/v1/tickets/{ticket_id}/attachments/presign` | Get presigned upload URL | Yes | Reporter |
| `POST` | `/api/v1/tickets/{ticket_id}/attachments` | Confirm upload (register metadata) | Yes | Reporter |
| `GET` | `/api/v1/attachments/{attachment_id}/download` | Get presigned download URL | Yes | Project Guest |
| `DELETE` | `/api/v1/attachments/{attachment_id}` | Delete attachment | Yes | Uploader / Maintainer |

**Presign upload request:**
```json
{
    "filename": "screenshot.png",
    "content_type": "image/png",
    "size_bytes": 245000
}
```

**Presign upload response:**
```json
{
    "upload_url": "https://s3.../presigned-put-url",
    "s3_key": "org-id/project-id/ticket-id/att-id/screenshot.png",
    "expires_in": 3600
}
```

---

### Labels

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/labels` | List labels | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/labels` | Create label | Yes | Developer |
| `PATCH` | `/api/v1/labels/{label_id}` | Update label | Yes | Developer |
| `DELETE` | `/api/v1/labels/{label_id}` | Delete label | Yes | Developer |
| `POST` | `/api/v1/tickets/{ticket_id}/labels` | Add label to ticket | Yes | Developer |
| `DELETE` | `/api/v1/tickets/{ticket_id}/labels/{label_id}` | Remove label from ticket | Yes | Developer |

---

### Custom Fields

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/custom-fields` | List custom field definitions | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/custom-fields` | Create custom field | Yes | Maintainer |
| `PATCH` | `/api/v1/custom-fields/{field_id}` | Update custom field definition | Yes | Maintainer |
| `DELETE` | `/api/v1/custom-fields/{field_id}` | Delete custom field (and all values) | Yes | Maintainer |
| `PUT` | `/api/v1/custom-fields/reorder` | Reorder custom fields | Yes | Maintainer |
| `PATCH` | `/api/v1/tickets/{ticket_id}/custom-fields` | Set custom field values on a ticket | Yes | Reporter (own) / Developer (any) |

**Set custom field values request:**
```json
{
    "values": {
        "field-uuid-1": "text value",
        "field-uuid-2": 42,
        "field-uuid-3": ["option1", "option2"]
    }
}
```

---

### Sprints

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/sprints` | List sprints | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/sprints` | Create sprint | Yes | Maintainer |
| `GET` | `/api/v1/sprints/{sprint_id}` | Get sprint detail with stats | Yes | Project Guest |
| `PATCH` | `/api/v1/sprints/{sprint_id}` | Update sprint (name, goal, dates) | Yes | Maintainer |
| `DELETE` | `/api/v1/sprints/{sprint_id}` | Delete sprint (move tickets to backlog) | Yes | Maintainer |
| `POST` | `/api/v1/sprints/{sprint_id}/start` | Start sprint (set to active) | Yes | Maintainer |
| `POST` | `/api/v1/sprints/{sprint_id}/complete` | Complete sprint | Yes | Maintainer |

**Complete sprint request:**
```json
{
    "move_incomplete_to": "backlog" | "sprint-uuid-of-next-sprint"
}
```

**Sprint detail response includes:**
```json
{
    "id": "uuid",
    "name": "Sprint 14",
    "goal": "Complete auth module",
    "start_date": "2026-03-10",
    "end_date": "2026-03-24",
    "status": "active",
    "stats": {
        "total_tickets": 24,
        "completed_tickets": 18,
        "total_story_points": 42,
        "completed_story_points": 34,
        "tickets_by_status": {
            "to_do": 2,
            "in_progress": 4,
            "done": 18
        }
    }
}
```

---

### Boards

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/boards` | List boards | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/boards` | Create board | Yes | Maintainer |
| `GET` | `/api/v1/boards/{board_id}` | Get board with columns and tickets | Yes | Project Guest |
| `PATCH` | `/api/v1/boards/{board_id}` | Update board config | Yes | Maintainer |
| `DELETE` | `/api/v1/boards/{board_id}` | Delete board | Yes | Maintainer |
| `PUT` | `/api/v1/boards/{board_id}/columns/reorder` | Reorder columns | Yes | Maintainer |
| `PATCH` | `/api/v1/boards/{board_id}/columns/{column_id}` | Update column (WIP limit, etc.) | Yes | Maintainer |
| `POST` | `/api/v1/boards/{board_id}/move` | Move ticket to column at position | Yes | Developer |

**Move ticket request:**
```json
{
    "ticket_id": "uuid",
    "to_status_id": "uuid",
    "position": {
        "after_ticket_id": "uuid-or-null",
        "before_ticket_id": "uuid-or-null"
    }
}
```

---

### Backlog

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/backlog` | Get backlog (tickets not in any sprint) | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/backlog/reorder` | Reorder backlog items | Yes | Developer |
| `POST` | `/api/v1/projects/{project_id}/backlog/move-to-sprint` | Move tickets from backlog to sprint | Yes | Maintainer |

---

### Time Tracking

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/tickets/{ticket_id}/time-logs` | List time logs for ticket | Yes | Project Guest |
| `POST` | `/api/v1/tickets/{ticket_id}/time-logs` | Log time | Yes | Reporter (own) |
| `PATCH` | `/api/v1/time-logs/{log_id}` | Edit time log | Yes | Author / Maintainer |
| `DELETE` | `/api/v1/time-logs/{log_id}` | Delete time log | Yes | Author / Maintainer |
| `GET` | `/api/v1/projects/{project_id}/time-reports` | Time report (by user, date range) | Yes | Project Guest |

**Log time request:**
```json
{
    "time_spent_seconds": 7200,
    "description": "Implemented login form",
    "logged_for_date": "2026-03-24"
}
```

---

### Reports

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/reports/burndown` | Burndown chart data | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/burnup` | Burnup chart data | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/velocity` | Velocity chart (per sprint) | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/cumulative-flow` | Cumulative flow diagram data | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/cycle-time` | Cycle time distribution | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/lead-time` | Lead time distribution | Yes | Project Guest |
| `GET` | `/api/v1/sprints/{sprint_id}/reports/summary` | Sprint summary report | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/dashboard` | Project dashboard (ticket counts, by status/type/priority) | Yes | Project Guest |

**Report query parameters (common):**

| Parameter | Type | Description |
|---|---|---|
| `sprint_id` | UUID | Scope to a sprint (burndown, burnup) |
| `date_from` | date | Date range start |
| `date_to` | date | Date range end |
| `granularity` | string | `day`, `week`, `month` |
| `ticket_type` | string (CSV) | Filter by ticket type |

**Burndown response:**
```json
{
    "sprint_id": "uuid",
    "ideal_line": [
        {"date": "2026-03-10", "remaining": 42},
        {"date": "2026-03-24", "remaining": 0}
    ],
    "actual_line": [
        {"date": "2026-03-10", "remaining": 42},
        {"date": "2026-03-11", "remaining": 40},
        {"date": "2026-03-12", "remaining": 37}
    ]
}
```

---

### Activity Log

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/activity` | Project activity feed (cursor-paginated) | Yes | Project Guest |
| `GET` | `/api/v1/tickets/{ticket_id}/activity` | Ticket activity history | Yes | Project Guest |

---

### Webhooks

| Method | Path | Description | Auth | Min Role |
|---|---|---|---|---|
| `GET` | `/api/v1/organizations/{org_id}/webhooks` | List org webhooks | Yes | Org Admin |
| `POST` | `/api/v1/organizations/{org_id}/webhooks` | Create org webhook | Yes | Org Admin |
| `GET` | `/api/v1/projects/{project_id}/webhooks` | List project webhooks | Yes | Project Owner |
| `POST` | `/api/v1/projects/{project_id}/webhooks` | Create project webhook | Yes | Project Owner |
| `GET` | `/api/v1/webhooks/{webhook_id}` | Get webhook details | Yes | Org Admin / Project Owner |
| `PATCH` | `/api/v1/webhooks/{webhook_id}` | Update webhook | Yes | Org Admin / Project Owner |
| `DELETE` | `/api/v1/webhooks/{webhook_id}` | Delete webhook | Yes | Org Admin / Project Owner |
| `POST` | `/api/v1/webhooks/{webhook_id}/test` | Send test event | Yes | Org Admin / Project Owner |
| `GET` | `/api/v1/webhooks/{webhook_id}/deliveries` | List delivery logs | Yes | Org Admin / Project Owner |
| `POST` | `/api/v1/webhooks/{webhook_id}/deliveries/{delivery_id}/redeliver` | Retry failed delivery | Yes | Org Admin / Project Owner |

---

## WebSocket Protocol

### Connection

```
ws://host/ws/?token=<JWT_ACCESS_TOKEN>
```

The JWT is validated on connection. Invalid tokens cause an immediate close with code `4001`.

### Message Format

All WebSocket messages are JSON with this envelope:

**Client -> Server:**
```json
{
    "type": "subscribe" | "unsubscribe" | "ping",
    "channel": "board:{board_id}" | "project:{project_id}" | "ticket:{ticket_id}",
    "data": {}
}
```

**Server -> Client:**
```json
{
    "type": "event",
    "channel": "board:uuid",
    "event": "ticket.moved",
    "data": {
        "ticket_id": "uuid",
        "from_status_id": "uuid",
        "to_status_id": "uuid",
        "board_rank": "m",
        "actor": {
            "id": "uuid",
            "display_name": "Jane Doe"
        },
        "timestamp": "2026-03-24T10:30:00Z"
    }
}
```

### Channels

| Channel Pattern | Description | Events |
|---|---|---|
| `board:{board_id}` | Board real-time updates | `ticket.moved`, `ticket.created`, `ticket.updated`, `ticket.deleted` |
| `project:{project_id}` | Project-wide events | `sprint.started`, `sprint.completed`, `member.added`, `member.removed` |
| `ticket:{ticket_id}` | Single ticket updates | `ticket.updated`, `comment.added`, `comment.edited`, `attachment.added` |
| `user:{user_id}` | Personal notifications | `notification.new`, `notification.read` |

### Event Types

| Event | Fired When | Payload Includes |
|---|---|---|
| `ticket.created` | New ticket created | Full ticket summary |
| `ticket.updated` | Ticket fields changed | Changed fields with old/new values |
| `ticket.moved` | Ticket moved on board | ticket_id, from/to status, new rank |
| `ticket.deleted` | Ticket soft-deleted | ticket_id |
| `ticket.transitioned` | Status changed | ticket_id, from/to status, resolution |
| `comment.added` | New comment posted | comment summary, ticket_id |
| `comment.edited` | Comment text changed | comment_id, new body preview |
| `comment.deleted` | Comment soft-deleted | comment_id |
| `attachment.added` | File uploaded | attachment summary |
| `attachment.deleted` | File removed | attachment_id |
| `sprint.started` | Sprint activated | sprint summary |
| `sprint.completed` | Sprint closed | sprint summary with stats |
| `member.added` | User added to project/org | user summary, role |
| `member.removed` | User removed | user_id |
| `member.role_changed` | Role updated | user_id, old/new role |
| `notification.new` | New notification for user | notification summary |

### Heartbeat

Server sends a `ping` every 30 seconds. Client must respond with `pong` within 10 seconds or the connection is dropped. The client should also send `ping` if no message is received for 30 seconds.

```json
{"type": "ping"}
{"type": "pong"}
```

### Reconnection

The frontend implements exponential backoff reconnection:
- Initial delay: 1 second
- Max delay: 30 seconds
- Multiplier: 2x
- On reconnect, re-subscribe to all previously subscribed channels

---

## Webhook Delivery Protocol

### Delivery Request

Webhooks are delivered as `POST` requests to the configured URL:

```
POST https://hooks.example.com/my-webhook
Content-Type: application/json
X-Hub-Signature-256: sha256=<HMAC-SHA256 of body using webhook secret>
X-Webhook-ID: <delivery_id>
X-Webhook-Event: ticket.created
X-Webhook-Timestamp: 2026-03-24T10:30:00Z
User-Agent: ProjectHub-Webhook/1.0
```

### Payload Structure

```json
{
    "event": "ticket.created",
    "timestamp": "2026-03-24T10:30:00Z",
    "delivery_id": "uuid",
    "webhook_id": "uuid",
    "organization": {
        "id": "uuid",
        "name": "Acme Corp",
        "slug": "acme"
    },
    "project": {
        "id": "uuid",
        "name": "Platform",
        "key": "PLAT"
    },
    "actor": {
        "id": "uuid",
        "display_name": "Jane Doe",
        "email": "jane@acme.com"
    },
    "data": {
        "ticket": {
            "id": "uuid",
            "ticket_number": 42,
            "key": "PLAT-42",
            "title": "Implement OIDC login",
            "ticket_type": "story",
            "priority": "high",
            "status": "To Do",
            "assignee": {
                "id": "uuid",
                "display_name": "John Smith"
            },
            "url": "https://app.example.com/projects/uuid/tickets/PLAT-42"
        }
    }
}
```

### Signature Verification

Recipients verify the webhook signature:

```python
import hmac
import hashlib

def verify_signature(payload_body: bytes, secret: str, signature_header: str) -> bool:
    expected = "sha256=" + hmac.new(
        secret.encode(), payload_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)
```

### Retry Policy

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |

A delivery is considered successful if the response status is `2xx`. After 5 failed attempts, the delivery is marked as `failed`. Webhooks that fail 10 consecutive deliveries are automatically deactivated with a notification to the webhook owner.

### Available Webhook Events

```
ticket.created
ticket.updated
ticket.deleted
ticket.transitioned
comment.created
comment.updated
comment.deleted
sprint.created
sprint.started
sprint.completed
sprint.deleted
epic.created
epic.updated
epic.deleted
project.member_added
project.member_removed
project.member_role_changed
project.updated
project.archived
project.deleted
```
