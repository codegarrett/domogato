# Phase 12 Architecture

## Issue Report Submission Flow

```
User submits report (UI or AI Agent)
       │
       ▼
  API Endpoint (POST /issue-reports)
       │
       ├─► issue_report_service.create_report()
       │     ├─ Create IssueReport row
       │     ├─ Create IssueReportReporter row (original reporter)
       │     └─ Update search_vector (via DB trigger)
       │
       ├─► events.publish(EVENT_ISSUE_REPORT_CREATED)
       │
       └─► Return report + similarity hints
```

## Similarity Detection

```
Query text from user
       │
       ▼
  Tier 1: PostgreSQL FTS
       │
       ├─► plainto_tsquery on issue_reports.search_vector
       │   WHERE project_id = X AND status IN ('open', 'reviewing')
       │   ORDER BY ts_rank_cd DESC
       │
       ▼
  Tier 2: pgvector Semantic Search (when configured)
       │
       ├─► Embed query text via LLM embedding provider
       │   Query ai_embeddings WHERE content_type = 'issue_report'
       │   AND project_id = X
       │   ORDER BY cosine similarity DESC
       │
       ▼
  Merge & Deduplicate
       │
       └─► Return scored results
```

FTS is always available and provides fast keyword matching. Semantic search is optional and provides conceptual matching when the embedding provider is configured.

## Ticket Creation Flow

```
User selects issue reports in queue UI (or AI agent provides IDs)
       │
       ▼
  API Endpoint (POST /issue-reports/create-ticket)
       │
       ├─► ticket_service.create_ticket()
       │     └─ Standard ticket creation with workflow initial status
       │
       ├─► Create issue_report_ticket_links for each report
       │
       ├─► Update issue reports status → 'ticket_created'
       │
       ├─► events.publish(EVENT_TICKET_CREATED_FROM_ISSUES)
       │
       └─► Return created ticket
```

## AI Agent Integration

The AI agent uses the existing ReAct-style tool-calling loop (Phase 9). Four new skills are added:

```
User: "The export feature is broken"
       │
       ▼
  Agent receives message
       │
       ├─► search_issue_reports(project_key, query="export broken")
       │     └─ Returns 0-N matching open reports
       │
       ├─► IF matches found:
       │     ├─► present_choices(similar reports)
       │     └─► User selects match → add_reporter_to_issue_report()
       │
       └─► IF no matches:
             ├─► Ask clarifying questions (natural language)
             ├─► request_approval(action="Create issue report", details={...})
             └─► create_issue_report()
```

## RBAC

| Action | Minimum Role |
|--------|-------------|
| Submit issue report | GUEST |
| List / view reports | GUEST |
| Add reporter (self) | GUEST |
| Update report fields | DEVELOPER |
| Create ticket from reports | DEVELOPER |
| Dismiss / delete report | MAINTAINER |
