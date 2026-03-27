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
from app.schemas.comment import CommentCreate, CommentRead, CommentUpdate
from app.schemas.common import PaginatedResponse
from app.services import activity_service, comment_service, mention_service, project_service, ticket_service, user_service

router = APIRouter(tags=["comments"])


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


@router.post(
    "/tickets/{ticket_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    ticket_id: UUID,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role_via_ticket(db, ticket_id, user, ProjectRole.GUEST)
    comment = await comment_service.create_comment(
        db, ticket_id=ticket_id, author_id=user.id, body=body.body,
    )

    await activity_service.log_activity(
        db, ticket_id=ticket_id, user_id=user.id, action="comment_added",
        metadata_json={"comment_id": str(comment.id)},
    )

    ticket = await ticket_service.get_ticket(db, ticket_id)

    if ticket and body.body:
        await mention_service.process_mentions(
            db,
            html_body=body.body,
            ticket_id=ticket_id,
            ticket_title=ticket.title,
            author_id=user.id,
            author_name=user.display_name,
        )

    await events.publish(
        events.EVENT_COMMENT_ADDED,
        comment_id=str(comment.id),
        ticket_id=str(ticket_id),
        project_id=str(ticket.project_id) if ticket else None,
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    result = CommentRead.model_validate(comment)
    result.author_name = user.display_name
    result.author_email = user.email
    return result


@router.get(
    "/tickets/{ticket_id}/comments",
    response_model=PaginatedResponse[CommentRead],
)
async def list_comments(
    ticket_id: UUID,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role_via_ticket(db, ticket_id, user, ProjectRole.GUEST)
    comments, total = await comment_service.list_comments(
        db, ticket_id, offset=offset, limit=limit,
    )
    return PaginatedResponse(
        items=[CommentRead(**c) for c in comments],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.patch("/comments/{comment_id}", response_model=CommentRead)
async def update_comment(
    comment_id: UUID,
    body: CommentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await comment_service.get_comment(db, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    await _require_project_role_via_ticket(db, comment.ticket_id, user, ProjectRole.GUEST)
    updated = await comment_service.update_comment(db, comment_id, body.body)

    await events.publish(
        events.EVENT_COMMENT_EDITED,
        comment_id=str(comment_id),
        ticket_id=str(comment.ticket_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
    )

    result = CommentRead.model_validate(updated)
    if updated and updated.author_id:
        author = await user_service.get_user_by_id(db, updated.author_id)
        if author:
            result.author_name = author.display_name
            result.author_email = author.email
    return result


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    comment = await comment_service.get_comment(db, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    await _require_project_role_via_ticket(db, comment.ticket_id, user, ProjectRole.GUEST)
    await comment_service.soft_delete_comment(db, comment_id)

    await events.publish(
        events.EVENT_COMMENT_DELETED,
        comment_id=str(comment_id),
        ticket_id=str(comment.ticket_id),
        actor_id=str(user.id),
        actor_name=user.display_name,
    )
