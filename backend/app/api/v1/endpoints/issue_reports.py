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
from app.schemas.issue_report import (
    CreateTicketFromReports,
    IssueReportCreate,
    IssueReportRead,
    IssueReportReporterCreate,
    IssueReportReporterRead,
    IssueReportUpdate,
    SimilarReportRead,
)
from app.schemas.ticket import TicketRead
from app.services import issue_report_service, project_service

router = APIRouter(tags=["issue-reports"])


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


async def _enrich_report(db: AsyncSession, report) -> IssueReportRead:
    """Build an IssueReportRead from an ORM IssueReport, resolving display names."""
    from app.models.user import User as UserModel
    from sqlalchemy import select

    created_by_name = None
    if report.created_by:
        u = (await db.execute(select(UserModel.display_name).where(UserModel.id == report.created_by))).scalar_one_or_none()
        created_by_name = u

    reporters = []
    if hasattr(report, "reporters") and report.reporters:
        for r in report.reporters:
            name = (await db.execute(select(UserModel.display_name).where(UserModel.id == r.user_id))).scalar_one_or_none()
            reporters.append(IssueReportReporterRead(
                user_id=r.user_id,
                display_name=name,
                original_description=r.original_description,
                created_at=r.created_at,
            ))

    linked_tickets = []
    if hasattr(report, "ticket_links") and report.ticket_links:
        from app.models.ticket import Ticket
        from app.models.project import Project
        for link in report.ticket_links:
            ticket_row = (await db.execute(
                select(Ticket.ticket_number, Ticket.title, Ticket.project_id).where(Ticket.id == link.ticket_id)
            )).one_or_none()
            ticket_key = None
            ticket_title = None
            if ticket_row:
                proj = (await db.execute(select(Project.key).where(Project.id == ticket_row.project_id))).scalar_one_or_none()
                ticket_key = f"{proj}-{ticket_row.ticket_number}" if proj else None
                ticket_title = ticket_row.title
            linked_tickets.append({
                "ticket_id": link.ticket_id,
                "ticket_key": ticket_key,
                "ticket_title": ticket_title,
                "created_at": link.created_at,
            })

    return IssueReportRead(
        id=report.id,
        project_id=report.project_id,
        title=report.title,
        description=report.description,
        status=report.status,
        priority=report.priority,
        created_by=report.created_by,
        created_by_name=created_by_name,
        reporter_count=report.reporter_count,
        created_at=report.created_at,
        updated_at=report.updated_at,
        reporters=reporters,
        linked_tickets=linked_tickets,
    )


@router.post(
    "/projects/{project_id}/issue-reports",
    response_model=IssueReportRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_issue_report(
    project_id: UUID,
    body: IssueReportCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    report = await issue_report_service.create_issue_report(
        db,
        project_id=project_id,
        title=body.title,
        description=body.description,
        priority=body.priority,
        created_by=user.id,
    )

    report_full = await issue_report_service.get_issue_report(db, report.id)

    await events.publish(
        events.EVENT_ISSUE_REPORT_CREATED,
        issue_report_id=str(report.id),
        project_id=str(project_id),
        actor_id=str(user.id),
    )

    return await _enrich_report(db, report_full)


@router.get(
    "/projects/{project_id}/issue-reports/similar",
    response_model=list[SimilarReportRead],
)
async def find_similar_reports(
    project_id: UUID,
    q: str = Query(..., min_length=1),
    limit: int = Query(5, ge=1, le=20),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)
    results = await issue_report_service.find_similar_reports(db, project_id, q, limit=limit)
    return results


@router.get(
    "/projects/{project_id}/issue-reports",
    response_model=PaginatedResponse[IssueReportRead],
)
async def list_issue_reports(
    project_id: UUID,
    status: str | None = Query(None),
    priority: str | None = Query(None),
    q: str | None = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    reports, total = await issue_report_service.list_issue_reports(
        db,
        project_id,
        status=status,
        priority=priority,
        search=q,
        sort_by=sort_by,
        sort_dir=sort_dir,
        offset=offset,
        limit=limit,
    )

    items = []
    for r in reports:
        items.append(IssueReportRead(
            id=r.id,
            project_id=r.project_id,
            title=r.title,
            description=r.description,
            status=r.status,
            priority=r.priority,
            created_by=r.created_by,
            reporter_count=r.reporter_count,
            created_at=r.created_at,
            updated_at=r.updated_at,
        ))

    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get(
    "/projects/{project_id}/issue-reports/{report_id}",
    response_model=IssueReportRead,
)
async def get_issue_report(
    project_id: UUID,
    report_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    report = await issue_report_service.get_issue_report(db, report_id)
    if report is None or report.project_id != project_id:
        raise HTTPException(status_code=404, detail="Issue report not found")

    return await _enrich_report(db, report)


@router.patch(
    "/projects/{project_id}/issue-reports/{report_id}",
    response_model=IssueReportRead,
)
async def update_issue_report(
    project_id: UUID,
    report_id: UUID,
    body: IssueReportUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)

    existing = await issue_report_service.get_issue_report(db, report_id)
    if existing is None or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Issue report not found")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    report = await issue_report_service.update_issue_report(db, report_id, **updates)
    return await _enrich_report(db, report)


@router.delete(
    "/projects/{project_id}/issue-reports/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_issue_report(
    project_id: UUID,
    report_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.MAINTAINER)

    existing = await issue_report_service.get_issue_report(db, report_id)
    if existing is None or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Issue report not found")

    await issue_report_service.dismiss_issue_report(db, report_id)


@router.post(
    "/projects/{project_id}/issue-reports/{report_id}/reporters",
    response_model=IssueReportReporterRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_reporter(
    project_id: UUID,
    report_id: UUID,
    body: IssueReportReporterCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    existing = await issue_report_service.get_issue_report(db, report_id)
    if existing is None or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="Issue report not found")

    target_user_id = body.user_id or user.id

    try:
        reporter = await issue_report_service.add_reporter(
            db, report_id, target_user_id, body.original_description,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    from sqlalchemy import select as sa_select
    display_name = (await db.execute(
        sa_select(User.display_name).where(User.id == target_user_id)
    )).scalar_one_or_none()

    await events.publish(
        events.EVENT_ISSUE_REPORT_REPORTER_ADDED,
        issue_report_id=str(report_id),
        project_id=str(project_id),
        actor_id=str(user.id),
        reporter_user_id=str(target_user_id),
    )

    return IssueReportReporterRead(
        user_id=reporter.user_id,
        display_name=display_name,
        original_description=reporter.original_description,
        created_at=reporter.created_at,
    )


@router.get(
    "/projects/{project_id}/issue-reports/{report_id}/reporters",
    response_model=list[IssueReportReporterRead],
)
async def list_reporters(
    project_id: UUID,
    report_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    reporters = await issue_report_service.list_reporters(db, report_id)

    from sqlalchemy import select as sa_select
    result = []
    for r in reporters:
        display_name = (await db.execute(
            sa_select(User.display_name).where(User.id == r.user_id)
        )).scalar_one_or_none()
        result.append(IssueReportReporterRead(
            user_id=r.user_id,
            display_name=display_name,
            original_description=r.original_description,
            created_at=r.created_at,
        ))
    return result


@router.post(
    "/projects/{project_id}/issue-reports/create-ticket",
    status_code=status.HTTP_201_CREATED,
)
async def create_ticket_from_reports(
    project_id: UUID,
    body: CreateTicketFromReports,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)

    try:
        ticket, linked_count = await issue_report_service.create_ticket_from_reports(
            db,
            project_id=project_id,
            issue_report_ids=body.issue_report_ids,
            reporter_id=user.id,
            title=body.title,
            description=body.description,
            ticket_type=body.ticket_type,
            priority=body.priority,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    project = await project_service.get_project(db, project_id)
    ticket_read = TicketRead.model_validate(ticket)
    ticket_read.project_key = project.key if project else None

    await events.publish(
        events.EVENT_TICKET_CREATED_FROM_ISSUES,
        ticket_id=str(ticket.id),
        project_id=str(project_id),
        actor_id=str(user.id),
        issue_report_ids=[str(rid) for rid in body.issue_report_ids],
    )

    return {"ticket": ticket_read, "linked_reports": linked_count}


@router.get(
    "/tickets/{ticket_id}/issue-reports",
)
async def get_ticket_issue_reports(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get issue reports linked to a specific ticket."""
    return await issue_report_service.get_ticket_issue_report_links(db, ticket_id)
