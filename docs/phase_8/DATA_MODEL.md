# Phase 8 Data Model

## Overview

Phase 8 introduces three new tables (`ai_conversations`, `ai_messages`, `ai_embeddings`) and enables the pgvector PostgreSQL extension for vector storage. One Alembic migration handles the extension and all three tables.

## PostgreSQL Extension: pgvector

The `vector` extension must be enabled before creating the embeddings table:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This requires the `pgvector/pgvector:pg16` Docker image (replacing `postgres:16-alpine`) which includes the extension pre-installed.

---

## New Table: `ai_conversations`

Stores chat conversation sessions, each belonging to a single user.

```sql
CREATE TABLE ai_conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(500),
    model       VARCHAR(200),
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX ix_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
```

### Column Details

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `UUID` | NOT NULL | Primary key, auto-generated |
| `user_id` | `UUID` (FK → users.id) | NOT NULL | Owner of the conversation |
| `title` | `VARCHAR(500)` | YES | Auto-generated from first user message (truncated to 80 chars) |
| `model` | `VARCHAR(200)` | YES | LLM model used (e.g., `"kimi-k2.5"`, `"gpt-4o"`) |
| `is_archived` | `BOOLEAN` | NOT NULL | Soft-archive flag for future use |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Conversation creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Updated on each new message |

### Indexes

- `ix_ai_conversations_user_id` — fast lookup of a user's conversations
- `ix_ai_conversations_updated_at` — supports sorting by most recent activity

### Cascade Behavior

- `ON DELETE CASCADE` on `user_id`: deleting a user deletes all their conversations

---

## New Table: `ai_messages`

Stores individual messages within a conversation. Both user messages and assistant responses are stored here.

```sql
CREATE TABLE ai_messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role              VARCHAR(20) NOT NULL,
    content           TEXT NOT NULL,
    model             VARCHAR(200),
    prompt_tokens     INTEGER,
    completion_tokens INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_ai_messages_conversation_id ON ai_messages(conversation_id);
```

### Column Details

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `UUID` | NOT NULL | Primary key, auto-generated |
| `conversation_id` | `UUID` (FK → ai_conversations.id) | NOT NULL | Parent conversation |
| `role` | `VARCHAR(20)` | NOT NULL | Message role: `"system"`, `"user"`, or `"assistant"` |
| `content` | `TEXT` | NOT NULL | Full message content |
| `model` | `VARCHAR(200)` | YES | Model that generated this message (NULL for user messages) |
| `prompt_tokens` | `INTEGER` | YES | Input token count (assistant messages only) |
| `completion_tokens` | `INTEGER` | YES | Output token count (assistant messages only) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Message creation timestamp |

### Column Notes

- `role` values: `"system"` (system prompt, not typically stored), `"user"` (human input), `"assistant"` (LLM response)
- `model`, `prompt_tokens`, `completion_tokens` are NULL for user messages and populated for assistant messages
- Token counts are reported by the LLM provider after streaming completes

### Cascade Behavior

- `ON DELETE CASCADE` on `conversation_id`: deleting a conversation deletes all its messages

---

## New Table: `ai_embeddings`

Stores vector embeddings for content across the platform. Uses pgvector's `VECTOR` type for efficient similarity search.

```sql
CREATE TABLE ai_embeddings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL,
    content_id   UUID NOT NULL,
    chunk_index  INTEGER NOT NULL DEFAULT 0,
    chunk_text   TEXT NOT NULL,
    embedding    VECTOR(1536) NOT NULL,
    metadata     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_ai_embeddings_content ON ai_embeddings(content_type, content_id);
```

### Column Details

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `UUID` | NOT NULL | Primary key, auto-generated |
| `content_type` | `VARCHAR(50)` | NOT NULL | Source entity type (e.g., `"ticket"`, `"kb_page"`, `"comment"`) |
| `content_id` | `UUID` | NOT NULL | ID of the source entity |
| `chunk_index` | `INTEGER` | NOT NULL | Index within a multi-chunk document (0 for single-chunk) |
| `chunk_text` | `TEXT` | NOT NULL | Original text that was embedded (for reference/debugging) |
| `embedding` | `VECTOR(1536)` | NOT NULL | The embedding vector (dimension configurable via `EMBEDDING_DIMENSIONS`) |
| `metadata` | `JSONB` | NOT NULL | Flexible metadata (e.g., project_id, title, URL) |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | Embedding creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | Last update timestamp |

### Column Notes

- `content_type` + `content_id` together identify the source entity. This is a polymorphic reference pattern (no FK constraint, since content can come from any table).
- `chunk_index` supports splitting long documents into multiple embedding chunks. For short content, this is always 0.
- `chunk_text` stores the original text for debugging and potential re-embedding without fetching the source entity.
- `embedding` uses `VECTOR(1536)` as default dimension. pgvector accepts any dimension at insert time, but a consistent dimension is required for indexing.
- `metadata` stores contextual information that may be useful when retrieving similar content (e.g., the project name, ticket title, page path).

### Indexes

- `ix_ai_embeddings_content` — composite index for looking up embeddings by source entity
- Vector index (HNSW or IVFFlat) will be added in a future phase when data volume warrants it:

```sql
-- Future: add when embedding count exceeds ~10,000
CREATE INDEX ix_ai_embeddings_vector ON ai_embeddings
  USING hnsw (embedding vector_cosine_ops);
```

### Planned Content Types

| Content Type | Source Table | Embedding Trigger (Future) |
|-------------|-------------|---------------------------|
| `ticket` | `tickets` | On create/update title+description |
| `kb_page` | `kb_pages` | On page version publish |
| `comment` | `comments` | On create |
| `kb_comment` | `kb_page_comments` | On create |

---

## Migration

### Single Migration: AI Tables + pgvector

File: `backend/alembic/versions/xxxx_ai_tables_and_pgvector.py`

```python
"""ai_tables_and_pgvector

Create the pgvector extension and AI-related tables for Phase 8.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector


def upgrade():
    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ai_conversations
    op.create_table(
        "ai_conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("model", sa.String(200), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ai_conversations_user_id", "ai_conversations", ["user_id"])
    op.create_index("ix_ai_conversations_updated_at", "ai_conversations", ["updated_at"])

    # ai_messages
    op.create_table(
        "ai_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("conversation_id", UUID(as_uuid=True), sa.ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("model", sa.String(200), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ai_messages_conversation_id", "ai_messages", ["conversation_id"])

    # ai_embeddings
    op.create_table(
        "ai_embeddings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("content_type", sa.String(50), nullable=False),
        sa.Column("content_id", UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column("metadata", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_ai_embeddings_content", "ai_embeddings", ["content_type", "content_id"])


def downgrade():
    op.drop_table("ai_embeddings")
    op.drop_table("ai_messages")
    op.drop_table("ai_conversations")
    op.execute("DROP EXTENSION IF EXISTS vector")
```

---

## Entity Relationship Diagram

```
┌──────────────┐         ┌───────────────────┐
│    users      │         │  ai_conversations  │
├──────────────┤         ├───────────────────┤
│ id (PK)      │◄────────│ user_id (FK)      │
│ email        │  CASCADE│ id (PK)           │
│ display_name │         │ title             │
│ ...          │         │ model             │
└──────────────┘         │ is_archived       │
                         │ created_at        │
                         │ updated_at        │
                         └────────┬──────────┘
                                  │
                                  │ CASCADE
                                  │
                         ┌────────┴──────────┐
                         │   ai_messages      │
                         ├───────────────────┤
                         │ id (PK)           │
                         │ conversation_id   │
                         │   (FK)            │
                         │ role              │
                         │ content           │
                         │ model             │
                         │ prompt_tokens     │
                         │ completion_tokens │
                         │ created_at        │
                         └───────────────────┘


┌───────────────────┐
│  ai_embeddings    │     (polymorphic — no FK)
├───────────────────┤
│ id (PK)           │     ┌──────────┐
│ content_type      │────▶│ tickets  │
│ content_id        │────▶│ kb_pages │
│ chunk_index       │────▶│ comments │
│ chunk_text        │     └──────────┘
│ embedding         │
│   (VECTOR 1536)   │
│ metadata (JSONB)  │
│ created_at        │
│ updated_at        │
└───────────────────┘
```

---

## Data Flow: Chat Message

```
User sends "How do I create a sprint?" in flyout
       │
       ▼
POST /ai/chat { conversation_id: null, message: "How do I..." }
       │
       ▼
INSERT INTO ai_conversations (user_id, title, model)
  VALUES ('user-uuid', 'How do I create a sprint?', 'kimi-k2.5')
  RETURNING id
       │
       ▼
INSERT INTO ai_messages (conversation_id, role, content)
  VALUES ('conv-uuid', 'user', 'How do I create a sprint?')
       │
       ▼
SELECT role, content FROM ai_messages
  WHERE conversation_id = 'conv-uuid'
  ORDER BY created_at
       │
       ▼
LLM provider.chat_completion_stream(messages)
  → Stream tokens to client via SSE
  → Accumulate full response
       │
       ▼
INSERT INTO ai_messages (conversation_id, role, content, model, prompt_tokens, completion_tokens)
  VALUES ('conv-uuid', 'assistant', '<full response>', 'kimi-k2.5', 245, 89)
       │
       ▼
UPDATE ai_conversations SET updated_at = now() WHERE id = 'conv-uuid'
```

---

## Data Flow: Embedding Creation (Foundation)

Phase 8 provides the infrastructure; automatic embedding triggers come in future phases.

```
Content is passed to embedding service
       │
       ▼
Split into chunks if text > chunk_size
       │
       ▼
embedding_provider.create_embeddings(["chunk1", "chunk2", ...])
       │
       ▼
Returns [[0.012, -0.034, ...], [0.045, 0.023, ...]]
       │
       ▼
INSERT INTO ai_embeddings (content_type, content_id, chunk_index, chunk_text, embedding, metadata)
  VALUES
    ('ticket', 'ticket-uuid', 0, 'chunk1 text', '[0.012, -0.034, ...]', '{"project_id": "..."}'),
    ('ticket', 'ticket-uuid', 1, 'chunk2 text', '[0.045, 0.023, ...]', '{"project_id": "..."}')
```

### Future: Similarity Search Query

```sql
SELECT content_type, content_id, chunk_text,
       embedding <=> $1 AS distance
FROM ai_embeddings
WHERE content_type = 'ticket'
ORDER BY embedding <=> $1
LIMIT 10;
```

The `<=>` operator computes cosine distance. Lower values = more similar.
