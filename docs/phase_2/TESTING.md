# Phase 2 Testing Strategy

## Overview

Phase 1 established 138 backend pytest tests. Phase 2 grew this to **179 passing tests** covering all API endpoints with async fixtures and test database isolation. Phase 2 extends testing in four directions:

1. **Backend unit tests** for all new Phase 2 endpoints and services
2. **Frontend unit tests** via Vitest for composables, stores, and key components
3. **End-to-end tests** via Playwright for critical user journeys
4. **RBAC permission matrix tests** for comprehensive role-based access verification

---

## Backend Testing (pytest)

### Existing Infrastructure

- Framework: pytest with pytest-asyncio
- Database: isolated `projecthub_test` database, schema recreated per session, transactions rolled back per test
- HTTP client: httpx AsyncClient with ASGITransport
- Fixtures: `db_session`, `client` (authenticated), `admin_client`, `anon_client` (401)
- Redis: FakeRedis mock

### New Test Files (Phases 2.1-2.9)

| File | Phase | Coverage |
|------|-------|----------|
| `tests/api/v1/test_performance.py` | 2.7 | CFD snapshot usage, project caching, workflow caching |
| `tests/api/v1/test_reports.py` (extended) | 2.8 | Sprint report, CSV exports (velocity, cycle-time, CFD), audit log endpoint with action filter |
| `tests/api/v1/test_rbac.py` | 2.9 | 13 tests: role resolution unit tests (8) + API access matrix tests (5) |
| `tests/tasks/test_snapshot_tasks.py` | 2.7 | Daily snapshot creation with category aggregation, idempotency |

### Test Patterns

**Attachment tests** require mocking S3. Use `unittest.mock.AsyncMock` to patch `aioboto3.Session`:

```python
@pytest.fixture
def mock_s3(monkeypatch):
    mock_client = AsyncMock()
    mock_client.generate_presigned_url.return_value = "https://minio/presigned"
    # Patch the storage service's S3 client creation
    monkeypatch.setattr("app.services.storage_service.get_s3_client", lambda: mock_client)
    return mock_client
```

**Dependency cycle detection** tests should cover:
- Direct cycle: A blocks B, B blocks A
- Transitive cycle: A blocks B, B blocks C, C blocks A
- Valid chains: A blocks B, B blocks C (no cycle)
- Self-reference: A blocks A

**Event handler tests** should verify that publishing an event results in:
- WebSocket manager's `broadcast_to_channel` called with correct channel and payload
- Celery task `deliver_webhook.delay` called for matching webhooks

---

## RBAC Permission Matrix (Phase 2.9)

### Test Structure

A single test file `tests/api/v1/test_rbac.py` with parametrized tests covering all role combinations.

### Roles Under Test

| Role | Scope | Description |
|------|-------|-------------|
| System Admin | Global | Full access to everything |
| Org Owner | Organization | Created the org, full org access |
| Org Admin | Organization | Can manage org settings, members, projects |
| Org Member | Organization | Can view org, access internal projects |
| Project Owner | Project | Full project access |
| Project Maintainer | Project | Can manage workflows, labels, custom fields, members |
| Project Developer | Project | Can create/edit tickets, comments, time logs |
| Project Reporter | Project | Can create own tickets, cannot edit others |
| Project Guest | Project | Read-only access |
| Non-Member | None | No project access (unless project is internal visibility) |

### Endpoint Coverage Matrix

Each row is tested for allow/deny across all roles:

**Organization endpoints:**
- Create org (system admin only)
- Update org (org admin+)
- Add/remove org members (org admin+)
- View org (org member+)

**Project endpoints:**
- Create project (org admin+)
- Update project (project maintainer+)
- Archive/unarchive project (project owner+)
- Add/remove project members (project maintainer+)
- View project (project guest+ for private, org member+ for internal)

**Ticket endpoints:**
- Create ticket (reporter+)
- Update own ticket (reporter+)
- Update any ticket (developer+)
- Delete ticket (maintainer+)
- Transition status (reporter+ own, developer+ any)
- Bulk update (developer+)

**Comment endpoints:**
- Create comment (reporter+)
- Edit own comment (reporter+)
- Edit any comment (maintainer+)
- Delete comment (author or maintainer+)

**Attachment endpoints:**
- Upload (reporter+)
- Download (guest+)
- Delete own upload (reporter+)
- Delete any upload (maintainer+)

**Dependency endpoints:**
- View dependencies (guest+)
- Add/remove dependencies (developer+)

**Workflow endpoints:**
- View workflows (org member+)
- Create/edit/delete workflows (org admin+)

**Sprint/board/report endpoints:**
- View (guest+)
- Create/manage sprints (maintainer+)

### Test Implementation Pattern

```python
import pytest
from httpx import AsyncClient

ROLE_CONFIGS = [
    ("system_admin", True, True, True),
    ("org_admin", True, True, False),
    ("org_member", True, False, False),
    ("project_owner", True, True, True),
    ("project_maintainer", True, True, False),
    ("project_developer", True, False, False),
    ("project_reporter", True, False, False),
    ("project_guest", True, False, False),
    ("non_member", False, False, False),
]

@pytest.mark.asyncio
@pytest.mark.parametrize("role,can_view,can_edit,can_admin", ROLE_CONFIGS)
async def test_ticket_access(role, can_view, can_edit, can_admin, ...):
    client = await create_client_with_role(role, ...)

    # View
    resp = await client.get(f"/api/v1/tickets/{ticket_id}")
    assert (resp.status_code == 200) == can_view

    # Edit
    resp = await client.patch(f"/api/v1/tickets/{ticket_id}", json={...})
    assert (resp.status_code == 200) == can_edit

    # Delete
    resp = await client.delete(f"/api/v1/tickets/{ticket_id}")
    assert (resp.status_code in (200, 204)) == can_admin
```

### Role Inheritance Tests

Verify that:
- System admin overrides all org/project roles
- Org admin gets implicit maintainer role on all projects in that org
- Org owner gets implicit admin role
- Higher project roles include all permissions of lower roles

---

## Frontend Unit Testing (Vitest)

### Setup

```bash
npm install -D vitest @vue/test-utils jsdom
```

**vite.config.ts additions:**

```typescript
export default defineConfig({
  // ... existing config
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/**/*.d.ts', 'src/main.ts'],
    },
  },
})
```

**package.json script:**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Test Files

| File | Tests |
|------|-------|
| `src/api/__tests__/reports.test.ts` | Reports and audit API module export verification |
| `src/components/__tests__/PieChart.test.ts` | PieChart rendering with data and custom options |
| `src/components/__tests__/BarChart.test.ts` | BarChart rendering with data |
| `src/composables/__tests__/useKeyboardShortcuts.test.ts` | Shortcut registration on mount |

### Mocking Strategy

- **API calls:** Mock axios via `vi.mock('@/api/client')`
- **Router:** Use `createRouter` with `createMemoryHistory` for in-memory routing
- **PrimeVue:** Global mock plugin that stubs components
- **WebSocket:** Mock the native WebSocket class
- **i18n:** Use actual i18n instance with test locale

### Example Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CommandPalette from '@/components/common/CommandPalette.vue'

describe('CommandPalette', () => {
  it('opens on Ctrl+K', async () => {
    const wrapper = mount(CommandPalette, { global: { plugins: [...] } })

    await wrapper.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.cmd-palette').exists()).toBe(true)
  })

  it('navigates results with arrow keys', async () => {
    // ... setup with mock results
    const input = wrapper.find('.cmd-palette-input input')
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('.cmd-palette-result.selected').text()).toContain('Result 2')
  })
})
```

---

## End-to-End Testing (Playwright)

### Setup

```bash
npm install -D @playwright/test
npx playwright install chromium firefox
```

**playwright.config.ts:**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3035',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: undefined,
})
```

### Test Suites (Moderate Coverage)

#### `e2e/smoke.spec.ts` (implemented)
- Login page loads and shows sign-in content
- Unauthenticated users redirected to login
- Dashboard accessible with dev auth bypass
- Organizations page navigable

### Page Object Pattern

```typescript
// e2e/pages/TicketListPage.ts
import { Page } from '@playwright/test'

export class TicketListPage {
  constructor(private page: Page) {}

  async navigate(projectId: string) {
    await this.page.goto(`/projects/${projectId}/tickets`)
  }

  async createTicket(title: string) {
    await this.page.click('button:has-text("New Ticket")')
    await this.page.fill('input[placeholder*="title"]', title)
    await this.page.click('button:has-text("Create")')
  }

  async getTicketCount() {
    return this.page.locator('.ticket-row').count()
  }
}
```

### Data Setup

E2E tests use a fresh database state. A helper script or API calls at the start of each test suite create the necessary org/project/workflow/tickets data. The dev auth bypass provides automatic authentication.

---

## OpenAPI Documentation Polish (Phase 2.9)

### Approach

Add `description` and `examples` to all Pydantic schemas:

```python
class TicketCreate(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Title of the ticket",
        examples=["Implement user login flow"],
    )
    ticket_type: str = Field(
        default="task",
        description="Type of ticket: story, bug, task, epic, subtask",
        examples=["story", "bug"],
    )
```

Add route metadata:

```python
@router.post(
    "/projects/{project_id}/tickets",
    response_model=TicketRead,
    status_code=201,
    summary="Create a new ticket",
    description="Creates a ticket in the specified project. The ticket is assigned "
    "the project's default workflow and gets an auto-incremented ticket number.",
    tags=["Tickets"],
)
```

Add tag grouping in router:

```python
tags_metadata = [
    {"name": "Health", "description": "Health check endpoints"},
    {"name": "Organizations", "description": "Organization management"},
    {"name": "Projects", "description": "Project management"},
    {"name": "Tickets", "description": "Ticket CRUD and lifecycle"},
    {"name": "Comments", "description": "Ticket comments"},
    {"name": "Attachments", "description": "File attachments"},
    {"name": "Dependencies", "description": "Ticket dependencies"},
    {"name": "Workflows", "description": "Workflow engine"},
    {"name": "Sprints", "description": "Sprint management"},
    {"name": "Boards", "description": "Kanban and Scrum boards"},
    {"name": "Labels", "description": "Ticket labels"},
    {"name": "Custom Fields", "description": "Custom field definitions and values"},
    {"name": "Time Tracking", "description": "Work time logging"},
    {"name": "Notifications", "description": "In-app notifications"},
    {"name": "Webhooks", "description": "Outbound webhook management"},
    {"name": "Reports", "description": "Project analytics and reports"},
    {"name": "Timeline", "description": "Gantt timeline view"},
    {"name": "Users", "description": "User management"},
]
```

### Coverage Target

All schemas in `backend/app/schemas/` should have:
- `Field(description=...)` on every field
- At least one `examples` value for non-obvious fields
- `model_config = ConfigDict(json_schema_extra={...})` for complex request bodies

All endpoints should have:
- `summary` (short, action-oriented)
- `description` (when behavior is non-obvious)
- `tags` for grouping

---

## Test Execution

### Backend

```bash
# Run all backend tests (inside container)
docker compose exec api python -m pytest tests/ -v

# Run specific test file
docker compose exec api python -m pytest tests/api/v1/test_rbac.py -v

# Run with coverage
docker compose exec api python -m pytest tests/ --cov=app --cov-report=html
```

### Frontend Unit Tests

```bash
# Run once
cd frontend && npm run test

# Watch mode
cd frontend && npm run test:watch
```

### Frontend E2E Tests

```bash
# Ensure docker compose is running first
cd frontend && npx playwright test

# Run specific suite
cd frontend && npx playwright test e2e/tickets.spec.ts

# With UI mode (for debugging)
cd frontend && npx playwright test --ui
```

### CI Considerations (Future)

When CI is set up:
1. Backend tests run in a container with test database
2. Frontend unit tests run without Docker (happy-dom)
3. E2E tests require the full Docker Compose stack
4. Recommended: run backend + frontend unit tests on every PR, E2E on merge to main
