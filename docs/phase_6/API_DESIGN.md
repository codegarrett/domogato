# Phase 6 API Design

## New Endpoints

### Public Auth Configuration

#### `GET /api/v1/auth/config`

Returns the current authentication configuration so the frontend knows which login experience to render. **No authentication required.**

**Response (200):**
```json
{
  "auth_mode": "local",
  "needs_setup": false,
  "local_registration_enabled": true,
  "oidc": {
    "issuer_url": "https://keycloak.example.com/realms/projecthub",
    "client_id": "projecthub-frontend"
  }
}
```

When `auth_mode` is `"local"`, the `oidc` field may be `null`. When `auth_mode` is `"oidc"`, `local_registration_enabled` is always `false`.

---

### Local Authentication

#### `POST /api/v1/auth/login`

Authenticate with email and password. Only available when `auth_mode == "local"`.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass1"
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Jane Doe",
    "is_system_admin": false
  }
}
```

**Error (401):**
```json
{
  "detail": "Invalid email or password"
}
```

**Error (403):**
```json
{
  "detail": "Local authentication is not enabled"
}
```

---

#### `POST /api/v1/auth/register`

Create a new user account with password. Only available when `auth_mode == "local"` AND `local_registration_enabled == true`.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass1",
  "display_name": "New User"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "display_name": "New User",
    "is_system_admin": false
  }
}
```

**Validation:**
- `email`: valid email format, unique
- `password`: min 8 chars, at least one uppercase, one lowercase, one digit
- `display_name`: 1–255 chars

**Error (400):**
```json
{
  "detail": "A user with this email already exists"
}
```

**Error (403):**
```json
{
  "detail": "Registration is not enabled"
}
```

---

#### `POST /api/v1/auth/change-password`

Change the current user's password. Requires authentication.

**Min Role:** Authenticated user

**Request:**
```json
{
  "current_password": "OldPass1",
  "new_password": "NewSecure2"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error (400):**
```json
{
  "detail": "Current password is incorrect"
}
```

---

### Setup Wizard

#### `GET /api/v1/setup/status`

Check if initial setup is required. **No authentication required.**

**Response (200):**
```json
{
  "needs_setup": true,
  "auth_mode": "local"
}
```

`needs_setup` is `true` when:
1. No user with `is_system_admin == true` exists in the database, AND
2. `INITIAL_ADMIN_EMAIL` env var is not set

---

#### `POST /api/v1/setup/initialize`

Create the first system administrator. **No authentication required. Only works when `needs_setup` is true.**

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "AdminPass1",
  "display_name": "System Admin"
}
```

**Response (201):**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "display_name": "System Admin",
    "is_system_admin": true
  }
}
```

**Error (409):**
```json
{
  "detail": "Setup has already been completed. A system administrator already exists."
}
```

---

### System Settings (Admin Only)

#### `GET /api/v1/system-settings/auth`

Get the effective authentication settings with source annotations.

**Min Role:** System Admin

**Response (200):**
```json
{
  "settings": {
    "auth_mode": {
      "value": "local",
      "source": "env",
      "env_locked": true
    },
    "local_registration_enabled": {
      "value": false,
      "source": "database",
      "env_locked": false
    },
    "oidc_issuer_url": {
      "value": "https://keycloak.example.com/realms/projecthub",
      "source": "env",
      "env_locked": true
    },
    "oidc_client_id": {
      "value": "projecthub-backend",
      "source": "env",
      "env_locked": true
    },
    "oidc_client_secret": {
      "value": "****",
      "source": "env",
      "env_locked": true
    },
    "oidc_auto_provision": {
      "value": true,
      "source": "default",
      "env_locked": false
    },
    "oidc_allowed_domains": {
      "value": [],
      "source": "default",
      "env_locked": false
    },
    "oidc_default_org_id": {
      "value": null,
      "source": "default",
      "env_locked": false
    },
    "oidc_admin_claim": {
      "value": "projecthub-admin",
      "source": "default",
      "env_locked": false
    }
  }
}
```

The `source` field is one of: `"env"`, `"database"`, `"default"`.
The `env_locked` field indicates if the value is set by an environment variable and cannot be changed through the UI.
The `oidc_client_secret` value is always masked in the response.

---

#### `PUT /api/v1/system-settings/auth`

Update authentication settings. Only non-env-locked fields can be changed.

**Min Role:** System Admin

**Request:**
```json
{
  "auth_mode": "oidc",
  "oidc_auto_provision": true,
  "oidc_allowed_domains": ["company.com", "partner.org"],
  "oidc_default_org_id": "uuid-of-org"
}
```

**Response (200):**
Returns the full effective settings (same shape as GET response).

**Error (400):**
```json
{
  "detail": "Cannot change 'auth_mode': locked by environment variable AUTH_MODE"
}
```

---

#### `POST /api/v1/system-settings/auth/test-oidc`

Test OIDC connectivity by fetching the discovery document from the configured issuer URL.

**Min Role:** System Admin

**Request (optional):**
```json
{
  "issuer_url": "https://keycloak.example.com/realms/projecthub"
}
```

If no body is provided, uses the currently configured `oidc_issuer_url`.

**Response (200):**
```json
{
  "success": true,
  "issuer": "https://keycloak.example.com/realms/projecthub",
  "authorization_endpoint": "https://keycloak.example.com/realms/projecthub/protocol/openid-connect/auth",
  "token_endpoint": "https://keycloak.example.com/realms/projecthub/protocol/openid-connect/token"
}
```

**Error (502):**
```json
{
  "success": false,
  "detail": "Failed to reach OIDC provider: Connection refused"
}
```

---

## Existing Endpoints Modified

### `GET /api/v1/auth/oidc-config`

Previously always returned OIDC config. Now returns `null` values when `auth_mode == "local"`.

### User JIT Provisioning (internal)

`get_or_create_user()` in `user_service.py` now checks:
1. `oidc_auto_provision` — if `false`, unknown OIDC users get 403
2. `oidc_allowed_domains` — if non-empty, email domain must be in the list
3. `oidc_default_org_id` — if set, new users are auto-added to this org as `member`
4. `INITIAL_ADMIN_EMAIL` — if email matches, user is promoted to system admin

---

## JWT Token Format

### Local Auth Token (HS256)

```json
{
  "iss": "projecthub",
  "sub": "user-uuid",
  "email": "user@example.com",
  "exp": 1711234567,
  "iat": 1711230967,
  "type": "access"
}
```

Signed with `SECRET_KEY` using HS256. Distinguished from OIDC tokens by `iss == "projecthub"`.

### OIDC Token (RS256)

Existing format — issued by Keycloak, validated against JWKS. `iss` matches `OIDC_ISSUER_URL`.

### Token Discrimination

`get_current_user` peeks at the unverified `iss` claim:
- `iss == "projecthub"` → validate as local token (HS256 + SECRET_KEY)
- Any other `iss` → validate as OIDC token (RS256 + JWKS)
