# Phase 11 API Design

## Ticket Watchers

### Add Watcher
```
POST /api/v1/tickets/{ticket_id}/watchers
Body: { "user_id": "uuid" }
Response: 201 { "ticket_id": "uuid", "user_id": "uuid", "created_at": "..." }
```

### Remove Watcher
```
DELETE /api/v1/tickets/{ticket_id}/watchers/{user_id}
Response: 204
```

### List Watchers
```
GET /api/v1/tickets/{ticket_id}/watchers
Response: 200 [ { "user_id": "uuid", "display_name": "...", "created_at": "..." } ]
```

## Notification Preferences

### Get Preferences
```
GET /api/v1/users/me/notification-preferences
Response: 200 [
  { "event_category": "ticket_assigned", "in_app": true, "email": true, "email_delivery": "digest" },
  { "event_category": "ticket_commented", "in_app": true, "email": true, "email_delivery": "digest" },
  ...
]
```

### Update Preferences
```
PUT /api/v1/users/me/notification-preferences
Body: [
  { "event_category": "ticket_assigned", "in_app": true, "email": false, "email_delivery": "instant" },
  ...
]
Response: 200 [ ... updated preferences ... ]
```

## Saved Views

### Create View
```
POST /api/v1/projects/{project_id}/views
Body: {
  "name": "My High Priority Bugs",
  "entity_type": "ticket",
  "filters": { "ticket_type": ["bug"], "priority": ["high", "highest"] },
  "sort_by": "due_date",
  "sort_dir": "asc",
  "is_shared": false
}
Response: 201 { "id": "uuid", ... }
```

### List Views
```
GET /api/v1/projects/{project_id}/views
Response: 200 [ { "id": "uuid", "name": "...", "filters": {...}, ... } ]
```

### Update View
```
PUT /api/v1/views/{view_id}
Body: { "name": "...", "filters": {...}, ... }
Response: 200 { ... }
```

### Delete View
```
DELETE /api/v1/views/{view_id}
Response: 204
```

## Global Search

### Search
```
GET /api/v1/search?q=auth&types=ticket,kb_page,comment&project_id=uuid&limit=20
Response: 200 {
  "results": [
    {
      "type": "ticket",
      "id": "uuid",
      "title": "Implement authentication",
      "subtitle": "PROJ-42 · Story · High",
      "highlight": "...JWT-based <b>auth</b>entication flow...",
      "url": "/tickets/uuid",
      "project_id": "uuid",
      "updated_at": "..."
    },
    {
      "type": "kb_page",
      "id": "uuid",
      "title": "Auth Architecture",
      "subtitle": "Engineering Wiki > Security",
      "highlight": "...describes the <b>auth</b> design...",
      "url": "/projects/uuid/kb/eng-wiki/auth-architecture",
      "project_id": "uuid",
      "updated_at": "..."
    }
  ],
  "total": 42
}
```

## Dashboard

### Get Dashboard Data
```
GET /api/v1/users/me/dashboard
Response: 200 {
  "assigned_tickets": [
    { "id": "uuid", "title": "...", "ticket_key": "PROJ-42", "priority": "high", "due_date": "2026-04-01", "status_name": "In Progress", "project_name": "..." }
  ],
  "overdue_count": 3,
  "watched_recent": [
    { "id": "uuid", "title": "...", "ticket_key": "PROJ-10", "updated_at": "...", "last_event": "status changed to Done" }
  ],
  "active_sprints": [
    { "id": "uuid", "name": "Sprint 5", "project_name": "...", "progress_pct": 60, "end_date": "2026-04-05" }
  ],
  "recent_activity": [
    { "id": "uuid", "event_type": "ticket.created", "title": "Created PROJ-42", "created_at": "..." }
  ],
  "stats": {
    "open_tickets": 12,
    "completed_this_week": 8,
    "hours_logged_this_week": 32.5
  }
}
```
