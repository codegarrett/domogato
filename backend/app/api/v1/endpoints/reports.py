from __future__ import annotations

import csv
import io
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import ProjectRole, require_project_role
from app.models.user import User
from app.schemas.report import (
    BurndownReport,
    CumulativeFlowReport,
    CycleTimeReport,
    ProjectSummary,
    SprintReport,
    VelocityReport,
)
from app.services import report_service

router = APIRouter(tags=["reports"])


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    if not rows:
        buf = io.StringIO("")
    else:
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/projects/{project_id}/reports/summary",
    response_model=ProjectSummary,
)
async def get_project_summary(
    project_id: UUID,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.get_project_summary(db, project_id)


@router.get(
    "/projects/{project_id}/reports/velocity",
    response_model=VelocityReport,
)
async def get_velocity(
    project_id: UUID,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.get_velocity_report(db, project_id)


@router.get(
    "/projects/{project_id}/sprints/{sprint_id}/report",
    response_model=SprintReport,
)
async def get_sprint_report(
    project_id: UUID,
    sprint_id: UUID,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.get_sprint_report(db, sprint_id)


@router.get(
    "/sprints/{sprint_id}/reports/burndown",
    response_model=BurndownReport,
)
async def get_burndown(
    sprint_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.get_burndown_report(db, sprint_id)


@router.get(
    "/projects/{project_id}/reports/cumulative-flow",
    response_model=CumulativeFlowReport,
)
async def get_cumulative_flow(
    project_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.get_cumulative_flow(
        db, project_id, start_date, end_date,
    )


@router.get(
    "/projects/{project_id}/reports/cycle-time",
    response_model=CycleTimeReport,
)
async def get_cycle_time(
    project_id: UUID,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    return await report_service.get_cycle_time_report(
        db, project_id, start_date=start_date, end_date=end_date,
    )


# ── CSV exports ──────────────────────────────────────────────────


@router.get("/projects/{project_id}/reports/velocity/csv")
async def export_velocity_csv(
    project_id: UUID,
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    data = await report_service.get_velocity_report(db, project_id)
    rows = [
        {"sprint_name": e["sprint_name"], "velocity": e["velocity"]}
        for e in data["entries"]
    ]
    return _csv_response(rows, "velocity.csv")


@router.get("/projects/{project_id}/reports/cycle-time/csv")
async def export_cycle_time_csv(
    project_id: UUID,
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    data = await report_service.get_cycle_time_report(
        db, project_id, start_date=start_date, end_date=end_date,
    )
    rows = [
        {"ticket_key": e["ticket_key"], "title": e["title"], "cycle_time_hours": e["cycle_time_hours"]}
        for e in data["entries"]
    ]
    return _csv_response(rows, "cycle-time.csv")


@router.get("/projects/{project_id}/reports/cumulative-flow/csv")
async def export_cfd_csv(
    project_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    user: User = Depends(get_current_user),
    _role: ProjectRole = require_project_role(ProjectRole.GUEST),
    db: AsyncSession = Depends(get_db),
):
    data = await report_service.get_cumulative_flow(
        db, project_id, start_date, end_date,
    )
    rows = [
        {"date": d["date"], "todo": d["todo"], "in_progress": d["in_progress"], "done": d["done"]}
        for d in data["days"]
    ]
    return _csv_response(rows, "cumulative-flow.csv")
