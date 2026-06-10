from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core import events
from app.core.permissions import (
    ProjectRole,
    assert_story_update,
    get_effective_project_role_for_user,
    require_minimum_project_role,
)
from app.models.user import User
from app.models.user_story import UserStory, UserStoryQuestion
from app.schemas.common import PaginatedResponse
from app.schemas.ticket import TicketRead
from app.schemas.user_story import (
    CreateTicketsFromUserStories,
    UserStoryChildBrief,
    UserStoryCreate,
    UserStoryDependencyCreate,
    UserStoryDependencyRead,
    UserStoryDiscussionCreate,
    UserStoryDiscussionRead,
    UserStoryForTicketRead,
    UserStoryListItem,
    UserStoryQuestionCreate,
    UserStoryQuestionRead,
    UserStoryRead,
    UserStoryTicketLinkRead,
    UserStoryUpdate,
)
from app.services import project_service, user_story_service

router = APIRouter(tags=["user-stories"])


async def _require_project_role(
    db: AsyncSession, project_id: UUID, user: User, minimum: ProjectRole,
) -> None:
    await require_minimum_project_role(db, user, project_id, minimum)


async def _enrich_story(db: AsyncSession, story: UserStory) -> UserStoryRead:
    created_by_name = await user_story_service.get_display_name(db, story.created_by)
    parent_title = story.parent.title if story.parent else None

    questions = []
    for q in story.questions:
        questions.append(UserStoryQuestionRead(
            id=q.id,
            text=q.text,
            position=q.position,
            created_by=q.created_by,
            created_by_name=await user_story_service.get_display_name(db, q.created_by),
            created_at=q.created_at,
        ))

    discussions = []
    for d in story.discussions:
        discussions.append(UserStoryDiscussionRead(
            id=d.id,
            author_id=d.author_id,
            author_name=await user_story_service.get_display_name(db, d.author_id),
            body=d.body,
            applies_to_all_questions=d.applies_to_all_questions,
            question_ids=[q.id for q in d.referenced_questions],
            created_at=d.created_at,
            updated_at=d.updated_at,
        ))

    dependencies = []
    for dep in story.depends_on:
        title = dep.depends_on_story.title if dep.depends_on_story else None
        dependencies.append(UserStoryDependencyRead(
            story_id=dep.story_id,
            depends_on_id=dep.depends_on_id,
            depends_on_title=title,
            created_at=dep.created_at,
        ))

    children = [
        UserStoryChildBrief(
            id=c.id,
            title=c.title,
            status=c.status,
            priority=c.priority,
        )
        for c in story.children
    ]

    linked = [
        UserStoryTicketLinkRead(**row)
        for row in await user_story_service.enrich_ticket_links(db, story)
    ]

    return UserStoryRead(
        id=story.id,
        project_id=story.project_id,
        title=story.title,
        quick_notes=story.quick_notes,
        story_title=story.story_title,
        story_body=story.story_body,
        story_acceptance_criteria=story.story_acceptance_criteria,
        status=story.status,
        priority=story.priority,
        parent_id=story.parent_id,
        parent_title=parent_title,
        created_by=story.created_by,
        created_by_name=created_by_name,
        created_at=story.created_at,
        updated_at=story.updated_at,
        questions=questions,
        discussions=discussions,
        dependencies=dependencies,
        children=children,
        linked_tickets=linked,
    )


@router.post(
    "/projects/{project_id}/user-stories",
    response_model=UserStoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_story(
    project_id: UUID,
    body: UserStoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.REPORTER)

    story = await user_story_service.create_user_story(
        db,
        project_id=project_id,
        title=body.title,
        created_by=user.id,
    )
    story_full = await user_story_service.get_user_story(db, story.id)

    await events.publish(
        events.EVENT_USER_STORY_CREATED,
        user_story_id=str(story.id),
        project_id=str(project_id),
        actor_id=str(user.id),
    )

    return await _enrich_story(db, story_full)


@router.get(
    "/projects/{project_id}/user-stories",
    response_model=PaginatedResponse[UserStoryListItem],
)
async def list_user_stories(
    project_id: UUID,
    status: str | None = Query(None),
    priority: str | None = Query(None),
    parent_id: UUID | None = Query(None),
    top_level_only: bool = Query(False),
    q: str | None = Query(None),
    sort_by: str = Query(
        "created_at",
        pattern=r"^(created_at|updated_at|title|status|priority)$",
    ),
    sort_dir: str = Query("desc", pattern=r"^(asc|desc)$"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    stories, total = await user_story_service.list_user_stories(
        db,
        project_id,
        status=status,
        priority=priority,
        parent_id=parent_id,
        parent_is_null=top_level_only,
        search=q,
        sort_by=sort_by,
        sort_dir=sort_dir,
        offset=offset,
        limit=limit,
    )

    story_ids = [s.id for s in stories]
    parent_titles: dict[UUID, str] = {}
    parent_ids = {s.parent_id for s in stories if s.parent_id}
    if parent_ids:
        rows = (
            await db.execute(
                select(UserStory.id, UserStory.title).where(UserStory.id.in_(parent_ids))
            )
        ).all()
        parent_titles = {row.id: row.title for row in rows}

    question_counts: dict[UUID, int] = {}
    child_counts: dict[UUID, int] = {}
    if story_ids:
        q_rows = (
            await db.execute(
                select(UserStoryQuestion.user_story_id, func.count())
                .where(UserStoryQuestion.user_story_id.in_(story_ids))
                .group_by(UserStoryQuestion.user_story_id)
            )
        ).all()
        question_counts = {row[0]: row[1] for row in q_rows}

        c_rows = (
            await db.execute(
                select(UserStory.parent_id, func.count())
                .where(UserStory.parent_id.in_(story_ids))
                .group_by(UserStory.parent_id)
            )
        ).all()
        child_counts = {row[0]: row[1] for row in c_rows}

    items = []
    for s in stories:
        items.append(UserStoryListItem(
            id=s.id,
            project_id=s.project_id,
            title=s.title,
            status=s.status,
            priority=s.priority,
            parent_id=s.parent_id,
            parent_title=parent_titles.get(s.parent_id) if s.parent_id else None,
            created_by_name=await user_story_service.get_display_name(db, s.created_by),
            question_count=question_counts.get(s.id, 0),
            child_count=child_counts.get(s.id, 0),
            created_at=s.created_at,
            updated_at=s.updated_at,
        ))

    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get(
    "/projects/{project_id}/user-stories/{story_id}",
    response_model=UserStoryRead,
)
async def get_user_story(
    project_id: UUID,
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    story = await user_story_service.get_user_story(db, story_id)
    if story is None or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    return await _enrich_story(db, story)


@router.patch(
    "/projects/{project_id}/user-stories/{story_id}",
    response_model=UserStoryRead,
)
async def update_user_story(
    project_id: UUID,
    story_id: UUID,
    body: UserStoryUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await user_story_service.get_user_story(db, story_id)
    if existing is None or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    effective_role = await get_effective_project_role_for_user(db, user, project_id)
    assert_story_update(effective_role)

    try:
        story = await user_story_service.update_user_story(db, story_id, **updates)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    await events.publish(
        events.EVENT_USER_STORY_UPDATED,
        user_story_id=str(story_id),
        project_id=str(project_id),
        actor_id=str(user.id),
    )

    story_full = await user_story_service.get_user_story(db, story_id)
    return await _enrich_story(db, story_full)


@router.delete(
    "/projects/{project_id}/user-stories/{story_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def cancel_user_story(
    project_id: UUID,
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.MAINTAINER)

    existing = await user_story_service.get_user_story(db, story_id)
    if existing is None or existing.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    await user_story_service.update_user_story(db, story_id, status="canceled")


@router.post(
    "/projects/{project_id}/user-stories/{story_id}/questions",
    response_model=UserStoryQuestionRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_question(
    project_id: UUID,
    story_id: UUID,
    body: UserStoryQuestionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.REPORTER)

    story = await user_story_service.get_user_story(db, story_id)
    if story is None or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    question = await user_story_service.add_question(
        db,
        user_story_id=story_id,
        text=body.text,
        created_by=user.id,
    )

    if story.status == "not_started":
        await user_story_service.update_user_story(db, story_id, status="discovery")

    return UserStoryQuestionRead(
        id=question.id,
        text=question.text,
        position=question.position,
        created_by=question.created_by,
        created_by_name=await user_story_service.get_display_name(db, question.created_by),
        created_at=question.created_at,
    )


@router.delete(
    "/projects/{project_id}/user-stories/{story_id}/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_question(
    project_id: UUID,
    story_id: UUID,
    question_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)

    story = await user_story_service.get_user_story(db, story_id)
    if story is None or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    question = next((q for q in story.questions if q.id == question_id), None)
    if question is None:
        raise HTTPException(status_code=404, detail="Question not found")

    await user_story_service.delete_question(db, question_id)


@router.post(
    "/projects/{project_id}/user-stories/{story_id}/discussions",
    response_model=UserStoryDiscussionRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_discussion(
    project_id: UUID,
    story_id: UUID,
    body: UserStoryDiscussionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.REPORTER)

    story = await user_story_service.get_user_story(db, story_id)
    if story is None or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    discussion = await user_story_service.add_discussion(
        db,
        user_story_id=story_id,
        body=body.body,
        author_id=user.id,
        question_ids=body.question_ids,
        applies_to_all_questions=body.applies_to_all_questions,
    )

    return UserStoryDiscussionRead(
        id=discussion.id,
        author_id=discussion.author_id,
        author_name=await user_story_service.get_display_name(db, discussion.author_id),
        body=discussion.body,
        applies_to_all_questions=discussion.applies_to_all_questions,
        question_ids=[q.id for q in discussion.referenced_questions],
        created_at=discussion.created_at,
        updated_at=discussion.updated_at,
    )


@router.get(
    "/projects/{project_id}/user-stories/{story_id}/children",
    response_model=list[UserStoryChildBrief],
)
async def list_children(
    project_id: UUID,
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.GUEST)

    story = await user_story_service.get_user_story(db, story_id)
    if story is None or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    children = await user_story_service.list_children(db, story_id)
    return [
        UserStoryChildBrief(id=c.id, title=c.title, status=c.status, priority=c.priority)
        for c in children
    ]


@router.post(
    "/projects/{project_id}/user-stories/{story_id}/dependencies",
    response_model=UserStoryDependencyRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_dependency(
    project_id: UUID,
    story_id: UUID,
    body: UserStoryDependencyCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)

    story = await user_story_service.get_user_story(db, story_id)
    if story is None or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    try:
        dep = await user_story_service.add_dependency(
            db,
            story_id=story_id,
            depends_on_id=body.depends_on_id,
            project_id=project_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    depends_on = await user_story_service.get_user_story(db, dep.depends_on_id)
    return UserStoryDependencyRead(
        story_id=dep.story_id,
        depends_on_id=dep.depends_on_id,
        depends_on_title=depends_on.title if depends_on else None,
        created_at=dep.created_at,
    )


@router.delete(
    "/projects/{project_id}/user-stories/{story_id}/dependencies/{depends_on_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_dependency(
    project_id: UUID,
    story_id: UUID,
    depends_on_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)

    story = await user_story_service.get_user_story(db, story_id)
    if story is None or story.project_id != project_id:
        raise HTTPException(status_code=404, detail="User story not found")

    try:
        await user_story_service.remove_dependency(
            db, story_id=story_id, depends_on_id=depends_on_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/projects/{project_id}/user-stories/create-tickets",
    response_model=list[TicketRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_tickets_from_stories(
    project_id: UUID,
    body: CreateTicketsFromUserStories,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_project_role(db, project_id, user, ProjectRole.DEVELOPER)

    try:
        tickets, errors = await user_story_service.create_tickets_from_stories(
            db,
            project_id=project_id,
            user_story_ids=body.user_story_ids,
            reporter_id=user.id,
            ticket_type=body.ticket_type,
        )
    except ValueError as exc:
        msg = str(exc)
        if isinstance(exc.args[0], dict) and "validation_errors" in exc.args[0]:
            raise HTTPException(status_code=422, detail=exc.args[0]) from exc
        raise HTTPException(status_code=400, detail=msg) from exc

    if errors:
        raise HTTPException(
            status_code=422,
            detail={"validation_errors": errors},
        )

    await events.publish(
        events.EVENT_USER_STORY_TICKETS_CREATED,
        project_id=str(project_id),
        actor_id=str(user.id),
        user_story_ids=[str(sid) for sid in body.user_story_ids],
        ticket_ids=[str(t.id) for t in tickets],
    )

    project = await project_service.get_project(db, project_id)
    project_key = project.key if project else None
    return [
        TicketRead.model_validate(t).model_copy(update={"project_key": project_key})
        for t in tickets
    ]


@router.get(
    "/tickets/{ticket_id}/user-stories",
    response_model=list[UserStoryForTicketRead],
)
async def get_user_stories_for_ticket(
    ticket_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.ticket import Ticket

    ticket = (
        await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    await _require_project_role(db, ticket.project_id, user, ProjectRole.GUEST)

    rows = await user_story_service.get_user_stories_for_ticket(db, ticket_id)
    return [UserStoryForTicketRead(**row) for row in rows]
