# Phase 7 Architecture

## Import Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend Import Wizard                                         │
│                                                                 │
│  1. Upload    2. Column Map   3. Value Map   4. Preview   5. Go │
│  ┌─────────┐  ┌───────────┐  ┌───────────┐  ┌────────┐  ┌───┐ │
│  │File/Text│→ │Auto-mapped│→ │Type/Status│→ │10 rows │→ │Run│ │
│  │  input  │  │ dropdowns │  │ selectors │  │preview │  │   │ │
│  └─────────┘  └───────────┘  └───────────┘  └────────┘  └───┘ │
└───────────────────┬────────────────────────────────┬────────────┘
                    │ POST /import/analyze           │ POST /import/execute
                    ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend API (FastAPI)                                          │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  Analyze Handler  │    │  Execute Handler                  │  │
│  │                  │    │                                    │  │
│  │  Parse CSV/JSON  │    │  Retrieve cached rows from Redis  │  │
│  │  Detect columns  │    │  Apply column + value mappings    │  │
│  │  Auto-map fields │    │  Find-or-create labels            │  │
│  │  Extract uniques │    │  Resolve users by display name    │  │
│  │  Cache in Redis  │    │  Match statuses to workflow       │  │
│  │  Return analysis │    │  Bulk-create tickets              │  │
│  └──────────────────┘    │  Resolve parent-child links       │  │
│                          │  Return results summary           │  │
│                          └──────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
           ┌────────┐   ┌────────┐   ┌──────────┐
           │ Redis  │   │ Postgres│   │ Postgres │
           │ Cache  │   │ Tickets │   │ Labels/  │
           │ (TTL)  │   │         │   │ Sprints  │
           └────────┘   └────────┘   └──────────┘
```

## CSV Parsing Strategy

### Duplicate Column Headers
Jira CSV exports contain multiple columns with the same name (e.g. "Labels", "Sprint", "Comment", "Attachment"). The parser handles this by:
1. Reading the raw header row
2. Detecting duplicates
3. Merging values from duplicate columns into a single list per row
4. Presenting the deduplicated column list to the user

### Multiline Fields
Python's `csv.DictReader` natively handles RFC 4180 quoted fields containing newlines. Jira's "Description" column frequently spans multiple lines.

### Date Parsing
Jira exports dates in format `DD/Mon/YY H:MM AM/PM` (e.g. "25/Mar/26 7:15 AM"). The parser uses `datetime.strptime` with format `%d/%b/%y %I:%M %p`. For date-only fields, just the date portion is extracted.

## Auto-Mapping Algorithm

The auto-mapper uses a case-insensitive dictionary of known column names from Jira and other common tools:

```python
KNOWN_COLUMN_MAPPINGS = {
    "summary": "title",
    "issue type": "ticket_type",
    "priority": "priority",
    "status": "status",
    "description": "description",
    "assignee": "assignee",
    "reporter": "reporter",
    "labels": "labels",
    "sprint": "sprint",
    "due date": "due_date",
    "issue key": "external_key",
    "parent key": "parent_key",
    "resolution": "resolution",
    "resolved": "resolved_at",
    "created": "created_date",
    "custom field (story point estimate)": "story_points",
    "custom field (start date)": "start_date",
}
```

Each target field can only be mapped once (first match wins if multiple source columns match the same target).

## Entity Resolution

### Users
- Query `users` table by `display_name` (case-insensitive)
- Matched users are assigned as `assignee_id` / `reporter_id`
- Unmatched names are stored in `custom_field_values.unmatched_assignee` / `custom_field_values.unmatched_reporter`

### Labels
- Query existing labels for the project by name
- Create any that don't exist (with default color)
- Attach labels to tickets via `ticket_labels` junction table

### Statuses
- User maps source status names to workflow status IDs in the value mapping step
- Unmapped statuses fall back to the project's initial workflow status

### Parent-Child Relationships
- During import, each ticket's external key is tracked in a `{external_key: ticket_id}` map
- After all tickets are created, rows with a `parent_key` value are resolved against this map
- Matched pairs get their `parent_ticket_id` updated

## Redis Session Cache

Parsed rows are cached in Redis to avoid re-parsing between the analyze and execute steps:

- Key: `import:{session_id}`
- Value: JSON-serialized list of row dictionaries
- TTL: 30 minutes
- Automatically cleaned up by Redis expiration
