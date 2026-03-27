# Phase 2 Architecture Changes

## Overview

Phase 2 introduces infrastructure additions (MinIO, Celery Beat), wires the existing event bus to domain services, activates WebSocket real-time updates, adds a Redis caching layer, and brings in frontend testing infrastructure. This document covers the architectural changes and new components.

For the base architecture, see `docs/phase_1/ARCHITECTURE.md`.

---

## Infrastructure Changes

### Docker Compose Additions

```
Phase 1 services:  postgres, redis, api, celery-worker, frontend, nginx
Phase 2 additions: minio, createbuckets, celery-beat
```

#### MinIO (S3-compatible storage)

```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  ports:
    - "9002:9000"    # S3 API (host 9002 -> container 9000, avoids port conflict)
    - "9003:9001"    # Console (host 9003 -> container 9001)
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  volumes:
    - miniodata:/data
  healthcheck:
    test: ["CMD", "mc", "ready", "local"]
    interval: 10s
    timeout: 5s
    retries: 5

createbuckets:
  image: minio/mc:latest
  depends_on:
    minio:
      condition: service_healthy
  entrypoint: >
    /bin/sh -c "
    mc alias set myminio http://minio:9000 minioadmin minioadmin;
    mc mb myminio/projecthub-attachments --ignore-existing;
    exit 0;
    "
```

#### Celery Beat

```yaml
celery-beat:
  build:
    context: ./backend
    target: dev
  command: celery -A app.tasks.celery_app beat --loglevel=info
  volumes:
    - ./backend:/app
  depends_on:
    redis:
      condition: service_healthy
    postgres:
      condition: service_healthy
  environment:
    # same env as api and celery-worker
```

---

## Event System Architecture

### Current State (Phase 1)

The event bus (`backend/app/core/events.py`) defines event types and a simple in-process pub/sub mechanism, but no services call `publish()`. The WebSocket manager (`backend/app/websocket/manager.py`) exists but receives no domain events. The notification service creates notifications directly, not through the event bus.

### Phase 2 Event Flow

```
                                    ┌──────────────────┐
                                    │  Redis Pub/Sub   │
                                    │  (cross-instance) │
                                    └────────┬─────────┘
                                             │
    ┌─────────────┐    publish()    ┌────────▼─────────┐    broadcast     ┌──────────────┐
    │ API Endpoint │ ──────────────▶│  Event Handlers  │ ──────────────▶  │ WS Manager   │
    │ (tickets,    │                │  (event_handlers │                  │ (per-channel  │
    │  comments,   │                │   .py)           │                  │  broadcast)   │
    │  sprints)    │                └────────┬─────────┘                  └──────────────┘
    └─────────────┘                          │
                                             │ enqueue
                                             ▼
                                    ┌──────────────────┐
                                    │  Celery Tasks    │
                                    │  (webhook_tasks) │
                                    └──────────────────┘
```

### Event Handler Registration

A new module `backend/app/core/event_handlers.py` subscribes to all event types at app startup:

```python
from app.core.events import subscribe, EVENT_TICKET_CREATED, ...
from app.websocket.manager import manager

async def on_ticket_created(ticket_id, project_id, board_id, actor_id, **kwargs):
    payload = {"type": "event", "event": "ticket.created", "data": {...}}
    # Broadcast to board and project channels
    await manager.broadcast_to_channel(f"board:{board_id}", payload)
    await manager.broadcast_to_channel(f"project:{project_id}", payload)
    # Publish to Redis Pub/Sub for other instances
    await redis_publish(f"events:{project_id}", payload)
    # Enqueue webhook delivery
    webhooks = await get_matching_webhooks(project_id, "ticket.created")
    for wh in webhooks:
        deliver_webhook.delay(wh.id, payload)

# Register at startup
subscribe(EVENT_TICKET_CREATED, on_ticket_created)
```

### Redis Pub/Sub Bridge

For horizontal scaling (multiple API instances), events are also published to Redis Pub/Sub channels. Each API instance subscribes to these channels on startup and broadcasts received events to its local WebSocket connections.

```
API Instance 1                    Redis                    API Instance 2
┌──────────┐    PUBLISH    ┌──────────────┐    MESSAGE    ┌──────────┐
│ Event Bus │ ───────────▶ │ Channel:     │ ───────────▶  │ WS Mgr   │
│           │              │ events:{pid} │               │ broadcast │
└──────────┘               └──────────────┘               └──────────┘
```

---

## File Attachment Flow

### Upload Flow (3-step presigned URL pattern)

```
Browser                    API                     MinIO (S3)
  │                         │                         │
  │ POST /presign           │                         │
  │ {filename, type, size}  │                         │
  │────────────────────────▶│                         │
  │                         │ generate_presigned_url  │
  │                         │────────────────────────▶│
  │  {upload_url, s3_key}   │                         │
  │◀────────────────────────│                         │
  │                         │                         │
  │ PUT upload_url          │                         │
  │ [file bytes]            │                         │
  │────────────────────────────────────────────────▶  │
  │  200 OK                 │                         │
  │◀────────────────────────────────────────────────  │
  │                         │                         │
  │ POST /attachments       │                         │
  │ {filename, s3_key, ...} │                         │
  │────────────────────────▶│                         │
  │                         │ create attachment row   │
  │  {attachment object}    │                         │
  │◀────────────────────────│                         │
```

### Download Flow

```
Browser                    API                     MinIO (S3)
  │                         │                         │
  │ GET /download           │                         │
  │────────────────────────▶│ generate_presigned_get  │
  │                         │────────────────────────▶│
  │  {download_url}         │                         │
  │◀────────────────────────│                         │
  │                         │                         │
  │ GET download_url        │                         │
  │────────────────────────────────────────────────▶  │
  │  [file bytes]           │                         │
  │◀────────────────────────────────────────────────  │
```

### S3 Key Structure

```
{org_id}/{project_id}/{ticket_id}/{attachment_id}/{original_filename}
```

This structure allows:
- Bulk deletion of all attachments for a ticket/project/org
- S3 lifecycle policies per organization
- Access logging scoped to organizational boundaries

---

## Caching Layer

### Architecture

```
Request ──▶ Service Layer ──▶ Cache Service ──▶ Redis
                                    │               │
                                    │  cache miss   │
                                    ▼               │
                                Database ◀──────────┘
                                    │               (set cache)
                                    ▼
                                Response
```

### Cache Service Design

```python
class CacheService:
    async def get_cached(key: str, loader: Callable, ttl: int = 300) -> Any:
        """Try Redis first, fall back to loader function on miss or error."""
        try:
            cached = await redis.get(key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass  # Redis down, fall through to DB

        result = await loader()
        try:
            await redis.set(key, json.dumps(result), ex=ttl)
        except Exception:
            pass  # Best-effort caching

        return result

    async def invalidate(pattern: str) -> None:
        """Delete cache keys matching pattern."""
        try:
            keys = await redis.keys(pattern)
            if keys:
                await redis.delete(*keys)
        except Exception:
            pass
```

### Cache Keys

| Data | Key Pattern | TTL | Invalidation Trigger |
|------|-------------|-----|---------------------|
| Workflow definition | `workflow:{id}` | 5 min | Workflow update/delete |
| Workflow list (per org) | `workflows:org:{org_id}` | 5 min | Any workflow CRUD in org |
| Project settings | `project:{id}` | 5 min | Project update |
| Organization data | `org:{id}` | 5 min | Org update |

---

## Daily Snapshot System (Celery Beat)

### Purpose

The cumulative flow diagram (CFD) requires historical ticket counts by status category. Rather than computing from activity logs (expensive and imprecise), a daily snapshot captures the exact state.

### Celery Beat Schedule

```python
beat_schedule = {
    "daily-cfd-snapshot": {
        "task": "app.tasks.snapshot_tasks.daily_cfd_snapshot",
        "schedule": crontab(hour=0, minute=0),  # Midnight UTC
    },
}
```

### Snapshot Task

For each active (non-archived) project:
1. Count tickets grouped by `workflow_status.category` (to_do, in_progress, done)
2. Store as a `DailySnapshot` row: `{project_id, date, data: {to_do: N, in_progress: M, done: K}}`

The CFD report service reads snapshots in a date range instead of recomputing from activity logs.

---

## Frontend Testing Architecture

### Vitest (Unit Tests)

```
frontend/
├── src/
│   ├── __tests__/
│   │   ├── useWebSocket.test.ts
│   │   ├── useKeyboardShortcuts.test.ts
│   │   ├── authStore.test.ts
│   │   ├── apiClient.test.ts
│   │   ├── CommandPalette.test.ts
│   │   └── NotificationBell.test.ts
│   └── ...
├── vite.config.ts          (test config block)
└── package.json            (test script)
```

- Test runner: Vitest (integrates with Vite config)
- DOM environment: jsdom
- Component testing: @vue/test-utils
- Mocking: Vitest built-in mocking

### Playwright (E2E Tests)

```
frontend/
├── e2e/
│   ├── auth.spec.ts
│   ├── organizations.spec.ts
│   ├── projects.spec.ts
│   ├── tickets.spec.ts
│   ├── board.spec.ts
│   ├── sprints.spec.ts
│   ├── reports.spec.ts
│   └── search.spec.ts
├── playwright.config.ts
└── package.json
```

- Runs against the full Docker Compose stack (dev auth bypass mode)
- Base URL: `http://localhost:3035`
- Browsers: Chromium (primary), Firefox (cross-check)
- Moderate coverage: critical user journeys + CRUD for all major entities

---

## Chart Library (Phase 2.8)

### Chart.js + vue-chartjs

Selected for:
- Lightweight (~60KB gzipped)
- Good PrimeVue ecosystem compatibility
- Built-in responsive design, tooltips, animations
- Sufficient for all chart types needed (line, bar, pie, scatter, stacked area)

### Chart Components

```
frontend/src/components/charts/
├── LineChart.vue           (burndown, burnup)
├── BarChart.vue            (velocity)
├── StackedAreaChart.vue    (cumulative flow)
├── ScatterChart.vue        (cycle time distribution)
└── PieChart.vue            (status/priority breakdown)
```

Each component:
- Accepts `data` and `options` props
- Auto-detects dark/light theme from PrimeVue
- Responsive sizing via container
- Emits `click` events for drill-down navigation
