from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.search import SearchResponse
from app.services import search_service

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, max_length=200),
    types: str | None = Query(None, description="Comma-separated: ticket,kb_page,comment"),
    project_id: UUID | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    type_list = [t.strip() for t in types.split(",")] if types else None
    return await search_service.global_search(
        db,
        user_id=user.id,
        query=q,
        types=type_list,
        project_id=project_id,
        limit=limit,
        is_system_admin=user.is_system_admin,
    )
