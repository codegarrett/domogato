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
from app.schemas.dependency import DependencyCreate, DependencyRead
from app.services import dependency_service, project_service, ticket_service

router = APIRouter(tags=["dependencies"])


async def _require_project_role_via_ticket(
    db: AsyncSession, ticket_id: UUID, user: User, minimum: ProjectRole,
) -> None:
    if user.is_system_admin:
        return
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    project = await project_service.get_project(db, ticket.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=ticket.project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[minimum]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


async def _enrich_dependency(db: AsyncSession, dep) -> DependencyRead:
    read = DependencyRead.model_validate(dep)
    blocking = await ticket_service.get_ticket(db, dep.blocking_ticket_id)
    blocked = await ticket_service.get_ticket(db, dep.blocked_ticket_id)
    if blocking:
        proj = await project_service.get_project(db, blocking.project_id)
        read.blocking_ticket_title = blocking.title
        read.blocking_ticket_key = f"{proj.key}-{blocking.ticket_number}" if proj else None
    if blocked:
        proj = await project_service.get_project(db, blocked.project_id)
        read.blocked_ticket_title = blocked.title
        read.blocked_ticket_key = f"{proj.key}-{blocked.ticket_number}" if proj else None
    return read


@router.post(
    "/tickets/{ticket_id}/dependencies",
    response_model=DependencyRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_dependency(
    ticket_id: UUID,
    body: DependencyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role_via_ticket(db, ticket_id, user, ProjectRole.DEVELOPER)

    if body.dependency_type == "blocks":
        blocking_id, blocked_id = ticket_id, body.blocked_ticket_id
    elif body.dependency_type == "blocked_by":
        blocking_id, blocked_id = body.blocked_ticket_id, ticket_id
    else:
        blocking_id, blocked_id = ticket_id, body.blocked_ticket_id

    target = await ticket_service.get_ticket(db, body.blocked_ticket_id)
    if target is None:
        raise HTTPException(status_code=404, detail="Target ticket not found")

    try:
        dep = await dependency_service.create_dependency(
            db,
            blocking_ticket_id=blocking_id,
            blocked_ticket_id=blocked_id,
            dependency_type=body.dependency_type if body.dependency_type != "blocked_by" else "blocks",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return await _enrich_dependency(db, dep)


@router.get(
    "/tickets/{ticket_id}/dependencies",
    response_model=list[DependencyRead],
)
async def list_dependencies(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role_via_ticket(db, ticket_id, user, ProjectRole.GUEST)
    deps = await dependency_service.list_dependencies(db, ticket_id)
    return [await _enrich_dependency(db, d) for d in deps]


@router.delete(
    "/dependencies/{dependency_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_dependency(
    dependency_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from app.models.ticket import TicketDependency

    result = await db.execute(
        select(TicketDependency).where(TicketDependency.id == dependency_id)
    )
    dep = result.scalar_one_or_none()
    if dep is None:
        raise HTTPException(status_code=404, detail="Dependency not found")

    await _require_project_role_via_ticket(db, dep.blocking_ticket_id, user, ProjectRole.DEVELOPER)

    deleted = await dependency_service.delete_dependency(db, dependency_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dependency not found")
