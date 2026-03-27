from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
from app.models.user import User
from app.schemas.time_log import (
    TimeLogCreate,
    TimeLogRead,
    TimeLogUpdate,
    TimesheetReport,
)
from app.services import ticket_service, time_tracking_service

router = APIRouter(tags=["time-tracking"])


@router.post(
    "/tickets/{ticket_id}/time-logs",
    response_model=TimeLogRead,
    status_code=status.HTTP_201_CREATED,
)
async def log_time(
    ticket_id: UUID,
    body: TimeLogCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    entry = await time_tracking_service.log_time(
        db,
        ticket_id=ticket_id,
        project_id=ticket.project_id,
        user_id=user.id,
        seconds_spent=body.seconds_spent,
        work_date=body.work_date,
        description=body.description,
        activity_type=body.activity_type,
    )
    return TimeLogRead.model_validate(entry)


@router.get(
    "/tickets/{ticket_id}/time-logs",
    response_model=dict,
)
async def list_ticket_time_logs(
    ticket_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    entries, total = await time_tracking_service.list_time_logs_for_ticket(
        db, ticket_id, offset=offset, limit=limit,
    )
    return {
        "items": [TimeLogRead.model_validate(e) for e in entries],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get(
    "/tickets/{ticket_id}/time-summary",
)
async def get_ticket_time_summary(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ticket = await ticket_service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return await time_tracking_service.get_ticket_time_summary(db, ticket_id)


@router.patch(
    "/time-logs/{log_id}",
    response_model=TimeLogRead,
)
async def update_time_log(
    log_id: UUID,
    body: TimeLogUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await time_tracking_service.get_time_log(db, log_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Time log not found")
    if entry.user_id != user.id and not user.is_system_admin:
        raise HTTPException(status_code=403, detail="Can only edit your own time logs")

    update_data = body.model_dump(exclude_unset=True)
    updated = await time_tracking_service.update_time_log(db, log_id, **update_data)
    return TimeLogRead.model_validate(updated)


@router.delete(
    "/time-logs/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_time_log(
    log_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entry = await time_tracking_service.get_time_log(db, log_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Time log not found")
    if entry.user_id != user.id and not user.is_system_admin:
        raise HTTPException(status_code=403, detail="Can only delete your own time logs")
    await time_tracking_service.delete_time_log(db, log_id)


@router.get(
    "/projects/{project_id}/time-report",
)
async def get_project_time_report(
    project_id: UUID,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    user_id: UUID | None = Query(None),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    entries, total_count = await time_tracking_service.get_time_report_by_project(
        db, project_id, start_date=start_date, end_date=end_date, user_id=user_id,
    )
    total_seconds = sum(e.seconds_spent for e in entries)
    return {
        "total_seconds": total_seconds,
        "total_entries": total_count,
        "entries": [TimeLogRead.model_validate(e) for e in entries],
    }


@router.get(
    "/users/me/timesheet",
    response_model=TimesheetReport,
)
async def get_my_timesheet(
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if (end_date - start_date).days > 90:
        raise HTTPException(
            status_code=400,
            detail="Date range cannot exceed 90 days",
        )
    result = await time_tracking_service.get_timesheet(
        db, user.id, start_date, end_date,
    )
    return result
