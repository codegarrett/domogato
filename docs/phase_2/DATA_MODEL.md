# Phase 2 Data Model

## Overview

Phase 2 introduces two new database tables (`attachments`, `daily_snapshots`) and leverages the existing `ticket_dependencies` table that was created in Phase 1 but had no API. No existing tables are modified.

For the base data model, see `docs/phase_1/DATA_MODEL.md`.

---

## New Tables

### `attachments`

File attachment metadata. Actual files are stored in S3 (MinIO).

```sql
CREATE TABLE attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    filename        VARCHAR(255) NOT NULL,
    content_type    VARCHAR(127) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    s3_key          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_attachments_ticket_id ON attachments(ticket_id);
CREATE INDEX ix_attachments_project_id ON attachments(project_id);
```

**Notes:**
- `project_id` is denormalized (derivable from ticket -> project) for efficient project-level queries and bulk cleanup
- `s3_key` stores the full S3 object path: `{org_id}/{project_id}/{ticket_id}/{attachment_id}/{filename}`
- `uploaded_by_id` is SET NULL on user deletion to preserve attachment records
- No `updated_at` -- attachments are immutable once confirmed

**SQLAlchemy Model:**

```python
class Attachment(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "attachments"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    uploaded_by_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(127), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    s3_key: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False,
    )

    ticket: Mapped["Ticket"] = relationship(back_populates="attachments")
```

---

### `daily_snapshots`

Daily ticket count snapshots for cumulative flow diagrams. Populated by Celery Beat task.

```sql
CREATE TABLE daily_snapshots (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    snapshot_date           DATE NOT NULL,
    total_tickets           INTEGER NOT NULL DEFAULT 0,
    by_status               JSONB NOT NULL DEFAULT '{}',
    by_priority             JSONB NOT NULL DEFAULT '{}',
    completed_count         INTEGER NOT NULL DEFAULT 0,
    story_points_completed  INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_daily_snapshot_project_date
        UNIQUE (project_id, snapshot_date)
);

CREATE INDEX ix_daily_snapshots_project_id
    ON daily_snapshots(project_id);
```

**`by_status` JSONB structure** (aggregated by workflow status category):

```json
{
    "to_do": 15,
    "in_progress": 8,
    "done": 22
}
```

**`by_priority` JSONB structure:**

```json
{
    "high": 10,
    "medium": 20,
    "low": 15
}
```

**Notes:**
- Unique constraint on `(project_id, snapshot_date)` prevents duplicate snapshots
- The Celery Beat task runs once per day (86400s interval), checking for existing rows for idempotency
- `by_status` stores counts aggregated by category (to_do, in_progress, done), not raw status UUIDs
- `completed_count` and `story_points_completed` track terminal-status ticket metrics

**SQLAlchemy Model:**

```python
class DailySnapshot(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "daily_snapshots"
    __table_args__ = (
        UniqueConstraint("project_id", "snapshot_date", name="uq_daily_snapshot_project_date"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_tickets: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    by_status: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    by_priority: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    completed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    story_points_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default="now()", nullable=False,
    )
```

---

## Existing Table: `ticket_dependencies`

Created in the Phase 1 migration but had no API endpoints or frontend UI. Phase 2.3 adds the API and UI.

```sql
-- Already exists from Phase 1 migration
CREATE TABLE ticket_dependencies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocking_ticket_id  UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    blocked_ticket_id   UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    dependency_type     VARCHAR(20) NOT NULL DEFAULT 'blocks',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_ticket_deps_blocking_blocked
        UNIQUE (blocking_ticket_id, blocked_ticket_id)
);

CREATE INDEX ix_ticket_dependencies_blocked_ticket_id
    ON ticket_dependencies(blocked_ticket_id);
```

**Dependency types** (stored in `dependency_type` column):
- `blocks` -- blocking_ticket blocks blocked_ticket
- `relates_to` -- bidirectional relationship (stored as single row)
- `duplicates` -- blocking_ticket duplicates blocked_ticket

**API interpretation:**
- When a user adds a "blocks" dependency from ticket A to ticket B: `blocking_ticket_id=A, blocked_ticket_id=B, type=blocks`
- When a user adds an "is_blocked_by" dependency from ticket A to ticket B: `blocking_ticket_id=B, blocked_ticket_id=A, type=blocks` (inverse storage)
- When a user adds a "relates_to" dependency: `blocking_ticket_id=A, blocked_ticket_id=B, type=relates_to`
- The unique constraint prevents duplicate A->B entries, but A->B and B->A are both allowed for `blocks` type

---

## Relationship Additions to Existing Models

### `Ticket` model (modification)

Add relationship for attachments:

```python
# In backend/app/models/ticket.py, add to Ticket class:
attachments: Mapped[list["Attachment"]] = relationship(
    back_populates="ticket", cascade="all, delete-orphan",
)
```

No column changes to the tickets table.

---

## Migrations Summary

| Phase | Migration | Description |
|-------|-----------|-------------|
| 2.2 | `XXXX_attachments.py` | Create `attachments` table with indexes |
| 2.7 | `XXXX_daily_snapshots.py` | Create `daily_snapshots` table with unique constraint |

No migrations needed for:
- `ticket_dependencies` (already exists)
- Ticket model changes (relationship only, no new columns)
- Cache layer (Redis, no DB)
- Event system (in-memory + Redis Pub/Sub, no DB)

---

## Entity Relationship Additions

```
                    ┌─────────────┐
                    │   Ticket    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
     ┌──────────────┐ ┌─────────┐ ┌──────────────────┐
     │  Attachment   │ │ Comment │ │ TicketDependency  │
     │  (NEW Phase2) │ │         │ │ (existing, now    │
     │              │ │         │ │  with API)         │
     └──────────────┘ └─────────┘ └──────────────────┘

     ┌─────────────┐
     │   Project   │
     └──────┬──────┘
            │
            ▼
     ┌──────────────────┐
     │  DailySnapshot   │
     │  (NEW Phase2)    │
     └──────────────────┘
```
