"""Tests for project-scoped agent skill endpoints."""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrgMembership, Organization, Project, ProjectMembership, User
from app.services.workflow_service import seed_default_workflows

SKILL_MD = """---
tool_name: proj_custom_tool
description: Project custom tool
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
Project skill.
"""


async def _setup_maintainer_project(db: AsyncSession, user: User) -> Project:
    org = Organization(name="Agent Skills Org", slug=f"askills-{uuid.uuid4().hex[:8]}")
    db.add(org)
    await db.flush()
    db.add(OrgMembership(user_id=user.id, organization_id=org.id, role="owner"))
    await db.flush()
    workflows = await seed_default_workflows(db, org.id)
    wf = next(w for w in workflows if w.name == "Simple Kanban")
    project = Project(
        organization_id=org.id,
        name="Agent Skills Project",
        key="ASKL",
        visibility="internal",
        default_workflow_id=wf.id,
    )
    db.add(project)
    await db.flush()
    db.add(ProjectMembership(user_id=user.id, project_id=project.id, role="maintainer"))
    await db.flush()
    return project


class TestProjectAgentSkillsAuth:
    @pytest.mark.asyncio
    async def test_guest_cannot_list(
        self, client: AsyncClient, db: AsyncSession, test_user: User,
    ):
        org = Organization(name="Guest Org", slug=f"gorg-{uuid.uuid4().hex[:8]}")
        db.add(org)
        await db.flush()
        db.add(OrgMembership(user_id=test_user.id, organization_id=org.id, role="member"))
        await db.flush()
        workflows = await seed_default_workflows(db, org.id)
        wf = next(w for w in workflows if w.name == "Simple Kanban")
        project = Project(
            organization_id=org.id,
            name="Guest Project",
            key="GUEST",
            visibility="internal",
            default_workflow_id=wf.id,
        )
        db.add(project)
        await db.flush()
        db.add(ProjectMembership(user_id=test_user.id, project_id=project.id, role="guest"))
        await db.flush()

        resp = await client.get(f"/api/v1/projects/{project.id}/agent-skills")
        assert resp.status_code == 403


class TestProjectAgentSkillsCrud:
    @pytest.mark.asyncio
    async def test_crud_and_secrets(
        self, client: AsyncClient, db: AsyncSession, test_user: User,
    ):
        project = await _setup_maintainer_project(db, test_user)
        base = f"/api/v1/projects/{project.id}"

        list_resp = await client.get(f"{base}/agent-skills")
        assert list_resp.status_code == 200
        assert list_resp.json() == []

        put_resp = await client.put(
            f"{base}/agent-skills/my-skill",
            json={"name": "My Skill", "content_md": SKILL_MD, "enabled": True},
        )
        assert put_resp.status_code == 200
        assert put_resp.json()["tool_name"] == "proj_custom_tool"

        list_resp = await client.get(f"{base}/agent-skills")
        assert len(list_resp.json()) == 1

        get_resp = await client.get(f"{base}/agent-skills/my-skill")
        assert get_resp.status_code == 200
        assert "proj_custom_tool" in get_resp.json()["content_md"]

        validate_resp = await client.post(
            f"{base}/agent-skills/validate",
            json={"content_md": SKILL_MD},
        )
        assert validate_resp.status_code == 200
        assert validate_resp.json()["valid"] is True

        secret_resp = await client.put(
            f"{base}/agent-skills-secrets",
            json={"key": "TOKEN", "value": "secret-value"},
        )
        assert secret_resp.status_code == 204

        keys_resp = await client.get(f"{base}/agent-skills-secrets")
        assert keys_resp.status_code == 200
        assert "TOKEN" in keys_resp.json()["keys"]

        del_resp = await client.delete(f"{base}/agent-skills/my-skill")
        assert del_resp.status_code == 204
