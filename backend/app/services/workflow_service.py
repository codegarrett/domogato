from __future__ import annotations

import uuid
from collections import deque
from typing import Any
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workflow import Workflow, WorkflowStatus, WorkflowTransition


async def create_workflow(
    db: AsyncSession,
    org_id: UUID,
    name: str,
    description: str | None = None,
) -> Workflow:
    wf = Workflow(
        organization_id=org_id,
        name=name,
        description=description,
    )
    db.add(wf)
    await db.flush()
    await db.refresh(wf)
    return wf


async def clone_from_template(
    db: AsyncSession,
    org_id: UUID,
    template_id: UUID,
    name: str,
) -> Workflow:
    template = await get_workflow(db, template_id)
    if template is None:
        raise ValueError("Template workflow not found")

    wf = Workflow(
        organization_id=org_id,
        name=name,
        description=template.description,
    )
    db.add(wf)
    await db.flush()
    await db.refresh(wf)

    old_to_new: dict[uuid.UUID, uuid.UUID] = {}
    for s in template.statuses:
        new_status = WorkflowStatus(
            workflow_id=wf.id,
            name=s.name,
            category=s.category,
            color=s.color,
            position=s.position,
            is_initial=s.is_initial,
            is_terminal=s.is_terminal,
        )
        db.add(new_status)
        await db.flush()
        await db.refresh(new_status)
        old_to_new[s.id] = new_status.id

    for t in template.transitions:
        new_from = old_to_new.get(t.from_status_id)
        new_to = old_to_new.get(t.to_status_id)
        if new_from and new_to:
            new_transition = WorkflowTransition(
                workflow_id=wf.id,
                from_status_id=new_from,
                to_status_id=new_to,
                name=t.name,
                conditions=dict(t.conditions) if t.conditions else {},
            )
            db.add(new_transition)

    await db.flush()

    return await get_workflow(db, wf.id)  # type: ignore[return-value]


async def get_workflow(db: AsyncSession, workflow_id: UUID) -> Workflow | None:
    result = await db.execute(
        select(Workflow)
        .where(Workflow.id == workflow_id)
        .options(
            selectinload(Workflow.statuses),
            selectinload(Workflow.transitions),
        )
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def list_workflows(
    db: AsyncSession,
    org_id: UUID,
    *,
    offset: int = 0,
    limit: int = 50,
    include_templates: bool = False,
) -> tuple[list[Workflow], int]:
    query = select(Workflow).where(Workflow.organization_id == org_id)
    if not include_templates:
        query = query.where(Workflow.is_template == False)  # noqa: E712

    from sqlalchemy import func
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = (
        query
        .options(selectinload(Workflow.statuses), selectinload(Workflow.transitions))
        .order_by(Workflow.name)
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    workflows = list(result.scalars().all())

    return workflows, total


async def update_workflow(
    db: AsyncSession, workflow_id: UUID, **kwargs: Any
) -> Workflow | None:
    wf = await get_workflow(db, workflow_id)
    if wf is None:
        return None
    for key, value in kwargs.items():
        if value is not None and hasattr(wf, key):
            setattr(wf, key, value)
    await db.flush()
    await db.refresh(wf)
    return wf


async def delete_workflow(db: AsyncSession, workflow_id: UUID) -> bool:
    wf = await get_workflow(db, workflow_id)
    if wf is None:
        return False
    await db.delete(wf)
    await db.flush()
    return True


async def add_status(
    db: AsyncSession,
    workflow_id: UUID,
    name: str,
    category: str = "to_do",
    color: str = "#6B7280",
    position: int = 0,
    is_initial: bool = False,
    is_terminal: bool = False,
) -> WorkflowStatus:
    status = WorkflowStatus(
        workflow_id=workflow_id,
        name=name,
        category=category,
        color=color,
        position=position,
        is_initial=is_initial,
        is_terminal=is_terminal,
    )
    db.add(status)
    await db.flush()
    await db.refresh(status)
    return status


async def update_status(
    db: AsyncSession, status_id: UUID, **kwargs: Any
) -> WorkflowStatus | None:
    result = await db.execute(
        select(WorkflowStatus).where(WorkflowStatus.id == status_id)
    )
    ws = result.scalar_one_or_none()
    if ws is None:
        return None
    for key, value in kwargs.items():
        if value is not None and hasattr(ws, key):
            setattr(ws, key, value)
    await db.flush()
    await db.refresh(ws)
    return ws


async def remove_status(db: AsyncSession, status_id: UUID) -> bool:
    result = await db.execute(
        select(WorkflowStatus).where(WorkflowStatus.id == status_id)
    )
    ws = result.scalar_one_or_none()
    if ws is None:
        return False

    await db.execute(
        delete(WorkflowTransition).where(
            (WorkflowTransition.from_status_id == status_id)
            | (WorkflowTransition.to_status_id == status_id)
        )
    )

    await db.delete(ws)
    await db.flush()
    return True


async def add_transition(
    db: AsyncSession,
    workflow_id: UUID,
    from_status_id: UUID,
    to_status_id: UUID,
    name: str | None = None,
    conditions: dict[str, Any] | None = None,
) -> WorkflowTransition:
    transition = WorkflowTransition(
        workflow_id=workflow_id,
        from_status_id=from_status_id,
        to_status_id=to_status_id,
        name=name,
        conditions=conditions or {},
    )
    db.add(transition)
    await db.flush()
    await db.refresh(transition)
    return transition


async def remove_transition(db: AsyncSession, transition_id: UUID) -> bool:
    result = await db.execute(
        select(WorkflowTransition).where(WorkflowTransition.id == transition_id)
    )
    t = result.scalar_one_or_none()
    if t is None:
        return False
    await db.delete(t)
    await db.flush()
    return True


async def validate_workflow(db: AsyncSession, workflow_id: UUID) -> list[str]:
    wf = await get_workflow(db, workflow_id)
    if wf is None:
        return ["Workflow not found"]

    errors: list[str] = []

    initial_statuses = [s for s in wf.statuses if s.is_initial]
    terminal_statuses = [s for s in wf.statuses if s.is_terminal]

    if not initial_statuses:
        errors.append("Workflow must have at least one initial status")
    if not terminal_statuses:
        errors.append("Workflow must have at least one terminal status")

    if initial_statuses and wf.statuses:
        adjacency: dict[uuid.UUID, list[uuid.UUID]] = {}
        for s in wf.statuses:
            adjacency[s.id] = []
        for t in wf.transitions:
            if t.from_status_id in adjacency:
                adjacency[t.from_status_id].append(t.to_status_id)

        reachable: set[uuid.UUID] = set()
        queue: deque[uuid.UUID] = deque()
        for s in initial_statuses:
            reachable.add(s.id)
            queue.append(s.id)

        while queue:
            current = queue.popleft()
            for neighbor in adjacency.get(current, []):
                if neighbor not in reachable:
                    reachable.add(neighbor)
                    queue.append(neighbor)

        for s in wf.statuses:
            if s.id not in reachable:
                errors.append(
                    f"Status '{s.name}' is not reachable from any initial status"
                )

    return errors


async def seed_default_workflows(db: AsyncSession, org_id: UUID) -> list[Workflow]:
    DEFAULT_NAMES = {"Simple Kanban", "Scrum Standard", "Bug Tracking"}
    existing = await db.execute(
        select(Workflow).where(
            Workflow.organization_id == org_id,
            Workflow.name.in_(DEFAULT_NAMES),
        )
    )
    if existing.scalars().first() is not None:
        return []

    workflows: list[Workflow] = []

    # --- Simple Kanban ---
    kanban = Workflow(organization_id=org_id, name="Simple Kanban")
    db.add(kanban)
    await db.flush()
    await db.refresh(kanban)

    kanban_statuses = [
        WorkflowStatus(workflow_id=kanban.id, name="To Do", category="to_do", color="#6B7280", position=0, is_initial=True),
        WorkflowStatus(workflow_id=kanban.id, name="In Progress", category="in_progress", color="#3B82F6", position=1),
        WorkflowStatus(workflow_id=kanban.id, name="Done", category="done", color="#10B981", position=2, is_terminal=True),
    ]
    for s in kanban_statuses:
        db.add(s)
    await db.flush()
    for s in kanban_statuses:
        await db.refresh(s)

    kanban_transitions = [
        WorkflowTransition(workflow_id=kanban.id, from_status_id=kanban_statuses[0].id, to_status_id=kanban_statuses[1].id, name="Start"),
        WorkflowTransition(workflow_id=kanban.id, from_status_id=kanban_statuses[1].id, to_status_id=kanban_statuses[2].id, name="Complete"),
    ]
    for t in kanban_transitions:
        db.add(t)
    await db.flush()
    workflows.append(kanban)

    # --- Scrum Standard ---
    scrum = Workflow(organization_id=org_id, name="Scrum Standard")
    db.add(scrum)
    await db.flush()
    await db.refresh(scrum)

    scrum_defs = [
        ("Open", "to_do", "#6B7280", True, False),
        ("To Do", "to_do", "#9CA3AF", False, False),
        ("In Progress", "in_progress", "#3B82F6", False, False),
        ("In Review", "in_progress", "#8B5CF6", False, False),
        ("QA", "in_progress", "#F59E0B", False, False),
        ("Done", "done", "#10B981", False, True),
        ("Closed", "done", "#6366F1", False, True),
    ]
    scrum_statuses: list[WorkflowStatus] = []
    for i, (name, cat, color, initial, terminal) in enumerate(scrum_defs):
        s = WorkflowStatus(
            workflow_id=scrum.id, name=name, category=cat, color=color,
            position=i, is_initial=initial, is_terminal=terminal,
        )
        db.add(s)
        scrum_statuses.append(s)
    await db.flush()
    for s in scrum_statuses:
        await db.refresh(s)

    for i in range(len(scrum_statuses) - 1):
        db.add(WorkflowTransition(
            workflow_id=scrum.id,
            from_status_id=scrum_statuses[i].id,
            to_status_id=scrum_statuses[i + 1].id,
        ))
    await db.flush()
    workflows.append(scrum)

    # --- Bug Tracking ---
    bug = Workflow(organization_id=org_id, name="Bug Tracking")
    db.add(bug)
    await db.flush()
    await db.refresh(bug)

    bug_defs = [
        ("New", "to_do", "#EF4444", True, False),
        ("Triaged", "to_do", "#F59E0B", False, False),
        ("In Progress", "in_progress", "#3B82F6", False, False),
        ("Fixed", "in_progress", "#8B5CF6", False, False),
        ("Verified", "in_progress", "#10B981", False, False),
        ("Closed", "done", "#6366F1", False, True),
    ]
    bug_statuses: list[WorkflowStatus] = []
    for i, (name, cat, color, initial, terminal) in enumerate(bug_defs):
        s = WorkflowStatus(
            workflow_id=bug.id, name=name, category=cat, color=color,
            position=i, is_initial=initial, is_terminal=terminal,
        )
        db.add(s)
        bug_statuses.append(s)
    await db.flush()
    for s in bug_statuses:
        await db.refresh(s)

    for i in range(len(bug_statuses) - 1):
        db.add(WorkflowTransition(
            workflow_id=bug.id,
            from_status_id=bug_statuses[i].id,
            to_status_id=bug_statuses[i + 1].id,
        ))
    await db.flush()
    workflows.append(bug)

    return workflows
