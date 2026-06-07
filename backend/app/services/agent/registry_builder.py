"""Build per-user skill registries including custom markdown skills."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import ProjectRole, resolve_effective_project_role
from app.models.membership import ProjectMembership
from app.models.organization import Organization
from app.models.project import Project
from app.models.user import User
from app.services.agent.dynamic_skill import DynamicSkill
from app.services.agent.skills import SkillRegistry
from app.services.agent_skill_parser import parse_agent_skill_md
from app.services.agent_skill_service import (
    list_enabled_global_skills,
    list_enabled_project_skills_for_projects,
)


async def _user_has_any_project(db: AsyncSession, user: User) -> bool:
    if user.is_system_admin:
        result = await db.execute(select(Project.id).limit(1))
        return result.scalar_one_or_none() is not None

    explicit = await db.execute(
        select(ProjectMembership.id).where(ProjectMembership.user_id == user.id).limit(1)
    )
    if explicit.scalar_one_or_none() is not None:
        return True

    from app.models.membership import OrgMembership

    org_rows = (
        await db.execute(
            select(OrgMembership.organization_id, OrgMembership.role).where(
                OrgMembership.user_id == user.id
            )
        )
    ).all()
    if not org_rows:
        return False

    for org_id, _role in org_rows:
        proj = await db.execute(
            select(Project.id).where(
                Project.organization_id == org_id,
                Project.is_archived.is_(False),
            ).limit(1)
        )
        if proj.scalar_one_or_none() is not None:
            return True
    return False


async def _accessible_project_ids(db: AsyncSession, user: User) -> list[UUID]:
    if user.is_system_admin:
        rows = await db.execute(select(Project.id).where(Project.is_archived.is_(False)))
        return [row[0] for row in rows.all()]

    project_ids: set[UUID] = set()
    memberships = (
        await db.execute(
            select(ProjectMembership.project_id).where(ProjectMembership.user_id == user.id)
        )
    ).all()
    project_ids.update(row[0] for row in memberships)

    from app.models.membership import OrgMembership

    org_memberships = (
        await db.execute(
            select(OrgMembership.organization_id, OrgMembership.role).where(
                OrgMembership.user_id == user.id
            )
        )
    ).all()
    for org_id, org_role in org_memberships:
        projects = (
            await db.execute(
                select(Project).where(
                    Project.organization_id == org_id,
                    Project.is_archived.is_(False),
                )
            )
        ).scalars().all()
        for project in projects:
            effective = await resolve_effective_project_role(
                user_id=user.id,
                project_id=project.id,
                organization_id=org_id,
                project_visibility=project.visibility,
                is_system_admin=user.is_system_admin,
                db=db,
            )
            if effective is not None:
                project_ids.add(project.id)

    return list(project_ids)


def register_builtin_skills(reg: SkillRegistry) -> None:
    from app.services.agent import register_builtin_skills as _register

    _register(reg)


async def build_skill_registry(db: AsyncSession, user: User) -> SkillRegistry:
    reg = SkillRegistry()
    register_builtin_skills(reg)

    seen_names = {s.name for s in reg.list_all()}

    if await _user_has_any_project(db, user):
        for defn in await list_enabled_global_skills(db):
            try:
                parsed = parse_agent_skill_md(defn.content_md)
            except Exception:
                continue
            if parsed.tool_name in seen_names:
                continue
            reg.register(DynamicSkill(defn, parsed))
            seen_names.add(parsed.tool_name)

    project_ids = await _accessible_project_ids(db, user)
    for defn in await list_enabled_project_skills_for_projects(db, project_ids):
        try:
            parsed = parse_agent_skill_md(defn.content_md)
        except Exception:
            continue
        if parsed.tool_name in seen_names:
            continue
        reg.register(DynamicSkill(defn, parsed))
        seen_names.add(parsed.tool_name)

    return reg
