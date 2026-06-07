from __future__ import annotations

import uuid

from unittest.mock import patch

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrgMembership, Organization, Project, ProjectMembership, User
from app.models.workflow import Workflow, WorkflowStatus
from app.services.agent import registry
from app.services.agent.builtin_skills import (
    CreateTicketSkill,
    GetTicketDetailsSkill,
    SearchTicketsSkill,
)
from app.services.agent.kb_skills import CreateKBPageSkill, ListKBSpacesSkill
from app.services.agent.productivity_skills import (
    AddTicketCommentSkill,
    GlobalSearchSkill,
    WatchTicketSkill,
)
from app.services.agent.skills import SkillContext
from app.services.agent.workflow_skills import GetTicketTransitionsSkill
from app.services.ticket_service import create_ticket
from app.services.workflow_service import seed_default_workflows
from app.services import kb_service
from app.schemas.kb import SpaceCreate


async def _setup_agent_project(
    db: AsyncSession,
    user: User,
    *,
    role: str = "developer",
    org_owner: User | None = None,
) -> tuple[Project, Workflow, WorkflowStatus]:
    org = Organization(name="Agent Org", slug=f"agent-org-{uuid.uuid4().hex[:8]}")
    db.add(org)
    await db.flush()

    owner = org_owner or user
    db.add(OrgMembership(user_id=owner.id, organization_id=org.id, role="owner"))
    await db.flush()

    workflows = await seed_default_workflows(db, org.id)
    kanban = next(w for w in workflows if w.name == "Simple Kanban")
    wf = await db.get(Workflow, kanban.id)
    assert wf is not None

    initial = (await db.execute(
        select(WorkflowStatus).where(
            WorkflowStatus.workflow_id == wf.id,
            WorkflowStatus.is_initial == True,  # noqa: E712
        )
    )).scalar_one()

    project = Project(
        organization_id=org.id,
        name="Agent Project",
        key="AGENT",
        visibility="internal",
        default_workflow_id=wf.id,
    )
    db.add(project)
    await db.flush()

    db.add(ProjectMembership(user_id=user.id, project_id=project.id, role=role))
    await db.flush()

    return project, wf, initial


def _ctx(db: AsyncSession, user: User, params: dict) -> SkillContext:
    return SkillContext(db=db, user=user, params=params)


@pytest.mark.asyncio
async def test_registry_has_expected_skill_count():
    assert len(registry) == 29


@pytest.mark.asyncio
async def test_search_tickets_priority_enum_matches_schema():
    skill = SearchTicketsSkill()
    priority_prop = skill.parameters_schema["properties"]["priority"]
    assert priority_prop["enum"] == ["lowest", "low", "medium", "high", "highest"]
    assert "status_name" in skill.parameters_schema["properties"]


@pytest.mark.asyncio
async def test_search_tickets_status_name_filter(
    db_session: AsyncSession, test_user: User,
):
    project, _, initial = await _setup_agent_project(db_session, test_user)
    await create_ticket(
        db_session,
        project_id=project.id,
        title="Open task",
        reporter_id=test_user.id,
    )

    skill = SearchTicketsSkill()
    result = await skill.execute(_ctx(
        db_session, test_user,
        {"project_key": project.key, "status_name": initial.name},
    ))
    assert result["total"] >= 1
    assert all(t["status"] == initial.name for t in result["tickets"])


@pytest.mark.asyncio
async def test_get_ticket_details_includes_parent_and_subtasks(
    db_session: AsyncSession, test_user: User,
):
    project, _, _ = await _setup_agent_project(db_session, test_user)
    parent = await create_ticket(
        db_session,
        project_id=project.id,
        title="Parent",
        reporter_id=test_user.id,
    )
    await create_ticket(
        db_session,
        project_id=project.id,
        title="Child subtask",
        reporter_id=test_user.id,
        parent_ticket_id=parent.id,
    )

    skill = GetTicketDetailsSkill()
    parent_result = await skill.execute(_ctx(
        db_session, test_user,
        {"project_key": project.key, "ticket_number": parent.ticket_number},
    ))
    assert parent_result["subtask_count"] == 1
    assert len(parent_result["subtasks"]) == 1
    assert parent_result["subtasks"][0]["key"] == f"{project.key}-{parent.ticket_number + 1}"

    child_result = await skill.execute(_ctx(
        db_session, test_user,
        {"project_key": project.key, "ticket_number": parent.ticket_number + 1},
    ))
    assert child_result["parent_key"] == f"{project.key}-{parent.ticket_number}"


@pytest.mark.asyncio
async def test_create_ticket_with_parent_ticket_number(
    db_session: AsyncSession, test_user: User,
):
    project, _, _ = await _setup_agent_project(db_session, test_user)
    parent = await create_ticket(
        db_session,
        project_id=project.id,
        title="Parent for subtask skill",
        reporter_id=test_user.id,
    )

    skill = CreateTicketSkill()
    result = await skill.execute(_ctx(
        db_session, test_user,
        {
            "project_key": project.key,
            "title": "Sub via skill",
            "parent_ticket_number": parent.ticket_number,
        },
    ))
    assert result["created"] is True
    assert result["type"] == "subtask"


@pytest.mark.asyncio
async def test_get_ticket_transitions_returns_valid_next(
    db_session: AsyncSession, test_user: User,
):
    project, wf, initial = await _setup_agent_project(db_session, test_user)
    ticket = await create_ticket(
        db_session,
        project_id=project.id,
        title="Transition test",
        reporter_id=test_user.id,
    )

    skill = GetTicketTransitionsSkill()
    result = await skill.execute(_ctx(
        db_session, test_user,
        {"project_key": project.key, "ticket_number": ticket.ticket_number},
    ))
    assert result["current_status"] == initial.name
    assert any(s["name"] == "In Progress" for s in result["valid_next_statuses"])
    assert len(result["all_statuses"]) >= 3


@pytest.mark.asyncio
async def test_global_search_respects_project_scope(
    db_session: AsyncSession, test_user: User,
):
    project, _, _ = await _setup_agent_project(db_session, test_user)
    ticket = await create_ticket(
        db_session,
        project_id=project.id,
        title="UniqueSearchableAlphaTicket",
        reporter_id=test_user.id,
    )
    await db_session.execute(
        text(
            "UPDATE tickets SET search_vector = to_tsvector('english', title) "
            "WHERE id = :id"
        ),
        {"id": ticket.id},
    )
    await db_session.flush()

    skill = GlobalSearchSkill()
    result = await skill.execute(_ctx(
        db_session, test_user,
        {"query": "UniqueSearchableAlphaTicket", "project_key": project.key},
    ))
    assert result["total"] >= 1
    assert any("UniqueSearchableAlphaTicket" in (r.get("title") or "") for r in result["results"])


@pytest.mark.asyncio
async def test_add_comment_requires_developer_role(
    db_session: AsyncSession, test_user: User,
):
    guest = User(
        oidc_subject=f"guest-{uuid.uuid4().hex[:8]}",
        email="guest@example.com",
        display_name="Guest User",
        is_active=True,
        preferences={},
    )
    db_session.add(guest)
    await db_session.flush()

    project, _, _ = await _setup_agent_project(
        db_session, guest, role="guest", org_owner=test_user,
    )
    ticket = await create_ticket(
        db_session,
        project_id=project.id,
        title="Comment target",
        reporter_id=guest.id,
    )

    skill = AddTicketCommentSkill()
    result = await skill.execute(_ctx(
        db_session, guest,
        {
            "project_key": project.key,
            "ticket_number": ticket.ticket_number,
            "body": "Should fail",
        },
    ))
    assert "error" in result
    assert "Developer" in result["error"]


@pytest.mark.asyncio
async def test_watch_ticket_idempotent(
    db_session: AsyncSession, test_user: User,
):
    project, _, _ = await _setup_agent_project(db_session, test_user)
    ticket = await create_ticket(
        db_session,
        project_id=project.id,
        title="Watch target",
        reporter_id=test_user.id,
    )

    skill = WatchTicketSkill()
    first = await skill.execute(_ctx(
        db_session, test_user,
        {"project_key": project.key, "ticket_number": ticket.ticket_number},
    ))
    second = await skill.execute(_ctx(
        db_session, test_user,
        {"project_key": project.key, "ticket_number": ticket.ticket_number},
    ))
    assert first["watching"] is True
    assert second["watching"] is True


@pytest.mark.asyncio
async def test_list_kb_spaces(
    db_session: AsyncSession, test_user: User,
):
    project, _, _ = await _setup_agent_project(db_session, test_user)
    await kb_service.create_space(
        db_session,
        project.id,
        SpaceCreate(name="Documentation"),
        user_id=test_user.id,
    )

    skill = ListKBSpacesSkill()
    result = await skill.execute(_ctx(
        db_session, test_user,
        {"project_key": project.key},
    ))
    assert result["total"] == 1
    assert result["spaces"][0]["name"] == "Documentation"
    assert result["spaces"][0]["slug"] == "documentation"


@pytest.mark.asyncio
@patch("app.services.agent.kb_skills.schedule_kb_page_embedding")
async def test_create_kb_page(
    mock_schedule,
    db_session: AsyncSession, test_user: User,
):
    project, _, _ = await _setup_agent_project(db_session, test_user)
    space = await kb_service.create_space(
        db_session,
        project.id,
        SpaceCreate(name="Wiki"),
        user_id=test_user.id,
    )

    skill = CreateKBPageSkill()
    result = await skill.execute(_ctx(
        db_session, test_user,
        {
            "project_key": project.key,
            "space_slug": space.slug,
            "title": "Getting Started",
            "content_markdown": "# Hello\n\nWelcome to the wiki.",
        },
    ))
    assert result["created"] is True
    assert result["slug"] == "getting-started"
    assert result["space_slug"] == space.slug
    assert f"/projects/{project.id}/kb/{space.slug}/getting-started" in result["path"]
    assert result["url"].endswith(result["path"])
    mock_schedule.assert_called_once()
    scheduled_id = mock_schedule.call_args[0][0]
    assert scheduled_id == result["page_id"]
