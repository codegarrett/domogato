# Phase 12 API Design

## Issue Report CRUD

### Create Issue Report
```
POST /api/v1/projects/{project_id}/issue-reports
Auth: Bearer token, GUEST+ project role
Body: { "title": "string", "description": "string?", "priority": "low|medium|high|critical" }
Response: 201 {
  "id": "uuid",
  "project_id": "uuid",
  "title": "string",
  "description": "string",
  "status": "open",
  "priority": "medium",
  "created_by": "uuid",
  "reporter_count": 1,
  "created_at": "...",
  "updated_at": "...",
  "reporters": [{ "user_id": "uuid", "display_name": "...", "original_description": "...", "created_at": "..." }]
}
```

The creator is automatically added as the first reporter.

### List Issue Reports
```
GET /api/v1/projects/{project_id}/issue-reports
Auth: Bearer token, GUEST+ project role
Query: status, priority, q (FTS), sort_by (created_at|reporter_count|priority), sort_dir (asc|desc), offset, limit
Response: 200 {
  "items": [...],
  "total": 42,
  "offset": 0,
  "limit": 50
}
```

### Get Issue Report
```
GET /api/v1/projects/{project_id}/issue-reports/{report_id}
Auth: Bearer token, GUEST+ project role
Response: 200 { ...full report with reporters and linked_tickets... }
```

### Update Issue Report
```
PATCH /api/v1/projects/{project_id}/issue-reports/{report_id}
Auth: Bearer token, DEVELOPER+ project role
Body: { "title?": "string", "description?": "string", "priority?": "string", "status?": "string" }
Response: 200 { ...updated report... }
```

### Delete Issue Report
```
DELETE /api/v1/projects/{project_id}/issue-reports/{report_id}
Auth: Bearer token, MAINTAINER+ project role
Response: 204
```

Sets status to `dismissed` (soft delete).

## Reporter Management

### Add Reporter
```
POST /api/v1/projects/{project_id}/issue-reports/{report_id}/reporters
Auth: Bearer token, GUEST+ project role
Body: { "user_id?": "uuid", "original_description": "string" }
Response: 201 { "issue_report_id": "uuid", "user_id": "uuid", "original_description": "...", "created_at": "..." }
```

Defaults to current user if `user_id` is omitted. Increments `reporter_count`.

### List Reporters
```
GET /api/v1/projects/{project_id}/issue-reports/{report_id}/reporters
Auth: Bearer token, GUEST+ project role
Response: 200 [{ "user_id": "uuid", "display_name": "string", "original_description": "string", "created_at": "..." }]
```

## Ticket Creation from Reports

### Create Ticket from Issue Reports
```
POST /api/v1/projects/{project_id}/issue-reports/create-ticket
Auth: Bearer token, DEVELOPER+ project role
Body: {
  "issue_report_ids": ["uuid", ...],
  "title?": "string",
  "description?": "string",
  "ticket_type?": "task|bug|story",
  "priority?": "lowest|low|medium|high|highest"
}
Response: 201 {
  "ticket": { ...ticket object... },
  "linked_reports": 3
}
```

Creates a ticket via `ticket_service.create_ticket`, creates `issue_report_ticket_links`, and transitions selected reports to `ticket_created` status. If `title` is omitted, uses the first report's title.

## Similarity Search

### Find Similar Reports
```
GET /api/v1/projects/{project_id}/issue-reports/similar
Auth: Bearer token, GUEST+ project role
Query: q (required), limit (default 5, max 20)
Response: 200 [
  { "id": "uuid", "title": "string", "description": "string", "status": "open", "priority": "medium", "reporter_count": 3, "similarity_score": 0.85 }
]
```

Uses FTS first. When pgvector embeddings are configured, also performs semantic similarity search. Results are merged and deduplicated.

## AI Agent Skills

### search_issue_reports
- Parameters: `project_key` (required), `query` (optional), `status` (optional)
- Returns: list of matching issue reports with metadata

### create_issue_report
- Parameters: `project_key`, `title`, `description`, `priority`
- Gate: `request_approval` before execution
- Returns: created report with key details

### add_reporter_to_issue_report
- Parameters: `project_key`, `report_id`, `original_description`
- Returns: confirmation with updated reporter count

### create_ticket_from_issue_reports
- Parameters: `project_key`, `issue_report_ids`, `title`, `description`, `ticket_type`, `priority`
- Gate: `request_approval` before execution
- Returns: created ticket details with link count
