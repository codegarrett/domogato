"""System-admin endpoints for embedding management."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.permissions import require_system_admin
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.embedding_admin import (
    DeleteContentEmbeddingsRequest,
    DeleteEmbeddingsOut,
    EmbeddingDetailOut,
    EmbeddingListItem,
    EmbeddingReindexOut,
    EmbeddingStatsOut,
    SemanticSearchOut,
    SemanticSearchRequest,
)
from app.services import embedding_admin_service

router = APIRouter(prefix="/admin/embeddings", tags=["admin-embeddings"])


@router.get("/stats", response_model=EmbeddingStatsOut)
async def get_stats(
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    return await embedding_admin_service.get_embedding_stats(db)


@router.get("", response_model=PaginatedResponse[EmbeddingListItem])
async def list_embeddings(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    project_id: UUID | None = Query(None),
    content_type: str | None = Query(None),
    q: str | None = Query(None, description="Search chunk text and metadata"),
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    items, total = await embedding_admin_service.list_embeddings(
        db,
        offset=offset,
        limit=limit,
        project_id=project_id,
        content_type=content_type,
        q=q,
    )
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("/semantic-search", response_model=SemanticSearchOut)
async def semantic_search(
    body: SemanticSearchRequest,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    return await embedding_admin_service.admin_semantic_search(
        db,
        query=body.query,
        project_id=body.project_id,
        content_types=body.content_types,
        limit=body.limit,
    )


@router.delete("/content", response_model=DeleteEmbeddingsOut)
async def delete_content_embeddings(
    body: DeleteContentEmbeddingsRequest,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    return await embedding_admin_service.delete_content_embeddings(
        db,
        content_type=body.content_type,
        content_id=body.content_id,
    )


@router.post(
    "/projects/{project_id}/reindex",
    response_model=EmbeddingReindexOut,
)
async def reindex_project(
    project_id: UUID,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    return await embedding_admin_service.reindex_project(db, project_id)


@router.post(
    "/content/{content_type}/{content_id}/reindex",
    response_model=EmbeddingReindexOut,
)
async def reindex_content(
    content_type: str,
    content_id: UUID,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    return await embedding_admin_service.reindex_content(
        db,
        content_type=content_type,
        content_id=content_id,
    )


@router.get("/{embedding_id}", response_model=EmbeddingDetailOut)
async def get_embedding(
    embedding_id: UUID,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    return await embedding_admin_service.get_embedding(db, embedding_id)


@router.delete("/{embedding_id}", response_model=DeleteEmbeddingsOut)
async def delete_embedding(
    embedding_id: UUID,
    _admin: User = require_system_admin(),
    db: AsyncSession = Depends(get_db),
):
    return await embedding_admin_service.delete_embedding_row(db, embedding_id)
