# Phase 3 Architecture

## Overview

Phase 3 introduces the Knowledge Base (KB) feature, a Confluence-style documentation system integrated into the project management platform. This document covers the architectural decisions, component design, and integration patterns.

For the base architecture, see `docs/phase_1/ARCHITECTURE.md`. For Phase 2 additions, see `docs/phase_2/ARCHITECTURE.md`.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Vue.js)                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Space List   │  │ Page Tree    │  │ Page Editor   │  │
│  │ View         │  │ Sidebar      │  │ (TipTap +     │  │
│  │              │  │ (recursive)  │  │  Markdown)    │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Version      │  │ Threaded     │  │ Template      │  │
│  │ History +    │  │ Comments     │  │ Picker        │  │
│  │ Diff Viewer  │  │              │  │               │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                      │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ KB Space     │  │ KB Page      │  │ KB Version    │  │
│  │ Router       │  │ Router       │  │ Router        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘  │
│         │                 │                  │           │
│  ┌──────┴─────────────────┴──────────────────┴────────┐  │
│  │              KB Service Layer                       │  │
│  │  kb_service, kb_version_service, kb_comment_service │  │
│  │  kb_attachment_service, kb_template_service         │  │
│  │  kb_search_service                                  │  │
│  └──────┬─────────────────┬──────────────────┬────────┘  │
│         │                 │                  │           │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌────────▼────────┐  │
│  │ PostgreSQL  │  │ S3 (MinIO)  │  │ Permissions     │  │
│  │ (6 tables)  │  │ (files)     │  │ (reuse existing)│  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Access Control

The Knowledge Base reuses the existing project-level RBAC system. No new permission model is needed.

### Role Mapping

| Action | Minimum Role | Notes |
|--------|-------------|-------|
| View spaces, pages, comments | Guest | Read-only access |
| Create/edit pages | Developer | Content authoring |
| Delete pages | Maintainer | Destructive action |
| Create/manage spaces | Maintainer | Space administration |
| Archive/delete spaces | Owner | Space lifecycle |
| Create/manage templates | Maintainer | Template administration |
| Create comments | Developer | Participation |
| Delete own comments | Developer | Self-management |
| Delete any comment | Maintainer | Moderation |
| Upload attachments | Developer | Content authoring |
| Delete own attachments | Developer | Self-management |
| Delete any attachment | Maintainer | Moderation |

### Permission Check Pattern

All KB endpoints use the existing `require_project_role()` dependency or a manual `_require_project_role()` helper. The project ID is resolved from the space (for space endpoints) or from the page's space (for page endpoints).

```python
# Space endpoints: project_id is in the URL
@router.get("/projects/{project_id}/kb/spaces")
async def list_spaces(
    project_id: UUID,
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    ...

# Page endpoints: project_id resolved via space -> project
@router.get("/kb/pages/{page_id}")
async def get_page(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await kb_service.get_page(db, page_id)
    space = await kb_service.get_space_by_id(db, page.space_id)
    await _require_project_role(db, space.project_id, user, ProjectRole.GUEST)
    ...
```

---

## Page Storage and Content Model

### Dual Content Storage

Each page stores content in two formats:

```
┌──────────────┐        ┌──────────────┐
│  Markdown    │ ◄────► │    HTML      │
│  (source of  │  sync  │  (rendered   │
│   truth for  │        │   cache for  │
│   editing)   │        │   display)   │
└──────────────┘        └──────────────┘
```

- **`content_markdown`**: The canonical source, used for markdown toggle editing and diffs
- **`content_html`**: Pre-rendered HTML, used for fast read-only display

The frontend sends both formats when saving. The backend stores both. This avoids server-side markdown rendering while keeping reads fast.

### WYSIWYG + Markdown Toggle

```
┌─────────────────────────────────────────┐
│  KBRichTextEditor                        │
│                                          │
│  ┌─────────┐  ┌────────────────────┐    │
│  │ Toolbar  │  │ [WYSIWYG] [MD]    │    │
│  └─────────┘  └────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │                                   │   │
│  │  TipTap Editor (WYSIWYG mode)    │   │
│  │  -- or --                         │   │
│  │  Markdown Textarea (MD mode)      │   │
│  │                                   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Toggle sync flow:**
1. WYSIWYG → Markdown: Serialize TipTap JSON to markdown using `turndown` (HTML→MD)
2. Markdown → WYSIWYG: Parse markdown to HTML using `marked`, then set as TipTap content

### TipTap Extensions

The KB editor extends the base `RichTextEditor.vue` with additional extensions:

```
Base RichTextEditor extensions:
  StarterKit, Placeholder, Link, Underline, TaskList, TaskItem

KB-specific additions:
  @tiptap/extension-image          (inline images)
  @tiptap/extension-table          (rich tables)
  @tiptap/extension-table-row
  @tiptap/extension-table-cell
  @tiptap/extension-table-header
  Custom: InlineImageUpload        (drag/paste image → S3 upload)
  Custom: SlashCommands            (Notion-style / menu)
  Custom: CalloutNode              (info/warning/tip/danger blocks)
```

---

## Inline Image Upload Flow

```
Browser                         API                        MinIO (S3)
  │                              │                            │
  │ User pastes/drops image      │                            │
  │                              │                            │
  │ POST /kb/pages/{id}/         │                            │
  │   attachments                │                            │
  │ {filename, content_type,     │                            │
  │  size_bytes}                 │                            │
  │─────────────────────────────▶│                            │
  │                              │  generate_presign_upload   │
  │                              │───────────────────────────▶│
  │  {upload_url, attachment}    │                            │
  │◀─────────────────────────────│                            │
  │                              │                            │
  │ PUT upload_url               │                            │
  │ [image bytes]                │                            │
  │──────────────────────────────────────────────────────────▶│
  │  200 OK                      │                            │
  │◀──────────────────────────────────────────────────────────│
  │                              │                            │
  │ Insert <img src="download    │                            │
  │   URL"> into TipTap editor   │                            │
  └──────────────────────────────┘                            │
```

The image node in TipTap uses the S3 download URL as its `src`. When the page is saved, the HTML content includes the image references.

---

## Page Tree and Navigation

### Nested Page Tree

Pages form an unlimited-depth tree via `parent_page_id`. The tree is loaded per space.

```
Space: "Engineering Docs"
├── Getting Started Guide          (position: 0, parent: null)
│   ├── Installation               (position: 0, parent: Getting Started)
│   ├── Configuration              (position: 1, parent: Getting Started)
│   │   └── Environment Variables  (position: 0, parent: Configuration)
│   └── First Steps                (position: 2, parent: Getting Started)
├── Architecture                   (position: 1, parent: null)
│   ├── Backend                    (position: 0, parent: Architecture)
│   └── Frontend                   (position: 1, parent: Architecture)
└── API Reference                  (position: 2, parent: null)
```

### Tree Loading Strategy

- **Initial load**: Fetch root pages with one level of children
- **Expand on demand**: Lazy-load deeper children when a node is expanded
- **Active path**: When navigating to a deep page, load its ancestor chain to auto-expand the tree

### URL Structure

```
/projects/:projectId/kb                         → Space list
/projects/:projectId/kb/:spaceSlug              → Space (tree + first page or empty state)
/projects/:projectId/kb/:spaceSlug/:pageSlug    → Page view
/projects/:projectId/kb/:spaceSlug/:pageSlug/history → Version history
```

Slugs are human-readable, auto-generated from names/titles, and unique within their scope (space slugs per project, page slugs per space).

### Breadcrumb Navigation

Breadcrumbs show the full path from space to current page:

```
Project Name > Knowledge Base > Engineering Docs > Getting Started Guide > Configuration
```

The ancestor chain is fetched via `GET /kb/pages/{pageId}/ancestors` and cached during navigation.

---

## Version History and Diff

### Versioning Strategy

Every save creates a new version with a full content snapshot:

```
Page save (PATCH /kb/pages/{id})
  │
  ├── Update kb_pages row (title, content_markdown, content_html, last_edited_by)
  │
  └── INSERT kb_page_versions (page_id, version_number++, title, content, created_by)
```

**Full snapshots** (not deltas) are used for:
- Fast reads without reconstruction
- Simple restore (just copy content from old version)
- Easy diffing (compare any two versions directly)

### Diff Computation

Diffs are computed server-side using Python's `difflib.unified_diff()` on the markdown content:

```python
import difflib

def compute_diff(old_markdown: str, new_markdown: str) -> list[dict]:
    old_lines = old_markdown.splitlines(keepends=True)
    new_lines = new_markdown.splitlines(keepends=True)
    differ = difflib.unified_diff(old_lines, new_lines, lineterm='')
    # Parse into structured diff entries: {type: added/removed/unchanged, content: ...}
```

The frontend renders the diff with green (additions) and red (deletions) highlighting.

### Restore Flow

```
User clicks "Restore version 2"
  │
  ├── GET /kb/pages/{id}/versions/{v2_id}    (fetch old content)
  │
  └── POST /kb/pages/{id}/versions/{v2_id}/restore
        │
        ├── Creates new version N+1 with content from version 2
        ├── Updates kb_pages row with restored content
        └── Sets change_summary = "Restored from version 2"
```

---

## Threaded Comments

### Thread Structure

Comments support unlimited nesting via `parent_comment_id`:

```
Comment A (parent: null)
├── Reply B (parent: A)
│   └── Reply D (parent: B)
└── Reply C (parent: A)

Comment E (parent: null)
```

### Loading Strategy

Comments are loaded in a flat list ordered by `created_at`, then assembled into a tree structure on the backend before sending to the frontend:

```python
async def list_comments_threaded(db, page_id):
    # 1. Fetch all comments for the page
    comments = await db.execute(
        select(KBPageComment)
        .where(KBPageComment.page_id == page_id)
        .order_by(KBPageComment.created_at)
    )
    # 2. Build tree: group by parent_comment_id, nest recursively
    # 3. Return top-level comments with nested replies
```

### Soft Delete Behavior

When a comment is soft-deleted:
- `is_deleted` is set to true
- The body is replaced with `"[deleted]"` in API responses
- The comment structure is preserved so child replies remain visible in context

---

## Full-Text Search

### Index Strategy

KB pages use PostgreSQL full-text search with a GIN index:

```sql
-- Expression-based GIN index (no stored column needed)
CREATE INDEX ix_kb_pages_fts ON kb_pages USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_markdown, ''))
);
```

Alternatively, a stored `search_vector` column with a trigger can be used for better performance on large datasets:

```sql
ALTER TABLE kb_pages ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_markdown, ''))
    ) STORED;

CREATE INDEX ix_kb_pages_search_vector ON kb_pages USING GIN (search_vector);
```

### Search Query

```python
from sqlalchemy import func

query = (
    select(KBPage)
    .where(
        KBPage.is_deleted == False,
        KBPage.is_published == True,
        func.to_tsvector('english', KBPage.title + ' ' + KBPage.content_markdown)
        .match(search_term),
    )
    .order_by(
        func.ts_rank(
            func.to_tsvector('english', KBPage.title + ' ' + KBPage.content_markdown),
            func.plainto_tsquery('english', search_term),
        ).desc()
    )
)
```

### Snippet Generation

Use `ts_headline` for search result snippets with match highlighting:

```sql
SELECT ts_headline(
    'english',
    content_markdown,
    plainto_tsquery('english', 'search term'),
    'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
) AS snippet
FROM kb_pages
```

### Cmd+K Integration

The existing `CommandPalette.vue` is extended to include KB results:

```
Search "deployment"
├── 🎫 PROJ-42: Fix deployment pipeline     (ticket)
├── 📁 Infrastructure Project                (project)
├── 📖 Deployment Guide                      (KB page - Engineering Docs)
└── 📖 CI/CD Configuration                   (KB page - DevOps Space)
```

KB results are fetched from `/projects/{pid}/kb/search?q=...` and merged with ticket/project results.

---

## Template System

### Built-in vs Custom Templates

```
Templates available when creating a page:
├── Built-in (project_id = NULL, is_builtin = true)
│   ├── 📄 Blank Page
│   ├── 📋 Meeting Notes
│   ├── ⚖️ Decision Record
│   ├── 📖 How-To Guide
│   └── 🔌 API Documentation
└── Custom (project_id = {pid}, is_builtin = false)
    ├── 🔄 Sprint Retrospective
    └── 📊 Architecture Decision Record
```

Built-in templates are seeded during application initialization (or via a management command). They are:
- Available to all projects
- Cannot be modified or deleted by users
- Identified by `is_builtin = true` and `project_id = NULL`

Custom templates are:
- Created by Maintainers within a project
- Scoped to that project only
- Can be created from any existing page's content ("Save as template")

---

## S3 Key Structure

```
projects/
└── {project_id}/
    └── kb/
        └── {space_id}/
            └── {page_id}/
                ├── {uuid}_{filename1.png}
                ├── {uuid}_{filename2.pdf}
                └── {uuid}_{filename3.jpg}
```

This structure:
- Separates KB attachments from ticket attachments (`kb/` prefix)
- Allows bulk deletion per page, space, or project
- Maintains organizational hierarchy for S3 lifecycle policies

---

## Frontend Component Structure

```
frontend/src/
├── api/
│   └── kb.ts                              (all KB API functions)
├── views/kb/
│   ├── KBSpaceListView.vue                (space grid/list)
│   ├── KBSpaceView.vue                    (space layout: sidebar + content)
│   ├── KBPageView.vue                     (page read view)
│   ├── KBPageEditor.vue                   (page edit view)
│   └── KBVersionHistoryView.vue           (version history + diff)
├── components/kb/
│   ├── PageTreeSidebar.vue                (recursive page tree)
│   ├── VersionHistoryPanel.vue            (version list)
│   ├── ThreadedComments.vue               (nested comment UI)
│   ├── TemplatePicker.vue                 (template selection dialog)
│   └── MarkdownSourceEditor.vue           (raw markdown editor)
└── components/editor/
    ├── KBRichTextEditor.vue               (enhanced TipTap for KB)
    └── extensions/
        ├── InlineImageUpload.ts           (drag/paste image → S3)
        ├── SlashCommands.ts               (Notion-style / menu)
        └── CalloutNode.ts                 (info/warning/tip/danger)
```
