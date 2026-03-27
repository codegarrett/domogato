from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
from app.models.kb_story_workflow import KBStoryWorkflowStatus
from app.models.user import User
from app.schemas.kb_story import (
    StoryWorkflowRead,
    StoryWorkflowStatusCreate,
    StoryWorkflowStatusRead,
    StoryWorkflowStatusUpdate,
)
from app.services import kb_story_service

router = APIRouter(tags=["knowledge-base"])


@router.get(
    "/projects/{project_id}/kb/story-workflow",
    response_model=StoryWorkflowRead,
)
async def get_story_workflow(
    project_id: UUID,
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    workflow = await kb_story_service.get_or_create_story_workflow(db, project_id)
    return StoryWorkflowRead.model_validate(workflow)


@router.post(
    "/projects/{project_id}/kb/story-workflow/statuses",
    response_model=StoryWorkflowStatusRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_workflow_status(
    project_id: UUID,
    body: StoryWorkflowStatusCreate,
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    workflow = await kb_story_service.get_or_create_story_workflow(db, project_id)
    s = await kb_story_service.add_workflow_status(
        db,
        workflow_id=workflow.id,
        name=body.name,
        category=body.category,
        color=body.color,
        position=body.position,
        is_initial=body.is_initial,
        is_terminal=body.is_terminal,
    )
    return StoryWorkflowStatusRead.model_validate(s)


@router.patch(
    "/projects/{project_id}/kb/story-workflow/statuses/{status_id}",
    response_model=StoryWorkflowStatusRead,
)
async def update_workflow_status(
    project_id: UUID,
    status_id: UUID,
    body: StoryWorkflowStatusUpdate,
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBStoryWorkflowStatus).where(KBStoryWorkflowStatus.id == status_id)
    )
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Status not found")

    update_data = body.model_dump(exclude_unset=True)
    s = await kb_story_service.update_workflow_status(db, s, update_data)
    return StoryWorkflowStatusRead.model_validate(s)


@router.delete(
    "/projects/{project_id}/kb/story-workflow/statuses/{status_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_workflow_status(
    project_id: UUID,
    status_id: UUID,
    _role: ProjectRole = require_project_role(ProjectRole.OWNER),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBStoryWorkflowStatus).where(KBStoryWorkflowStatus.id == status_id)
    )
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Status not found")

    if await kb_story_service.is_status_in_use(db, status_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a status that is currently in use by pages",
        )

    await kb_story_service.delete_workflow_status(db, s)
