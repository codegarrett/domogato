from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.issue_report import (
    IssueReport,
    IssueReportAttachment,
    IssueReportReporter,
    IssueReportTicketLink,
    issue_report_labels,
)
from app.models.label import Label
from app.models.ticket import Ticket
from app.models.project import Project
from app.services.ticket_service import create_ticket
from app.services import storage_service


async def create_issue_report(
    db: AsyncSession,
    *,
    project_id: UUID,
    title: str,
    description: str | None = None,
    priority: str = "medium",
    source_url: str | None = None,
    created_by: UUID | None = None,
    reporter_name: str | None = None,
    reporter_email: str | None = None,
    original_description: str | None = None,
    label_ids: list[UUID] | None = None,
) -> IssueReport:
    report = IssueReport(
        project_id=project_id,
        title=title,
        description=description,
        source_url=source_url,
        priority=priority,
        created_by=created_by,
        reporter_name=reporter_name,
        reporter_email=reporter_email,
        reporter_count=1,
    )
    db.add(report)
    await db.flush()

    if created_by:
        reporter = IssueReportReporter(
            issue_report_id=report.id,
            user_id=created_by,
            original_description=original_description or description,
        )
        db.add(reporter)

    await db.flush()

    if label_ids:
        valid_label_ids = (await db.execute(
            select(Label.id).where(
                Label.id.in_(label_ids),
                Label.project_id == project_id,
            )
        )).scalars().all()
        for lid in valid_label_ids:
            await db.execute(
                issue_report_labels.insert().values(
                    issue_report_id=report.id, label_id=lid,
                )
            )
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
            selectinload(IssueReport.attachments),
            selectinload(IssueReport.labels),
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
    base = select(IssueReport).where(IssueReport.project_id == project_id)

    if status:
        base = base.where(IssueReport.status == status)
    if priority:
        base = base.where(IssueReport.priority == priority)
    if search:
        ts_query = func.plainto_tsquery("english", search)
        base = base.where(IssueReport.search_vector.op("@@")(ts_query))

    count_query = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_query)).scalar_one()

    sort_column = getattr(IssueReport, sort_by, IssueReport.created_at)
    order = sort_column.desc() if sort_dir == "desc" else sort_column.asc()
    query = base.options(selectinload(IssueReport.labels)).order_by(order).offset(offset).limit(limit)

    result = await db.execute(query)
    reports = list(result.scalars().unique().all())
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


async def create_issue_report_attachment(
    db: AsyncSession,
    *,
    issue_report_id: UUID,
    project_id: UUID,
    uploaded_by_id: UUID | None,
    filename: str,
    content_type: str,
    size_bytes: int,
) -> tuple[IssueReportAttachment, str]:
    s3_key = storage_service.generate_s3_key(str(project_id), filename)
    attachment = IssueReportAttachment(
        issue_report_id=issue_report_id,
        uploaded_by_id=uploaded_by_id,
        filename=filename,
        content_type=content_type,
        size_bytes=size_bytes,
        s3_key=s3_key,
    )
    db.add(attachment)
    await db.flush()
    await db.refresh(attachment)
    upload_url = await storage_service.generate_upload_presign(s3_key, content_type)
    return attachment, upload_url


async def list_issue_report_attachments(
    db: AsyncSession, issue_report_id: UUID,
) -> list[IssueReportAttachment]:
    result = await db.execute(
        select(IssueReportAttachment)
        .where(IssueReportAttachment.issue_report_id == issue_report_id)
        .order_by(IssueReportAttachment.created_at.asc())
    )
    return list(result.scalars().all())


async def get_issue_report_attachment(
    db: AsyncSession, attachment_id: UUID,
) -> IssueReportAttachment | None:
    result = await db.execute(
        select(IssueReportAttachment).where(IssueReportAttachment.id == attachment_id)
    )
    return result.scalar_one_or_none()


async def delete_issue_report_attachment(
    db: AsyncSession, attachment_id: UUID,
) -> bool:
    attachment = await get_issue_report_attachment(db, attachment_id)
    if attachment is None:
        return False
    await storage_service.delete_object(attachment.s3_key)
    await db.delete(attachment)
    await db.flush()
    return True


async def add_label_to_issue_report(
    db: AsyncSession, issue_report_id: UUID, label_id: UUID,
) -> None:
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    stmt = pg_insert(issue_report_labels).values(
        issue_report_id=issue_report_id, label_id=label_id,
    ).on_conflict_do_nothing()
    await db.execute(stmt)
    await db.flush()


async def remove_label_from_issue_report(
    db: AsyncSession, issue_report_id: UUID, label_id: UUID,
) -> None:
    await db.execute(
        issue_report_labels.delete().where(
            issue_report_labels.c.issue_report_id == issue_report_id,
            issue_report_labels.c.label_id == label_id,
        )
    )
    await db.flush()


async def get_issue_report_labels(
    db: AsyncSession, issue_report_id: UUID,
) -> list[Label]:
    result = await db.execute(
        select(Label)
        .join(issue_report_labels, issue_report_labels.c.label_id == Label.id)
        .where(issue_report_labels.c.issue_report_id == issue_report_id)
        .order_by(Label.name)
    )
    return list(result.scalars().all())


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
