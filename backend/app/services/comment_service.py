from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.comment import Comment
from app.models.user import User


async def create_comment(
    db: AsyncSession,
    *,
    ticket_id: UUID,
    author_id: UUID,
    body: str,
) -> Comment:
    comment = Comment(
        ticket_id=ticket_id,
        author_id=author_id,
        body=body,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return comment


async def get_comment(db: AsyncSession, comment_id: UUID) -> Comment | None:
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id)
    )
    return result.scalar_one_or_none()


async def list_comments(
    db: AsyncSession,
    ticket_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[dict[str, Any]], int]:
    base = select(Comment).where(
        Comment.ticket_id == ticket_id,
        Comment.is_deleted == False,  # noqa: E712
    )

    count_query = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = (
        select(Comment, User)
        .outerjoin(User, User.id == Comment.author_id)
        .where(
            Comment.ticket_id == ticket_id,
            Comment.is_deleted == False,  # noqa: E712
        )
        .order_by(Comment.created_at)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()

    comments = []
    for comment, user in rows:
        comments.append({
            "id": comment.id,
            "ticket_id": comment.ticket_id,
            "author_id": comment.author_id,
            "body": comment.body,
            "is_edited": comment.is_edited,
            "is_deleted": comment.is_deleted,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
            "author_name": user.display_name if user else None,
            "author_email": user.email if user else None,
        })

    return comments, total


async def update_comment(
    db: AsyncSession,
    comment_id: UUID,
    body: str,
) -> Comment | None:
    comment = await get_comment(db, comment_id)
    if comment is None:
        return None

    comment.body = body
    comment.is_edited = True
    await db.flush()
    await db.refresh(comment)
    return comment


async def soft_delete_comment(db: AsyncSession, comment_id: UUID) -> Comment | None:
    comment = await get_comment(db, comment_id)
    if comment is None:
        return None
    comment.is_deleted = True
    await db.flush()
    await db.refresh(comment)
    return comment
