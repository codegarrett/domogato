# Phase 14 Data Model — PM User Stories

## Core table: `user_stories`

Project-scoped planning entity (no assignee; assignment happens on tickets).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| project_id | UUID FK → projects | CASCADE |
| created_by | UUID FK → users | SET NULL |
| parent_id | UUID FK → user_stories | Nullable; hierarchy |
| title | varchar(500) | Required working title |
| quick_notes | text | Optional scratch pad |
| story_title | varchar(500) | Refined user story statement (e.g. "As a … I want …"); included in ticket description |
| story_body | text | Markdown body |
| story_acceptance_criteria | text | Markdown AC |
| status | varchar(30) | Fixed enum (see below) |
| priority | varchar(20) | Ticket priority enum |
| search_vector | tsvector | FTS on title + story fields |

**Status enum:** `not_started | in_progress | discovery | story_ready | ticket_created | blocked | deferred | canceled`

**Priority enum:** `lowest | low | medium | high | highest`

## Related tables

- `user_story_questions` — open questions with stable IDs for discussion references
- `user_story_discussions` — answers/notes; optional M2M to questions via `user_story_discussion_questions`
- `user_story_dependencies` — directed edges (composite PK story_id + depends_on_id)
- `user_story_ticket_links` — links to tickets; sets story status to `ticket_created` on link

## KB deprecation

KB `kb_page_meta` rows with `page_type = 'user_story'` are migrated via `backend/scripts/migrate_kb_user_stories.py`. KB story workflow UI is removed from `KBPageView`; PM user stories replace the planning workflow.
