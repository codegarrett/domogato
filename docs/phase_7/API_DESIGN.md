# Phase 7 API Design

## Import Endpoints

All endpoints are scoped to a project and require `MAINTAINER` role.

---

### POST `/projects/{project_id}/import/analyze`

Parses uploaded content and returns column analysis with auto-suggested mappings.

**Request Body:**
```json
{
  "content": "<raw CSV or JSON text>",
  "format": "csv"
}
```

- `content` (string, required): Raw file content, max 10 MB
- `format` (string, required): `"csv"` or `"json"`

**Response (200):**
```json
{
  "import_session_id": "uuid",
  "format": "csv",
  "total_rows": 929,
  "columns": ["Summary", "Issue key", "Issue Type", "Status", "Priority", ...],
  "suggested_mappings": [
    { "source_column": "Summary", "target_field": "title" },
    { "source_column": "Issue Type", "target_field": "ticket_type" },
    { "source_column": "Priority", "target_field": "priority" },
    { "source_column": "Description", "target_field": "description" },
    { "source_column": "Issue key", "target_field": "external_key" },
    { "source_column": "Status", "target_field": "status" },
    { "source_column": "Assignee", "target_field": "assignee" },
    { "source_column": "Reporter", "target_field": "reporter" },
    { "source_column": "Labels", "target_field": "labels" },
    { "source_column": "Sprint", "target_field": "sprint" },
    { "source_column": "Custom field (Story point estimate)", "target_field": "story_points" },
    { "source_column": "Custom field (Start date)", "target_field": "start_date" },
    { "source_column": "Due date", "target_field": "due_date" },
    { "source_column": "Parent key", "target_field": "parent_key" },
    { "source_column": "Resolution", "target_field": "resolution" },
    { "source_column": "Resolved", "target_field": "resolved_at" },
    { "source_column": "Created", "target_field": "created_date" }
  ],
  "unmapped_columns": ["Issue id", "Project key", "Project name", ...],
  "sample_rows": [
    { "Summary": "Fix login bug", "Issue key": "PROJ-123", ... }
  ],
  "unique_values": {
    "ticket_type": ["Task", "Bug", "Story", "Epic", "Sub-task"],
    "priority": ["Highest", "High", "Medium", "Low", "Lowest"],
    "status": ["To Do", "In Progress", "Done", "QA Done", "Wont Do"],
    "assignee": ["Kelly Garrett", "Juan Quispe", ...],
    "reporter": ["Kelly Garrett", ...],
    "labels": ["No-QA-Required", ...],
    "sprint": ["Sprint 9", ...]
  }
}
```

---

### POST `/projects/{project_id}/import/execute`

Executes the import with confirmed column and value mappings.

**Request Body:**
```json
{
  "import_session_id": "uuid",
  "column_mappings": [
    { "source_column": "Summary", "target_field": "title" },
    { "source_column": "Issue Type", "target_field": "ticket_type" }
  ],
  "value_mappings": {
    "ticket_type": [
      { "source_value": "Task", "target_value": "task" },
      { "source_value": "Bug", "target_value": "bug" },
      { "source_value": "Story", "target_value": "story" },
      { "source_value": "Sub-task", "target_value": "subtask" }
    ],
    "priority": [
      { "source_value": "Highest", "target_value": "highest" },
      { "source_value": "High", "target_value": "high" }
    ],
    "status": [
      { "source_value": "To Do", "target_value": "<workflow_status_id>" },
      { "source_value": "In Progress", "target_value": "<workflow_status_id>" },
      { "source_value": "Done", "target_value": "<workflow_status_id>" }
    ]
  },
  "options": {
    "create_labels": true,
    "create_sprints": false,
    "skip_resolved": false
  }
}
```

**Response (200):**
```json
{
  "total_processed": 929,
  "tickets_created": 910,
  "tickets_skipped": 19,
  "labels_created": ["No-QA-Required", "Urgent"],
  "sprints_created": [],
  "parent_links_resolved": 45,
  "errors": [
    { "row_number": 42, "external_key": "PROJ-42", "error": "Title is empty" }
  ]
}
```

---

## Target Fields

Available target fields for column mapping:

| Target Field | Description | Required |
|---|---|---|
| `title` | Ticket title | Yes |
| `description` | Ticket description | No |
| `ticket_type` | Type (task, bug, story, epic, subtask) | No (default: task) |
| `priority` | Priority (lowest, low, medium, high, highest) | No (default: medium) |
| `status` | Workflow status (matched by name or ID) | No (default: initial status) |
| `assignee` | Assignee (matched by display name) | No |
| `reporter` | Reporter (matched by display name) | No |
| `labels` | Labels (find-or-create by name) | No |
| `sprint` | Sprint (matched by name) | No |
| `story_points` | Story point estimate | No |
| `due_date` | Due date | No |
| `start_date` | Start date | No |
| `external_key` | External issue key (stored in metadata) | No |
| `parent_key` | Parent ticket external key (resolved after import) | No |
| `resolution` | Resolution string | No |
| `resolved_at` | Resolution date | No |
| `created_date` | Original creation date (stored in metadata) | No |
