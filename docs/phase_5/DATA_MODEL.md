# Phase 5 Data Model

## Overview

Phase 5 primarily leverages **existing** database tables and fields. No new tables are required. The main data-level change is the structured use of the existing `User.preferences` JSONB column.

## Existing Tables Used

### `users` Table

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oidc_subject    VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    avatar_url      VARCHAR(2048),                -- Phase 5: set via S3 upload
    is_system_admin BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    preferences     JSONB DEFAULT '{}',            -- Phase 5: structured prefs
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

**Phase 5 Usage:**
- `avatar_url`: Updated via new avatar upload/confirm flow (S3 presigned URL)
- `preferences`: Stores user settings (locale, dark mode, notification preferences)
- `is_system_admin`: Used by admin views to gate access
- `is_active`: Toggled by admin user management
- All other fields are read/displayed in the profile page

### `organization_members` Table

```sql
CREATE TABLE organization_members (
    id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role    VARCHAR(20) NOT NULL DEFAULT 'member',  -- member, admin, owner
    UNIQUE (org_id, user_id)
);
```

**Phase 5 Usage:**
- Displayed in user profile (membership cards)
- Admin org management: add/remove members, change roles

### `project_members` Table

```sql
CREATE TABLE project_members (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL DEFAULT 'viewer',
    UNIQUE (project_id, user_id)
);
```

**Phase 5 Usage:**
- Displayed in user profile (project membership summary)

## User Preferences Schema

The `preferences` JSONB column is schemaless at the database level. The application enforces a conventional structure:

```json
{
  "locale": "en",
  "darkMode": false,
  "notifications": {
    "email": true,
    "sound": true
  }
}
```

### Field Descriptions

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `locale` | `string` | `"en"` | User's preferred language (`"en"` or `"es"`) |
| `darkMode` | `boolean` | `false` | Dark mode preference |
| `notifications.email` | `boolean` | `true` | Receive email notifications |
| `notifications.sound` | `boolean` | `true` | Play sound for in-app notifications |

### Merge Strategy

When updating preferences, the frontend must send the **complete** preferences object. The backend stores the entire JSON value (no deep merge). The frontend is responsible for merging the existing preferences with any changes before sending.

## S3 Storage

### Avatar Object Layout

```
bucket/
└── users/
    └── {user_id}/
        └── avatar/
            └── {uuid}_{original_filename}
```

- Each user has at most one avatar object
- Uploading a new avatar replaces the old one
- Deleting clears both the S3 object and `user.avatar_url`
- The `{uuid}` prefix prevents caching issues on avatar change

## No New Migrations Required

All database structures needed for Phase 5 already exist:
- `users` table with `preferences` (JSONB), `avatar_url`, `is_system_admin`, `is_active`
- `organizations`, `organization_members` for org management
- `projects`, `project_members` for project membership display

The only "data model" work is defining the conventional schema for the `preferences` JSONB field, which is handled at the application layer.
