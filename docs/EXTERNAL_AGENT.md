# External AI Agent Embed

The external agent provides an iframe-embeddable AI assistant at `/embed/agent`, using the same authenticated user and RBAC as the in-app flyout drawer.

## Enable

1. Sign in as a **system admin**.
2. Open **Admin → External Agent**.
3. Enable **Enable external agent**.
4. Add **parent application origins** (e.g. `https://myorg.lightning.force.com`).
5. Save settings.

## Embed snippet

```html
<iframe
  src="https://your-domogato-host/embed/agent"
  title="ProjectHub AI Assistant"
  width="420"
  height="720"
  style="border: none;"
></iframe>
```

The admin UI shows a copy-ready snippet with your current host.

## Authentication

| Mode | Behavior |
|------|----------|
| **Local** | Users see a minimal login form at `/auth/embed/login`. After sign-in they remain on the agent page only (not the dashboard). |
| **OIDC** | Users are redirected to the IdP. Callback returns to `/embed/agent`. Register `/auth/callback` and `/auth/silent-renew` as redirect URIs. |

Session cookies for embed mode use `SameSite=None; Secure` when established via `POST /auth/session` with `{ "embed": true }` (HTTPS required).

## iframe security

- Nginx serves embed routes with `Content-Security-Policy: frame-ancestors 'self' …` instead of `X-Frame-Options: SAMEORIGIN`.
- Mirror allowed origins in the **`EXTERNAL_AGENT_ALLOWED_ORIGINS`** environment variable at deploy time (comma-separated) and extend nginx CSP accordingly.
- Optional env override: **`EXTERNAL_AGENT_ENABLED=true`**.

## API

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/v1/auth/config` | Includes `external_agent_enabled`, `external_agent_url` |
| `GET /api/v1/auth/embed-config` | Public | Embed enabled flag + allowed origins |
| `GET/PUT /api/v1/system-settings/embed` | System admin | Toggle + origins |

All AI chat endpoints continue to require a normal user JWT — the embed page does not elevate privileges.

## Deployment checklist

- [ ] Enable external agent in admin settings
- [ ] Set `EXTERNAL_AGENT_ALLOWED_ORIGINS` to match admin origins
- [ ] Ensure `APP_BASE_URL` is HTTPS in production
- [ ] Register OIDC redirect URIs for embed domain
- [ ] Test iframe from each allowed parent origin

## Salesforce example

In a Lightning page or Visualforce, add an iframe whose `src` points to your Domogato `/embed/agent` URL. Add your Salesforce domain (e.g. `https://myorg.lightning.force.com`) to allowed origins.
