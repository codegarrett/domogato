from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.project import Project
from app.models.ticket import Ticket
from app.models.user import User
from app.models.user_story import (
    UserStory,
    UserStoryDependency,
    UserStoryDiscussion,
    UserStoryQuestion,
    UserStoryTicketLink,
    user_story_discussion_questions,
)
from app.models.workflow import WorkflowStatus
from app.services.ticket_service import create_ticket

_TERMINAL_STATUSES = frozenset({"canceled", "ticket_created"})


async def create_user_story(
    db: AsyncSession,
    *,
    project_id: UUID,
    title: str,
    created_by: UUID | None = None,
) -> UserStory:
    story = UserStory(
        project_id=project_id,
        title=title,
        created_by=created_by,
        status="not_started",
        priority="medium",
    )
    db.add(story)
    await db.flush()
    await db.refresh(story)
    return story


async def get_user_story(db: AsyncSession, story_id: UUID) -> UserStory | None:
    result = await db.execute(
        select(UserStory)
        .options(
            selectinload(UserStory.questions),
            selectinload(UserStory.discussions).selectinload(
                UserStoryDiscussion.referenced_questions,
            ),
            selectinload(UserStory.depends_on).selectinload(
                UserStoryDependency.depends_on_story,
            ),
            selectinload(UserStory.children),
            selectinload(UserStory.ticket_links),
            selectinload(UserStory.parent),
        )
        .where(UserStory.id == story_id)
    )
    return result.scalar_one_or_none()


async def list_user_stories(
    db: AsyncSession,
    project_id: UUID,
    *,
    status: str | None = None,
    priority: str | None = None,
    parent_id: UUID | None = None,
    parent_is_null: bool = False,
    search: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[UserStory], int]:
    base = select(UserStory).where(UserStory.project_id == project_id)

    if status:
        base = base.where(UserStory.status == status)
    if priority:
        base = base.where(UserStory.priority == priority)
    if parent_is_null:
        base = base.where(UserStory.parent_id.is_(None))
    elif parent_id is not None:
        base = base.where(UserStory.parent_id == parent_id)
    if search:
        ts_query = func.plainto_tsquery("english", search)
        base = base.where(UserStory.search_vector.op("@@")(ts_query))

    count_query = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_query)).scalar_one()

    sort_col = getattr(UserStory, sort_by, UserStory.created_at)
    order = sort_col.desc() if sort_dir == "desc" else sort_col.asc()
    rows = (
        await db.execute(
            base.order_by(order).offset(offset).limit(limit)
        )
    ).scalars().all()

    return list(rows), total


async def _validate_parent(
    db: AsyncSession,
    *,
    story_id: UUID | None,
    parent_id: UUID,
    project_id: UUID,
) -> None:
    if story_id is not None and parent_id == story_id:
        raise ValueError("A story cannot be its own parent")

    parent = (
        await db.execute(select(UserStory).where(UserStory.id == parent_id))
    ).scalar_one_or_none()
    if parent is None or parent.project_id != project_id:
        raise ValueError("Parent story not found in this project")

    current_id: UUID | None = parent_id
    visited: set[UUID] = set()
    while current_id is not None:
        if story_id is not None and current_id == story_id:
            raise ValueError("Parent assignment would create a cycle")
        if current_id in visited:
            break
        visited.add(current_id)
        row = (
            await db.execute(
                select(UserStory.parent_id).where(UserStory.id == current_id)
            )
        ).scalar_one_or_none()
        current_id = row


async def update_user_story(
    db: AsyncSession,
    story_id: UUID,
    **updates,
) -> UserStory:
    story = await get_user_story(db, story_id)
    if story is None:
        raise ValueError("User story not found")

    if "parent_id" in updates:
        parent_id = updates["parent_id"]
        if parent_id is not None:
            await _validate_parent(
                db,
                story_id=story_id,
                parent_id=parent_id,
                project_id=story.project_id,
            )

    for key, value in updates.items():
        setattr(story, key, value)

    await db.flush()
    await db.refresh(story)
    return story


async def add_question(
    db: AsyncSession,
    *,
    user_story_id: UUID,
    text: str,
    created_by: UUID | None,
) -> UserStoryQuestion:
    max_pos = (
        await db.execute(
            select(func.coalesce(func.max(UserStoryQuestion.position), -1)).where(
                UserStoryQuestion.user_story_id == user_story_id,
            )
        )
    ).scalar_one()

    question = UserStoryQuestion(
        user_story_id=user_story_id,
        text=text,
        position=max_pos + 1,
        created_by=created_by,
    )
    db.add(question)
    await db.flush()
    await db.refresh(question)
    return question


async def delete_question(db: AsyncSession, question_id: UUID) -> None:
    question = (
        await db.execute(
            select(UserStoryQuestion).where(UserStoryQuestion.id == question_id)
        )
    ).scalar_one_or_none()
    if question is None:
        raise ValueError("Question not found")
    await db.delete(question)
    await db.flush()


async def add_discussion(
    db: AsyncSession,
    *,
    user_story_id: UUID,
    body: str,
    author_id: UUID | None,
    question_ids: list[UUID] | None = None,
    applies_to_all_questions: bool = False,
) -> UserStoryDiscussion:
    discussion = UserStoryDiscussion(
        user_story_id=user_story_id,
        body=body,
        author_id=author_id,
        applies_to_all_questions=applies_to_all_questions,
    )
    db.add(discussion)
    await db.flush()

    if question_ids:
        valid_ids = (
            await db.execute(
                select(UserStoryQuestion.id).where(
                    UserStoryQuestion.id.in_(question_ids),
                    UserStoryQuestion.user_story_id == user_story_id,
                )
            )
        ).scalars().all()
        for qid in valid_ids:
            await db.execute(
                user_story_discussion_questions.insert().values(
                    discussion_id=discussion.id,
                    question_id=qid,
                )
            )
        await db.flush()

    await db.refresh(discussion)
    result = await db.execute(
        select(UserStoryDiscussion)
        .options(selectinload(UserStoryDiscussion.referenced_questions))
        .where(UserStoryDiscussion.id == discussion.id)
    )
    return result.scalar_one()


async def _would_create_dependency_cycle(
    db: AsyncSession,
    story_id: UUID,
    depends_on_id: UUID,
) -> bool:
    if story_id == depends_on_id:
        return True

    visited: set[UUID] = set()
    queue = [depends_on_id]
    while queue:
        current = queue.pop(0)
        if current == story_id:
            return True
        if current in visited:
            continue
        visited.add(current)
        deps = (
            await db.execute(
                select(UserStoryDependency.depends_on_id).where(
                    UserStoryDependency.story_id == current,
                )
            )
        ).scalars().all()
        queue.extend(deps)
    return False


async def add_dependency(
    db: AsyncSession,
    *,
    story_id: UUID,
    depends_on_id: UUID,
    project_id: UUID,
) -> UserStoryDependency:
    if story_id == depends_on_id:
        raise ValueError("A story cannot depend on itself")

    stories = (
        await db.execute(
            select(UserStory).where(
                UserStory.id.in_([story_id, depends_on_id]),
                UserStory.project_id == project_id,
            )
        )
    ).scalars().all()
    if len(stories) != 2:
        raise ValueError("Both stories must exist in this project")

    if await _would_create_dependency_cycle(db, story_id, depends_on_id):
        raise ValueError("Dependency would create a cycle")

    existing = (
        await db.execute(
            select(UserStoryDependency).where(
                UserStoryDependency.story_id == story_id,
                UserStoryDependency.depends_on_id == depends_on_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    dep = UserStoryDependency(story_id=story_id, depends_on_id=depends_on_id)
    db.add(dep)
    await db.flush()
    return dep


async def remove_dependency(
    db: AsyncSession,
    *,
    story_id: UUID,
    depends_on_id: UUID,
) -> None:
    dep = (
        await db.execute(
            select(UserStoryDependency).where(
                UserStoryDependency.story_id == story_id,
                UserStoryDependency.depends_on_id == depends_on_id,
            )
        )
    ).scalar_one_or_none()
    if dep is None:
        raise ValueError("Dependency not found")
    await db.delete(dep)
    await db.flush()


async def list_children(db: AsyncSession, story_id: UUID) -> list[UserStory]:
    result = await db.execute(
        select(UserStory)
        .where(UserStory.parent_id == story_id)
        .order_by(UserStory.created_at.asc())
    )
    return list(result.scalars().all())


def _build_ticket_description(story: UserStory) -> str:
    parts: list[str] = []
    if story.story_title:
        parts.append("## User Story\n\n" + story.story_title.strip())
    if story.story_body:
        parts.append(story.story_body.strip())
    if story.story_acceptance_criteria:
        parts.append("## Acceptance Criteria\n\n" + story.story_acceptance_criteria.strip())
    return "\n\n".join(parts)


def _validate_refined_fields(story: UserStory) -> list[str]:
    missing: list[str] = []
    if not story.story_title or not story.story_title.strip():
        missing.append("story_title")
    if not story.story_body or not story.story_body.strip():
        missing.append("story_body")
    if not story.story_acceptance_criteria or not story.story_acceptance_criteria.strip():
        missing.append("story_acceptance_criteria")
    return missing


async def create_tickets_from_stories(
    db: AsyncSession,
    *,
    project_id: UUID,
    user_story_ids: list[UUID],
    reporter_id: UUID,
    ticket_type: str = "story",
) -> tuple[list[Ticket], list[dict]]:
    stories = (
        await db.execute(
            select(UserStory).where(
                UserStory.id.in_(user_story_ids),
                UserStory.project_id == project_id,
            )
        )
    ).scalars().all()

    if not stories:
        raise ValueError("No valid user stories found")

    found_ids = {s.id for s in stories}
    missing_ids = [sid for sid in user_story_ids if sid not in found_ids]
    if missing_ids:
        raise ValueError("One or more user stories were not found in this project")

    errors: list[dict] = []
    tickets: list[Ticket] = []

    for story in stories:
        missing_fields = _validate_refined_fields(story)
        if missing_fields:
            errors.append({"user_story_id": str(story.id), "missing_fields": missing_fields})
            continue

        ticket = await create_ticket(
            db,
            project_id=project_id,
            title=story.title.strip(),
            description=_build_ticket_description(story),
            ticket_type=ticket_type,
            priority=story.priority,
            reporter_id=reporter_id,
        )

        link = UserStoryTicketLink(
            user_story_id=story.id,
            ticket_id=ticket.id,
            created_by=reporter_id,
        )
        db.add(link)

        if story.status not in _TERMINAL_STATUSES:
            story.status = "ticket_created"

        tickets.append(ticket)

    if not tickets and errors:
        raise ValueError({"validation_errors": errors})

    await db.flush()
    for ticket in tickets:
        await db.refresh(ticket)

    return tickets, errors


async def get_user_stories_for_ticket(
    db: AsyncSession,
    ticket_id: UUID,
) -> list[dict]:
    links = (
        await db.execute(
            select(UserStoryTicketLink).where(UserStoryTicketLink.ticket_id == ticket_id)
        )
    ).scalars().all()

    stories: list[dict] = []
    for link in links:
        story = (
            await db.execute(select(UserStory).where(UserStory.id == link.user_story_id))
        ).scalar_one_or_none()
        if story is None:
            continue
        stories.append({
            "id": story.id,
            "title": story.title,
            "story_title": story.story_title,
            "status": story.status,
            "priority": story.priority,
            "project_id": story.project_id,
        })
    return stories


async def enrich_ticket_links(db: AsyncSession, story: UserStory) -> list[dict]:
    enriched: list[dict] = []
    for link in story.ticket_links:
        ticket_row = (
            await db.execute(
                select(Ticket.ticket_number, Ticket.title, Ticket.project_id).where(
                    Ticket.id == link.ticket_id,
                )
            )
        ).one_or_none()
        ticket_key = None
        ticket_title = None
        if ticket_row:
            proj = (
                await db.execute(
                    select(Project.key).where(Project.id == ticket_row.project_id)
                )
            ).scalar_one_or_none()
            ticket_key = f"{proj}-{ticket_row.ticket_number}" if proj else None
            ticket_title = ticket_row.title
        enriched.append({
            "ticket_id": link.ticket_id,
            "ticket_key": ticket_key,
            "ticket_title": ticket_title,
            "created_at": link.created_at,
        })
    return enriched


async def get_display_name(db: AsyncSession, user_id: UUID | None) -> str | None:
    if user_id is None:
        return None
    return (
        await db.execute(select(User.display_name).where(User.id == user_id))
    ).scalar_one_or_none()
