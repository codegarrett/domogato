from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.label import LabelCreate, LabelRead, LabelUpdate
from app.services import label_service, project_service, ticket_service

router = APIRouter(tags=["labels"])


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
    "/projects/{project_id}/labels",
    response_model=LabelRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_label(
    project_id: UUID,
    body: LabelCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.MAINTAINER)
    label = await label_service.create_label(
        db, project_id=project_id, name=body.name,
        color=body.color or "#6B7280", description=body.description,
    )
    return label


@router.get("/projects/{project_id}/labels", response_model=list[LabelRead])
async def list_labels(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)
    labels = await label_service.list_labels(db, project_id)
    return [LabelRead.model_validate(lbl) for lbl in labels]


@router.patch("/labels/{label_id}", response_model=LabelRead)
async def update_label(
    label_id: UUID,
    body: LabelUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    label = await label_service.get_label(db, label_id)
    if label is None:
        raise HTTPException(status_code=404, detail="Label not found")
    await _require_project_role(db, label.project_id, user, ProjectRole.MAINTAINER)
    update_data = body.model_dump(exclude_unset=True)
    updated = await label_service.update_label(db, label_id, **update_data)
    return updated


@router.delete("/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    label_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    label = await label_service.get_label(db, label_id)
    if label is None:
        raise HTTPException(status_code=404, detail="Label not found")
    await _require_project_role(db, label.project_id, user, ProjectRole.MAINTAINER)
    await label_service.delete_label(db, label_id)


@router.get("/tickets/{ticket_id}/labels", response_model=list[LabelRead])
async def list_ticket_labels(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.GUEST)
    labels = await label_service.get_labels_for_ticket(db, ticket_id)
    return [LabelRead.model_validate(lbl) for lbl in labels]


@router.post(
    "/tickets/{ticket_id}/labels/{label_id}",
    status_code=status.HTTP_201_CREATED,
)
async def add_label_to_ticket(
    ticket_id: UUID,
    label_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.DEVELOPER)
    await label_service.add_label_to_ticket(db, ticket_id, label_id)


@router.delete(
    "/tickets/{ticket_id}/labels/{label_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_label_from_ticket(
    ticket_id: UUID,
    label_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.DEVELOPER)
    removed = await label_service.remove_label_from_ticket(db, ticket_id, label_id)
    if not removed:
        raise HTTPException(status_code=404, detail="Label not attached to this ticket")
