from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OrgMembership, Organization, Project, ProjectMembership, User
from app.models.workflow import Workflow, WorkflowStatus
from app.services.agent import registry
from app.services.agent.executor import _summarize_result, run_agent_turn
from app.services.agent.interaction_skills import INTERACTION_TOOLS
from app.services.agent.skills import SkillRegistry
from app.services.llm.base import StreamEvent
from app.services.ticket_service import create_ticket
from app.services.workflow_service import seed_default_workflows


async def _setup_agent_project(
    db: AsyncSession,
    user: User,
    *,
    role: str = "developer",
) -> tuple[Project, Workflow, WorkflowStatus]:
    org = Organization(name="Agent Org", slug=f"agent-org-{uuid.uuid4().hex[:8]}")
    db.add(org)
    await db.flush()

    db.add(OrgMembership(user_id=user.id, organization_id=org.id, role="owner"))
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


def test_summarize_result_transitions():
    summary = _summarize_result("get_ticket_transitions", {
        "current_status": "To Do",
        "valid_next_statuses": [{"name": "In Progress"}],
    })
    assert "To Do" in summary
    assert "1 valid transition" in summary


def test_summarize_result_dashboard():
    summary = _summarize_result("get_my_dashboard", {
        "assigned_tickets": [{"key": "A-1"}],
        "overdue_count": 2,
    })
    assert "1 assigned" in summary
    assert "2 overdue" in summary


def test_summarize_result_comments():
    summary = _summarize_result("list_ticket_comments", {
        "comments": [{"body": "hi"}],
        "total": 1,
    })
    assert "1 comment" in summary


def test_summarize_result_attachments():
    summary = _summarize_result("list_conversation_attachments", {
        "attachments": [{"id": "1"}],
        "total": 1,
    })
    assert "1 attachment" in summary


def test_summarize_result_created_with_url():
    summary = _summarize_result("create_ticket", {
        "created": True,
        "message": "Ticket AGENT-1 created successfully.",
        "url": "http://localhost/projects/abc/tickets/AGENT-1",
    })
    assert "AGENT-1 created successfully" in summary
    assert "http://localhost/projects/abc/tickets/AGENT-1" in summary


def test_interaction_tools_frozenset():
    assert "request_approval" in INTERACTION_TOOLS
    assert "present_choices" in INTERACTION_TOOLS


@pytest.mark.asyncio
async def test_executor_approval_short_circuit(
    db_session: AsyncSession, test_user: User,
):
    mock_provider = MagicMock()
    mock_provider.model = "test-model"
    mock_provider.chat_completion = AsyncMock(return_value=MagicMock(
        content="Please approve this action.",
        tool_calls=[{
            "id": "call_1",
            "type": "function",
            "function": {
                "name": "request_approval",
                "arguments": json.dumps({
                    "action": "Create ticket",
                    "details": {"title": "Test"},
                }),
            },
        }],
        prompt_tokens=10,
        completion_tokens=5,
    ))

    empty_registry = SkillRegistry()
    events: list[str] = []

    async for event in run_agent_turn(
        provider=mock_provider,
        messages=[{"role": "user", "content": "create a ticket"}],
        registry=empty_registry,
        db=db_session,
        user=test_user,
        max_tokens=100,
        temperature=0.0,
        max_tool_rounds=3,
    ):
        events.append(event)

    parsed = [json.loads(e.removeprefix("data: ").strip()) for e in events]
    types = [p["type"] for p in parsed]
    assert "approval_request" in types
    assert "_agent_done" in types
    assert "tool_start" not in types

    done_event = next(p for p in parsed if p["type"] == "_agent_done")
    history = done_event["tool_call_history"]
    interaction_msgs = [m for m in history if m.get("role") == "interaction"]
    assert len(interaction_msgs) == 1
    interaction = json.loads(interaction_msgs[0]["content"])
    assert interaction["type"] == "approval"
    assert interaction["status"] == "pending"
    assert interaction["action"] == "Create ticket"
    assert interaction["details"] == {"title": "Test"}

    tool_msgs = [m for m in history if m.get("role") == "tool"]
    assert len(tool_msgs) == 1
    assert tool_msgs[0]["name"] == "request_approval"


@pytest.mark.asyncio
async def test_executor_tool_start_and_result(
    db_session: AsyncSession, test_user: User,
):
    project, _, _ = await _setup_agent_project(db_session, test_user)
    await create_ticket(
        db_session,
        project_id=project.id,
        title="Executor test ticket",
        reporter_id=test_user.id,
    )

    mock_provider = MagicMock()
    mock_provider.model = "test-model"

    tool_response = MagicMock(
        content=None,
        tool_calls=[{
            "id": "call_1",
            "type": "function",
            "function": {
                "name": "list_my_projects",
                "arguments": "{}",
            },
        }],
        prompt_tokens=10,
        completion_tokens=5,
        model="test-model",
    )
    final_tool_response = MagicMock(
        content=None,
        tool_calls=None,
        prompt_tokens=10,
        completion_tokens=5,
        model="test-model",
    )

    call_count = 0

    async def mock_chat(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return tool_response
        return final_tool_response

    async def mock_stream(*args, **kwargs):
        yield StreamEvent(content="Here are your projects.")
        yield StreamEvent(is_done=True, model="test-model", prompt_tokens=20, completion_tokens=10)

    mock_provider.chat_completion = AsyncMock(side_effect=mock_chat)
    mock_provider.chat_completion_stream_with_usage = mock_stream

    events: list[str] = []
    async for event in run_agent_turn(
        provider=mock_provider,
        messages=[{"role": "user", "content": "list my projects"}],
        registry=registry,
        db=db_session,
        user=test_user,
        max_tokens=100,
        temperature=0.0,
        max_tool_rounds=3,
    ):
        events.append(event)

    parsed = [json.loads(e.removeprefix("data: ").strip()) for e in events]
    types = [p["type"] for p in parsed]
    assert "tool_start" in types
    assert "tool_result" in types
