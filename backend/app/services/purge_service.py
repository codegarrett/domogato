"""Service to hard-delete all tickets, issue reports, and related data for a project.

This is a development convenience — it lets admins wipe ticket/issue data
from a project without dropping the entire database, which is useful when
iterating on imports and workflows.

Deletion order:
  1. Collect S3 keys from ticket attachments and issue-report attachments.
  2. Delete AI embeddings whose content references this project's data.
  3. Delete notifications whose entity points at a project ticket.
  4. Delete daily snapshots for the project.
  5. Delete issue reports  (CASCADE removes reporters, ticket_links, attachments, labels).
  6. Delete tickets         (CASCADE removes comments, labels, attachments, activity,
                             time logs, watchers, dependencies, child tickets,
                             kb_page_ticket_links, issue_report_ticket_links).
  7. Delete epics for the project.
  8. Reset project.ticket_sequence to 0.
  9. Best-effort S3 cleanup of collected keys.
"""
from __future__ import annotations

from uuid import UUID

import structlog
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_embedding import AIEmbedding
from app.models.attachment import Attachment
from app.models.daily_snapshot import DailySnapshot
from app.models.epic import Epic
from app.models.issue_report import IssueReport, IssueReportAttachment
from app.models.notification import Notification
from app.models.project import Project
from app.models.ticket import Ticket
from app.services import storage_service

logger = structlog.get_logger()


async def purge_project_data(db: AsyncSession, project_id: UUID) -> dict:
    """Hard-delete all tickets, issue reports, epics, and satellite data for a project.

    Returns a summary dict with counts of deleted rows.
    """
    summary: dict[str, int] = {}

    # -- 1. Collect S3 keys before the DB rows disappear -----------------------

    ticket_s3_rows = (
        await db.execute(
            select(Attachment.s3_key).where(Attachment.project_id == project_id)
        )
    ).scalars().all()

    ir_s3_rows = (
        await db.execute(
            select(IssueReportAttachment.s3_key)
            .join(IssueReport, IssueReport.id == IssueReportAttachment.issue_report_id)
            .where(IssueReport.project_id == project_id)
        )
    ).scalars().all()

    s3_keys: list[str] = list(ticket_s3_rows) + list(ir_s3_rows)

    # -- 2. AI embeddings (no FK cascade — project_id is SET NULL) -------------

    ticket_ids_subq = select(Ticket.id).where(Ticket.project_id == project_id).scalar_subquery()
    ir_ids_subq = select(IssueReport.id).where(IssueReport.project_id == project_id).scalar_subquery()

    res = await db.execute(
        delete(AIEmbedding).where(
            (AIEmbedding.project_id == project_id)
            | (
                (AIEmbedding.content_type == "ticket")
                & AIEmbedding.content_id.in_(ticket_ids_subq)
            )
            | (
                (AIEmbedding.content_type == "issue_report")
                & AIEmbedding.content_id.in_(ir_ids_subq)
            )
        )
    )
    summary["ai_embeddings"] = res.rowcount

    # -- 3. Notifications (no FK to tickets — entity_id is a bare UUID) --------

    res = await db.execute(
        delete(Notification).where(
            Notification.entity_type == "ticket",
            Notification.entity_id.in_(ticket_ids_subq),
        )
    )
    summary["notifications"] = res.rowcount

    # -- 4. Daily snapshots ----------------------------------------------------

    res = await db.execute(
        delete(DailySnapshot).where(DailySnapshot.project_id == project_id)
    )
    summary["daily_snapshots"] = res.rowcount

    # -- 5. Issue reports (CASCADE handles child tables) -----------------------

    res = await db.execute(
        delete(IssueReport).where(IssueReport.project_id == project_id)
    )
    summary["issue_reports"] = res.rowcount

    # -- 6. Tickets (CASCADE handles child tables) -----------------------------

    res = await db.execute(
        delete(Ticket).where(Ticket.project_id == project_id)
    )
    summary["tickets"] = res.rowcount

    # -- 7. Epics --------------------------------------------------------------

    res = await db.execute(
        delete(Epic).where(Epic.project_id == project_id)
    )
    summary["epics"] = res.rowcount

    # -- 8. Reset ticket sequence ----------------------------------------------

    await db.execute(
        update(Project)
        .where(Project.id == project_id)
        .values(ticket_sequence=0)
    )

    await db.flush()

    # -- 9. Best-effort S3 cleanup (runs after flush so we know DB is good) ----

    deleted_s3 = 0
    for key in s3_keys:
        try:
            await storage_service.delete_object(key)
            deleted_s3 += 1
        except Exception:
            await logger.awarning("purge_s3_delete_failed", s3_key=key)
    summary["s3_objects"] = deleted_s3

    await logger.ainfo(
        "project_data_purged",
        project_id=str(project_id),
        summary=summary,
    )

    return summary
