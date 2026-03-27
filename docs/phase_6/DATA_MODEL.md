# Phase 6 Data Model

## Overview

Phase 6 introduces one new table (`system_settings`) and adds one column to the existing `users` table. Two Alembic migrations are required.

## New Table: `system_settings`

A generic key-value store for runtime-configurable application settings. Designed to be extensible beyond auth settings for future use.

```sql
CREATE TABLE system_settings (
    key         VARCHAR(255) PRIMARY KEY,
    value       JSONB NOT NULL DEFAULT '{}',
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Column Details

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `key` | `VARCHAR(255)` | NOT NULL | Setting identifier (e.g., `"auth_mode"`, `"oidc_auto_provision"`) |
| `value` | `JSONB` | NOT NULL | Setting value as JSON (allows strings, booleans, arrays, objects) |
| `updated_by` | `UUID` (FK → users.id) | YES | Last user who modified this setting (NULL for system/migration-set values) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Timestamp of last modification |

### Index

Primary key on `key` provides index for lookups. No additional indexes needed for this small table.

### Auth Settings Keys

These keys are managed by Phase 6:

| Key | Value Type | Example Value | Description |
|-----|-----------|---------------|-------------|
| `auth_mode` | string | `"local"` | `"local"` or `"oidc"` |
| `local_registration_enabled` | boolean | `false` | Allow public registration in local mode |
| `oidc_issuer_url` | string | `"https://kc.example.com/realms/ph"` | OIDC discovery base URL |
| `oidc_client_id` | string | `"projecthub-backend"` | OIDC client identifier |
| `oidc_client_secret` | string | `"gAAAAB..."` | Fernet-encrypted client secret |
| `oidc_auto_provision` | boolean | `true` | Auto-create users on first OIDC login |
| `oidc_allowed_domains` | array | `["company.com"]` | Email domain whitelist for provisioning |
| `oidc_default_org_id` | string/null | `"uuid-here"` | Auto-assign new users to this org |
| `oidc_admin_claim` | string | `"projecthub-admin"` | Keycloak realm role granting system admin |

### Merge Strategy with Environment Variables

The `system_settings` table is NOT the sole source of truth. Values are merged at runtime:

```
Effective Value = ENV_VAR (if set) → DB value (if exists) → Default
```

The merge logic lives in `system_settings_service.py`, not in the database.

---

## Modified Table: `users`

### New Column: `password_hash`

```sql
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
```

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `password_hash` | `VARCHAR(255)` | YES | Bcrypt hash of user's password (NULL for OIDC-only users) |

This column is:
- `NULL` for users created via OIDC (they authenticate through the external provider)
- `NULL` for users who have not set a local password
- Set to a bcrypt hash for users who register locally or set a password through the admin

### Updated Users Table Schema

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oidc_subject    VARCHAR(255) UNIQUE NOT NULL,
    email           VARCHAR(320) UNIQUE NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    avatar_url      VARCHAR(2048),
    password_hash   VARCHAR(255),           -- NEW: Phase 6
    is_system_admin BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    preferences     JSONB DEFAULT '{}',
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### OIDC Subject for Local Users

Local users (created via registration or setup wizard) need a value for `oidc_subject` since it has a `UNIQUE NOT NULL` constraint. For local users, the pattern is:

```
oidc_subject = "local:{user_uuid}"
```

This ensures:
- No collision with real OIDC subjects
- The unique constraint is satisfied
- Local vs OIDC users are easily distinguishable by the prefix

---

## Migrations

### Migration 1: Add `system_settings` table

```python
def upgrade():
    op.create_table(
        'system_settings',
        sa.Column('key', sa.String(255), primary_key=True),
        sa.Column('value', JSONB, nullable=False, server_default='{}'),
        sa.Column('updated_by', sa.Uuid(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('system_settings')
```

### Migration 2: Add `password_hash` to `users`

```python
def upgrade():
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=True))

def downgrade():
    op.drop_column('users', 'password_hash')
```

---

## Entity Relationship Changes

```
┌─────────────┐         ┌──────────────────┐
│   users      │         │ system_settings   │
├─────────────┤         ├──────────────────┤
│ id (PK)     │◄────────│ updated_by (FK)  │
│ oidc_subject│         │ key (PK)         │
│ email       │         │ value (JSONB)    │
│ display_name│         │ updated_at       │
│ avatar_url  │         └──────────────────┘
│ password_   │
│   hash (NEW)│
│ is_system_  │
│   admin     │
│ is_active   │
│ preferences │
│ last_login  │
│   _at       │
└─────────────┘
```

The `system_settings.updated_by` FK tracks which admin last changed a setting. It uses `ON DELETE SET NULL` so that deleting a user doesn't cascade to settings.

---

## Data Flow for Auth Settings

```
Admin changes auth_mode to "oidc" via UI
        │
        ▼
PUT /system-settings/auth { "auth_mode": "oidc" }
        │
        ▼
INSERT INTO system_settings (key, value, updated_by, updated_at)
VALUES ('auth_mode', '"oidc"', 'admin-uuid', now())
ON CONFLICT (key) DO UPDATE SET value = '"oidc"', updated_by = ..., updated_at = now()
        │
        ▼
Next request → get_effective_auth_settings()
        │
        ├── Check env: AUTH_MODE not set → skip
        ├── Check DB: system_settings['auth_mode'] = "oidc" → use
        └── Return: auth_mode = "oidc" (source: "database")
```
