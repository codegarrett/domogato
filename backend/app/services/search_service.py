from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, literal, select, text, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.kb_page import KBPage
from app.models.kb_space import KBSpace
from app.models.membership import ProjectMembership
from app.models.project import Project
from app.models.ticket import Ticket
from app.models.workflow import WorkflowStatus


async def global_search(
    db: AsyncSession,
    *,
    user_id: UUID,
    query: str,
    types: list[str] | None = None,
    project_id: UUID | None = None,
    limit: int = 20,
    is_system_admin: bool = False,
) -> dict[str, Any]:
    if not query or not query.strip():
        return {"results": [], "total": 0}

    allowed_types = types or ["ticket", "kb_page", "comment"]
    q = query.strip()
    ts_query = func.plainto_tsquery("english", q)
    like_pattern = f"%{q}%"

    sub_queries = []

    if "ticket" in allowed_types:
        ticket_q = (
            select(
                literal("ticket").label("type"),
                Ticket.id.label("id"),
                Ticket.title.label("title"),
                func.concat(
                    Project.key, literal("-"), Ticket.ticket_number,
                    literal(" · "), Ticket.ticket_type, literal(" · "), Ticket.priority,
                ).label("subtitle"),
                func.ts_headline("english", func.coalesce(Ticket.description, literal("")), ts_query).label("highlight"),
                func.concat(literal("/tickets/"), Ticket.id).label("url"),
                Ticket.project_id.label("project_id"),
                Ticket.updated_at.label("updated_at"),
                func.ts_rank(Ticket.search_vector, ts_query).label("rank"),
            )
            .join(Project, Project.id == Ticket.project_id)
            .where(
                Ticket.is_deleted == False,  # noqa: E712
                Ticket.search_vector.op("@@")(ts_query),
            )
        )
        if project_id:
            ticket_q = ticket_q.where(Ticket.project_id == project_id)
        if not is_system_admin:
            ticket_q = ticket_q.where(
                Ticket.project_id.in_(
                    select(ProjectMembership.project_id).where(
                        ProjectMembership.user_id == user_id
                    )
                )
                | (Project.visibility == "public")
            )
        sub_queries.append(ticket_q)

    if "kb_page" in allowed_types:
        kb_q = (
            select(
                literal("kb_page").label("type"),
                KBPage.id.label("id"),
                KBPage.title.label("title"),
                func.concat(KBSpace.name).label("subtitle"),
                func.ts_headline(
                    "english",
                    func.coalesce(KBPage.content_markdown, literal("")),
                    ts_query,
                ).label("highlight"),
                func.concat(
                    literal("/projects/"),
                    KBSpace.project_id,
                    literal("/kb/"),
                    KBSpace.slug,
                    literal("/"),
                    KBPage.slug,
                ).label("url"),
                KBSpace.project_id.label("project_id"),
                KBPage.updated_at.label("updated_at"),
                func.ts_rank(KBPage.search_vector, ts_query).label("rank"),
            )
            .join(KBSpace, KBSpace.id == KBPage.space_id)
            .where(
                KBPage.is_deleted == False,  # noqa: E712
                KBPage.is_published == True,  # noqa: E712
                KBPage.search_vector.op("@@")(ts_query),
            )
        )
        if project_id:
            kb_q = kb_q.where(KBSpace.project_id == project_id)
        if not is_system_admin:
            kb_q = kb_q.where(
                KBSpace.project_id.in_(
                    select(ProjectMembership.project_id).where(
                        ProjectMembership.user_id == user_id
                    )
                )
            )
        sub_queries.append(kb_q)

    if "comment" in allowed_types:
        comment_q = (
            select(
                literal("comment").label("type"),
                Comment.id.label("id"),
                func.concat(literal("Comment on "), Ticket.title).label("title"),
                func.concat(
                    Project.key, literal("-"), Ticket.ticket_number,
                ).label("subtitle"),
                func.substr(Comment.body, 1, 200).label("highlight"),
                func.concat(literal("/tickets/"), Ticket.id).label("url"),
                Ticket.project_id.label("project_id"),
                Comment.updated_at.label("updated_at"),
                literal(0.1).label("rank"),
            )
            .join(Ticket, Ticket.id == Comment.ticket_id)
            .join(Project, Project.id == Ticket.project_id)
            .where(
                Ticket.is_deleted == False,  # noqa: E712
                Comment.body.ilike(like_pattern),
            )
        )
        if project_id:
            comment_q = comment_q.where(Ticket.project_id == project_id)
        if not is_system_admin:
            comment_q = comment_q.where(
                Ticket.project_id.in_(
                    select(ProjectMembership.project_id).where(
                        ProjectMembership.user_id == user_id
                    )
                )
                | (Project.visibility == "public")
            )
        sub_queries.append(comment_q)

    if not sub_queries:
        return {"results": [], "total": 0}

    combined = union_all(*sub_queries).subquery()
    count_q = select(func.count()).select_from(combined)
    total = (await db.execute(count_q)).scalar_one()

    results_q = (
        select(combined)
        .order_by(combined.c.rank.desc(), combined.c.updated_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(results_q)).all()

    return {
        "results": [
            {
                "type": r.type,
                "id": str(r.id),
                "title": r.title,
                "subtitle": r.subtitle,
                "highlight": r.highlight,
                "url": r.url,
                "project_id": str(r.project_id),
                "updated_at": r.updated_at.isoformat() if r.updated_at else None,
            }
            for r in rows
        ],
        "total": total,
    }
