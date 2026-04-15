# Phase 13 Architecture

## Updated Import Wizard Flow

```
Step 1: Upload
       │
       ▼
Step 2: Column Mapping
       │
       ▼
Step 3: Value Mapping (status, type, priority)
       │
       ▼
Step 4: User Resolution (NEW)
       │
       ├─► If no assignee/reporter columns mapped → auto-skip to Step 5
       │
       ▼
Step 5: Preview
       │
       ▼
Step 6: Results
```

## User Preview Flow

```
User advances from Value Mapping step
       │
       ▼
  Frontend collects unique names
  from analysis.unique_values["assignee"]
  and analysis.unique_values["reporter"]
       │
       ▼
  POST /projects/{project_id}/import/preview-users
  { names: ["jdoe", "Jane Smith", "john@example.com"] }
       │
       ▼
  preview_users() service
       │
       ├─► Query project_memberships JOIN users
       │     WHERE project_memberships.project_id = X
       │
       ├─► Per input name:
       │     1. Exact display_name match (case-insensitive)
       │     2. Email match (case-insensitive, if no display_name match)
       │     3. "none" if no match found
       │
       └─► Return { matches: [...], project_members: [...] }
       │
       ▼
  Frontend initializes userMappings
       │
       ├─► exact/email match → userMappings[name] = matched_user_id
       └─► none → userMappings[name] = undefined (user must choose)
```

## User Mappings Override Layer

```
Execute request arrives with user_mappings:
{ "jdoe": "uuid-of-john", "admin": null, "unknown user": null }
       │
       ▼
_resolve_users(db, display_names, user_mappings)
       │
       ├─► Phase 1: Apply overrides from user_mappings
       │     - UUID value → result[name.lower()] = UUID
       │     - null value → mark as "explicitly unassigned" (skip DB lookup)
       │
       └─► Phase 2: DB lookup for remaining names
             select(User.id, User.display_name)
             where lower(display_name) IN (remaining_names)
       │
       ▼
user_id_map: { "jdoe": UUID, "jane smith": UUID, ... }
       │
       ▼
Per ticket row:
  assignee_id = user_id_map.get(name.lower())  # None if not found or explicit null
  if assignee_id is None and not in user_mappings:
      unmatched_assignee = name
      unresolved_count += 1
```

## RBAC

User preview and execute both require MAINTAINER or above on the project (or system admin). This is unchanged from the existing import endpoints.

| Action | Minimum Role |
|--------|-------------|
| Analyze import | MAINTAINER |
| Preview users | MAINTAINER |
| Execute import | MAINTAINER |
