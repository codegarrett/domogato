from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.saved_view import SavedView
from app.models.user import User
from app.schemas.saved_view import SavedViewCreate, SavedViewRead, SavedViewUpdate

router = APIRouter(tags=["saved-views"])


@router.get(
    "/projects/{project_id}/views",
    response_model=list[SavedViewRead],
)
async def list_views(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(SavedView)
        .where(
            SavedView.project_id == project_id,
            (SavedView.user_id == user.id) | (SavedView.is_shared == True),  # noqa: E712
        )
        .order_by(SavedView.name)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post(
    "/projects/{project_id}/views",
    response_model=SavedViewRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_view(
    project_id: UUID,
    body: SavedViewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = SavedView(
        user_id=user.id,
        project_id=project_id,
        name=body.name,
        entity_type=body.entity_type,
        filters=body.filters,
        sort_by=body.sort_by,
        sort_dir=body.sort_dir,
        columns=body.columns,
        is_default=body.is_default,
        is_shared=body.is_shared,
    )
    db.add(view)
    await db.flush()
    await db.refresh(view)
    return view


@router.put(
    "/views/{view_id}",
    response_model=SavedViewRead,
)
async def update_view(
    view_id: UUID,
    body: SavedViewUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = (
        await db.execute(select(SavedView).where(SavedView.id == view_id))
    ).scalar_one_or_none()
    if view is None or view.user_id != user.id:
        raise HTTPException(status_code=404, detail="View not found")

    updates = body.model_dump(exclude_unset=True)
    if updates:
        await db.execute(
            update(SavedView).where(SavedView.id == view_id).values(**updates)
        )
        await db.flush()
        await db.refresh(view)
    return view


@router.delete(
    "/views/{view_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_view(
    view_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    view = (
        await db.execute(select(SavedView).where(SavedView.id == view_id))
    ).scalar_one_or_none()
    if view is None or view.user_id != user.id:
        raise HTTPException(status_code=404, detail="View not found")
    await db.execute(delete(SavedView).where(SavedView.id == view_id))
    await db.flush()
