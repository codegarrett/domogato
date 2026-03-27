# Phase 10 Data Model

## Overview

Phase 10 adds a `project_id` column to the existing `ai_embeddings` table and defines the metadata schema stored in the JSONB `metadata` column. No new tables are created.

---

## Modified Table: `ai_embeddings`

### New Column: `project_id`

```sql
ALTER TABLE ai_embeddings
    ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX ix_ai_embeddings_project_id ON ai_embeddings(project_id);
```

### Updated Column Details

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `UUID` | NOT NULL | Primary key (Phase 8) |
| `content_type` | `VARCHAR(50)` | NOT NULL | `"kb_page"` or `"kb_attachment"` (Phase 8) |
| `content_id` | `UUID` | NOT NULL | FK to the source entity (Phase 8) |
| `chunk_index` | `INTEGER` | NOT NULL | 0-based chunk position within the source (Phase 8) |
| `chunk_text` | `TEXT` | NOT NULL | The text content of this chunk (Phase 8) |
| `embedding` | `vector(1536)` | NOT NULL | pgvector embedding (Phase 8) |
| `metadata` | `JSONB` | NOT NULL | Rich metadata — see schema below (Phase 8, enriched in Phase 10) |
| `project_id` | `UUID` (FK) | YES | **NEW** — Reference to `projects.id` for project-scoped queries |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Timestamp (Phase 8) |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Timestamp (Phase 8) |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `ix_ai_embeddings_content` | `(content_type, content_id)` | B-tree | Lookup/delete by source (Phase 8) |
| `ix_ai_embeddings_project_id` | `(project_id)` | B-tree | **NEW** — Filter by project for scoped vector search |

---

## Metadata JSONB Schema

### For `content_type = "kb_page"`

```json
{
  "space_id": "uuid-string",
  "space_name": "Engineering Docs",
  "space_slug": "engineering-docs",
  "page_title": "API Authentication Guide",
  "page_slug": "api-authentication-guide",
  "parent_pages": [
    {
      "id": "uuid-string",
      "title": "Getting Started",
      "slug": "getting-started"
    },
    {
      "id": "uuid-string",
      "title": "API Reference",
      "slug": "api-reference"
    }
  ],
  "source_type": "page_content"
}
```

### For `content_type = "kb_attachment"`

```json
{
  "space_id": "uuid-string",
  "space_name": "Engineering Docs",
  "space_slug": "engineering-docs",
  "page_id": "uuid-string",
  "page_title": "API Authentication Guide",
  "page_slug": "api-authentication-guide",
  "parent_pages": [...],
  "source_type": "attachment",
  "filename": "auth-flow.pdf",
  "file_content_type": "application/pdf",
  "file_size_bytes": 245760
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `space_id` | string (UUID) | The KB space containing the page |
| `space_name` | string | Display name of the space |
| `space_slug` | string | URL slug of the space |
| `page_title` | string | Title of the KB page |
| `page_slug` | string | URL slug of the page |
| `page_id` | string (UUID) | For attachments: the parent page ID |
| `parent_pages` | array | Ordered list of ancestor pages (root first), each with `id`, `title`, `slug` |
| `source_type` | string | `"page_content"` or `"attachment"` |
| `filename` | string | For attachments: original filename |
| `file_content_type` | string | For attachments: MIME type |
| `file_size_bytes` | integer | For attachments: file size in bytes |

---

## Content Types

| `content_type` | `content_id` references | Description |
|----------------|------------------------|-------------|
| `kb_page` | `kb_pages.id` | Embedding of KB page markdown content |
| `kb_attachment` | `kb_page_attachments.id` | Embedding of text extracted from an attached file |

---

## Embedding Lifecycle

| Event | Action |
|-------|--------|
| KB page created | `embed_kb_page` task generates embeddings for the page content |
| KB page updated | `embed_kb_page` task deletes old embeddings and regenerates |
| KB page deleted | `delete_kb_embeddings` task removes all embeddings for the page |
| Attachment confirmed | `embed_kb_attachment` task extracts text and generates embeddings |

Embeddings are always replaced atomically: delete all existing rows for `(content_type, content_id)`, then insert new rows. This ensures idempotency.
