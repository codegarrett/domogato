# Architecture Decision Records

This document captures all significant architecture decisions made during the planning phase. Each record follows a consistent format: context, decision, rationale, and alternatives considered.

---

## ADR-001: Backend Framework -- FastAPI

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
We need a Python web framework for a high-performance REST API with WebSocket support, automatic API documentation, and strong typing.

**Decision:**
Use FastAPI as the backend framework.

**Rationale:**
- Native async/await support for high-concurrency workloads (many concurrent WebSocket connections, parallel DB queries)
- Automatic OpenAPI (Swagger) documentation generated from Pydantic models -- reduces doc maintenance burden
- Pydantic v2 integration for request validation and response serialization with high performance
- Built-in dependency injection system maps cleanly to our layered permission checks (auth -> org role -> project role)
- Native WebSocket support without additional libraries
- Growing ecosystem and strong community adoption for new projects

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Django + DRF** | Synchronous by default (async support still maturing), heavier ORM coupling, admin panel not needed (we have our own UI). Would add unnecessary complexity for a custom SPA-backed API. |
| **Flask** | No built-in async support, no automatic API docs, requires more boilerplate for validation and serialization. Would need many extensions to match FastAPI's built-in features. |

---

## ADR-002: ORM -- SQLAlchemy 2.0 (Async)

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
We need an ORM that supports async operations, complex queries (recursive CTEs, JSONB operations, full-text search), and has a mature migration story.

**Decision:**
Use SQLAlchemy 2.0 with the async extension and asyncpg driver.

**Rationale:**
- Industry-standard Python ORM with the largest ecosystem of extensions and community knowledge
- SQLAlchemy 2.0 introduced first-class async support with `AsyncSession` and `AsyncEngine`
- asyncpg is the fastest PostgreSQL driver for Python
- Supports all PostgreSQL features we need: JSONB operations, full-text search, recursive CTEs, partial indexes
- Alembic (from the same author) provides reliable auto-generated migrations
- Mapped column syntax in 2.0 provides type safety similar to dataclasses

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Tortoise ORM** | Async-native but smaller community, fewer PostgreSQL-specific features, migration tooling (Aerich) less mature than Alembic |
| **SQLModel** | Built on SQLAlchemy but adds an abstraction layer that complicates advanced queries (CTEs, JSONB). Better for simpler schemas. |
| **Raw asyncpg** | Maximum performance but no ORM features, no migration tooling, significant boilerplate for every query |

---

## ADR-003: Authentication -- Keycloak OIDC (External)

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
The platform requires enterprise-grade authentication. The team already operates a Keycloak instance in production.

**Decision:**
Integrate with the existing Keycloak instance as the OIDC identity provider. The application is a Relying Party -- it does not manage passwords, sessions, or identity federation directly.

**Rationale:**
- Keycloak is already deployed and managed by the team, reducing operational overhead
- OIDC is a standard protocol, so switching providers (Okta, Azure AD, Auth0) in the future requires only configuration changes, not code changes
- Keycloak handles: password policies, MFA, brute force protection, social login, user federation (LDAP/AD)
- JIT (Just-In-Time) user provisioning means no manual user creation in the app -- users appear on first login
- PKCE flow for the SPA prevents authorization code interception attacks

**Key Design Choices:**
- Frontend uses Authorization Code flow with PKCE (public client, no client secret in browser)
- Backend validates JWTs by fetching and caching the JWKS from Keycloak
- System admin role is mapped from a Keycloak realm role (`projecthub-admin`)
- Org/project roles are managed within the application database, not in Keycloak (Keycloak handles identity, app handles authorization)

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Custom auth (password hashing + sessions)** | Enormous effort to build securely (password reset, MFA, brute force protection). Keycloak already solves these. |
| **Bundle Keycloak in Docker Compose** | Adds significant resource overhead to the dev environment. Since Keycloak is already in production, we connect to it. Dev environments can use a lightweight Keycloak container or mock the OIDC flow. |
| **Auth0 / Okta** | SaaS cost and vendor lock-in. Team already has Keycloak expertise. However, the OIDC integration is provider-agnostic, so migration remains possible. |

---

## ADR-004: Authorization -- Application-Level RBAC

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
We need fine-grained role-based access control at the organization and project level, following a GitLab-style model.

**Decision:**
Implement RBAC entirely within the application (database + FastAPI dependency injection). Keycloak provides identity; the app provides authorization.

**Rationale:**
- GitLab-style project roles (Owner/Maintainer/Developer/Reporter/Guest) require project-scoped permissions that are difficult to model in Keycloak's role system
- Role assignments change frequently (adding members to projects) and need to be instant -- no Keycloak admin API round-trips
- Permission logic is tightly coupled to business logic (e.g., "reporters can edit only their own tickets") and belongs in the application
- FastAPI's dependency injection makes it ergonomic to compose permission checks

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Keycloak Authorization Services** | Complex to configure for resource-scoped roles, adds latency for every permission check (round-trip to Keycloak), tight coupling to Keycloak's policy engine |
| **Open Policy Agent (OPA)** | Powerful but adds another infrastructure component and a new language (Rego). Overkill for our permission model which is role-based, not attribute-based. |
| **Casbin** | Good library-level RBAC, but our model is simple enough to implement directly. Adding Casbin would be an unnecessary abstraction layer. |

---

## ADR-005: Real-Time -- WebSockets with Redis Pub/Sub

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
The platform needs real-time updates for Kanban boards, ticket changes, and notifications.

**Decision:**
Use FastAPI's native WebSocket support with Redis Pub/Sub for cross-instance event fan-out.

**Rationale:**
- FastAPI has built-in WebSocket support, no additional framework needed
- Redis Pub/Sub enables horizontal scaling: events published on one API instance are received by WebSocket connections on all instances
- Redis is already in the stack (Celery broker, caching), so no new infrastructure component
- Channel-based subscription model maps naturally to our domain (board channels, ticket channels, user notification channels)

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Socket.IO** | Adds a heavy JavaScript-oriented library. Python Socket.IO support exists but adds complexity. Native WebSocket is simpler and sufficient. |
| **Server-Sent Events (SSE)** | Unidirectional (server to client only). We need bidirectional for subscribe/unsubscribe commands. Also has reconnection limitations compared to WebSocket. |
| **Long polling** | Higher latency, more resource-intensive. WebSocket provides immediate delivery. |
| **NATS / RabbitMQ** | More capable message brokers but overkill for our use case. Redis Pub/Sub is simpler and already available. |

---

## ADR-006: Frontend UI Library -- PrimeVue 4

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
We need a comprehensive Vue 3 component library with enterprise-grade components (data tables, trees, charts, dialogs, forms) that supports theming and customization.

**Decision:**
Use PrimeVue 4 as the primary UI component library.

**Rationale:**
- 90+ components covering all our needs: DataTable (virtual scroll, column reorder, filter, sort, edit), TreeTable (nested ticket hierarchy), Chart (Chart.js wrapper), Dialog, AutoComplete, Dropdown, Calendar, ColorPicker, etc.
- Design token-based theming system allows deep customization without fighting the library
- Accessible (WCAG 2.1 AA compliant)
- Active development and commercial support available (PrimeTek)
- Smaller bundle than alternatives when tree-shaken (only import what you use)

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Vuetify 3** | Material Design aesthetic may not suit all users. Larger bundle size. Opinionated layout system. Fewer enterprise data components than PrimeVue. |
| **Naive UI** | TypeScript-first and performant, but smaller component set for enterprise features (no built-in Chart, weaker DataTable). Less community adoption. |
| **Custom + Tailwind** | Maximum control but enormous effort to build all components (data table, tree, date picker, etc.) from scratch. Not practical for the project scope. |
| **Element Plus** | Good component set but theming is less flexible. More oriented toward Vue 2 migration users. |

---

## ADR-007: Rich Text Editor -- TipTap 2

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
Ticket descriptions and comments need rich text editing with support for formatting, code blocks, @mentions, links, and images.

**Decision:**
Use TipTap 2 (ProseMirror-based) for all rich text editing.

**Rationale:**
- Built on ProseMirror, the industry standard for structured document editing
- Highly extensible via extensions: custom nodes, marks, plugins
- Built-in @mention extension for user tagging
- Markdown shortcuts (type `#` for heading, `*` for bold, etc.)
- Stores content as structured JSON (can render to HTML for display, searchable)
- Collaborative editing ready (future feature potential)
- Vue 3 integration via `@tiptap/vue-3`

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Quill** | Simpler but less extensible. Custom formatting and @mentions require more hacking. No structured JSON output. |
| **CKEditor 5** | Powerful but heavier, commercial license for some features, more complex integration. |
| **Markdown-only** | Simpler to implement but poor UX for non-technical users. No WYSIWYG formatting. |

---

## ADR-008: Search Strategy -- PostgreSQL Full-Text Search

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
Users need to search tickets by title and description content. Search must support ranking by relevance.

**Decision:**
Use PostgreSQL's built-in full-text search via `tsvector` columns and `tsquery` operators.

**Rationale:**
- No additional infrastructure component to deploy and maintain
- Good-enough relevance ranking for our use case (weighted title > description)
- GIN index on `tsvector` column provides fast query performance
- Built-in support for stemming, stop words, phrase matching
- Can be upgraded to Elasticsearch/Meilisearch later if needed without changing the API contract

**Trade-offs:**
- Less sophisticated ranking than dedicated search engines
- No fuzzy matching (typo tolerance) out of the box
- No faceted search without additional queries
- Performance may degrade with millions of tickets (at which point, migrate to dedicated search)

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Elasticsearch** | Powerful but adds operational complexity (JVM, cluster management, index sync). Overkill for v1 with expected data volumes. |
| **Meilisearch** | Lighter than Elasticsearch but still another service to deploy and keep in sync. Better for later if PG FTS becomes insufficient. |
| **LIKE queries** | No relevance ranking, terrible performance on large datasets, no stemming. |

---

## ADR-009: File Storage -- S3-Compatible with Presigned URLs

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
Users need to upload file attachments (images, documents, screenshots) to tickets and comments.

**Decision:**
Store files in S3-compatible storage, using presigned URLs for direct browser-to-S3 uploads and downloads.

**Rationale:**
- Presigned upload URLs allow the browser to upload directly to S3, bypassing the API server (no memory/CPU pressure on the backend for large files)
- S3-compatible API works with AWS S3, MinIO, DigitalOcean Spaces, etc.
- Presigned download URLs provide time-limited access control without proxying through the backend
- Scalable to any volume of files without backend changes
- Cost-effective for storage and bandwidth

**Flow:**
1. Client requests presigned upload URL from backend (which checks permissions)
2. Client uploads file directly to S3 using the presigned URL
3. Client confirms upload to backend (registers metadata: filename, size, content type)
4. For downloads, client requests presigned download URL from backend

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Local filesystem** | Not scalable, not available across multiple API instances, no CDN integration, complicates Docker deployment |
| **Database BLOBs** | Bloats database, poor performance for large files, complicates backups |
| **Backend-proxied upload** | Works but wastes backend CPU/memory for large files. Presigned URLs are the standard approach. |

---

## ADR-010: Task Queue -- Celery with Redis Broker

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
We need asynchronous task processing for webhook delivery (with retries), notification fan-out, and scheduled jobs (daily report snapshots).

**Decision:**
Use Celery with Redis as the message broker.

**Rationale:**
- Mature, battle-tested distributed task queue for Python
- Redis is already in the stack, avoiding another infrastructure component (vs RabbitMQ)
- Built-in retry policies with configurable backoff strategies
- Celery Beat for scheduled/periodic tasks (daily CFD snapshots)
- Task result storage (optional, via Redis) for delivery status tracking
- Well-documented and widely understood by Python developers

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **FastAPI BackgroundTasks** | In-process only, no retry mechanism, no scheduling, lost if the process crashes. Suitable for fire-and-forget but not for reliable webhook delivery. |
| **Dramatiq** | Good alternative to Celery with simpler API, but smaller community and fewer integrations. |
| **Huey** | Lightweight but fewer features (limited retry policies, no Beat equivalent). |
| **ARQ** | Async-native (asyncio), but smaller community and less battle-tested than Celery. |

---

## ADR-011: Deployment Model -- Docker Compose

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
We need a deployment model for development and initial production use.

**Decision:**
Use Docker Compose for all environments (development and initial production).

**Rationale:**
- Single `docker compose up` starts the entire platform
- Consistent environments between development and production
- Easy to add/remove services
- Sufficient for single-server deployments
- Can be migrated to Kubernetes later when scaling demands it

**Service Composition:**
- `nginx` (reverse proxy)
- `api` (FastAPI, can be scaled to N replicas behind nginx)
- `celery-worker` (can be scaled independently)
- `celery-beat` (single instance)
- `frontend` (dev server in dev, static files in production)
- `postgres` (with volume persistence)
- `redis` (with volume persistence)

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Kubernetes** | Adds significant operational complexity. Overkill for the initial deployment. Docker Compose is easier to reason about and debug. |
| **Bare metal / systemd** | Harder to reproduce, no service orchestration, manual dependency management. |

---

## ADR-012: Board Ordering -- Lexicographic Ranking

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
Kanban board cards and backlog items need persistent ordering. Users drag-and-drop items, and the order must be saved efficiently without updating every row in the column.

**Decision:**
Use string-based lexicographic ranking (similar to Jira's LexoRank) for board card and backlog ordering.

**Rationale:**
- Inserting between two items only requires updating one row (the moved item), not reindexing all items
- String comparison for ordering works natively with `ORDER BY` in SQL
- O(1) rank calculation for insertions (compute midpoint string between neighbors)
- Periodic rebalancing is rare and can be done as a background task

**How it works:**
- Character set: `0-9a-z` (36 characters)
- Initial rank: `"m"` (midpoint)
- Between `"a"` and `"c"`: `"b"`
- Between `"a"` and `"b"`: `"an"` (extend with midpoint of next char range)
- Rebalance when max rank length exceeds threshold (e.g., 50 chars)

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Integer position** | Moving an item requires updating all subsequent items' positions (O(n) updates per drag). Unacceptable for large columns. |
| **Floating-point position** | Precision issues after many insertions. Lexicographic strings have no precision limit (just append characters). |
| **Linked list** | Complex queries for ordered retrieval. Cannot use simple `ORDER BY`. |

---

## ADR-013: Notification Channels -- In-App + Webhooks (n8n)

**Date:** 2026-03-24

**Status:** Accepted

**Context:**
Users need to be notified of events (ticket assigned, @mentioned, status changes). Email delivery is handled externally by n8n.

**Decision:**
The platform provides in-app notifications (WebSocket + bell icon) and webhook events. n8n consumes webhook events and handles email delivery.

**Rationale:**
- Clean separation of concerns: the platform handles real-time and in-app notifications, n8n handles email routing/templating
- n8n is already in the team's infrastructure for workflow automation
- Webhook events are a standard integration pattern -- not just for n8n, but for Slack, Teams, or any other system
- Avoids embedding SMTP configuration and email templating in the application

**Flow:**
1. Event occurs (ticket assigned)
2. Platform creates in-app notification (stored in DB, pushed via WebSocket)
3. Platform fires webhook to n8n
4. n8n applies rules (who gets email, when, template) and sends email via configured SMTP

**Alternatives Considered:**
| Alternative | Reason Rejected |
|---|---|
| **Built-in SMTP email** | Requires SMTP configuration, email templates, delivery tracking, bounce handling. n8n already handles this better. |
| **Third-party email service (SendGrid, Mailgun)** | SaaS cost, vendor dependency. n8n + SMTP is already operational. |
