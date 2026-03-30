from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.issue_report import (
    IssueReport,
    IssueReportReporter,
    IssueReportTicketLink,
)
from app.models.ticket import Ticket
from app.models.project import Project
from app.services.ticket_service import create_ticket


async def create_issue_report(
    db: AsyncSession,
    *,
    project_id: UUID,
    title: str,
    description: str | None = None,
    priority: str = "medium",
    created_by: UUID,
    original_description: str | None = None,
) -> IssueReport:
    report = IssueReport(
        project_id=project_id,
        title=title,
        description=description,
        priority=priority,
        created_by=created_by,
        reporter_count=1,
    )
    db.add(report)
    await db.flush()

    reporter = IssueReportReporter(
        issue_report_id=report.id,
        user_id=created_by,
        original_description=original_description or description,
    )
    db.add(reporter)
    await db.flush()
    await db.refresh(report)
    return report


async def get_issue_report(
    db: AsyncSession, report_id: UUID,
) -> IssueReport | None:
    result = await db.execute(
        select(IssueReport)
        .options(
            selectinload(IssueReport.reporters),
            selectinload(IssueReport.ticket_links),
        )
        .where(IssueReport.id == report_id)
    )
    return result.scalar_one_or_none()


async def list_issue_reports(
    db: AsyncSession,
    project_id: UUID,
    *,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[IssueReport], int]:
    query = select(IssueReport).where(IssueReport.project_id == project_id)

    if status:
        query = query.where(IssueReport.status == status)
    if priority:
        query = query.where(IssueReport.priority == priority)
    if search:
        ts_query = func.plainto_tsquery("english", search)
        query = query.where(IssueReport.search_vector.op("@@")(ts_query))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    sort_column = getattr(IssueReport, sort_by, IssueReport.created_at)
    order = sort_column.desc() if sort_dir == "desc" else sort_column.asc()
    query = query.order_by(order).offset(offset).limit(limit)

    result = await db.execute(query)
    reports = list(result.scalars().all())
    return reports, total


async def update_issue_report(
    db: AsyncSession,
    report_id: UUID,
    **kwargs: Any,
) -> IssueReport | None:
    report = await get_issue_report(db, report_id)
    if report is None:
        return None

    for key, value in kwargs.items():
        if value is not None and hasattr(report, key):
            setattr(report, key, value)
    await db.flush()
    await db.refresh(report)
    return report


async def dismiss_issue_report(
    db: AsyncSession, report_id: UUID,
) -> IssueReport | None:
    report = await get_issue_report(db, report_id)
    if report is None:
        return None
    report.status = "dismissed"
    await db.flush()
    await db.refresh(report)
    return report


async def add_reporter(
    db: AsyncSession,
    report_id: UUID,
    user_id: UUID,
    original_description: str | None = None,
) -> IssueReportReporter:
    existing = (
        await db.execute(
            select(IssueReportReporter).where(
                IssueReportReporter.issue_report_id == report_id,
                IssueReportReporter.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ValueError("User is already a reporter on this issue")

    reporter = IssueReportReporter(
        issue_report_id=report_id,
        user_id=user_id,
        original_description=original_description,
    )
    db.add(reporter)

    await db.execute(
        update(IssueReport)
        .where(IssueReport.id == report_id)
        .values(reporter_count=IssueReport.reporter_count + 1)
    )

    await db.flush()
    await db.refresh(reporter)
    return reporter


async def list_reporters(
    db: AsyncSession, report_id: UUID,
) -> list[IssueReportReporter]:
    result = await db.execute(
        select(IssueReportReporter)
        .where(IssueReportReporter.issue_report_id == report_id)
        .order_by(IssueReportReporter.created_at.asc())
    )
    return list(result.scalars().all())


async def find_similar_reports(
    db: AsyncSession,
    project_id: UUID,
    query_text: str,
    *,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """FTS-based similarity search on open/reviewing issue reports."""
    ts_query = func.plainto_tsquery("english", query_text)

    stmt = (
        select(
            IssueReport.id,
            IssueReport.title,
            IssueReport.description,
            IssueReport.status,
            IssueReport.priority,
            IssueReport.reporter_count,
            func.ts_rank_cd(IssueReport.search_vector, ts_query).label("score"),
        )
        .where(
            IssueReport.project_id == project_id,
            IssueReport.status.in_(["open", "reviewing"]),
            IssueReport.search_vector.op("@@")(ts_query),
        )
        .order_by(func.ts_rank_cd(IssueReport.search_vector, ts_query).desc())
        .limit(limit)
    )

    rows = (await db.execute(stmt)).all()

    results = []
    for row in rows:
        results.append({
            "id": row.id,
            "title": row.title,
            "description": row.description,
            "status": row.status,
            "priority": row.priority,
            "reporter_count": row.reporter_count,
            "similarity_score": float(row.score) if row.score else 0.0,
        })
    return results


async def create_ticket_from_reports(
    db: AsyncSession,
    *,
    project_id: UUID,
    issue_report_ids: list[UUID],
    reporter_id: UUID,
    title: str | None = None,
    description: str | None = None,
    ticket_type: str = "bug",
    priority: str = "medium",
) -> tuple[Ticket, int]:
    """Create a ticket from selected issue reports, linking them automatically."""
    reports = (
        await db.execute(
            select(IssueReport).where(
                IssueReport.id.in_(issue_report_ids),
                IssueReport.project_id == project_id,
            )
        )
    ).scalars().all()

    if not reports:
        raise ValueError("No valid issue reports found")

    effective_title = title or reports[0].title
    if not description:
        parts = []
        for r in reports:
            parts.append(f"**{r.title}** ({r.reporter_count} reporter(s))")
            if r.description:
                parts.append(r.description)
            parts.append("")
        description = "\n".join(parts).strip()

    ticket = await create_ticket(
        db,
        project_id=project_id,
        title=effective_title,
        description=description,
        ticket_type=ticket_type,
        priority=priority,
        reporter_id=reporter_id,
    )

    for report in reports:
        link = IssueReportTicketLink(
            issue_report_id=report.id,
            ticket_id=ticket.id,
        )
        db.add(link)
        report.status = "ticket_created"

    await db.flush()
    await db.refresh(ticket)

    return ticket, len(reports)


async def get_ticket_issue_report_links(
    db: AsyncSession, ticket_id: UUID,
) -> list[dict[str, Any]]:
    """Get issue reports linked to a ticket."""
    stmt = (
        select(
            IssueReportTicketLink.created_at,
            IssueReport.id,
            IssueReport.title,
            IssueReport.status,
            IssueReport.priority,
            IssueReport.reporter_count,
        )
        .join(IssueReport, IssueReport.id == IssueReportTicketLink.issue_report_id)
        .where(IssueReportTicketLink.ticket_id == ticket_id)
        .order_by(IssueReportTicketLink.created_at.asc())
    )
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": str(row.id),
            "title": row.title,
            "status": row.status,
            "priority": row.priority,
            "reporter_count": row.reporter_count,
            "linked_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]
