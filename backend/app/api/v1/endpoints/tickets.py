from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core import events
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.ticket import TicketBulkUpdate, TicketCreate, TicketRead, TicketStatusTransition, TicketUpdate
from app.services import activity_service, project_service, ticket_service, watcher_service

router = APIRouter(tags=["tickets"])


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
    "/projects/{project_id}/tickets",
    response_model=TicketRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_ticket(
    project_id: UUID,
    body: TicketCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)
    project = await project_service.get_project(db, project_id)
    try:
        ticket = await ticket_service.create_ticket(
            db,
            project_id=project_id,
            title=body.title,
            description=body.description,
            ticket_type=body.ticket_type,
            priority=body.priority,
            assignee_id=body.assignee_id,
            reporter_id=user.id,
            epic_id=body.epic_id,
            story_points=body.story_points,
            due_date=body.due_date,
            start_date=body.start_date,
            parent_ticket_id=body.parent_ticket_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    await activity_service.log_activity(
        db, ticket_id=ticket.id, user_id=user.id, action="created",
    )

    initial_watchers = [user.id]
    if body.assignee_id and body.assignee_id != user.id:
        initial_watchers.append(body.assignee_id)
    await watcher_service.ensure_watchers(db, ticket.id, initial_watchers)

    await events.publish(
        events.EVENT_TICKET_CREATED,
        ticket_id=str(ticket.id),
        project_id=str(project_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    result = TicketRead.model_validate(ticket)
    result.project_key = project.key
    return result


@router.get(
    "/projects/{project_id}/tickets",
    response_model=PaginatedResponse[TicketRead],
)
async def list_tickets(
    project_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    ticket_type: str | None = None,
    priority: str | None = None,
    assignee_id: UUID | None = None,
    epic_id: UUID | None = None,
    sprint_id: UUID | None = None,
    workflow_status_id: UUID | None = None,
    is_deleted: bool = False,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)
    project = await project_service.get_project(db, project_id)
    tickets, total = await ticket_service.list_tickets(
        db, project_id,
        offset=offset, limit=limit,
        search=search,
        ticket_type=ticket_type, priority=priority,
        assignee_id=assignee_id, epic_id=epic_id,
        sprint_id=sprint_id, workflow_status_id=workflow_status_id,
        is_deleted=is_deleted, sort_by=sort_by, sort_dir=sort_dir,
    )
    items = []
    for t in tickets:
        r = TicketRead.model_validate(t)
        r.project_key = project.key
        items.append(r)
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/tickets/{ticket_id}", response_model=TicketRead)
async def get_ticket(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.GUEST)
    project = await project_service.get_project(db, ticket.project_id)
    result = TicketRead.model_validate(ticket)
    result.project_key = project.key
    return result


@router.patch("/tickets/{ticket_id}", response_model=TicketRead)
async def update_ticket(
    ticket_id: UUID,
    body: TicketUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.DEVELOPER)
    update_data = body.model_dump(exclude_unset=True)

    old_data = {k: getattr(ticket, k, None) for k in update_data}

    updated = await ticket_service.update_ticket(db, ticket_id, **update_data)

    new_data = {k: getattr(updated, k, None) for k in update_data}
    await activity_service.log_ticket_changes(
        db, ticket_id=ticket_id, user_id=user.id,
        old_data={k: str(v) if v is not None else None for k, v in old_data.items()},
        new_data={k: str(v) if v is not None else None for k, v in new_data.items()},
    )

    if "assignee_id" in update_data and body.assignee_id:
        await watcher_service.ensure_watchers(db, ticket_id, [body.assignee_id])

    await events.publish(
        events.EVENT_TICKET_UPDATED,
        ticket_id=str(ticket_id),
        project_id=str(ticket.project_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
        changed_fields=list(update_data.keys()),
    )

    project = await project_service.get_project(db, ticket.project_id)
    result = TicketRead.model_validate(updated)
    result.project_key = project.key
    return result


@router.post("/tickets/{ticket_id}/transition", response_model=TicketRead)
async def transition_ticket_status(
    ticket_id: UUID,
    body: TicketStatusTransition,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.DEVELOPER)

    old_status_id = str(ticket.workflow_status_id)

    try:
        updated = await ticket_service.transition_status(
            db, ticket_id, body.workflow_status_id, resolution=body.resolution,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    await activity_service.log_activity(
        db, ticket_id=ticket_id, user_id=user.id, action="transition",
        field_name="workflow_status_id",
        old_value=old_status_id,
        new_value=str(body.workflow_status_id),
    )

    await events.publish(
        events.EVENT_TICKET_STATUS_CHANGED,
        ticket_id=str(ticket_id),
        project_id=str(ticket.project_id),
        from_status_id=old_status_id,
        to_status_id=str(body.workflow_status_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    project = await project_service.get_project(db, ticket.project_id)
    result = TicketRead.model_validate(updated)
    result.project_key = project.key
    return result


@router.delete("/tickets/{ticket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ticket(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await _require_project_role(db, ticket.project_id, user, ProjectRole.MAINTAINER)
    await ticket_service.soft_delete_ticket(db, ticket_id)

    await events.publish(
        events.EVENT_TICKET_DELETED,
        ticket_id=str(ticket_id),
        project_id=str(ticket.project_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
    )


@router.post("/projects/{project_id}/tickets/bulk")
async def bulk_update_tickets(
    project_id: UUID,
    body: TicketBulkUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)
    fields = body.model_dump(exclude={"ticket_ids", "labels"}, exclude_unset=True, exclude_none=True)
    count = await ticket_service.bulk_update_tickets(db, body.ticket_ids, **fields)

    for tid in body.ticket_ids:
        await events.publish(
            events.EVENT_TICKET_UPDATED,
            ticket_id=str(tid),
            project_id=str(project_id),
            actor_id=str(user.id),
            actor_name=user.display_name,
            changed_fields=list(fields.keys()),
        )

    return {"updated": count}


@router.get("/projects/{project_id}/tickets/export")
async def export_tickets_csv(
    project_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import csv
    import io

    from starlette.responses import StreamingResponse

    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    rows = await ticket_service.export_tickets_csv(db, project_id)
    if not rows:
        return StreamingResponse(
            iter(["No tickets found"]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=tickets.csv"},
        )

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tickets_{project_id}.csv"},
    )
