# Phase 7 Data Model

## No Schema Changes Required

Phase 7 does not introduce new database tables or columns. It leverages existing structures:

### Existing Tables Used

- **`tickets`** — Bulk insert target. The `custom_field_values` JSONB column stores import metadata.
- **`labels`** — Find-or-create during import.
- **`ticket_labels`** — Junction table for attaching labels to imported tickets.
- **`sprints`** — Optional: match by name during import.
- **`users`** — Match assignee/reporter by display name.
- **`workflow_statuses`** — Match imported status names to project workflow statuses.
- **`projects`** — Read `ticket_sequence` for bulk number allocation, `default_workflow_id` for status resolution.

### Import Metadata in `custom_field_values`

Each imported ticket stores metadata in the existing JSONB column:

```json
{
  "import_metadata": {
    "external_key": "ORBIS-929",
    "source": "jira_csv",
    "imported_at": "2026-03-24T12:00:00Z",
    "original_created_at": "2026-03-25T07:15:00Z",
    "original_updated_at": "2026-03-25T07:17:00Z",
    "unmatched_assignee": "Juan Quispe",
    "unmatched_reporter": "Kelly Garrett"
  }
}
```

### Redis Cache (Ephemeral)

- Key pattern: `import:{uuid}`
- Value: JSON array of parsed row objects
- TTL: 1800 seconds (30 minutes)
- Purpose: Bridge between analyze and execute API calls without re-uploading/re-parsing
