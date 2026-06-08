# Phase 14 API Design — PM User Stories

All endpoints are project-scoped under `/api/v1/projects/{project_id}/user-stories` unless noted.

## Phase 1 — CRUD

| Method | Path | Min role |
|--------|------|----------|
| POST | `/user-stories` | REPORTER |
| GET | `/user-stories` | GUEST |
| GET | `/user-stories/{story_id}` | GUEST |
| PATCH | `/user-stories/{story_id}` | REPORTER (own title/notes) / DEVELOPER (any) |
| DELETE | `/user-stories/{story_id}` | MAINTAINER (sets status=canceled) |

**Create (Phase 1):** `{ "title": "..." }` — server sets `status=not_started`, `priority=medium`.

**List filters:** `status`, `priority`, `parent_id`, `top_level_only`, `q` (FTS).

## Phase 2 — Discovery

| Method | Path | Min role |
|--------|------|----------|
| POST | `.../questions` | REPORTER |
| DELETE | `.../questions/{question_id}` | DEVELOPER |
| POST | `.../discussions` | REPORTER |
| GET | `.../children` | GUEST |
| POST | `.../dependencies` | DEVELOPER |
| DELETE | `.../dependencies/{depends_on_id}` | DEVELOPER |

## Phase 3 — Tickets

| Method | Path | Min role |
|--------|------|----------|
| POST | `/user-stories/create-tickets` | DEVELOPER |
| GET | `/tickets/{ticket_id}/user-stories` | GUEST |

**Create tickets:** requires `story_title`, `story_body`, `story_acceptance_criteria` on each story (422 with field hints if missing).

**AI assist contexts:** `user_story_create`, `user_story_refine` via `/api/v1/ai/assist/generate`.

## Events

- `user_story.created`
- `user_story.updated`
- `user_story.tickets_created`
