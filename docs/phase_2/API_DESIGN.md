# Phase 2 API Design

## Overview

This document specifies all new and modified API endpoints introduced in Phase 2. These build on the existing `/api/v1` convention established in Phase 1.

For the original API specification, see `docs/phase_1/API_DESIGN.md`.

---

## New Endpoints

### File Attachments (Phase 2.2)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/tickets/{ticket_id}/attachments` | List attachments for a ticket | Yes | Project Guest |
| `POST` | `/api/v1/tickets/{ticket_id}/attachments/presign` | Get presigned upload URL | Yes | Reporter |
| `POST` | `/api/v1/tickets/{ticket_id}/attachments` | Confirm upload (register metadata) | Yes | Reporter |
| `GET` | `/api/v1/attachments/{attachment_id}/download` | Get presigned download URL | Yes | Project Guest |
| `DELETE` | `/api/v1/attachments/{attachment_id}` | Delete attachment (S3 + DB) | Yes | Uploader / Maintainer |

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
    "upload_url": "https://minio:9000/projecthub-attachments/...",
    "s3_key": "{org_id}/{project_id}/{ticket_id}/{attachment_id}/screenshot.png",
    "expires_in": 3600
}
```

**Confirm upload request:**

```json
{
    "filename": "screenshot.png",
    "content_type": "image/png",
    "size_bytes": 245000,
    "s3_key": "{org_id}/{project_id}/{ticket_id}/{attachment_id}/screenshot.png"
}
```

**Attachment response:**

```json
{
    "id": "uuid",
    "ticket_id": "uuid",
    "filename": "screenshot.png",
    "content_type": "image/png",
    "size_bytes": 245000,
    "uploaded_by": {
        "id": "uuid",
        "display_name": "Jane Doe"
    },
    "created_at": "2026-03-24T10:30:00Z"
}
```

**Validation rules:**
- `size_bytes` must not exceed 50MB (52428800 bytes)
- `filename` must not be empty, max 255 characters
- `content_type` must be a valid MIME type

---

### Ticket Dependencies (Phase 2.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/tickets/{ticket_id}/dependencies` | List all dependencies | Yes | Project Guest |
| `POST` | `/api/v1/tickets/{ticket_id}/dependencies` | Add a dependency | Yes | Developer |
| `DELETE` | `/api/v1/tickets/{ticket_id}/dependencies/{dep_id}` | Remove a dependency | Yes | Developer |

**Create dependency request:**

```json
{
    "target_ticket_id": "uuid",
    "dependency_type": "blocks"
}
```

**Dependency types:**
- `blocks` -- this ticket blocks the target
- `is_blocked_by` -- this ticket is blocked by the target (creates inverse `blocks` record)
- `relates_to` -- bidirectional relationship
- `duplicates` -- this ticket duplicates the target

**List dependencies response:**

```json
{
    "blocks": [
        {
            "id": "uuid",
            "ticket_id": "uuid",
            "ticket_key": "PROJ-5",
            "title": "Implement login",
            "dependency_type": "blocks"
        }
    ],
    "blocked_by": [
        {
            "id": "uuid",
            "ticket_id": "uuid",
            "ticket_key": "PROJ-2",
            "title": "Set up auth",
            "dependency_type": "blocks"
        }
    ],
    "relates_to": [],
    "duplicates": []
}
```

**Error responses:**
- `400` -- Cycle detected (A blocks B blocks A)
- `409` -- Dependency already exists
- `404` -- Target ticket not found

---

### Bulk Operations (Phase 2.6)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `POST` | `/api/v1/projects/{project_id}/tickets/bulk` | Bulk update tickets | Yes | Developer |

**Bulk update request:**

```json
{
    "ticket_ids": ["uuid", "uuid", "uuid"],
    "updates": {
        "priority": "high",
        "assignee_id": "uuid",
        "sprint_id": "uuid"
    }
}
```

**Supported bulk update fields:**
- `workflow_status_id` (must be valid transition for all tickets)
- `assignee_id`
- `priority`
- `sprint_id`
- `epic_id`
- `is_deleted` (for bulk soft-delete)

**Response:** Array of updated ticket summaries.

---

### CSV Export (Phase 2.6)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/tickets/export` | Export tickets as CSV | Yes | Project Guest |

**Query parameters:** Same as ticket list endpoint (search, status, type, priority, assignee, etc.)

**Response:** `text/csv` with headers:

```
ticket_key,title,type,priority,status,assignee,reporter,epic,sprint,story_points,created_at,due_date
PROJ-1,Implement login,story,high,In Progress,Jane Doe,John Smith,Auth Epic,Sprint 1,5,2026-03-01,2026-03-15
```

---

### Sprint Report (Phase 2.8)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/sprints/{sprint_id}/report` | Sprint summary report | Yes | Project Guest |

**Response:**

```json
{
    "sprint": {
        "id": "uuid",
        "name": "Sprint 1",
        "start_date": "2026-03-01",
        "end_date": "2026-03-15",
        "status": "completed"
    },
    "planned": {
        "ticket_count": 15,
        "story_points": 42
    },
    "completed": {
        "ticket_count": 12,
        "story_points": 35
    },
    "added_during_sprint": {
        "ticket_count": 3,
        "story_points": 8
    },
    "removed_during_sprint": {
        "ticket_count": 1,
        "story_points": 3
    },
    "carry_over": {
        "ticket_count": 5,
        "story_points": 12
    },
    "velocity": 35,
    "completion_percentage": 80.0,
    "burndown": [
        {"date": "2026-03-01", "remaining": 42, "ideal": 42},
        {"date": "2026-03-02", "remaining": 39, "ideal": 39}
    ],
    "tickets": [
        {
            "id": "uuid",
            "ticket_key": "PROJ-1",
            "title": "Implement login",
            "status": "Done",
            "story_points": 5,
            "completed": true
        }
    ]
}
```

---

### Audit Log (Phase 2.8)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/audit-log` | List audit log entries | Yes | Project Guest |

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | UUID | Filter by actor |
| `action` | string | Filter by action type (created, field_change, transition, comment_added, etc.) |
| `offset` | integer | Pagination offset |
| `limit` | integer | Pagination limit (default 50, max 200) |

**Response:**

```json
{
    "items": [
        {
            "id": "uuid",
            "timestamp": "2026-03-24T10:30:00Z",
            "user": {
                "id": "uuid",
                "display_name": "Jane Doe"
            },
            "action": "field_change",
            "entity_type": "ticket",
            "entity_id": "uuid",
            "entity_key": "PROJ-5",
            "field_name": "priority",
            "old_value": "medium",
            "new_value": "high"
        }
    ],
    "total": 150,
    "offset": 0,
    "limit": 50
}
```

---

## Modified Endpoints

### Ticket List (Phase 2.5/2.6)

**Existing:** `GET /api/v1/projects/{project_id}/tickets`

**New query parameters added:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | `json` (default) or `csv` -- alternative to Accept header for CSV export |

No other changes to existing parameters.

---

### Board Tickets (Phase 2.5)

**Existing:** `GET /api/v1/boards/{board_id}/tickets`

No API changes needed. The `sprint_id` query parameter already exists in the backend service layer and is passed through from the endpoint.

---

### Reports CSV Exports (Phase 2.8)

Dedicated CSV export endpoints (separate from JSON endpoints):

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/reports/velocity/csv` | Velocity data as CSV | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/cycle-time/csv` | Cycle time data as CSV | Yes | Project Guest |
| `GET` | `/api/v1/projects/{project_id}/reports/cumulative-flow/csv` | CFD data as CSV | Yes | Project Guest |

All return `text/csv` with `Content-Disposition: attachment` headers. Query parameters match the corresponding JSON endpoints.

---

## WebSocket Events (Phase 2.4)

All events follow the server-to-client message format from Phase 1:

```json
{
    "type": "event",
    "channel": "board:{board_id}",
    "event": "ticket.moved",
    "data": { ... },
    "actor": { "id": "uuid", "display_name": "Jane Doe" },
    "timestamp": "2026-03-24T10:30:00Z"
}
```

### New Event Wiring

These events were defined in Phase 1 but not wired to services. Phase 2.1/2.4 activates them:

| Event | Channel(s) | Triggered By |
|-------|-----------|--------------|
| `ticket.created` | `board:{id}`, `project:{id}` | POST create ticket |
| `ticket.updated` | `board:{id}`, `ticket:{id}`, `project:{id}` | PATCH update ticket |
| `ticket.moved` | `board:{id}` | Board move ticket |
| `ticket.deleted` | `board:{id}`, `ticket:{id}` | DELETE ticket |
| `ticket.transitioned` | `board:{id}`, `ticket:{id}` | POST transition |
| `comment.added` | `ticket:{id}` | POST create comment |
| `comment.edited` | `ticket:{id}` | PATCH update comment |
| `comment.deleted` | `ticket:{id}` | DELETE comment |
| `attachment.added` | `ticket:{id}` | POST confirm attachment |
| `attachment.deleted` | `ticket:{id}` | DELETE attachment |
| `sprint.started` | `project:{id}` | POST start sprint |
| `sprint.completed` | `project:{id}` | POST complete sprint |
