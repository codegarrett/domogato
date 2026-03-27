# Phase 3 Data Model

## Overview

Phase 3 introduces six new database tables for the Knowledge Base feature. These tables support document spaces, nested pages with version history, threaded comments, inline file attachments, and reusable templates. No existing tables are modified.

For the base data model, see `docs/phase_1/DATA_MODEL.md`. For Phase 2 additions, see `docs/phase_2/DATA_MODEL.md`.

---

## New Tables

### `kb_spaces`

Top-level containers for knowledge base pages within a project.

```sql
CREATE TABLE kb_spaces (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    description  TEXT,
    slug         VARCHAR(100) NOT NULL,
    icon         VARCHAR(50),
    position     INTEGER NOT NULL DEFAULT 0,
    is_archived  BOOLEAN NOT NULL DEFAULT false,
    created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_kb_spaces_project_slug
        UNIQUE (project_id, slug)
);

CREATE INDEX ix_kb_spaces_project_id ON kb_spaces(project_id);
```

**Notes:**
- `slug` is auto-generated from `name` (lowercased, hyphenated, stripped of special chars), unique within a project
- `icon` stores an optional emoji or icon identifier (e.g., `"📚"` or `"book"`)
- `position` determines ordering in the space list; 0-indexed
- `is_archived` provides soft-archive (hidden from UI but not deleted)
- Deleting a project cascades to all its spaces

**SQLAlchemy Model:**

```python
class KBSpace(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_spaces"
    __table_args__ = (
        UniqueConstraint("project_id", "slug", name="uq_kb_spaces_project_slug"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    pages: Mapped[list["KBPage"]] = relationship(back_populates="space", cascade="all, delete-orphan")
```

---

### `kb_pages`

Documents within a knowledge base space. Supports unlimited nesting via self-referential `parent_page_id`.

```sql
CREATE TABLE kb_pages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id          UUID NOT NULL REFERENCES kb_spaces(id) ON DELETE CASCADE,
    parent_page_id    UUID REFERENCES kb_pages(id) ON DELETE SET NULL,
    title             VARCHAR(500) NOT NULL,
    slug              VARCHAR(200) NOT NULL,
    content_markdown  TEXT NOT NULL DEFAULT '',
    content_html      TEXT NOT NULL DEFAULT '',
    position          INTEGER NOT NULL DEFAULT 0,
    is_published      BOOLEAN NOT NULL DEFAULT true,
    is_deleted        BOOLEAN NOT NULL DEFAULT false,
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    last_edited_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_kb_pages_space_slug
        UNIQUE (space_id, slug)
);

CREATE INDEX ix_kb_pages_space_id ON kb_pages(space_id);
CREATE INDEX ix_kb_pages_parent_page_id ON kb_pages(parent_page_id);
CREATE INDEX ix_kb_pages_search_vector ON kb_pages USING GIN (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content_markdown, ''))
);
```

**Notes:**
- `parent_page_id` is NULL for root-level pages, references own table for nesting
- `ON DELETE SET NULL` for parent -- orphaned pages become root-level rather than cascading deletion
- `slug` is unique within a space, auto-generated from title
- `content_markdown` stores the raw markdown source; `content_html` is the pre-rendered HTML cache
- `is_published` supports draft pages (visible only to editors)
- `is_deleted` provides soft-delete
- `position` determines sibling ordering within the same parent
- GIN index on concatenated title + content for PostgreSQL full-text search
- `last_edited_by` tracks the most recent editor (updated on every save)

**SQLAlchemy Model:**

```python
class KBPage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_pages"
    __table_args__ = (
        UniqueConstraint("space_id", "slug", name="uq_kb_pages_space_slug"),
    )

    space_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_spaces.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    parent_page_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_pages.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    last_edited_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    space: Mapped["KBSpace"] = relationship(back_populates="pages")
    parent: Mapped[Optional["KBPage"]] = relationship(
        remote_side="KBPage.id", back_populates="children",
    )
    children: Mapped[list["KBPage"]] = relationship(back_populates="parent")
    versions: Mapped[list["KBPageVersion"]] = relationship(
        back_populates="page", cascade="all, delete-orphan",
    )
    comments: Mapped[list["KBPageComment"]] = relationship(
        back_populates="page", cascade="all, delete-orphan",
    )
    attachments: Mapped[list["KBPageAttachment"]] = relationship(
        back_populates="page", cascade="all, delete-orphan",
    )
```

---

### `kb_page_versions`

Immutable snapshots of page content, created on every save.

```sql
CREATE TABLE kb_page_versions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id           UUID NOT NULL REFERENCES kb_pages(id) ON DELETE CASCADE,
    version_number    INTEGER NOT NULL,
    title             VARCHAR(500) NOT NULL,
    content_markdown  TEXT NOT NULL DEFAULT '',
    content_html      TEXT NOT NULL DEFAULT '',
    change_summary    VARCHAR(500),
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_kb_page_versions_page_number
        UNIQUE (page_id, version_number)
);

CREATE INDEX ix_kb_page_versions_page_id ON kb_page_versions(page_id);
```

**Notes:**
- `version_number` is auto-incremented per page (1, 2, 3, ...) -- not a global sequence
- Stores full content snapshots (not deltas) for simplicity and fast reads
- `change_summary` is an optional commit-message-like description of what changed
- Versions are immutable -- restoring an old version creates a new version with the old content
- `created_by` tracks who made this version (may differ from page creator)

**SQLAlchemy Model:**

```python
class KBPageVersion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "kb_page_versions"
    __table_args__ = (
        UniqueConstraint("page_id", "version_number", name="uq_kb_page_versions_page_number"),
    )

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_pages.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    change_summary: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False,
    )

    page: Mapped["KBPage"] = relationship(back_populates="versions")
```

---

### `kb_page_comments`

Threaded comments on knowledge base pages. Supports unlimited nesting via self-referential `parent_comment_id`.

```sql
CREATE TABLE kb_page_comments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id             UUID NOT NULL REFERENCES kb_pages(id) ON DELETE CASCADE,
    parent_comment_id   UUID REFERENCES kb_page_comments(id) ON DELETE CASCADE,
    author_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body                TEXT NOT NULL,
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_kb_page_comments_page_id ON kb_page_comments(page_id, created_at);
CREATE INDEX ix_kb_page_comments_parent ON kb_page_comments(parent_comment_id);
```

**Notes:**
- `parent_comment_id` is NULL for top-level comments; references own table for replies
- `ON DELETE CASCADE` for parent_comment_id -- deleting a comment deletes all replies
- `body` stores HTML content (from the rich text editor)
- `is_deleted` provides soft-delete (content hidden but structure preserved for thread context)
- `author_id` is NOT NULL with CASCADE -- if a user is deleted, their comments are also removed

**SQLAlchemy Model:**

```python
class KBPageComment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_page_comments"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_pages.id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_comment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_page_comments.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    page: Mapped["KBPage"] = relationship(back_populates="comments")
    parent: Mapped[Optional["KBPageComment"]] = relationship(
        remote_side="KBPageComment.id", back_populates="replies",
    )
    replies: Mapped[list["KBPageComment"]] = relationship(back_populates="parent")
```

---

### `kb_page_attachments`

File attachment metadata for inline images and documents within KB pages. Actual files stored in S3 (MinIO).

```sql
CREATE TABLE kb_page_attachments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id       UUID NOT NULL REFERENCES kb_pages(id) ON DELETE CASCADE,
    filename      VARCHAR(500) NOT NULL,
    content_type  VARCHAR(255) NOT NULL,
    size_bytes    BIGINT NOT NULL,
    s3_key        VARCHAR(1000) NOT NULL,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_kb_page_attachments_page_id ON kb_page_attachments(page_id);
```

**Notes:**
- Reuses the same S3 presigned URL pattern as ticket attachments
- S3 key pattern: `projects/{project_id}/kb/{space_id}/{page_id}/{uuid}_{filename}`
- No `updated_at` -- attachments are immutable once uploaded
- `created_by` is SET NULL on user deletion to preserve attachment records
- Deleting a page cascades to attachment records; S3 objects should be cleaned up via a background task or lifecycle policy

**SQLAlchemy Model:**

```python
class KBPageAttachment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "kb_page_attachments"

    page_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("kb_pages.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    s3_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False,
    )

    page: Mapped["KBPage"] = relationship(back_populates="attachments")
```

---

### `kb_templates`

Reusable page templates -- both built-in (system-wide) and custom (project-scoped).

```sql
CREATE TABLE kb_templates (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    description       TEXT,
    content_markdown  TEXT NOT NULL DEFAULT '',
    content_html      TEXT NOT NULL DEFAULT '',
    icon              VARCHAR(50),
    is_builtin        BOOLEAN NOT NULL DEFAULT false,
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_kb_templates_project_id ON kb_templates(project_id);
```

**Notes:**
- `project_id` is nullable: NULL means a global/built-in template available to all projects
- `is_builtin` = true for system-provided templates (cannot be deleted or modified by users)
- Custom templates (`is_builtin = false`) are scoped to a project
- `icon` stores an emoji or icon identifier for UI display
- Built-in templates are seeded on application startup or first space creation

**Built-in templates (seeded):**

| Name | Icon | Description |
|------|------|-------------|
| Blank Page | `📄` | Empty page |
| Meeting Notes | `📋` | Date, attendees, agenda, discussion, action items |
| Decision Record | `⚖️` | Status, context, decision, consequences |
| How-To Guide | `📖` | Overview, prerequisites, step-by-step, troubleshooting |
| API Documentation | `🔌` | Endpoint, method, parameters, request/response examples |

**SQLAlchemy Model:**

```python
class KBTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "kb_templates"

    project_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True, index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_html: Mapped[str] = mapped_column(Text, nullable=False, default="")
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_builtin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
```

---

## Migrations Summary

| Phase | Migration | Description |
|-------|-----------|-------------|
| 3.1 | `XXXX_kb_tables.py` | Create `kb_spaces`, `kb_pages`, `kb_page_versions`, `kb_page_comments`, `kb_page_attachments`, `kb_templates` with all indexes and constraints |
| 3.4 | `XXXX_kb_search_vector.py` | Add `search_vector` tsvector column + GIN index + auto-update trigger to `kb_pages` (if not using expression index) |

No existing tables are modified. All new tables follow the established patterns from Phase 1 and Phase 2.

---

## Entity Relationship Diagram

```
    ┌─────────────┐
    │   Project   │
    └──────┬──────┘
           │ 1:N
           ▼
    ┌──────────────┐         ┌──────────────────┐
    │   KBSpace    │         │   KBTemplate     │
    │              │         │  (project_id     │
    │  project_id  │         │   nullable =     │
    └──────┬──────┘         │   built-in)      │
           │ 1:N             └──────────────────┘
           ▼
    ┌──────────────┐
    │   KBPage     │◄────────┐
    │              │         │ parent_page_id
    │  space_id    │─────────┘ (self-ref, unlimited nesting)
    └──────┬──────┘
           │
     ┌─────┼──────────┐
     │     │          │
     ▼     ▼          ▼
  ┌──────────┐ ┌────────────┐ ┌──────────────────┐
  │KBPage    │ │KBPage      │ │KBPage            │
  │Version   │ │Comment     │ │Attachment         │
  │          │ │            │ │                   │
  │ page_id  │ │ page_id    │ │ page_id           │
  │ version# │ │ parent_id  │ │ s3_key            │
  └──────────┘ │ (threaded) │ └──────────────────┘
               └────────────┘
```
