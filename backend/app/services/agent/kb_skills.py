"""Knowledge base management skills for the AI agent."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import ProjectRole
from app.models.kb_page import KBPage
from app.schemas.kb import PageCreate
from app.services.agent.skills import (
    BaseSkill,
    SkillContext,
    SkillError,
    SkillPermissionError,
    absolute_url,
    check_project_access,
    kb_page_path,
)
from app.services import kb_service


async def _resolve_space(ctx: SkillContext, project_id: UUID):
    space_slug = ctx.params.get("space_slug")
    space_name = ctx.params.get("space_name")

    if space_slug:
        space = await kb_service.get_space_by_slug(ctx.db, project_id, space_slug)
        if space is None:
            raise SkillError(f"KB space with slug '{space_slug}' not found.")
        return space

    if space_name:
        spaces = await kb_service.list_spaces(ctx.db, project_id)
        target = space_name.strip().lower()
        for space in spaces:
            if space.name.lower() == target or space.slug.lower() == target:
                return space
        raise SkillError(f"KB space '{space_name}' not found.")

    raise SkillError("Provide space_slug or space_name to identify the KB space.")


async def _resolve_parent_page_id(
    db: AsyncSession,
    space_id: UUID,
    *,
    parent_page_id: str | None,
    parent_page_title: str | None,
) -> UUID | None:
    if parent_page_id:
        page = await kb_service.get_page(db, UUID(parent_page_id))
        if page is None or page.space_id != space_id:
            raise SkillError(f"Parent page '{parent_page_id}' not found in this space.")
        return page.id

    if parent_page_title:
        target = parent_page_title.strip().lower()
        result = await db.execute(
            select(KBPage).where(
                KBPage.space_id == space_id,
                KBPage.is_deleted == False,  # noqa: E712
            )
        )
        for page in result.scalars():
            if page.title.lower() == target:
                return page.id
        raise SkillError(f"Parent page '{parent_page_title}' not found in this space.")

    return None


class ListKBSpacesSkill(BaseSkill):
    name = "list_kb_spaces"
    description = (
        "List knowledge base spaces in a project. Returns name, slug, and "
        "description for each space."
    )
    category = "knowledge_base"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
        },
        "required": ["project_key"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])
        spaces = await kb_service.list_spaces(ctx.db, project.id)
        return {
            "spaces": [
                {
                    "name": s.name,
                    "slug": s.slug,
                    "description": (s.description or "")[:200],
                }
                for s in spaces
            ],
            "total": len(spaces),
        }


class CreateKBPageSkill(BaseSkill):
    name = "create_kb_page"
    description = (
        "Create a new knowledge base page in a project space. Requires at "
        "least Developer role. Use for documentation, wiki pages, and KB "
        "articles — not for work tracking (use create_ticket for that)."
    )
    category = "knowledge_base"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "space_slug": {
                "type": "string",
                "description": "Slug of the KB space (preferred if known)",
            },
            "space_name": {
                "type": "string",
                "description": "Name of the KB space (case-insensitive match)",
            },
            "title": {
                "type": "string",
                "description": "Page title",
            },
            "content_markdown": {
                "type": "string",
                "description": "Page content in markdown format",
            },
            "parent_page_title": {
                "type": "string",
                "description": "Title of the parent page for nesting",
            },
            "parent_page_id": {
                "type": "string",
                "description": "UUID of the parent page for nesting",
            },
            "is_published": {
                "type": "boolean",
                "description": "Whether the page is published (default: true)",
            },
        },
        "required": ["project_key", "title", "content_markdown"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        try:
            project = await check_project_access(
                ctx.db,
                ctx.user,
                ctx.params["project_key"],
                min_role=ProjectRole.DEVELOPER,
            )
        except SkillPermissionError:
            return {
                "error": (
                    f"You don't have permission to create KB pages in project "
                    f"'{ctx.params['project_key']}'. You need at least the "
                    f"Developer role."
                ),
            }

        try:
            space = await _resolve_space(ctx, project.id)
            parent_page_id = await _resolve_parent_page_id(
                ctx.db,
                space.id,
                parent_page_id=ctx.params.get("parent_page_id"),
                parent_page_title=ctx.params.get("parent_page_title"),
            )
        except SkillError as exc:
            return {"error": str(exc)}

        page_data = PageCreate(
            title=ctx.params["title"],
            content_markdown=ctx.params.get("content_markdown", ""),
            parent_page_id=parent_page_id,
            is_published=ctx.params.get("is_published", True),
        )
        page = await kb_service.create_page(
            ctx.db,
            space.id,
            page_data,
            user_id=ctx.user.id,
        )

        path = kb_page_path(project.id, space.slug, page.slug)
        return {
            "created": True,
            "message": f"KB page '{page.title}' created successfully.",
            "page_id": str(page.id),
            "slug": page.slug,
            "space_slug": space.slug,
            "path": path,
            "url": absolute_url(path),
        }
