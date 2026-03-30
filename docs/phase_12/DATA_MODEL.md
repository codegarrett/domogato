# Phase 12 Data Model

## New Tables

### issue_reports

Core issue report entity representing a consolidated problem or request.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| project_id | UUID | FK → projects.id ON DELETE CASCADE, NOT NULL | |
| title | VARCHAR(500) | NOT NULL | Summary of the issue |
| description | TEXT | NULL | Detailed description |
| status | VARCHAR(30) | NOT NULL, DEFAULT 'open' | open, reviewing, ticket_created, dismissed |
| priority | VARCHAR(20) | NOT NULL, DEFAULT 'medium' | low, medium, high, critical |
| created_by | UUID | FK → users.id ON DELETE SET NULL, NULL | Original reporter |
| reporter_count | INTEGER | NOT NULL, DEFAULT 1 | Denormalized count for sorting |
| search_vector | TSVECTOR | NULL | FTS on title + description |
| created_at | TIMESTAMP WITH TZ | NOT NULL, DEFAULT now() | |
| updated_at | TIMESTAMP WITH TZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- ix_issue_reports_project_status on (project_id, status)
- ix_issue_reports_search_vector on search_vector USING GIN
- ix_issue_reports_created_by on created_by

### issue_report_reporters

Tracks every user who has reported or "me too'd" an issue, preserving their original description.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| issue_report_id | UUID | FK → issue_reports.id ON DELETE CASCADE, NOT NULL | |
| user_id | UUID | FK → users.id ON DELETE CASCADE, NOT NULL | |
| original_description | TEXT | NULL | What this user originally described |
| created_at | TIMESTAMP WITH TZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- UNIQUE(issue_report_id, user_id)
- ix_issue_report_reporters_user_id on user_id

### issue_report_ticket_links

Links issue reports to tickets created from them.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| issue_report_id | UUID | FK → issue_reports.id ON DELETE CASCADE, NOT NULL | |
| ticket_id | UUID | FK → tickets.id ON DELETE CASCADE, NOT NULL | |
| created_at | TIMESTAMP WITH TZ | NOT NULL, DEFAULT now() | |

**Indexes:**
- UNIQUE(issue_report_id, ticket_id)
- ix_issue_report_ticket_links_ticket_id on ticket_id

## Relationships

```
Project 1──* IssueReport
User 1──* IssueReport (created_by)
IssueReport 1──* IssueReportReporter
User 1──* IssueReportReporter
IssueReport *──* Ticket (via issue_report_ticket_links)
```

## Status Lifecycle

```
open → reviewing → ticket_created
open → dismissed
reviewing → dismissed
reviewing → open (reopen)
```
