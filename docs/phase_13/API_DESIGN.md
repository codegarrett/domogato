# Phase 13 API Design

## New Endpoint

### Preview Users
```
POST /api/v1/projects/{project_id}/import/preview-users
Auth: Bearer token, MAINTAINER+ project role
Body: {
  "names": ["jdoe", "Jane Smith", "john@example.com", "unknown user"]
}
Response: 200 {
  "matches": [
    {
      "source_name": "jdoe",
      "matched_user_id": null,
      "matched_display_name": null,
      "match_type": "none"
    },
    {
      "source_name": "Jane Smith",
      "matched_user_id": "uuid-of-jane",
      "matched_display_name": "Jane Smith",
      "match_type": "exact"
    },
    {
      "source_name": "john@example.com",
      "matched_user_id": "uuid-of-john",
      "matched_display_name": "John Doe",
      "match_type": "email"
    },
    {
      "source_name": "unknown user",
      "matched_user_id": null,
      "matched_display_name": null,
      "match_type": "none"
    }
  ],
  "project_members": [
    {
      "user_id": "uuid-of-jane",
      "display_name": "Jane Smith",
      "email": "jane@example.com",
      "avatar_url": null
    },
    {
      "user_id": "uuid-of-john",
      "display_name": "John Doe",
      "email": "john@example.com",
      "avatar_url": "https://..."
    }
  ]
}
```

Match resolution order per input name:
1. Case-insensitive `display_name` match among project members → `match_type: "exact"`
2. Case-insensitive `email` match among project members → `match_type: "email"`
3. No match → `match_type: "none"`

`project_members` is always the full list of project members regardless of match results, used to populate the manual override dropdown.

## Modified Endpoint

### Execute Import (updated)
```
POST /api/v1/projects/{project_id}/import/execute
Auth: Bearer token, MAINTAINER+ project role
Body: {
  "import_session_id": "uuid",
  "column_mappings": [...],
  "value_mappings": { ... },
  "user_mappings": {
    "jdoe": null,
    "Jane Smith": "uuid-of-jane",
    "john@example.com": "uuid-of-john"
  },
  "options": { ... }
}
Response: 200 {
  "total_processed": 50,
  "tickets_created": 48,
  "tickets_skipped": 2,
  "unresolved_assignees": 1,
  "labels_created": ["bug", "frontend"],
  "sprints_created": [],
  "parent_links_resolved": 5,
  "errors": []
}
```

`user_mappings` is optional; omitting it preserves the existing display-name-only resolution behavior. Keys are raw source strings as they appear in the import file (case-sensitive match against the data, then lowercased for lookup). Values are user UUIDs (string) or `null` to explicitly leave the assignee unset.

`unresolved_assignees` counts tickets where an assignee string was present in the import data but no user ID could be resolved (either no `user_mappings` entry and no display-name match, or the `user_mappings` entry was `null`).
