from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project

ORG_API = "/api/v1/organizations"
PROJECT_API = "/api/v1/projects"
STORY_API = "/api/v1/projects"


async def _setup_project(
    admin_client: AsyncClient,
    db_session: AsyncSession,
    slug: str = "us-test-org",
) -> tuple[dict, dict]:
    org_resp = await admin_client.post(ORG_API, json={"name": "US Org", "slug": slug})
    assert org_resp.status_code == 201
    org = org_resp.json()

    proj_resp = await admin_client.post(
        f"{ORG_API}/{org['id']}/projects",
        json={"name": "US Project", "key": "US", "visibility": "internal"},
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()

    wf_resp = await admin_client.get(f"{ORG_API}/{org['id']}/workflows")
    kanban = next(w for w in wf_resp.json()["items"] if "Kanban" in w["name"])
    if project.get("default_workflow_id") != kanban["id"]:
        await db_session.execute(
            update(Project)
            .where(Project.id == uuid.UUID(project["id"]))
            .values(default_workflow_id=uuid.UUID(kanban["id"]))
        )
        await db_session.flush()

    return org, project


@pytest.mark.asyncio
async def test_create_user_story_title_only(admin_client: AsyncClient, db_session: AsyncSession):
    _, project = await _setup_project(admin_client, db_session, slug="us-create-org")

    resp = await admin_client.post(
        f"{STORY_API}/{project['id']}/user-stories",
        json={"title": "Login with SSO"},
    )
    assert resp.status_code == 201
    story = resp.json()
    assert story["title"] == "Login with SSO"
    assert story["status"] == "not_started"
    assert story["priority"] == "medium"
    assert story["project_id"] == project["id"]


@pytest.mark.asyncio
async def test_list_user_stories_filters(admin_client: AsyncClient, db_session: AsyncSession):
    _, project = await _setup_project(admin_client, db_session, slug="us-list-org")
    pid = project["id"]

    await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "Story A"})
    r2 = await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "Story B"})
    story_b = r2.json()
    await admin_client.patch(
        f"{STORY_API}/{pid}/user-stories/{story_b['id']}",
        json={"status": "in_progress", "priority": "high"},
    )

    resp = await admin_client.get(f"{STORY_API}/{pid}/user-stories", params={"status": "in_progress"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Story B"


@pytest.mark.asyncio
async def test_user_story_questions_and_discussions(admin_client: AsyncClient, db_session: AsyncSession):
    _, project = await _setup_project(admin_client, db_session, slug="us-disc-org")
    pid = project["id"]

    story = (
        await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "Discovery story"})
    ).json()

    q_resp = await admin_client.post(
        f"{STORY_API}/{pid}/user-stories/{story['id']}/questions",
        json={"text": "Who is the primary user?"},
    )
    assert q_resp.status_code == 201
    question = q_resp.json()

    d_resp = await admin_client.post(
        f"{STORY_API}/{pid}/user-stories/{story['id']}/discussions",
        json={"body": "Product managers are the primary users.", "question_ids": [question["id"]]},
    )
    assert d_resp.status_code == 201
    discussion = d_resp.json()
    assert question["id"] in discussion["question_ids"]

    detail = (
        await admin_client.get(f"{STORY_API}/{pid}/user-stories/{story['id']}")
    ).json()
    assert detail["status"] == "discovery"
    assert len(detail["questions"]) == 1
    assert len(detail["discussions"]) == 1


@pytest.mark.asyncio
async def test_user_story_dependency_cycle_rejected(admin_client: AsyncClient, db_session: AsyncSession):
    _, project = await _setup_project(admin_client, db_session, slug="us-dep-org")
    pid = project["id"]

    a = (await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "A"})).json()
    b = (await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "B"})).json()

    assert (
        await admin_client.post(
            f"{STORY_API}/{pid}/user-stories/{a['id']}/dependencies",
            json={"depends_on_id": b["id"]},
        )
    ).status_code == 201

    cycle = await admin_client.post(
        f"{STORY_API}/{pid}/user-stories/{b['id']}/dependencies",
        json={"depends_on_id": a["id"]},
    )
    assert cycle.status_code == 400


@pytest.mark.asyncio
async def test_create_tickets_requires_refined_fields(admin_client: AsyncClient, db_session: AsyncSession):
    _, project = await _setup_project(admin_client, db_session, slug="us-tkt-org")
    pid = project["id"]

    story = (
        await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "Incomplete"})
    ).json()

    resp = await admin_client.post(
        f"{STORY_API}/{pid}/user-stories/create-tickets",
        json={"user_story_ids": [story["id"]]},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_tickets_from_refined_story(admin_client: AsyncClient, db_session: AsyncSession):
    _, project = await _setup_project(admin_client, db_session, slug="us-tkt2-org")
    pid = project["id"]

    story = (
        await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "Working title"})
    ).json()
    await admin_client.patch(
        f"{STORY_API}/{pid}/user-stories/{story['id']}",
        json={
            "story_title": "As a user I can log in with SSO",
            "story_body": "Users should authenticate via OIDC.",
            "story_acceptance_criteria": "- SSO button visible\n- Redirect works",
            "priority": "high",
        },
    )

    resp = await admin_client.post(
        f"{STORY_API}/{pid}/user-stories/create-tickets",
        json={"user_story_ids": [story["id"]], "ticket_type": "story"},
    )
    assert resp.status_code == 201
    tickets = resp.json()
    assert len(tickets) == 1
    assert tickets[0]["title"] == "Working title"
    assert "As a user I can log in with SSO" in (tickets[0]["description"] or "")
    assert "Users should authenticate via OIDC." in (tickets[0]["description"] or "")
    assert tickets[0]["priority"] == "high"
    assert tickets[0]["ticket_type"] == "story"

    updated = (
        await admin_client.get(f"{STORY_API}/{pid}/user-stories/{story['id']}")
    ).json()
    assert updated["status"] == "ticket_created"
    assert len(updated["linked_tickets"]) == 1


@pytest.mark.asyncio
async def test_create_tickets_partial_batch_rolls_back(
    admin_client: AsyncClient, db_session: AsyncSession,
):
    _, project = await _setup_project(admin_client, db_session, slug="us-partial-org")
    pid = project["id"]

    incomplete = (
        await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "Incomplete"})
    ).json()
    complete = (
        await admin_client.post(f"{STORY_API}/{pid}/user-stories", json={"title": "Complete"})
    ).json()
    await admin_client.patch(
        f"{STORY_API}/{pid}/user-stories/{complete['id']}",
        json={
            "story_title": "As a user I want X",
            "story_body": "Body text",
            "story_acceptance_criteria": "- AC1",
        },
    )

    resp = await admin_client.post(
        f"{STORY_API}/{pid}/user-stories/create-tickets",
        json={"user_story_ids": [incomplete["id"], complete["id"]]},
    )
    assert resp.status_code == 422
    message = resp.json()["error"]["message"]
    assert "validation_errors" in message
    assert "created_count" not in message
