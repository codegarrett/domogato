"""CRUD for agent skill definitions."""
from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_skill_definition import AgentSkillDefinition
from app.models.project import Project
from app.services.agent_skill_parser import ParsedAgentSkill, parse_agent_skill_md, validate_slug


async def list_skills(
    db: AsyncSession,
    *,
    project_id: UUID | None = None,
) -> list[AgentSkillDefinition]:
    stmt = select(AgentSkillDefinition).order_by(AgentSkillDefinition.slug)
    if project_id is None:
        stmt = stmt.where(AgentSkillDefinition.project_id.is_(None))
    else:
        stmt = stmt.where(AgentSkillDefinition.project_id == project_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_skill(
    db: AsyncSession,
    *,
    slug: str,
    project_id: UUID | None = None,
) -> AgentSkillDefinition | None:
    slug = validate_slug(slug)
    stmt = select(AgentSkillDefinition).where(AgentSkillDefinition.slug == slug)
    if project_id is None:
        stmt = stmt.where(AgentSkillDefinition.project_id.is_(None))
    else:
        stmt = stmt.where(AgentSkillDefinition.project_id == project_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def _ensure_unique_tool_name(
    db: AsyncSession,
    parsed: ParsedAgentSkill,
    *,
    project_id: UUID | None,
    exclude_id: UUID | None = None,
) -> None:
    rows = (await db.execute(
        select(AgentSkillDefinition).where(
            AgentSkillDefinition.project_id.is_(None) if project_id is None
            else AgentSkillDefinition.project_id == project_id
        )
    )).scalars().all()
    for row in rows:
        if exclude_id and row.id == exclude_id:
            continue
        try:
            other = parse_agent_skill_md(row.content_md)
        except HTTPException:
            continue
        if other.tool_name == parsed.tool_name:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"tool_name '{parsed.tool_name}' already used by skill '{row.slug}'",
            )


async def upsert_skill(
    db: AsyncSession,
    *,
    slug: str,
    name: str,
    content_md: str,
    project_id: UUID | None,
    updated_by_id: UUID | None,
    enabled: bool = True,
) -> tuple[AgentSkillDefinition, ParsedAgentSkill]:
    slug = validate_slug(slug)
    parsed = parse_agent_skill_md(content_md)

    if project_id is not None:
        project = await db.get(Project, project_id)
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    existing = await get_skill(db, slug=slug, project_id=project_id)
    await _ensure_unique_tool_name(
        db, parsed, project_id=project_id, exclude_id=existing.id if existing else None
    )

    if existing is None:
        row = AgentSkillDefinition(
            project_id=project_id,
            slug=slug,
            name=name.strip(),
            content_md=content_md,
            enabled=enabled,
            updated_by_id=updated_by_id,
        )
        db.add(row)
    else:
        existing.name = name.strip()
        existing.content_md = content_md
        existing.enabled = enabled
        existing.updated_by_id = updated_by_id
        row = existing

    await db.flush()
    await db.refresh(row)
    return row, parsed


async def delete_skill(
    db: AsyncSession,
    *,
    slug: str,
    project_id: UUID | None,
) -> None:
    slug = validate_slug(slug)
    existing = await get_skill(db, slug=slug, project_id=project_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    await db.execute(
        delete(AgentSkillDefinition).where(AgentSkillDefinition.id == existing.id)
    )
    await db.flush()


async def list_enabled_global_skills(db: AsyncSession) -> list[AgentSkillDefinition]:
    result = await db.execute(
        select(AgentSkillDefinition).where(
            AgentSkillDefinition.project_id.is_(None),
            AgentSkillDefinition.enabled.is_(True),
        )
    )
    return list(result.scalars().all())


async def list_enabled_project_skills_for_projects(
    db: AsyncSession,
    project_ids: list[UUID],
) -> list[AgentSkillDefinition]:
    if not project_ids:
        return []
    result = await db.execute(
        select(AgentSkillDefinition).where(
            AgentSkillDefinition.project_id.in_(project_ids),
            AgentSkillDefinition.enabled.is_(True),
        )
    )
    return list(result.scalars().all())
