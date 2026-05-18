# Phase 5 API Design

## New Endpoints

### Avatar Upload

> See [`docs/FILE_STORAGE.md`](../FILE_STORAGE.md).

#### `POST /api/v1/users/me/avatar`

Upload a profile avatar in a single request.

**Min Role:** Authenticated user (self only)

**Request:** `multipart/form-data` with field name `file`.

**Response (201):**

```json
{
  "avatar_url": "/api/v1/users/{user_id}/avatar"
}
```

**Validation:**
- `content_type` must be one of: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Max size 5 MB

---

#### `GET /api/v1/users/{user_id}/avatar`

Stream the user's uploaded avatar (inline image).

**Min Role:** Any authenticated user

**Auth:** `Authorization: Bearer` header or `?access_token=` query parameter (for `<img src>`).

**Response:** Image bytes (`Content-Disposition: inline`). `404` if no uploaded avatar (OIDC-only users may have an external `picture` URL in `avatar_url` instead).

---

#### `DELETE /api/v1/users/me/avatar`

Remove avatar from S3 and clear stored avatar key.

**Min Role:** Authenticated user (self only)

**Response:** `204 No Content`

---

### Auth / Security

#### `GET /api/v1/auth/account-url`

Return the Keycloak account management URL for the current user.

**Min Role:** Authenticated user

**Response (200):**

```json
{
  "account_url": "https://keycloak.example.com/realms/projecthub/account",
  "security_url": "https://keycloak.example.com/realms/projecthub/account/#/security/signingin"
}
```

---

## Existing Endpoints Used (No Changes Needed)

### User Self-Service

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/users/me` | Get current user profile with memberships |
| `PATCH` | `/api/v1/users/me` | Update display_name, avatar_url, preferences |

### Admin User Management

| Method | Path | Description | Min Role |
|--------|------|-------------|----------|
| `GET` | `/api/v1/users` | List all users (paginated, searchable) | System Admin |
| `GET` | `/api/v1/users/{user_id}` | Get user by ID | System Admin |
| `PATCH` | `/api/v1/users/{user_id}` | Admin update (is_active, is_system_admin) | System Admin |

### Admin Organization Management

| Method | Path | Description | Min Role |
|--------|------|-------------|----------|
| `GET` | `/api/v1/organizations` | List orgs (admin sees all) | Authenticated |
| `POST` | `/api/v1/organizations` | Create organization | System Admin |
| `GET` | `/api/v1/organizations/{org_id}` | Get org detail | Org Member |
| `PATCH` | `/api/v1/organizations/{org_id}` | Update org | Org Admin |
| `DELETE` | `/api/v1/organizations/{org_id}` | Deactivate org | Org Owner |
| `GET` | `/api/v1/organizations/{org_id}/members` | List members | Org Member |
| `POST` | `/api/v1/organizations/{org_id}/members` | Add member | Org Admin |
| `PATCH` | `/api/v1/organizations/{org_id}/members/{user_id}` | Change role | Org Admin |
| `DELETE` | `/api/v1/organizations/{org_id}/members/{user_id}` | Remove member | Org Admin |

---

## User Preferences Schema

The `preferences` JSONB field on the `User` model stores application settings:

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

Updated via `PATCH /api/v1/users/me` with:

```json
{
  "preferences": {
    "locale": "es",
    "darkMode": true,
    "notifications": {
      "email": false,
      "sound": true
    }
  }
}
```

The backend stores the entire preferences object (deep merge is the client's responsibility).
