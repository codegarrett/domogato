# System Architecture

## Overview

This document defines the architecture for the enterprise project management platform. The system follows a client-server model with a Vue 3 single-page application communicating with a FastAPI backend through an Nginx reverse proxy. Real-time features are powered by WebSockets with Redis Pub/Sub for horizontal scaling. Authentication is delegated to an external Keycloak instance via OIDC.

## High-Level System Diagram

```mermaid
graph TB
    subgraph client [Frontend]
        SPA["Vue 3 SPA<br/>PrimeVue + Pinia + TipTap"]
    end

    subgraph gateway [Reverse Proxy]
        Nginx["Nginx"]
    end

    subgraph backend [Backend]
        API["FastAPI<br/>REST API v1"]
        WS["WebSocket<br/>Manager"]
        Workers["Celery<br/>Workers"]
    end

    subgraph data [Data Layer]
        PG["PostgreSQL 16"]
        Redis["Redis 7"]
        S3["S3-Compatible<br/>Storage"]
    end

    subgraph auth [Identity Provider]
        KC["Keycloak<br/>OIDC Provider"]
    end

    SPA -->|HTTPS| Nginx
    Nginx -->|"/api/*"| API
    Nginx -->|"/ws/*"| WS
    Nginx -->|"/*"| SPA
    SPA -->|"OIDC Login Redirect"| KC
    API -->|"Validate JWT"| KC
    API --> PG
    API --> Redis
    API --> S3
    WS -->|"Pub/Sub"| Redis
    Workers --> PG
    Workers --> Redis
    Workers -->|"Deliver Webhooks"| External["External Systems<br/>n8n / Slack / etc."]
```

## Technology Stack

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Backend Framework** | FastAPI | 0.115+ | Async-native, automatic OpenAPI docs, Pydantic integration, dependency injection |
| **ORM** | SQLAlchemy 2.0 (async) | 2.0+ | Mature ecosystem, async support via asyncpg, complex query capability, unit-of-work pattern |
| **DB Driver** | asyncpg | 0.29+ | Fastest PostgreSQL driver for Python, native async |
| **Migrations** | Alembic | 1.13+ | De facto standard for SQLAlchemy, autogenerate support |
| **Validation** | Pydantic | 2.0+ | Built into FastAPI, high performance, JSON Schema generation |
| **Auth Library** | Authlib | 1.3+ | Comprehensive OIDC client, JWT validation, well-maintained |
| **Task Queue** | Celery | 5.4+ | Mature distributed task queue, retry policies, scheduling |
| **S3 Client** | aioboto3 | 13+ | Async S3 operations for file uploads/downloads |
| **WebSocket** | FastAPI native | - | Built-in WebSocket support, no extra dependency |
| **Frontend Framework** | Vue 3 | 3.5+ | Composition API, TypeScript support, reactive system |
| **Build Tool** | Vite | 6+ | Fast HMR, optimized builds, native ESM |
| **Type System** | TypeScript | 5.5+ | Type safety, IDE support, refactoring confidence |
| **State Management** | Pinia | 2.2+ | Official Vue store, TypeScript-first, devtools integration |
| **UI Library** | PrimeVue | 4+ | 90+ enterprise components, design token theming, accessible |
| **Rich Text** | TipTap | 2.x | ProseMirror-based, extensible, collaborative editing ready |
| **Charts** | Chart.js | 4+ | PrimeVue Charts integration, responsive, animated |
| **Drag & Drop** | vuedraggable | 4+ | SortableJS wrapper for Vue 3, touch support |
| **HTTP Client** | Axios | 1.7+ | Interceptors for auth, request/response transforms |
| **OIDC Client** | oidc-client-ts | 3+ | Standards-compliant OIDC/OAuth2, PKCE, silent renew |
| **Database** | PostgreSQL | 16 | JSONB, full-text search, CTEs, row-level security, materialized views |
| **Cache / PubSub** | Redis | 7 | WebSocket fanout, Celery broker, response caching, session storage |
| **Reverse Proxy** | Nginx | 1.27+ | SSL termination, routing, static file serving, WebSocket proxying |
| **Containerization** | Docker + Compose | 27+ | Reproducible environments, service orchestration |

## Infrastructure Components

### PostgreSQL 16

Primary data store for all application data. Key features used:

- **JSONB columns** for flexible data: organization settings, custom field values, workflow conditions, board configuration
- **Full-text search** via `tsvector` / `tsquery` for ticket search across title and description fields
- **Recursive CTEs** for querying nested ticket hierarchies
- **Partial indexes** for optimizing common query patterns (e.g., open tickets only)
- **GIN indexes** for JSONB and full-text search columns
- **Advisory locks** for sprint activation (ensure only one active sprint per project)

### Redis 7

Multi-purpose in-memory store:

- **Celery broker**: Task queue message transport for webhook delivery and async processing
- **WebSocket Pub/Sub**: Fan-out real-time events across multiple API server instances
- **Caching**: Frequently accessed data (user permissions, project settings, workflow definitions)
- **Rate limiting**: Token bucket counters for API rate limiting

### Nginx

Reverse proxy and static file server:

- Routes `/api/v1/*` to FastAPI backend (port 8000)
- Routes `/ws/*` to FastAPI WebSocket handler (port 8000)
- Routes `/*` to Vue SPA static files (or frontend dev server in development)
- Handles SSL termination in production
- Gzip compression for API responses and static assets
- Connection buffering and keep-alive management

### S3-Compatible Storage

File attachment storage:

- Presigned URLs for direct browser-to-S3 uploads (bypasses backend for large files)
- Presigned URLs for time-limited download access
- Compatible with AWS S3, MinIO, or any S3-compatible provider
- Organized by bucket path: `/{org_id}/{project_id}/{ticket_id}/{attachment_id}/{filename}`

## Project Structure

The platform is split into two independent codebases that communicate exclusively via HTTP/WebSocket APIs.

### Backend (`backend/`)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application factory, lifespan events
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py                 # Shared dependencies: DB session, current user, permission checks
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py           # Aggregates all v1 endpoint routers
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── auth.py         # OIDC callback, token exchange, user info
│   │           ├── users.py        # User profile, search, preferences
│   │           ├── organizations.py # Org CRUD, membership management
│   │           ├── projects.py     # Project CRUD, membership, settings
│   │           ├── epics.py        # Epic CRUD, progress tracking
│   │           ├── tickets.py      # Ticket CRUD, search, bulk ops, hierarchy
│   │           ├── comments.py     # Comment CRUD, @mentions
│   │           ├── attachments.py  # Upload/download presigned URLs
│   │           ├── workflows.py    # Workflow CRUD, statuses, transitions
│   │           ├── custom_fields.py # Field definitions and values
│   │           ├── sprints.py      # Sprint CRUD, planning, completion
│   │           ├── boards.py       # Board config, column management
│   │           ├── labels.py       # Label CRUD, ticket labeling
│   │           ├── time_tracking.py # Work log CRUD, time reports
│   │           ├── reports.py      # Burndown, velocity, CFD, etc.
│   │           ├── notifications.py # Notification list, mark read
│   │           └── webhooks.py     # Webhook CRUD, delivery logs
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py              # Pydantic Settings, env var loading
│   │   ├── security.py            # JWT decode/validate, OIDC discovery
│   │   ├── permissions.py         # RBAC logic, permission decorators
│   │   └── events.py              # Internal event bus for cross-cutting concerns
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py                # Declarative base, common mixins (timestamps, soft delete)
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── project.py
│   │   ├── epic.py
│   │   ├── ticket.py
│   │   ├── comment.py
│   │   ├── attachment.py
│   │   ├── workflow.py
│   │   ├── custom_field.py
│   │   ├── sprint.py
│   │   ├── board.py
│   │   ├── label.py
│   │   ├── time_log.py
│   │   ├── notification.py
│   │   ├── webhook.py
│   │   └── activity.py            # Audit trail entries
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py              # Pagination, error responses, enums
│   │   ├── user.py
│   │   ├── organization.py
│   │   ├── project.py
│   │   ├── epic.py
│   │   ├── ticket.py
│   │   ├── comment.py
│   │   ├── attachment.py
│   │   ├── workflow.py
│   │   ├── custom_field.py
│   │   ├── sprint.py
│   │   ├── board.py
│   │   ├── label.py
│   │   ├── time_log.py
│   │   ├── notification.py
│   │   └── webhook.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   ├── organization_service.py
│   │   ├── project_service.py
│   │   ├── epic_service.py
│   │   ├── ticket_service.py
│   │   ├── workflow_service.py
│   │   ├── custom_field_service.py
│   │   ├── sprint_service.py
│   │   ├── board_service.py
│   │   ├── search_service.py      # PostgreSQL FTS queries
│   │   ├── notification_service.py
│   │   ├── webhook_service.py
│   │   └── storage_service.py     # S3 presigned URL generation
│   ├── websocket/
│   │   ├── __init__.py
│   │   ├── manager.py             # Connection registry, Redis pub/sub bridge
│   │   ├── handlers.py            # Message routing
│   │   └── events.py              # Event type definitions
│   └── tasks/
│       ├── __init__.py
│       ├── celery_app.py          # Celery configuration
│       ├── webhook_tasks.py       # Webhook delivery with retries
│       └── notification_tasks.py  # Notification fanout
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/                  # Migration scripts
├── tests/
│   ├── conftest.py                # Fixtures: test DB, test client, auth mocks
│   ├── api/
│   │   └── v1/                    # Endpoint tests mirroring endpoint structure
│   ├── services/                  # Service layer unit tests
│   └── models/                    # Model unit tests
├── alembic.ini
├── Dockerfile
├── requirements.txt
├── requirements-dev.txt
└── pyproject.toml
```

### Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── main.ts                    # App bootstrap, plugin registration
│   ├── App.vue                    # Root component
│   ├── api/
│   │   ├── client.ts              # Axios instance, interceptors, base URL
│   │   ├── auth.ts                # OIDC token management
│   │   ├── organizations.ts       # Org API functions
│   │   ├── projects.ts            # Project API functions
│   │   ├── epics.ts
│   │   ├── tickets.ts
│   │   ├── comments.ts
│   │   ├── workflows.ts
│   │   ├── custom-fields.ts
│   │   ├── sprints.ts
│   │   ├── boards.ts
│   │   ├── labels.ts
│   │   ├── time-tracking.ts
│   │   ├── reports.ts
│   │   ├── notifications.ts
│   │   └── webhooks.ts
│   ├── assets/
│   │   └── styles/
│   │       ├── main.css           # Global styles
│   │       └── theme.css          # PrimeVue theme overrides
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppSidebar.vue
│   │   │   ├── OrgSwitcher.vue
│   │   │   ├── UserAvatar.vue
│   │   │   ├── RichTextEditor.vue # TipTap wrapper
│   │   │   ├── ConfirmDialog.vue
│   │   │   └── EmptyState.vue
│   │   ├── boards/
│   │   │   ├── KanbanBoard.vue
│   │   │   ├── KanbanColumn.vue
│   │   │   ├── KanbanCard.vue
│   │   │   ├── ScrumBoard.vue
│   │   │   ├── BoardFilters.vue
│   │   │   └── SwimLane.vue
│   │   ├── tickets/
│   │   │   ├── TicketDetail.vue
│   │   │   ├── TicketForm.vue
│   │   │   ├── TicketCard.vue
│   │   │   ├── TicketList.vue
│   │   │   ├── TicketHierarchy.vue # Tree view for nested tickets
│   │   │   ├── TicketComments.vue
│   │   │   ├── TicketAttachments.vue
│   │   │   ├── TicketActivity.vue
│   │   │   ├── CustomFieldRenderer.vue
│   │   │   └── TimeLogForm.vue
│   │   ├── epics/
│   │   │   ├── EpicList.vue
│   │   │   ├── EpicDetail.vue
│   │   │   └── EpicProgress.vue
│   │   ├── sprints/
│   │   │   ├── SprintPanel.vue
│   │   │   ├── SprintPlanning.vue
│   │   │   └── SprintComplete.vue
│   │   ├── backlog/
│   │   │   ├── BacklogList.vue
│   │   │   └── BacklogFilters.vue
│   │   ├── timeline/
│   │   │   ├── GanttChart.vue
│   │   │   ├── GanttBar.vue
│   │   │   └── GanttDependency.vue
│   │   ├── reports/
│   │   │   ├── BurndownChart.vue
│   │   │   ├── VelocityChart.vue
│   │   │   ├── CumulativeFlowChart.vue
│   │   │   ├── CycleTimeChart.vue
│   │   │   └── ProjectDashboard.vue
│   │   ├── workflows/
│   │   │   ├── WorkflowEditor.vue
│   │   │   ├── StatusNode.vue
│   │   │   └── TransitionEdge.vue
│   │   ├── admin/
│   │   │   ├── OrgSettings.vue
│   │   │   ├── ProjectSettings.vue
│   │   │   ├── MemberManager.vue
│   │   │   ├── WebhookManager.vue
│   │   │   └── CustomFieldManager.vue
│   │   └── notifications/
│   │       ├── NotificationBell.vue
│   │       ├── NotificationList.vue
│   │       └── NotificationItem.vue
│   ├── composables/
│   │   ├── useAuth.ts             # OIDC flow, token access, user info
│   │   ├── useWebSocket.ts        # WebSocket connection, reconnect, event handling
│   │   ├── usePermissions.ts      # Role checks, conditional rendering
│   │   ├── useNotifications.ts    # In-app notification state
│   │   ├── usePagination.ts       # Cursor/offset pagination helpers
│   │   ├── useDebounce.ts
│   │   └── useConfirm.ts          # Confirmation dialog composable
│   ├── layouts/
│   │   ├── AppLayout.vue          # Authenticated layout: header + sidebar + main
│   │   └── AuthLayout.vue         # Unauthenticated layout: centered card
│   ├── router/
│   │   ├── index.ts               # Route definitions
│   │   └── guards.ts              # Auth guard, permission guard
│   ├── stores/
│   │   ├── auth.ts                # User session, tokens, permissions
│   │   ├── organization.ts        # Current org, org list
│   │   ├── project.ts             # Current project context
│   │   ├── ticket.ts              # Ticket list/detail state
│   │   ├── board.ts               # Board state, column ordering
│   │   ├── sprint.ts              # Sprint state
│   │   ├── notification.ts        # Notification state, unread count
│   │   └── ui.ts                  # Sidebar collapsed, theme, layout prefs
│   ├── types/
│   │   ├── index.ts               # Re-exports
│   │   ├── models.ts              # TypeScript interfaces matching backend schemas
│   │   ├── api.ts                 # API response types, pagination
│   │   └── enums.ts               # Role, status, priority enums
│   └── views/
│       ├── auth/
│       │   ├── LoginView.vue
│       │   └── CallbackView.vue   # OIDC redirect handler
│       ├── dashboard/
│       │   └── DashboardView.vue
│       ├── organizations/
│       │   ├── OrgListView.vue
│       │   └── OrgDetailView.vue
│       ├── projects/
│       │   ├── ProjectListView.vue
│       │   └── ProjectDetailView.vue
│       ├── boards/
│       │   └── BoardView.vue
│       ├── backlog/
│       │   └── BacklogView.vue
│       ├── sprints/
│       │   └── SprintView.vue
│       ├── epics/
│       │   └── EpicView.vue
│       ├── tickets/
│       │   └── TicketView.vue
│       ├── timeline/
│       │   └── TimelineView.vue
│       ├── reports/
│       │   └── ReportsView.vue
│       ├── settings/
│       │   ├── OrgSettingsView.vue
│       │   ├── ProjectSettingsView.vue
│       │   └── UserSettingsView.vue
│       └── admin/
│           └── SystemAdminView.vue
├── public/
│   └── favicon.ico
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── eslint.config.js
├── Dockerfile
└── .env.example
```

## Configuration Management

All configuration follows the [12-factor app](https://12factor.net/) methodology. Configuration is injected via environment variables, loaded by Pydantic Settings in the backend and Vite env vars in the frontend.

### Backend Configuration (`app/core/config.py`)

```python
class Settings(BaseSettings):
    # Application
    APP_NAME: str = "ProjectHub"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str  # For signing internal tokens if needed
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # Database
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host:5432/dbname
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300  # seconds

    # OIDC / Keycloak
    OIDC_ISSUER_URL: str           # https://keycloak.example.com/realms/myrealm
    OIDC_CLIENT_ID: str
    OIDC_CLIENT_SECRET: str
    OIDC_AUDIENCE: str | None = None
    OIDC_JWKS_CACHE_TTL: int = 3600

    # S3
    S3_ENDPOINT_URL: str           # https://s3.amazonaws.com or http://minio:9000
    S3_ACCESS_KEY_ID: str
    S3_SECRET_ACCESS_KEY: str
    S3_BUCKET_NAME: str = "projecthub-attachments"
    S3_PRESIGN_EXPIRY: int = 3600  # seconds

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)
```

### Frontend Configuration (`.env` files)

```
VITE_API_BASE_URL=http://localhost/api/v1
VITE_WS_URL=ws://localhost/ws
VITE_OIDC_AUTHORITY=https://keycloak.example.com/realms/myrealm
VITE_OIDC_CLIENT_ID=projecthub-frontend
VITE_OIDC_REDIRECT_URI=http://localhost:3000/auth/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=http://localhost:3000
```

## Docker Compose Architecture

### Service Definitions

```yaml
services:
  nginx:
    # Reverse proxy, routes to api + frontend
    ports: ["80:80", "443:443"]
    depends_on: [api, frontend]

  api:
    # FastAPI backend
    build: ./backend
    ports: []  # Only exposed through nginx
    depends_on: [postgres, redis]
    environment:
      - DATABASE_URL=postgresql+asyncpg://projecthub:secret@postgres:5432/projecthub
      - REDIS_URL=redis://redis:6379/0

  celery-worker:
    # Celery worker for async tasks
    build: ./backend
    command: celery -A app.tasks.celery_app worker --loglevel=info
    depends_on: [postgres, redis]

  celery-beat:
    # Celery beat for scheduled tasks
    build: ./backend
    command: celery -A app.tasks.celery_app beat --loglevel=info
    depends_on: [redis]

  frontend:
    # Vue 3 dev server (production: nginx serves static build)
    build: ./frontend
    ports: []  # Only exposed through nginx

  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: projecthub
      POSTGRES_USER: projecthub
      POSTGRES_PASSWORD: secret
    ports: ["5434:5432"]  # Host port 5434 to avoid conflicts

  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
    ports: ["6381:6379"]  # Host port 6381 to avoid conflicts

volumes:
  pgdata:
  redisdata:
```

### Network Topology

```mermaid
graph LR
    subgraph docker_network [Docker Bridge Network]
        Nginx -->|":8000"| API
        Nginx -->|":3000"| Frontend
        API -->|":5432"| Postgres
        API -->|":6379"| Redis
        CeleryWorker["Celery Worker"] -->|":5432"| Postgres
        CeleryWorker -->|":6379"| Redis
        CeleryBeat["Celery Beat"] -->|":6379"| Redis
    end

    Browser["Browser"] -->|":80 / :443"| Nginx
```

### Nginx Routing Configuration

```nginx
upstream api_backend {
    server api:8000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    # API routes
    location /api/ {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket routes
    location /ws/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Frontend (SPA)
    location / {
        proxy_pass http://frontend:3000;  # Dev mode
        # For production: serve static files directly
        # root /usr/share/nginx/html;
        # try_files $uri $uri/ /index.html;
    }
}
```

## Request Flow

### Authenticated API Request

```mermaid
sequenceDiagram
    participant Browser
    participant Nginx
    participant FastAPI
    participant AuthMiddleware as Auth Middleware
    participant Keycloak
    participant Service as Service Layer
    participant DB as PostgreSQL

    Browser->>Nginx: GET /api/v1/projects (Bearer token)
    Nginx->>FastAPI: Forward request
    FastAPI->>AuthMiddleware: Extract JWT from Authorization header
    AuthMiddleware->>Keycloak: Fetch JWKS (cached)
    AuthMiddleware->>AuthMiddleware: Validate JWT signature + claims
    AuthMiddleware->>FastAPI: Inject current_user dependency
    FastAPI->>Service: project_service.list(user, org_id)
    Service->>DB: SELECT with permission filter
    DB-->>Service: Result set
    Service-->>FastAPI: ProjectList
    FastAPI-->>Nginx: 200 JSON response
    Nginx-->>Browser: Response
```

### WebSocket Connection

```mermaid
sequenceDiagram
    participant Browser
    participant Nginx
    participant WS as WebSocket Handler
    participant Redis
    participant OtherInstance as Other API Instance

    Browser->>Nginx: WS Upgrade /ws/?token=JWT
    Nginx->>WS: Forward upgrade
    WS->>WS: Validate JWT
    WS->>WS: Register connection (user_id, subscriptions)
    WS->>Redis: SUBSCRIBE board:{board_id}

    Note over OtherInstance: Another user moves a ticket
    OtherInstance->>Redis: PUBLISH board:{board_id} event
    Redis-->>WS: Message received
    WS-->>Browser: Send event frame
```

## Error Handling Strategy

All API errors follow a consistent envelope:

```json
{
    "error": {
        "code": "TICKET_NOT_FOUND",
        "message": "Ticket PROJ-123 does not exist",
        "details": {}
    }
}
```

HTTP status codes used:
- `400` - Validation error, bad request
- `401` - Missing or invalid authentication
- `403` - Insufficient permissions
- `404` - Resource not found
- `409` - Conflict (e.g., duplicate project key)
- `422` - Unprocessable entity (Pydantic validation)
- `429` - Rate limited
- `500` - Internal server error

## Logging and Observability

- **Structured logging** via `structlog` with JSON output
- **Request ID** propagated through all log entries (middleware-injected)
- **Access logs** with method, path, status, latency, user_id
- **Celery task logs** with task_id, status, duration
- Health check endpoint at `GET /api/v1/health` returning DB and Redis connectivity status
