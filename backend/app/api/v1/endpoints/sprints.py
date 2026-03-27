from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core import events
from app.core.permissions import ProjectRole, require_project_role
from app.models.user import User
from app.schemas.sprint import (
    BacklogMoveToSprintRequest,
    BacklogReorderRequest,
    SprintCompleteRequest,
    SprintCreate,
    SprintRead,
    SprintStats,
    SprintUpdate,
)
from app.schemas.ticket import TicketRead
from app.services import sprint_service

router = APIRouter(tags=["sprints"])


@router.get(
    "/projects/{project_id}/sprints",
    response_model=dict,
)
async def list_sprints(
    project_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status_filter: str | None = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    sprints, total = await sprint_service.list_sprints(
        db, project_id, offset=offset, limit=limit, status_filter=status_filter,
    )
    return {
        "items": [SprintRead.model_validate(s) for s in sprints],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post(
    "/projects/{project_id}/sprints",
    response_model=SprintRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_sprint(
    project_id: UUID,
    body: SprintCreate,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    sprint = await sprint_service.create_sprint(
        db,
        project_id=project_id,
        name=body.name,
        goal=body.goal,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    return SprintRead.model_validate(sprint)


@router.get(
    "/sprints/{sprint_id}",
    response_model=SprintStats,
)
async def get_sprint_detail(
    sprint_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sprint = await sprint_service.get_sprint(db, sprint_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    stats = await sprint_service.get_sprint_stats(db, sprint_id)
    return SprintStats(sprint=SprintRead.model_validate(sprint), **stats)


@router.patch(
    "/sprints/{sprint_id}",
    response_model=SprintRead,
)
async def update_sprint(
    sprint_id: UUID,
    body: SprintUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sprint = await sprint_service.get_sprint(db, sprint_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    update_data = body.model_dump(exclude_unset=True)
    updated = await sprint_service.update_sprint(db, sprint_id, **update_data)
    return SprintRead.model_validate(updated)


@router.delete(
    "/sprints/{sprint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_sprint(
    sprint_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sprint = await sprint_service.get_sprint(db, sprint_id)
    if sprint is None:
        raise HTTPException(status_code=404, detail="Sprint not found")
    await sprint_service.delete_sprint(db, sprint_id)


@router.post(
    "/sprints/{sprint_id}/start",
    response_model=SprintRead,
)
async def start_sprint(
    sprint_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        sprint = await sprint_service.start_sprint(db, sprint_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await events.publish(
        events.EVENT_SPRINT_STARTED,
        sprint_id=str(sprint.id),
        project_id=str(sprint.project_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    return SprintRead.model_validate(sprint)


@router.post(
    "/sprints/{sprint_id}/complete",
    response_model=SprintRead,
)
async def complete_sprint(
    sprint_id: UUID,
    body: SprintCompleteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        sprint = await sprint_service.complete_sprint(
            db, sprint_id, move_incomplete_to=body.move_incomplete_to,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    await events.publish(
        events.EVENT_SPRINT_COMPLETED,
        sprint_id=str(sprint.id),
        project_id=str(sprint.project_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
        velocity=sprint.velocity,
    )

    return SprintRead.model_validate(sprint)


# ---------- Backlog ----------


@router.get(
    "/projects/{project_id}/backlog",
    response_model=dict,
)
async def get_backlog(
    project_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    tickets, total = await sprint_service.get_backlog(
        db, project_id, offset=offset, limit=limit,
    )
    return {
        "items": [TicketRead.model_validate(t) for t in tickets],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post(
    "/projects/{project_id}/backlog/reorder",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def reorder_backlog(
    project_id: UUID,
    body: BacklogReorderRequest,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.DEVELOPER),
    db: AsyncSession = Depends(get_db),
):
    await sprint_service.reorder_backlog(db, project_id, body.ticket_ids)


@router.post(
    "/projects/{project_id}/backlog/move-to-sprint",
    status_code=status.HTTP_200_OK,
)
async def move_to_sprint(
    project_id: UUID,
    body: BacklogMoveToSprintRequest,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.MAINTAINER),
    db: AsyncSession = Depends(get_db),
):
    try:
        count = await sprint_service.move_tickets_to_sprint(
            db, project_id, body.ticket_ids, body.sprint_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"moved": count}
