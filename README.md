# Domogato

Open-source project management platform with integrated knowledge base and AI assistant. Built for teams that need tickets, sprints, boards, wikis, and smart search in one place.

**License:** [BSL 1.1](LICENSE) — free for organizations under $2M revenue. Converts to GPL v3 after 3 years.

## Features

- **Ticket Management** — Create, assign, prioritize, and track tickets with custom workflows
- **Kanban Boards** — Drag-and-drop boards with configurable columns per workflow status
- **Sprints & Backlog** — Plan sprints, manage backlogs, track velocity with burndown charts
- **Knowledge Base** — Nested wiki spaces with rich text editing, version history, and threaded comments
- **AI Assistant** — Chat-based AI agent that can search your KB, create tickets, and answer questions
- **Semantic Search** — Vector embeddings for KB content power natural language search
- **Global Search** — Unified search across tickets, KB pages, and comments (Ctrl+K)
- **Email Notifications** — Instant or digest email delivery with per-event preferences
- **Ticket Watchers** — Follow tickets you care about and get notified on all changes
- **Saved Views** — Save and recall filtered ticket list configurations
- **Dashboard** — Personal "My Work" view with assigned tickets, overdue items, sprint progress
- **Custom Fields** — Define per-project custom fields on tickets
- **Time Tracking** — Log time against tickets with reporting
- **Webhooks** — Push events to external systems
- **RBAC** — Role-based access control at organization and project levels
- **SSO** — OpenID Connect integration (Keycloak, Auth0, etc.) or built-in local auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, PrimeVue, Pinia, Vue Router, Vue-i18n |
| Backend | FastAPI, SQLAlchemy 2.x (async), Alembic |
| Database | PostgreSQL 16 + pgvector |
| Cache/Broker | Redis 7 |
| Task Queue | Celery |
| File Storage | S3-compatible (MinIO bundled for dev) |
| AI/LLM | OpenAI, Anthropic, Ollama, Azure OpenAI |
| Reverse Proxy | Nginx |
| Containerization | Docker Compose |

## Quick Start (Development)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- Git

### 1. Clone and configure

```bash
git clone https://github.com/your-org/domogato.git
cd domogato
cp .env.example .env
```

Edit `.env` with your settings. For local development the defaults work out of the box — you only need to set API keys if you want AI features.

### 2. Start the stack

```bash
docker compose up -d --build
```

This starts: PostgreSQL, Redis, MinIO, API server, Celery worker, Celery beat, frontend dev server, and Nginx.

### 3. Access the app

| Service | URL |
|---------|-----|
| Application | http://localhost |
| Frontend (direct) | http://localhost:3035 |
| MinIO Console | http://localhost:9003 |

The first user to register becomes the system admin. Database migrations run automatically on API startup.

## Production Deployment

### 1. Configure environment

```bash
cp .env.example .env
```

Set **all** `REQUIRED` variables in `.env`. At minimum:
- `POSTGRES_PASSWORD` — strong random password
- `SECRET_KEY` — `openssl rand -hex 32`
- `ALLOWED_ORIGINS` — your domain as a JSON array
- `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`

See `.env.example` for detailed documentation on every setting.

### 2. Deploy

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 3. Optional: Enable AI features

Set `LLM_PROVIDER`, `LLM_MODEL`, and `LLM_API_KEY` in `.env` to enable the AI assistant. Set `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, and `EMBEDDING_API_KEY` for semantic KB search.

### 4. Optional: Enable email notifications

Set `SMTP_ENABLED=true` and configure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` in `.env`.

## Project Structure

```
domogato/
├── backend/             # FastAPI application
│   ├── alembic/         # Database migrations
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── core/        # Config, events, permissions
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   ├── tasks/       # Celery tasks
│   │   ├── templates/   # Email templates
│   │   └── websocket/   # WebSocket manager
│   └── tests/
├── frontend/            # Vue 3 SPA
│   ├── src/
│   │   ├── api/         # API client modules
│   │   ├── components/  # Reusable Vue components
│   │   ├── views/       # Page-level views
│   │   ├── stores/      # Pinia state stores
│   │   ├── composables/ # Vue composables
│   │   ├── i18n/        # Internationalization (en, es)
│   │   └── router/      # Vue Router config
│   └── e2e/             # Playwright tests
├── nginx/               # Reverse proxy config
├── docs/                # Phase documentation
├── docker-compose.yml       # Development stack
├── docker-compose.prod.yml  # Production stack
└── .env.example             # Configuration reference
```

## Development

### Backend

The API auto-reloads on file changes (uvicorn with `--reload`). To run a migration:

```bash
docker compose exec api alembic upgrade head
```

### Frontend

The Vue dev server runs with HMR. Hot reload is automatic.

### Running tests

```bash
# Backend
docker compose exec api pytest

# Frontend
docker compose exec frontend npm test
```

## License

Licensed under the [Business Source License 1.1](LICENSE).

- **Free** for development, testing, and production use by organizations with less than $2,000,000 in annual revenue.
- Converts to **GPL v3** three years after each version's release date.
- Commercial licenses available — contact kgarrett@innosmash.com.

Copyright © 2026 Kelly Garrett.
