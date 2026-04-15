# Phase 13 Data Model

## No New Tables

Phase 13 introduces no new database tables or migrations. All changes are in the service layer, API schemas, and frontend.

## Modified Behavior on Existing Tables

### tickets

The `custom_field_values.import_metadata` JSONB field continues to store `unmatched_assignee` and `unmatched_reporter` for any names that were not resolved. With Phase 13, the user has the opportunity to resolve all names before import, so these fields should be empty for fully-resolved imports. They remain available for reference when a user explicitly chooses "Leave unassigned".

### project_memberships + users

The `preview_users()` service function joins these two existing tables to build the project member roster:

```
project_memberships
  user_id  →  users.id
  project_id
  role

users
  id
  display_name   ← matched case-insensitively against import names
  email          ← matched case-insensitively as fallback
  avatar_url     ← returned for UI display in the member dropdown
```

## API Payload Additions

### ImportExecuteRequest (new field)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| user_mappings | dict[str, str \| null] | {} | Source name → user UUID override or null to force unassigned |

### ImportResult (new field)

| Field | Type | Notes |
|-------|------|-------|
| unresolved_assignees | int | Count of tickets imported without a resolved assignee |

## Match Quality Taxonomy

| match_type | Condition | Auto-populated in UI |
|------------|-----------|----------------------|
| exact | `lower(display_name)` == `lower(input_name)` | Yes (green badge) |
| email | `lower(email)` == `lower(input_name)` | Yes (amber badge) |
| none | No match found | No (dropdown shown, user must select) |
