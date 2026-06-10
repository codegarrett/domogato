# E2E Testing with Playwright

End-to-end tests run against an isolated Docker stack with a dedicated `projecthub_e2e` database, Wiremock for custom agent skill HTTP stubs, and the **same LLM provider configuration as the main app** (OpenAI, Ollama Cloud, Azure, Anthropic, or optional local Ollama).

## Prerequisites

- Docker and Docker Compose v2
- Node.js 22+ (for Playwright locally)
- Playwright browsers: `cd frontend && npx playwright install chromium`

## First-time setup

```bash
cp .env.e2e.example .env.e2e
# Set LLM_PROVIDER, LLM_MODEL, LLM_API_KEY, LLM_BASE_URL (and EMBEDDING_*) in root .env
# — same bring-your-own-provider setup as normal development (e.g. Ollama Cloud).

make e2e-up
# Optional self-hosted Ollama instead: make e2e-up-local-ollama && make e2e-pull-models
```

## Running tests

```bash
# Full suite (resets DB + seeds + runs all projects)
cd frontend && npm run test:e2e

# Desktop only
npm run test:e2e:desktop

# Mobile layout checks
npm run test:e2e:mobile

# AI tests (LLM configured in .env, 120s timeout; auto-skipped if not configured)
npm run test:e2e:ai

# Debug single spec
npx playwright test e2e/tickets/ticket-crud.spec.ts --headed --debug

# Interactive UI mode
npm run test:e2e:ui

# HTML report after a run
npm run test:e2e:report
```

## Stack management

| Command | Description |
|---------|-------------|
| `make e2e-up` | Start dev stack with E2E overlay |
| `make e2e-up-local-ollama` | Same, plus optional local Ollama container |
| `make e2e-down` | Tear down stack |
| `make e2e-reset` | Reset DB + re-seed only |
| `make e2e-pull-models` | Pre-pull models into local Ollama (requires `e2e-up-local-ollama`) |
| `make e2e-test` | Up + wait healthy + run full suite |

## Seed data reference

Written to `frontend/e2e/.seed-state.json` on each global setup:

| Entity | Value |
|--------|-------|
| Admin | `e2e-admin@domogato.test` / `E2eAdmin!Pass123` |
| Member | `e2e-user@domogato.test` / `E2eUser!Pass123` |
| Organization | `E2E Org` (`e2e-org`) |
| Project | `E2E` key |
| Sprint | `E2E Sprint 1` (active) |
| Tickets | 5 seeded across statuses |
| KB | Space `e2e-knowledge`, pages including semantic search needle |
| Agent skill | `e2e-weather` → Wiremock |
| Issue report | `E2E Issue Report` |

## Environment variables

See [`.env.e2e.example`](../.env.e2e.example). Key vars:

- `E2E_BASE_URL` — default `http://localhost` (nginx)
- `LLM_*` / `EMBEDDING_*` — same as main app; E2E compose passes them through to the API
- `E2E_SKIP_AI=true` — force-skip all `@ai` tests regardless of provider config
- `E2E_SKIP_RESET=true` — reuse existing DB seed
- `E2E_SCREENSHOTS=on` — capture all screenshots (layout project)

## Debug workflow

1. `make e2e-up`
2. `cd frontend && npm run test:e2e:desktop -- e2e/tickets/ticket-crud.spec.ts`
3. On failure: `npm run test:e2e:report` → open trace + screenshot
4. Fix code, re-run single spec
5. `make e2e-down` when done

## Project structure

```
frontend/e2e/
├── e2e.config.ts       # Typed config + seed loader
├── global-setup.ts     # DB reset, AI config probe, auth storageState
├── fixtures/           # test.extend helpers
├── pages/              # Page objects
├── helpers/            # Scroll/screenshot/API utilities
├── auth/               # Login, register, logout
├── core/               # Orgs, projects, workflows
├── tickets/            # CRUD, list, detail, import
├── planning/           # Board, backlog, sprints, timeline
├── kb/                 # Spaces, pages, search
├── ai/                 # Chat, tools, skills, embeddings
├── admin/              # Users, auth, a11y, embeddings
├── issue-reports/      # Queue + detail
├── layout/             # Responsive overflow + screenshots
└── rbac/               # Member access tests
```

## Adding new tests

1. Add seed data to `backend/scripts/e2e_seed.py` if needed
2. Create or extend a page object in `frontend/e2e/pages/`
3. Write spec using `import { test, expect } from '../fixtures'`
4. Tag with `@smoke`, `@ai`, `@layout`, or `@rbac` in describe name
5. Add `data-testid` only when role/text selectors are unstable

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Auth failures | Delete `frontend/e2e/.auth/` and re-run (global-setup recreates) |
| 502 from nginx after reset | `docker compose restart nginx` (API container was recreated) |
| AI tests skipped unexpectedly | Ensure `LLM_*` is set in `.env` and API `/ai/config` shows `is_configured: true` |
| Local Ollama slow first run | `make e2e-up-local-ollama && make e2e-pull-models` |
| Stale seed | `make e2e-reset` or unset `E2E_SKIP_RESET` |
| API not ready | Wait for `curl http://localhost/api/v1/health` |
| MinIO attachments | Ensure `createbuckets` service completed |

Mobile layout tests capture screenshots on each route; horizontal-scroll assertions run on desktop only (tables often overflow slightly on 393px viewports).
