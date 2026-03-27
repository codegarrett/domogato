# Phase 3 API Design

## Overview

This document specifies all new API endpoints introduced in Phase 3 for the Knowledge Base feature. These build on the existing `/api/v1` convention established in Phase 1.

For the original API specification, see `docs/phase_1/API_DESIGN.md`. For Phase 2 additions, see `docs/phase_2/API_DESIGN.md`.

All KB endpoints use the existing project role-based access control. The minimum role required is specified per endpoint.

---

## New Endpoints

### KB Spaces (Phase 3.2)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/kb/spaces` | List spaces in project | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/kb/spaces` | Create a space | Yes | Maintainer |
| `GET` | `/api/v1/projects/{project_id}/kb/spaces/{slug}` | Get space detail | Yes | Project Guest |
| `PATCH` | `/api/v1/projects/{project_id}/kb/spaces/{slug}` | Update space | Yes | Maintainer |
| `DELETE` | `/api/v1/projects/{project_id}/kb/spaces/{slug}` | Archive space | Yes | Owner |

**Create space request:**

```json
{
    "name": "Engineering Docs",
    "description": "Technical documentation for the engineering team",
    "icon": "📚"
}
```

**Space response:**

```json
{
    "id": "uuid",
    "project_id": "uuid",
    "name": "Engineering Docs",
    "description": "Technical documentation for the engineering team",
    "slug": "engineering-docs",
    "icon": "📚",
    "position": 0,
    "is_archived": false,
    "created_by": "uuid",
    "page_count": 12,
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T10:00:00Z"
}
```

**Validation rules:**
- `name` is required, max 255 characters
- `slug` is auto-generated from name; must be unique per project
- `icon` is optional, max 50 characters

---

### KB Pages (Phase 3.2)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/kb/spaces/{space_id}/pages` | List root pages as tree | Yes | Project Guest |
| `POST` | `/api/v1/kb/spaces/{space_id}/pages` | Create a page | Yes | Developer |
| `GET` | `/api/v1/kb/pages/{page_id}` | Get page with content | Yes | Project Guest |
| `PATCH` | `/api/v1/kb/pages/{page_id}` | Update page (creates version) | Yes | Developer |
| `DELETE` | `/api/v1/kb/pages/{page_id}` | Soft-delete page | Yes | Maintainer |
| `POST` | `/api/v1/kb/pages/{page_id}/move` | Move/reparent page | Yes | Developer |
| `GET` | `/api/v1/kb/pages/{page_id}/children` | Get child pages | Yes | Project Guest |
| `GET` | `/api/v1/kb/pages/{page_id}/ancestors` | Get ancestor chain (breadcrumbs) | Yes | Project Guest |

**Create page request:**

```json
{
    "title": "Getting Started Guide",
    "content_markdown": "# Getting Started\n\nWelcome to the project...",
    "content_html": "<h1>Getting Started</h1><p>Welcome to the project...</p>",
    "parent_page_id": "uuid-or-null",
    "is_published": true,
    "template_id": "uuid-or-null"
}
```

**Page response:**

```json
{
    "id": "uuid",
    "space_id": "uuid",
    "parent_page_id": null,
    "title": "Getting Started Guide",
    "slug": "getting-started-guide",
    "content_markdown": "# Getting Started\n\nWelcome to the project...",
    "content_html": "<h1>Getting Started</h1><p>Welcome to the project...</p>",
    "position": 0,
    "is_published": true,
    "is_deleted": false,
    "created_by": {
        "id": "uuid",
        "display_name": "Jane Doe"
    },
    "last_edited_by": {
        "id": "uuid",
        "display_name": "Jane Doe"
    },
    "version_count": 3,
    "comment_count": 5,
    "created_at": "2026-03-24T10:00:00Z",
    "updated_at": "2026-03-24T14:30:00Z"
}
```

**Page tree response** (GET `/kb/spaces/{space_id}/pages`):

```json
[
    {
        "id": "uuid",
        "title": "Getting Started Guide",
        "slug": "getting-started-guide",
        "position": 0,
        "is_published": true,
        "children": [
            {
                "id": "uuid",
                "title": "Installation",
                "slug": "installation",
                "position": 0,
                "is_published": true,
                "children": []
            },
            {
                "id": "uuid",
                "title": "Configuration",
                "slug": "configuration",
                "position": 1,
                "is_published": true,
                "children": [
                    {
                        "id": "uuid",
                        "title": "Environment Variables",
                        "slug": "environment-variables",
                        "position": 0,
                        "is_published": true,
                        "children": []
                    }
                ]
            }
        ]
    }
]
```

**Move page request:**

```json
{
    "parent_page_id": "uuid-or-null",
    "position": 2
}
```

**Ancestors response** (GET `/kb/pages/{page_id}/ancestors`):

```json
[
    {
        "id": "uuid",
        "title": "Getting Started Guide",
        "slug": "getting-started-guide"
    },
    {
        "id": "uuid",
        "title": "Configuration",
        "slug": "configuration"
    }
]
```

**Validation rules:**
- `title` is required, max 500 characters
- `slug` is auto-generated from title; must be unique per space
- `content_markdown` and `content_html` are both stored (client sends both)
- `parent_page_id` must reference a page in the same space
- Soft-deleted pages are excluded from tree and list queries

**Error responses:**
- `404` -- Space or page not found
- `400` -- Invalid parent_page_id (different space or circular reference)
- `409` -- Slug conflict within space

---

### Page Versions (Phase 3.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/kb/pages/{page_id}/versions` | List version history | Yes | Project Guest |
| `GET` | `/api/v1/kb/pages/{page_id}/versions/{version_id}` | Get specific version | Yes | Project Guest |
| `POST` | `/api/v1/kb/pages/{page_id}/versions/{version_id}/restore` | Restore version | Yes | Developer |
| `GET` | `/api/v1/kb/pages/{page_id}/versions/{v1_id}/diff/{v2_id}` | Diff two versions | Yes | Project Guest |

**Version list response:**

```json
{
    "items": [
        {
            "id": "uuid",
            "version_number": 3,
            "title": "Getting Started Guide",
            "change_summary": "Added troubleshooting section",
            "created_by": {
                "id": "uuid",
                "display_name": "Jane Doe"
            },
            "created_at": "2026-03-24T14:30:00Z"
        }
    ],
    "total": 3,
    "offset": 0,
    "limit": 50
}
```

**Version detail response:**

```json
{
    "id": "uuid",
    "page_id": "uuid",
    "version_number": 2,
    "title": "Getting Started Guide",
    "content_markdown": "# Getting Started\n\n...",
    "content_html": "<h1>Getting Started</h1>...",
    "change_summary": "Updated introduction",
    "created_by": {
        "id": "uuid",
        "display_name": "Jane Doe"
    },
    "created_at": "2026-03-24T12:00:00Z"
}
```

**Diff response:**

```json
{
    "from_version": {
        "id": "uuid",
        "version_number": 1,
        "created_at": "2026-03-24T10:00:00Z"
    },
    "to_version": {
        "id": "uuid",
        "version_number": 2,
        "created_at": "2026-03-24T12:00:00Z"
    },
    "diff": [
        {
            "type": "unchanged",
            "content": "# Getting Started"
        },
        {
            "type": "removed",
            "content": "Welcome to the project."
        },
        {
            "type": "added",
            "content": "Welcome to the project! This guide will help you get started."
        }
    ],
    "stats": {
        "additions": 5,
        "deletions": 3,
        "unchanged": 42
    }
}
```

**Restore behavior:**
- Restoring version N creates a new version (N+1) with the content from version N
- The restore is non-destructive: no versions are deleted
- Change summary auto-set to "Restored from version {N}"

---

### Page Comments (Phase 3.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/kb/pages/{page_id}/comments` | List comments (threaded) | Yes | Project Guest |
| `POST` | `/api/v1/kb/pages/{page_id}/comments` | Add comment | Yes | Developer |
| `PATCH` | `/api/v1/kb/comments/{comment_id}` | Edit own comment | Yes | Developer |
| `DELETE` | `/api/v1/kb/comments/{comment_id}` | Delete comment | Yes | Developer (own) / Maintainer (any) |

**Create comment request:**

```json
{
    "body": "<p>Great documentation! One suggestion...</p>",
    "parent_comment_id": "uuid-or-null"
}
```

**Comment list response** (threaded structure):

```json
{
    "items": [
        {
            "id": "uuid",
            "page_id": "uuid",
            "parent_comment_id": null,
            "author": {
                "id": "uuid",
                "display_name": "Jane Doe",
                "avatar_url": null
            },
            "body": "<p>Great documentation!</p>",
            "is_deleted": false,
            "created_at": "2026-03-24T15:00:00Z",
            "updated_at": "2026-03-24T15:00:00Z",
            "replies": [
                {
                    "id": "uuid",
                    "page_id": "uuid",
                    "parent_comment_id": "uuid",
                    "author": {
                        "id": "uuid",
                        "display_name": "John Smith",
                        "avatar_url": null
                    },
                    "body": "<p>Thanks! I'll add more examples.</p>",
                    "is_deleted": false,
                    "created_at": "2026-03-24T15:30:00Z",
                    "updated_at": "2026-03-24T15:30:00Z",
                    "replies": []
                }
            ]
        }
    ],
    "total": 5
}
```

**Validation rules:**
- `body` is required, max 50000 characters
- `parent_comment_id` must reference a comment on the same page
- Soft-deleted comments show `body: "[deleted]"` but preserve thread structure

---

### Page Attachments (Phase 3.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `POST` | `/api/v1/kb/pages/{page_id}/attachments` | Create + get presigned upload URL | Yes | Developer |
| `GET` | `/api/v1/kb/pages/{page_id}/attachments` | List attachments for a page | Yes | Project Guest |
| `GET` | `/api/v1/kb/attachments/{attachment_id}/download` | Get presigned download URL | Yes | Project Guest |
| `DELETE` | `/api/v1/kb/attachments/{attachment_id}` | Delete attachment | Yes | Developer (own) / Maintainer (any) |

**Create attachment request:**

```json
{
    "filename": "architecture-diagram.png",
    "content_type": "image/png",
    "size_bytes": 245000
}
```

**Create attachment response:**

```json
{
    "attachment": {
        "id": "uuid",
        "page_id": "uuid",
        "filename": "architecture-diagram.png",
        "content_type": "image/png",
        "size_bytes": 245000,
        "created_by": "uuid",
        "created_at": "2026-03-24T10:00:00Z"
    },
    "upload_url": "https://minio:9000/projecthub-attachments/projects/..."
}
```

**Download response:**

```json
{
    "download_url": "https://minio:9000/projecthub-attachments/projects/...?signature=..."
}
```

**Validation rules:**
- `size_bytes` must not exceed 50MB (52428800 bytes)
- `filename` is required, max 500 characters
- Reuses existing `storage_service.py` for S3 presigned URL generation

---

### KB Templates (Phase 3.3)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/kb/templates` | List templates (built-in + project) | Yes | Project Guest |
| `POST` | `/api/v1/projects/{project_id}/kb/templates` | Create custom template | Yes | Maintainer |
| `GET` | `/api/v1/kb/templates/{template_id}` | Get template detail | Yes | Project Guest |
| `PATCH` | `/api/v1/kb/templates/{template_id}` | Update custom template | Yes | Maintainer |
| `DELETE` | `/api/v1/kb/templates/{template_id}` | Delete custom template | Yes | Maintainer |

**Create template request:**

```json
{
    "name": "Sprint Retrospective",
    "description": "Template for sprint retrospective notes",
    "content_markdown": "# Sprint Retrospective\n\n## What went well\n\n## What could improve\n\n## Action items\n",
    "content_html": "<h1>Sprint Retrospective</h1><h2>What went well</h2><h2>What could improve</h2><h2>Action items</h2>",
    "icon": "🔄"
}
```

**Template list response:**

```json
{
    "items": [
        {
            "id": "uuid",
            "project_id": null,
            "name": "Blank Page",
            "description": "Empty page",
            "icon": "📄",
            "is_builtin": true,
            "created_at": "2026-01-01T00:00:00Z"
        },
        {
            "id": "uuid",
            "project_id": "uuid",
            "name": "Sprint Retrospective",
            "description": "Template for sprint retrospective notes",
            "icon": "🔄",
            "is_builtin": false,
            "created_by": "uuid",
            "created_at": "2026-03-24T10:00:00Z"
        }
    ],
    "total": 7
}
```

**Error responses:**
- `403` -- Cannot modify or delete built-in templates
- `404` -- Template not found

---

### KB Search (Phase 3.4)

| Method | Path | Description | Auth | Min Role |
|--------|------|-------------|------|----------|
| `GET` | `/api/v1/projects/{project_id}/kb/search` | Search KB pages | Yes | Project Guest |

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query (required) |
| `space_id` | UUID | Optional: filter to specific space |
| `limit` | integer | Max results (default 10, max 50) |
| `offset` | integer | Pagination offset |

**Search response:**

```json
{
    "items": [
        {
            "page_id": "uuid",
            "title": "Getting Started Guide",
            "slug": "getting-started-guide",
            "space_id": "uuid",
            "space_name": "Engineering Docs",
            "space_slug": "engineering-docs",
            "snippet": "...Welcome to the <mark>project</mark>! This guide will help you <mark>get started</mark>...",
            "breadcrumb": ["Engineering Docs", "Onboarding", "Getting Started Guide"],
            "last_edited_by": "Jane Doe",
            "updated_at": "2026-03-24T14:30:00Z"
        }
    ],
    "total": 3,
    "offset": 0,
    "limit": 10
}
```

**Notes:**
- Uses PostgreSQL `ts_query` for full-text search and `ts_headline` for snippet generation
- Matches against page title and markdown content
- Excludes soft-deleted and unpublished pages
- Results include breadcrumb path for navigation context
- Respects project access permissions (search only returns pages from accessible projects)
