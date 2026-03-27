from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.permissions import (
    PROJECT_ROLE_HIERARCHY,
    ProjectRole,
    resolve_effective_project_role,
)
from app.models.kb_comment import KBPageComment
from app.models.kb_page import KBPage
from app.models.project import Project
from app.models.user import User
from app.schemas.kb import CommentAuthor, CommentCreate, CommentRead, CommentUpdate
from app.services import kb_service

router = APIRouter(tags=["knowledge-base"])


async def _require_page_role(
    db: AsyncSession, page: KBPage, user: User, min_role: ProjectRole,
) -> ProjectRole:
    if user.is_system_admin:
        return ProjectRole.OWNER
    space = await kb_service.get_space_by_id(db, page.space_id)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    result = await db.execute(select(Project).where(Project.id == space.project_id))
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    effective = await resolve_effective_project_role(
        user_id=user.id,
        project_id=space.project_id,
        organization_id=project.organization_id,
        project_visibility=project.visibility,
        is_system_admin=user.is_system_admin,
        db=db,
    )
    if effective is None or PROJECT_ROLE_HIERARCHY[effective] < PROJECT_ROLE_HIERARCHY[min_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return effective


async def _get_page_or_404(db: AsyncSession, page_id: UUID) -> KBPage:
    page = await kb_service.get_page(db, page_id)
    if page is None or page.is_deleted:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


def _build_comment_tree(
    comments: list[KBPageComment], authors: dict[UUID, User],
) -> list[CommentRead]:
    nodes: dict[UUID, CommentRead] = {}
    for c in comments:
        author = authors.get(c.author_id)
        nodes[c.id] = CommentRead(
            id=c.id,
            page_id=c.page_id,
            parent_comment_id=c.parent_comment_id,
            author=CommentAuthor(
                id=c.author_id,
                display_name=author.display_name if author else "Unknown",
                avatar_url=author.avatar_url if author else None,
            ),
            body=c.body,
            is_deleted=c.is_deleted,
            created_at=c.created_at,
            updated_at=c.updated_at,
            replies=[],
        )

    roots: list[CommentRead] = []
    for c in comments:
        node = nodes[c.id]
        if c.parent_comment_id and c.parent_comment_id in nodes:
            nodes[c.parent_comment_id].replies.append(node)
        else:
            roots.append(node)
    return roots


@router.get(
    "/kb/pages/{page_id}/comments",
    response_model=list[CommentRead],
)
async def list_comments(
    page_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.GUEST)

    result = await db.execute(
        select(KBPageComment)
        .where(KBPageComment.page_id == page_id)
        .order_by(KBPageComment.created_at)
    )
    comments = list(result.scalars().all())

    author_ids = {c.author_id for c in comments}
    authors: dict[UUID, User] = {}
    if author_ids:
        author_result = await db.execute(
            select(User).where(User.id.in_(author_ids))
        )
        for u in author_result.scalars().all():
            authors[u.id] = u

    return _build_comment_tree(comments, authors)


@router.post(
    "/kb/pages/{page_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    page_id: UUID,
    body: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    page = await _get_page_or_404(db, page_id)
    await _require_page_role(db, page, user, ProjectRole.DEVELOPER)

    if body.parent_comment_id is not None:
        parent = await db.execute(
            select(KBPageComment).where(
                KBPageComment.id == body.parent_comment_id,
                KBPageComment.page_id == page_id,
            )
        )
        if parent.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent comment not found on this page",
            )

    comment = KBPageComment(
        page_id=page_id,
        parent_comment_id=body.parent_comment_id,
        author_id=user.id,
        body=body.body,
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)

    return CommentRead(
        id=comment.id,
        page_id=comment.page_id,
        parent_comment_id=comment.parent_comment_id,
        author=CommentAuthor(
            id=user.id,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        ),
        body=comment.body,
        is_deleted=comment.is_deleted,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.patch(
    "/kb/comments/{comment_id}",
    response_model=CommentRead,
)
async def update_comment(
    comment_id: UUID,
    body: CommentUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBPageComment).where(KBPageComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    page = await _get_page_or_404(db, comment.page_id)
    await _require_page_role(db, page, user, ProjectRole.DEVELOPER)

    if comment.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can edit this comment",
        )

    comment.body = body.body
    await db.flush()
    await db.refresh(comment)

    return CommentRead(
        id=comment.id,
        page_id=comment.page_id,
        parent_comment_id=comment.parent_comment_id,
        author=CommentAuthor(
            id=user.id,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        ),
        body=comment.body,
        is_deleted=comment.is_deleted,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.delete(
    "/kb/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_comment(
    comment_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(KBPageComment).where(KBPageComment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")

    page = await _get_page_or_404(db, comment.page_id)
    effective = await _require_page_role(db, page, user, ProjectRole.DEVELOPER)

    is_author = comment.author_id == user.id
    is_maintainer = PROJECT_ROLE_HIERARCHY[effective] >= PROJECT_ROLE_HIERARCHY[ProjectRole.MAINTAINER]
    if not is_author and not is_maintainer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete this comment",
        )

    comment.is_deleted = True
    comment.body = "[deleted]"
    await db.flush()
