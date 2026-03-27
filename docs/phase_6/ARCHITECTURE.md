# Phase 6 Architecture

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend (Vue.js)                        │
│                                                              │
│  ┌───────────┐  ┌───────────┐  ┌────────────┐  ┌─────────┐ │
│  │  Login     │  │  Setup    │  │ Admin Auth │  │ Auth    │ │
│  │  /auth/*   │  │  /setup   │  │ /admin/auth│  │ Store   │ │
│  │           │  │           │  │            │  │         │ │
│  │ Adaptive: │  │ First-run │  │ - Mode     │  │authConfig│ │
│  │ - Local   │  │ admin     │  │ - OIDC     │  │authMode  │ │
│  │   form    │  │ creation  │  │ - Provision│  │needsSetup│ │
│  │ - SSO btn │  │ wizard    │  │ - Domains  │  │         │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘  └────┬────┘ │
│        │              │              │              │       │
│  ┌─────┴──────────────┴──────────────┴──────────────┴─────┐ │
│  │               API Client Layer (api/*.ts)               │ │
│  │      Bearer: local JWT -or- OIDC access token          │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP
┌───────────────────────────┼──────────────────────────────────┐
│                     Backend (FastAPI)                          │
│                                                              │
│  ┌──────────────┐  ┌────────────┐  ┌───────────────────────┐│
│  │ /auth/*      │  │ /setup/*   │  │ /system-settings/auth ││
│  │              │  │            │  │ (admin only)          ││
│  │ - /config    │  │ - /status  │  │                       ││
│  │   (public)   │  │   (public) │  │ - GET (read config)  ││
│  │ - /login     │  │ - /init    │  │ - PUT (update config) ││
│  │ - /register  │  │   (public) │  │ - POST test-oidc     ││
│  │ - /change-pw │  │            │  │                       ││
│  └──────┬───────┘  └──────┬─────┘  └────────┬──────────────┘│
│         │                 │                  │               │
│  ┌──────┴─────────────────┴──────────────────┴─────────────┐ │
│  │                 get_current_user() (deps.py)            │ │
│  │                                                         │ │
│  │  Token iss == "projecthub"?                             │ │
│  │  ├─ YES → decode_local_token(HS256, SECRET_KEY)         │ │
│  │  │        → get_user_by_id()                            │ │
│  │  └─ NO  → validate_token(RS256, JWKS)                   │ │
│  │           → get_or_create_user(claims, auth_settings)   │ │
│  └──────────┬────────────────────────┬─────────────────────┘ │
│             │                        │                       │
│  ┌──────────┴──────┐  ┌─────────────┴──────────┐            │
│  │ system_settings │  │    user_service.py      │            │
│  │ _service.py     │  │                         │            │
│  │                 │  │  JIT provisioning:      │            │
│  │ merge env vars  │  │  - auto_provision check │            │
│  │ with DB values  │  │  - domain whitelist     │            │
│  │                 │  │  - default org assign   │            │
│  │                 │  │  - admin email promote  │            │
│  └────────┬────────┘  └────────────┬────────────┘            │
│           │                        │                         │
│    ┌──────┴──────┐          ┌──────┴──────┐                  │
│    │  PostgreSQL  │          │  PostgreSQL  │                 │
│    │ system_      │          │  users       │                 │
│    │ settings     │          │              │                 │
│    └─────────────┘          └──────────────┘                 │
└──────────────────────────────────────────────────────────────┘
              │                        │
       ┌──────┴──────┐         ┌──────┴──────┐
       │  Env Vars   │         │  Keycloak   │
       │ (overrides) │         │ (OIDC IdP)  │
       └─────────────┘         └─────────────┘
```

## Auth Mode Decision Flow

```
Request arrives with Bearer token
        │
        ▼
   ┌─────────────────┐
   │ DEV_AUTH_BYPASS? │──YES──▶ Return dev user
   └────────┬────────┘
            │ NO
            ▼
   ┌─────────────────────┐
   │ Peek at unverified   │
   │ token `iss` claim    │
   └────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
iss == "projecthub" │  iss == external URL
    │               │
    ▼               ▼
┌──────────┐  ┌──────────────┐
│ Decode   │  │ Validate via │
│ HS256    │  │ OIDC JWKS    │
│ with     │  │ (existing)   │
│ SECRET   │  └──────┬───────┘
│ _KEY     │         │
└────┬─────┘         ▼
     │         ┌─────────────────┐
     │         │ auto_provision? │
     │         ├──YES──▶ Create/update user
     │         └──NO───▶ 403 if unknown
     ▼
┌─────────────┐
│ Lookup user │
│ by UUID     │
└─────────────┘
```

## Setup Wizard Flow

```
Frontend loads
     │
     ▼
GET /auth/config
     │
     ├── needs_setup: true ──▶ Redirect to /setup
     │                              │
     │                    ┌─────────┴──────────┐
     │                    │ Setup Wizard Steps  │
     │                    │ 1. Welcome          │
     │                    │ 2. Create admin     │
     │                    │ 3. Success          │
     │                    └─────────┬──────────┘
     │                              │
     │                    POST /setup/initialize
     │                              │
     │                    Returns JWT + user
     │                              │
     │                    Auto-login → Dashboard
     │
     └── needs_setup: false ──▶ Normal login flow
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                    auth_mode: local      auth_mode: oidc
                         │                     │
                    Show login form     Show SSO button
```

## First Admin Bootstrap Strategy

Two complementary mechanisms ensure the first admin can always be created:

### Mechanism 1: Environment Variable (`INITIAL_ADMIN_EMAIL`)
- Set `INITIAL_ADMIN_EMAIL=admin@company.com` in the environment
- When a user with this email first logs in (via OIDC or local registration), they are automatically promoted to `is_system_admin = true`
- This is the DevOps/infrastructure approach — no UI needed
- `GET /auth/config` returns `needs_setup: false` when this env var is set (even if no admin exists yet, one will be created on first login)

### Mechanism 2: Setup Wizard
- When no system admin exists AND `INITIAL_ADMIN_EMAIL` is not set, the app enters "setup mode"
- `GET /auth/config` returns `needs_setup: true`
- Frontend redirects to `/setup` — a standalone page showing a wizard
- Wizard creates the first local user with `is_system_admin = true`
- This is the self-service approach — no env vars or CLI needed
- `POST /setup/initialize` only works once; returns 409 after first admin exists

## Settings Merge Architecture

```
Priority (highest to lowest):
┌─────────────────────┐
│ 1. Environment Vars │  ← Always wins if set (safety valve)
├─────────────────────┤
│ 2. Database Values  │  ← Set by admin through UI
├─────────────────────┤
│ 3. Defaults         │  ← Hardcoded fallbacks
└─────────────────────┘
```

The `get_effective_auth_settings()` function:
1. Reads all defaults from the `AuthSettingsDefaults` dataclass
2. Overlays any values from the `system_settings` table
3. Overlays any non-default env var values (these always win)
4. Annotates each setting with its `source` ("default", "database", "env")
5. Returns the merged result

This ensures that:
- Admins can configure settings via UI without touching infrastructure
- DevOps can override any setting via env vars without touching the database
- The system can never be locked out of auth (set `AUTH_MODE=local` env var to recover)

## Frontend Auth Store Changes

The `useAuth` composable currently makes a static decision at module load time:

```typescript
const SKIP_OIDC = DEV_AUTH_BYPASS || !OIDC_CONFIGURED
```

Phase 6 changes this to a dynamic decision based on the backend config:

```typescript
// Auth store fetches config first
const authConfig = ref(null)
async function fetchAuthConfig() {
  const { data } = await axios.get('/api/v1/auth/config')
  authConfig.value = data
}

// useAuth adapts based on config
const isLocalMode = computed(() => authConfig.value?.auth_mode === 'local')

async function login() {
  if (isLocalMode.value) {
    // POST /auth/login with email/password → store JWT in sessionStorage
  } else {
    // Redirect to OIDC provider (existing flow)
  }
}
```

## Security Considerations

### Token Discrimination Safety
- Local tokens use HS256 (symmetric, validated with `SECRET_KEY`)
- OIDC tokens use RS256 (asymmetric, validated with provider's public keys)
- The `iss` claim is checked in the unverified header first, then fully validated with the appropriate algorithm
- An attacker cannot forge a local token without `SECRET_KEY`
- An attacker cannot craft an OIDC token that would be accepted as local (wrong algorithm)

### Setup Endpoint Protection
- `POST /setup/initialize` only works when zero system admins exist
- Race condition protection: uses `SELECT ... FOR UPDATE` to prevent concurrent setup
- Once any admin exists, the endpoint permanently returns 409

### OIDC Secret Storage
- When OIDC client secret is stored in the database (via admin UI), it is encrypted using Fernet symmetric encryption with `SECRET_KEY`
- The secret is never returned in API responses (always masked as `"****"`)
- Env var values are never written to the database

### Auth Mode Switching
- Changing from local to OIDC: existing local sessions remain valid until token expiry, but no new local logins are accepted
- Changing from OIDC to local: OIDC sessions remain valid until token expiry, but no new OIDC logins are accepted
- Users with `password_hash` set can still log in when mode returns to local
- OIDC users without passwords need to use "Forgot Password" or have admin set one

## Access Control Summary

| Endpoint | Auth Required | Min Role |
|----------|--------------|----------|
| `GET /auth/config` | No | Public |
| `POST /auth/login` | No | Public |
| `POST /auth/register` | No | Public |
| `POST /auth/change-password` | Yes | Authenticated |
| `GET /setup/status` | No | Public |
| `POST /setup/initialize` | No | Public (one-time) |
| `GET /system-settings/auth` | Yes | System Admin |
| `PUT /system-settings/auth` | Yes | System Admin |
| `POST /system-settings/auth/test-oidc` | Yes | System Admin |
