from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    ProjectRole,
    PROJECT_ROLE_HIERARCHY,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.services import activity_service, project_service, ticket_service

router = APIRouter(tags=["activity"])


class ActivityLogRead(BaseModel):
    id: UUID
    ticket_id: UUID
    user_id: UUID | None = None
    user_name: str | None = None
    action: str
    field_name: str | None = None
    old_value: str | None = None
    new_value: str | None = None
    metadata_json: dict[str, Any] = {}
    created_at: datetime

    model_config = {"from_attributes": True}


async def _require_project_role(
    db: AsyncSession, project_id: UUID, user: User, minimum: ProjectRole
) -> None:
    project = await project_service.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    effective_role = await resolve_effective_project_role(
        user_id=user.id,
        project_id=project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )

    if effective_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this project",
        )
    if PROJECT_ROLE_HIERARCHY[effective_role] < PROJECT_ROLE_HIERARCHY[minimum]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires {minimum.value} role or higher",
        )


@router.get(
    "/tickets/{ticket_id}/activity",
    response_model=PaginatedResponse[ActivityLogRead],
)
async def list_activity(
    ticket_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List activity log for a ticket. Requires guest+ access."""
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await _require_project_role(db, ticket.project_id, user, ProjectRole.GUEST)

    entries, total = await activity_service.list_activity(
        db, ticket_id, offset=offset, limit=limit,
    )
    return PaginatedResponse(
        items=[ActivityLogRead(**e) for e in entries],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.get(
    "/projects/{project_id}/audit-log",
    response_model=PaginatedResponse[ActivityLogRead],
)
async def list_project_audit_log(
    project_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    action: str | None = Query(None),
    user_id: UUID | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)
    entries, total = await activity_service.list_project_activity(
        db, project_id, offset=offset, limit=limit,
        action_filter=action, user_id_filter=user_id,
    )
    return PaginatedResponse(
        items=[ActivityLogRead(**e) for e in entries],
        total=total,
        offset=offset,
        limit=limit,
    )
