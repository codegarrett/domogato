from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.epic import EpicCreate, EpicRead, EpicUpdate
from app.services import epic_service, project_service

router = APIRouter(tags=["epics"])


async def _require_project_role(
    db: AsyncSession, project_id: UUID, user: User, minimum: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[minimum]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.post(
    "/projects/{project_id}/epics",
    response_model=EpicRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_epic(
    project_id: UUID,
    body: EpicCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)
    epic = await epic_service.create_epic(
        db,
        project_id=project_id,
        title=body.title,
        description=body.description,
        status=body.status or "open",
        color=body.color or "#3B82F6",
        start_date=body.start_date,
        target_date=body.target_date,
        created_by_id=user.id,
    )
    return epic


@router.get(
    "/projects/{project_id}/epics",
    response_model=PaginatedResponse[EpicRead],
)
async def list_epics(
    project_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)
    epics, total = await epic_service.list_epics(db, project_id, offset=offset, limit=limit)
    return PaginatedResponse(
        items=[EpicRead.model_validate(e) for e in epics],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get("/epics/{epic_id}", response_model=EpicRead)
async def get_epic(
    epic_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    epic = await epic_service.get_epic(db, epic_id)
    if epic is None:
        raise HTTPException(status_code=404, detail="Epic not found")
    await _require_project_role(db, epic.project_id, user, ProjectRole.GUEST)
    return epic


@router.patch("/epics/{epic_id}", response_model=EpicRead)
async def update_epic(
    epic_id: UUID,
    body: EpicUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    epic = await epic_service.get_epic(db, epic_id)
    if epic is None:
        raise HTTPException(status_code=404, detail="Epic not found")
    await _require_project_role(db, epic.project_id, user, ProjectRole.DEVELOPER)
    update_data = body.model_dump(exclude_unset=True)
    updated = await epic_service.update_epic(db, epic_id, **update_data)
    return updated


@router.delete("/epics/{epic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_epic(
    epic_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    epic = await epic_service.get_epic(db, epic_id)
    if epic is None:
        raise HTTPException(status_code=404, detail="Epic not found")
    await _require_project_role(db, epic.project_id, user, ProjectRole.MAINTAINER)
    await epic_service.delete_epic(db, epic_id)
