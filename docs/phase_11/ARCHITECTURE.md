# Phase 11 Architecture

## Notification Flow

```
Ticket Event (create/update/transition/comment)
       │
       ▼
  Event Handler (event_handlers.py)
       │
       ├─► WebSocket broadcast (existing)
       │
       ▼
  Notification Service
       │
       ├─► Query ticket watchers
       │
       ├─► For each watcher, check NotificationPreference
       │     ├─ in_app=true  → create Notification row + WS push
       │     ├─ email=true, delivery=instant → queue email task
       │     └─ email=true, delivery=digest  → create Notification row (emailed_at=NULL)
       │
       └─► Return
```

## Email Digest Flow

```
Celery Beat (every 30 min)
       │
       ▼
  send_notification_digests task
       │
       ├─► Query users with unread, un-emailed notifications
       │     WHERE emailed_at IS NULL AND email preference = digest
       │
       ├─► For each user, group notifications
       │
       ├─► Render digest template with Jinja2
       │
       ├─► Send via aiosmtplib
       │
       └─► Mark notifications emailed_at = now()
```

## Global Search Architecture

```
GET /search?q=...&types=...
       │
       ▼
  Search Service
       │
       ├─► Tickets: tsvector @@ plainto_tsquery (existing index)
       │
       ├─► KB Pages: tsvector @@ plainto_tsquery (existing index)
       │
       ├─► Comments: ILIKE on body
       │
       ├─► RBAC filter: user must have project access
       │
       ├─► Merge + rank by relevance score
       │
       └─► Return unified results
```

## Dashboard Data Aggregation

```
GET /users/me/dashboard
       │
       ▼
  Dashboard Service
       │
       ├─► Assigned tickets: WHERE assignee_id = me AND is_deleted = false
       │     AND workflow_status is not terminal
       │
       ├─► Overdue count: assigned + due_date < today
       │
       ├─► Watched recent: JOIN ticket_watchers WHERE user_id = me
       │     ORDER BY ticket.updated_at DESC LIMIT 10
       │
       ├─► Active sprints: WHERE sprint has tickets assigned to me
       │     + progress calculation
       │
       ├─► Recent activity: ActivityLog WHERE actor_id = me
       │     ORDER BY created_at DESC LIMIT 15
       │
       └─► Stats: COUNT queries for open/completed/hours
```

## Saved Views

Saved views store filter configuration as JSONB. The frontend applies these filters
to the existing ticket list endpoint parameters. No server-side query building is
needed beyond persisting and retrieving the filter configuration.

```
Frontend TicketListView
       │
       ├─► Load saved views: GET /projects/{id}/views
       │
       ├─► User selects a view → apply filters to URL params
       │
       ├─► Ticket list API: GET /projects/{id}/tickets?...
       │     (existing endpoint, filters passed as query params)
       │
       └─► Save current filters: POST /projects/{id}/views
```
