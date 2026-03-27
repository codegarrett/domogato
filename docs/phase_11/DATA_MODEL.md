# Phase 11 Data Model

## New Tables

### ticket_watchers

Many-to-many association between users and tickets they are watching.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| ticket_id | UUID | FK → tickets.id ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NOT NULL | |
| created_at | TIMESTAMP WITH TZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- UNIQUE(ticket_id, user_id)
- ix_ticket_watchers_user_id on user_id

### notification_preferences

Per-user, per-event-category notification channel preferences.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NOT NULL | |
| event_category | VARCHAR(50) | NOT NULL | e.g. ticket_assigned, ticket_commented, ticket_status_changed, mentioned, sprint_started, sprint_completed, kb_page_updated |
| in_app | BOOLEAN | NOT NULL, DEFAULT true | |
| email | BOOLEAN | NOT NULL, DEFAULT true | |
| email_delivery | VARCHAR(20) | NOT NULL, DEFAULT 'digest' | 'instant' or 'digest' |

**Indexes:**
- UNIQUE(user_id, event_category)

### saved_views

Persisted filter/sort configurations for ticket lists.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NOT NULL | |
| project_id | UUID | FK → projects.id ON DELETE CASCADE, nullable | NULL for cross-project views |
| name | VARCHAR(200) | NOT NULL | |
| entity_type | VARCHAR(50) | NOT NULL, DEFAULT 'ticket' | |
| filters | JSONB | NOT NULL, DEFAULT '{}' | Filter criteria |
| sort_by | VARCHAR(50) | DEFAULT 'created_at' | |
| sort_dir | VARCHAR(10) | DEFAULT 'desc' | |
| columns | JSONB | DEFAULT '[]' | Visible column list |
| is_default | BOOLEAN | DEFAULT false | |
| is_shared | BOOLEAN | DEFAULT false | |
| created_at | TIMESTAMP WITH TZ | NOT NULL | |
| updated_at | TIMESTAMP WITH TZ | NOT NULL | |

**Indexes:**
- ix_saved_views_user_project on (user_id, project_id)

## Modified Tables

### notifications

| Column | Change | Notes |
|--------|--------|-------|
| emailed_at | ADD COLUMN, TIMESTAMP WITH TZ, nullable | Tracks when notification was included in a digest email |

## JSONB Schemas

### saved_views.filters

```json
{
  "ticket_type": ["bug", "story"],
  "priority": ["high", "highest"],
  "assignee_id": ["uuid-1", "uuid-2"],
  "workflow_status_id": ["uuid-3"],
  "sprint_id": "uuid-4",
  "epic_id": "uuid-5",
  "label_ids": ["uuid-6"],
  "search": "keyword",
  "due_date_from": "2026-01-01",
  "due_date_to": "2026-12-31"
}
```
