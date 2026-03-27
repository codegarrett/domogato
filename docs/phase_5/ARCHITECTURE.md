# Phase 5 Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Vue.js)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  Profile  │  │ Settings │  │  Admin   │  │ Header │ │
│  │  /profile │  │/settings │  │/admin/*  │  │ Menu   │ │
│  │          │  │          │  │          │  │        │ │
│  │ - Name   │  │ - Locale │  │ - Users  │  │Profile→│ │
│  │ - Avatar │  │ - Dark   │  │ - Orgs   │  │Settings│ │
│  │ - 2FA    │  │   Mode   │  │          │  │Admin→  │ │
│  │ - Orgs   │  │ - Notifs │  │          │  │Logout  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │             │             │             │      │
│  ┌────┴─────────────┴─────────────┴─────────────┴────┐ │
│  │              API Client Layer (api/*.ts)           │ │
│  └───────────────────────┬───────────────────────────┘ │
└──────────────────────────┼─────────────────────────────┘
                           │ HTTP
┌──────────────────────────┼─────────────────────────────┐
│                    Backend (FastAPI)                     │
│                                                         │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐ │
│  │ /users/me/* │  │ /auth/*    │  │ /users/{id}      │ │
│  │             │  │            │  │ (admin only)     │ │
│  │ - profile   │  │ - oidc-cfg │  │                  │ │
│  │ - avatar    │  │ - acct-url │  │ - list/search    │ │
│  │ - prefs     │  │            │  │ - activate/deact │ │
│  └──────┬──────┘  └──────┬─────┘  └────────┬─────────┘ │
│         │                │                  │           │
│  ┌──────┴────────────────┴──────────────────┴─────────┐ │
│  │                   Services Layer                    │ │
│  │  user_service.py  │  storage_service.py            │ │
│  └──────────┬────────────────┬────────────────────────┘ │
│             │                │                          │
│      ┌──────┴──────┐  ┌─────┴──────┐                   │
│      │  PostgreSQL  │  │    MinIO   │                   │
│      │  (users)     │  │   (S3)    │                   │
│      └─────────────┘  └───────────┘                    │
└─────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Keycloak   │
                    │  (OIDC/2FA) │
                    └─────────────┘
```

## Frontend Component Structure

### New Routes

```
/profile                    → UserProfileView.vue
/settings                   → AppSettingsView.vue
/admin/users                → AdminUsersView.vue
/admin/organizations        → AdminOrgsView.vue
```

### Component Hierarchy

```
AppLayout.vue
├── Header (existing, updated)
│   └── User Menu (wired to routes)
│       ├── Profile → /profile
│       ├── Settings → /settings
│       ├── Admin → /admin/users (system admin only)
│       └── Sign out
│
├── UserProfileView.vue
│   ├── AvatarUpload.vue (new component)
│   ├── ProfileInfoCard (inline)
│   ├── SecurityCard (inline — 2FA, Keycloak links)
│   └── MembershipCards (inline — orgs/projects)
│
├── AppSettingsView.vue
│   ├── LanguageSection (inline)
│   ├── ThemeSection (inline)
│   └── NotificationSection (inline)
│
├── AdminUsersView.vue
│   ├── AdminSubNav.vue (new — Users | Orgs tabs)
│   └── User DataTable with actions
│
└── AdminOrgsView.vue
    ├── AdminSubNav.vue (shared)
    └── Org DataTable with member management
```

## Avatar Upload Flow

```
1. User clicks "Change Avatar"
2. File picker opens (accept: image/*)
3. Frontend calls POST /users/me/avatar { filename, content_type }
4. Backend generates presigned PUT URL, returns it
5. Frontend uploads file directly to S3 using presigned URL
6. Frontend calls POST /users/me/avatar/confirm { avatar_key }
7. Backend builds public URL, sets user.avatar_url, returns it
8. Frontend updates auth store with new avatar_url
```

S3 key pattern: `users/{user_id}/avatar/{uuid}_{filename}`

## Two-Factor Authentication Strategy

```
┌────────────┐     ┌───────────────┐     ┌────────────┐
│  Our App   │────>│   Keycloak    │────>│  User's    │
│  (link)    │     │  Account Mgmt │     │  2FA App   │
│            │<────│  Console      │<────│  (TOTP)    │
└────────────┘     └───────────────┘     └────────────┘
```

- **We do NOT implement 2FA directly** — Keycloak owns authentication
- We derive the Keycloak account console URL from `OIDC_ISSUER_URL`
  - Issuer: `https://keycloak.example.com/realms/projecthub`
  - Account console: `https://keycloak.example.com/realms/projecthub/account`
  - Security page: `...account/#/security/signingin`
- We inspect OIDC token claims (`acr`, `amr`) for 2FA status indication
- Future: Keycloak "Required Action" can force 2FA enrollment

## User Preferences Architecture

```
┌─────────────┐     PATCH /users/me      ┌──────────────┐
│  Frontend   │ ────────────────────────> │   Backend    │
│             │     { preferences: {...}} │              │
│ localStorage│ <──── initial load ────── │ user.prefs   │
│ (cache)     │     GET /users/me         │ (JSONB)      │
└─────────────┘                           └──────────────┘
```

- **Source of truth:** Backend `user.preferences` (JSONB)
- **Local cache:** `localStorage` for instant UI application (locale, dark mode)
- **Sync strategy:** On login/page load, fetch from backend → apply locally. On change, update both.
- **Schema:** Loosely typed JSONB; frontend defines expected shape

## Admin Route Protection

```typescript
// Router guard
{
  path: '/admin',
  beforeEnter: (to, from, next) => {
    if (authStore.isSystemAdmin) next()
    else next('/')
  },
  children: [
    { path: 'users', component: AdminUsersView },
    { path: 'organizations', component: AdminOrgsView },
  ]
}
```

Both frontend (route guard + conditional menu rendering) and backend (`require_system_admin()` dependency) enforce access control. The frontend guard prevents navigation; the backend guard prevents data access even if someone crafts requests directly.

## Access Control Summary

| Page | Frontend Guard | Backend Guard |
|------|---------------|---------------|
| Profile | Authenticated (via auth guard) | `get_current_user` |
| Settings | Authenticated (via auth guard) | `get_current_user` |
| Admin Users | `isSystemAdmin` route guard | `require_system_admin()` |
| Admin Orgs | `isSystemAdmin` route guard | `require_system_admin()` |
| Avatar Upload | Authenticated | `get_current_user` (self only) |
