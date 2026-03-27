from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
from app.models.kb_page import KBPage
from app.models.user import User
from app.schemas.kb import SpaceCreate, SpaceRead, SpaceUpdate
from app.services import kb_service

router = APIRouter(tags=["knowledge-base"])


@router.get(
    "/projects/{project_id}/kb/spaces",
    response_model=list[SpaceRead],
)
async def list_spaces(
    project_id: UUID,
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    spaces = await kb_service.list_spaces(db, project_id)
    results: list[SpaceRead] = []
    for space in spaces:
        page_filter = [KBPage.space_id == space.id, KBPage.is_deleted == False]  # noqa: E712

        count = (
            await db.execute(
                select(func.count()).select_from(KBPage).where(*page_filter)
            )
        ).scalar_one()

        last_updated = (
            await db.execute(
                select(func.max(KBPage.updated_at)).where(*page_filter)
            )
        ).scalar_one()

        contributors = (
            await db.execute(
                select(func.count(func.distinct(KBPage.last_edited_by))).where(
                    *page_filter, KBPage.last_edited_by.is_not(None)
                )
            )
        ).scalar_one()

        item = SpaceRead.model_validate(space)
        item.page_count = count
        item.last_updated_at = last_updated
        item.contributor_count = contributors
        results.append(item)
    return results


@router.post(
    "/projects/{project_id}/kb/spaces",
    response_model=SpaceRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_space(
    project_id: UUID,
    body: SpaceCreate,
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    space = await kb_service.create_space(db, project_id, body, user_id=user.id)
    return SpaceRead.model_validate(space)


@router.get(
    "/projects/{project_id}/kb/spaces/{slug}",
    response_model=SpaceRead,
)
async def get_space(
    project_id: UUID,
    slug: str,
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    space = await kb_service.get_space_by_slug(db, project_id, slug)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    count = (
        await db.execute(
            select(func.count())
            .select_from(KBPage)
            .where(KBPage.space_id == space.id, KBPage.is_deleted == False)  # noqa: E712
        )
    ).scalar_one()
    item = SpaceRead.model_validate(space)
    item.page_count = count
    return item


@router.patch(
    "/projects/{project_id}/kb/spaces/{slug}",
    response_model=SpaceRead,
)
async def update_space(
    project_id: UUID,
    slug: str,
    body: SpaceUpdate,
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    space = await kb_service.get_space_by_slug(db, project_id, slug)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    updated = await kb_service.update_space(db, space, body)
    return SpaceRead.model_validate(updated)


@router.delete(
    "/projects/{project_id}/kb/spaces/{slug}",
    response_model=SpaceRead,
)
async def archive_space(
    project_id: UUID,
    slug: str,
    _role: ProjectRole = require_project_role(ProjectRole.OWNER),
    db: AsyncSession = Depends(get_db),
):
    space = await kb_service.get_space_by_slug(db, project_id, slug)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    archived = await kb_service.archive_space(db, space)
    return SpaceRead.model_validate(archived)
