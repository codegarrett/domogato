"""Tests for dynamic skill registry builder."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrgMembership, Organization, Project, ProjectMembership, User
from app.models.agent_skill_definition import AgentSkillDefinition
from app.services.agent.registry_builder import build_skill_registry
from app.services.workflow_service import seed_default_workflows

GLOBAL_SKILL_MD = """---
tool_name: global_fetch_data
description: Global fetch skill
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/global"
---
Global skill body.
"""

PROJECT_SKILL_MD = """---
tool_name: project_fetch_data
description: Project fetch skill
category: integrations
min_role: guest
parameters:
  type: object
  properties:
    project_key:
      type: string
  required: [project_key]
request:
  method: GET
  url: "https://api.example.com/project"
---
Project skill body.
"""


async def _setup_project(db: AsyncSession, user: User) -> Project:
    org = Organization(name="Skills Org", slug=f"skills-{uuid.uuid4().hex[:8]}")
    db.add(org)
    await db.flush()
    db.add(OrgMembership(user_id=user.id, organization_id=org.id, role="owner"))
    await db.flush()
    workflows = await seed_default_workflows(db, org.id)
    wf = next(w for w in workflows if w.name == "Simple Kanban")
    project = Project(
        organization_id=org.id,
        name="Skills Project",
        key="SKIL",
        visibility="internal",
        default_workflow_id=wf.id,
    )
    db.add(project)
    await db.flush()
    db.add(ProjectMembership(user_id=user.id, project_id=project.id, role="developer"))
    await db.flush()
    return project


@pytest.mark.asyncio
async def test_registry_includes_builtins(db_session: AsyncSession, test_user: User):
    reg = await build_skill_registry(db_session, test_user)
    names = {s.name for s in reg.list_all()}
    assert "calculator" in names
    assert "search_tickets" in names


@pytest.mark.asyncio
async def test_registry_includes_global_and_project_skills(
    db_session: AsyncSession, test_user: User,
):
    project = await _setup_project(db_session, test_user)
    db_session.add(
        AgentSkillDefinition(
            project_id=None,
            slug="global-fetch",
            name="Global Fetch",
            content_md=GLOBAL_SKILL_MD,
            enabled=True,
        )
    )
    db_session.add(
        AgentSkillDefinition(
            project_id=project.id,
            slug="project-fetch",
            name="Project Fetch",
            content_md=PROJECT_SKILL_MD,
            enabled=True,
        )
    )
    await db_session.flush()

    reg = await build_skill_registry(db_session, test_user)
    names = {s.name for s in reg.list_all()}
    assert "global_fetch_data" in names
    assert "project_fetch_data" in names


@pytest.mark.asyncio
async def test_registry_excludes_global_skills_without_project_access(
    db_session: AsyncSession,
):
    user = User(
        oidc_subject=f"lonely-{uuid.uuid4().hex[:8]}",
        email="lonely@example.com",
        display_name="Lonely User",
        is_active=True,
        preferences={},
    )
    db_session.add(user)
    await db_session.flush()

    db_session.add(
        AgentSkillDefinition(
            project_id=None,
            slug="global-fetch",
            name="Global Fetch",
            content_md=GLOBAL_SKILL_MD,
            enabled=True,
        )
    )
    await db_session.flush()

    reg = await build_skill_registry(db_session, user)
    names = {s.name for s in reg.list_all()}
    assert "global_fetch_data" not in names
    assert "calculator" in names
