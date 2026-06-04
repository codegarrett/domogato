"""Built-in agent skills for ProjectHub.

Skills enforce user permissions via check_project_access.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.epic import Epic
from app.models.kb_page import KBPage
from app.models.kb_space import KBSpace
from app.models.membership import OrgMembership
from app.models.organization import Organization
from app.models.project import Project
from app.models.sprint import Sprint
from app.models.ticket import Ticket
from app.models.user import User
from app.models.workflow import Workflow, WorkflowStatus, WorkflowTransition
from app.core import events
from app.core.permissions import ProjectRole
from app.services.agent.skills import (
    BaseSkill,
    SkillContext,
    SkillPermissionError,
    absolute_url,
    check_project_access,
    resolve_assignee_id,
    resolve_epic_id_by_title,
    resolve_sprint_id_by_name,
    resolve_ticket,
    resolve_workflow_status_id,
    ticket_path,
)
from app.services import comment_service, issue_report_service
from app.services.project_service import list_projects_for_user
from app.services.sprint_service import get_sprint_stats, list_sprints
from app.services.ticket_service import create_ticket, get_ticket, list_tickets, update_ticket, transition_status


class ListMyProjectsSkill(BaseSkill):
    name = "list_my_projects"
    description = "List projects the current user has access to across all their organizations."
    category = "projects"
    parameters_schema = {
        "type": "object",
        "properties": {},
        "required": [],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        orgs_result = await ctx.db.execute(
            select(OrgMembership.organization_id).where(
                OrgMembership.user_id == ctx.user.id
            )
        )
        org_ids = list(orgs_result.scalars().all())

        if ctx.user.is_system_admin:
            org_result = await ctx.db.execute(select(Organization.id))
            org_ids = list(org_result.scalars().all())

        all_projects = []
        for org_id in org_ids:
            projects, _ = await list_projects_for_user(
                ctx.db, org_id, ctx.user.id,
                is_system_admin=ctx.user.is_system_admin,
                limit=100,
            )
            org_result = await ctx.db.execute(
                select(Organization.name).where(Organization.id == org_id)
            )
            org_name = org_result.scalar_one_or_none() or "Unknown"
            for p in projects:
                all_projects.append({
                    "key": p.key,
                    "name": p.name,
                    "description": (p.description or "")[:200],
                    "organization": org_name,
                })

        return {
            "projects": all_projects,
            "total": len(all_projects),
        }


class SearchTicketsSkill(BaseSkill):
    name = "search_tickets"
    description = "Search for tickets in a project by keyword, status, priority, assignee, or ticket type."
    category = "tickets"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "query": {
                "type": "string",
                "description": "Search text to match against ticket titles",
            },
            "priority": {
                "type": "string",
                "enum": ["lowest", "low", "medium", "high", "highest"],
                "description": "Filter by priority level",
            },
            "status_name": {
                "type": "string",
                "description": "Filter by workflow status name (e.g., 'Open', 'In Progress')",
            },
            "assignee": {
                "type": "string",
                "description": "Filter by assignee email, or 'me' for the current user",
            },
            "ticket_type": {
                "type": "string",
                "enum": ["task", "bug", "story", "epic"],
                "description": "Filter by ticket type",
            },
        },
        "required": ["project_key"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])

        assignee_id = None
        assignee_param = ctx.params.get("assignee")
        if assignee_param:
            assignee_id = await resolve_assignee_id(ctx.db, assignee_param, ctx.user)

        workflow_status_id = None
        status_name = ctx.params.get("status_name")
        if status_name:
            workflow_status_id = await resolve_workflow_status_id(
                ctx.db, project=project, status_name=status_name,
            )
            if workflow_status_id is None:
                return {
                    "error": f"Status '{status_name}' not found in this project's workflow.",
                }

        tickets_list, total = await list_tickets(
            ctx.db,
            project.id,
            search=ctx.params.get("query"),
            priority=ctx.params.get("priority"),
            assignee_id=assignee_id,
            ticket_type=ctx.params.get("ticket_type"),
            workflow_status_id=workflow_status_id,
            limit=20,
        )

        result_tickets = []
        for t in tickets_list:
            status_name = None
            if t.workflow_status_id:
                ws = await ctx.db.execute(
                    select(WorkflowStatus.name).where(WorkflowStatus.id == t.workflow_status_id)
                )
                status_name = ws.scalar_one_or_none()

            assignee_name = None
            if t.assignee_id:
                u = await ctx.db.execute(
                    select(User.display_name).where(User.id == t.assignee_id)
                )
                assignee_name = u.scalar_one_or_none()

            result_tickets.append({
                "key": f"{project.key}-{t.ticket_number}",
                "title": t.title,
                "type": t.ticket_type,
                "priority": t.priority,
                "status": status_name,
                "assignee": assignee_name,
                "story_points": t.story_points,
            })

        return {
            "tickets": result_tickets,
            "total": total,
            "project": project.key,
        }


class GetTicketDetailsSkill(BaseSkill):
    name = "get_ticket_details"
    description = "Get full details of a specific ticket by project key and ticket number."
    category = "tickets"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "ticket_number": {
                "type": "integer",
                "description": "The ticket number (e.g., 42 for PROJ-42)",
            },
        },
        "required": ["project_key", "ticket_number"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])

        ticket = await resolve_ticket(ctx.db, project, ctx.params["ticket_number"])
        if ticket is None:
            return {"error": f"Ticket {project.key}-{ctx.params['ticket_number']} not found"}

        status_name = None
        if ticket.workflow_status_id:
            ws = await ctx.db.execute(
                select(WorkflowStatus.name).where(WorkflowStatus.id == ticket.workflow_status_id)
            )
            status_name = ws.scalar_one_or_none()

        assignee_name = None
        if ticket.assignee_id:
            u = await ctx.db.execute(
                select(User.display_name).where(User.id == ticket.assignee_id)
            )
            assignee_name = u.scalar_one_or_none()

        reporter_name = None
        if ticket.reporter_id:
            u = await ctx.db.execute(
                select(User.display_name).where(User.id == ticket.reporter_id)
            )
            reporter_name = u.scalar_one_or_none()

        parent_key = None
        if ticket.parent_ticket_id:
            parent = await ctx.db.get(Ticket, ticket.parent_ticket_id)
            if parent and not parent.is_deleted:
                parent_key = f"{project.key}-{parent.ticket_number}"

        sprint_name = None
        if ticket.sprint_id:
            sprint_row = await ctx.db.execute(
                select(Sprint.name).where(Sprint.id == ticket.sprint_id)
            )
            sprint_name = sprint_row.scalar_one_or_none()

        epic_title = None
        if ticket.epic_id:
            epic_row = await ctx.db.execute(
                select(Epic.title).where(Epic.id == ticket.epic_id)
            )
            epic_title = epic_row.scalar_one_or_none()

        subtasks_list, subtask_total = await list_tickets(
            ctx.db, project.id, parent_ticket_id=ticket.id, limit=10,
        )
        subtasks = [
            {
                "key": f"{project.key}-{st.ticket_number}",
                "title": st.title,
                "status_id": str(st.workflow_status_id),
            }
            for st in subtasks_list
        ]

        _, comment_count = await comment_service.list_comments(
            ctx.db, ticket.id, limit=1,
        )
        source_issue_reports = await issue_report_service.get_ticket_issue_report_links(
            ctx.db, ticket.id,
        )

        return {
            "key": f"{project.key}-{ticket.ticket_number}",
            "title": ticket.title,
            "description": ticket.description or "",
            "type": ticket.ticket_type,
            "priority": ticket.priority,
            "status": status_name,
            "assignee": assignee_name,
            "reporter": reporter_name,
            "parent_key": parent_key,
            "sprint_name": sprint_name,
            "epic_title": epic_title,
            "subtask_count": subtask_total,
            "subtasks": subtasks,
            "comment_count": comment_count,
            "source_issue_reports": source_issue_reports,
            "story_points": ticket.story_points,
            "due_date": str(ticket.due_date) if ticket.due_date else None,
            "created_at": ticket.created_at.isoformat() if ticket.created_at else None,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else None,
        }


class GetSprintStatusSkill(BaseSkill):
    name = "get_sprint_status"
    description = "Get the active sprint status and completion statistics for a project."
    category = "sprints"
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

        sprints_list, _ = await list_sprints(
            ctx.db, project.id, status_filter="active", limit=1,
        )

        if not sprints_list:
            return {
                "project": project.key,
                "message": "No active sprint found",
                "sprint": None,
            }

        sprint = sprints_list[0]
        stats = await get_sprint_stats(ctx.db, sprint.id)

        return {
            "project": project.key,
            "sprint": {
                "name": sprint.name,
                "goal": sprint.goal,
                "status": sprint.status,
                "start_date": str(sprint.start_date) if sprint.start_date else None,
                "end_date": str(sprint.end_date) if sprint.end_date else None,
            },
            "stats": stats,
        }


class SearchKnowledgeBaseSkill(BaseSkill):
    name = "search_knowledge_base"
    description = "Search published knowledge base pages in a project using full-text search."
    category = "knowledge_base"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "query": {
                "type": "string",
                "description": "Search query for knowledge base articles",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results (default 5, max 20)",
                "default": 5,
            },
        },
        "required": ["project_key", "query"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])

        query_text = ctx.params["query"]
        limit = min(ctx.params.get("limit", 5), 20)

        ts_query = func.plainto_tsquery("english", query_text)

        stmt = (
            select(
                KBPage.id,
                KBPage.title,
                KBPage.slug,
                KBSpace.name.label("space_name"),
                KBSpace.slug.label("space_slug"),
                func.ts_headline(
                    "english",
                    KBPage.content_markdown,
                    ts_query,
                    "MaxFragments=2, MaxWords=40, MinWords=15",
                ).label("headline"),
            )
            .join(KBSpace, KBSpace.id == KBPage.space_id)
            .where(
                KBSpace.project_id == project.id,
                KBPage.is_deleted == False,
                KBPage.is_published == True,
                KBPage.search_vector.op("@@")(ts_query),
            )
            .order_by(func.ts_rank_cd(KBPage.search_vector, ts_query).desc())
            .limit(limit)
        )

        rows = (await ctx.db.execute(stmt)).all()

        results = []
        for page_id, title, slug, space_name, space_slug, headline in rows:
            results.append({
                "title": title,
                "space": space_name,
                "headline": headline or "",
            })

        return {
            "results": results,
            "total": len(results),
            "project": project.key,
            "query": query_text,
        }


class CreateTicketSkill(BaseSkill):
    name = "create_ticket"
    description = (
        "Create a new ticket in a project. Requires at least Developer role. "
        "You MUST have a title and should have a description before calling this."
    )
    category = "tickets"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "title": {
                "type": "string",
                "description": "Short summary of the ticket (max 500 chars)",
            },
            "description": {
                "type": "string",
                "description": (
                    "Markdown-formatted detailed description, acceptance criteria, etc."
                ),
            },
            "ticket_type": {
                "type": "string",
                "enum": ["task", "bug", "story", "epic"],
                "description": "Type of ticket (default: task)",
            },
            "priority": {
                "type": "string",
                "enum": ["lowest", "low", "medium", "high", "highest"],
                "description": "Priority level (default: medium)",
            },
            "story_points": {
                "type": "integer",
                "description": "Story point estimate",
            },
            "assignee_email": {
                "type": "string",
                "description": "Email of assignee, or 'me' for the current user",
            },
            "parent_ticket_number": {
                "type": "integer",
                "description": "Parent ticket number to create a subtask (e.g., 42 for PROJ-42)",
            },
            "sprint_name": {
                "type": "string",
                "description": "Name of the sprint to assign the ticket to",
            },
            "epic_title": {
                "type": "string",
                "description": "Title of the epic to assign the ticket to",
            },
        },
        "required": ["project_key", "title"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        try:
            project = await check_project_access(
                ctx.db, ctx.user, ctx.params["project_key"],
                min_role=ProjectRole.DEVELOPER,
            )
        except SkillPermissionError:
            return {
                "error": (
                    f"You don't have permission to create tickets in project "
                    f"'{ctx.params['project_key']}'. You need at least the Developer "
                    f"role. Contact the project owner or maintainer to request access."
                ),
            }

        kwargs: dict = {
            "project_id": project.id,
            "title": ctx.params["title"],
            "reporter_id": ctx.user.id,
        }
        if ctx.params.get("description"):
            kwargs["description"] = ctx.params["description"]
        if ctx.params.get("ticket_type"):
            kwargs["ticket_type"] = ctx.params["ticket_type"]
        if ctx.params.get("priority"):
            kwargs["priority"] = ctx.params["priority"]
        if ctx.params.get("story_points") is not None:
            kwargs["story_points"] = ctx.params["story_points"]

        if ctx.params.get("assignee_email"):
            assignee_id = await resolve_assignee_id(
                ctx.db, ctx.params["assignee_email"], ctx.user,
            )
            if assignee_id is None:
                return {"error": f"User with email '{ctx.params['assignee_email']}' not found"}
            kwargs["assignee_id"] = assignee_id

        if ctx.params.get("parent_ticket_number") is not None:
            parent = await resolve_ticket(
                ctx.db, project, ctx.params["parent_ticket_number"],
            )
            if parent is None:
                return {
                    "error": (
                        f"Parent ticket {project.key}-{ctx.params['parent_ticket_number']} "
                        "not found"
                    ),
                }
            kwargs["parent_ticket_id"] = parent.id

        if ctx.params.get("sprint_name"):
            sprint_id = await resolve_sprint_id_by_name(
                ctx.db, project.id, ctx.params["sprint_name"],
            )
            if sprint_id is None:
                return {"error": f"Sprint '{ctx.params['sprint_name']}' not found"}
            kwargs["sprint_id"] = sprint_id

        if ctx.params.get("epic_title"):
            epic_id = await resolve_epic_id_by_title(
                ctx.db, project.id, ctx.params["epic_title"],
            )
            if epic_id is None:
                return {"error": f"Epic '{ctx.params['epic_title']}' not found"}
            kwargs["epic_id"] = epic_id

        try:
            ticket = await create_ticket(ctx.db, **kwargs)
        except ValueError as exc:
            return {"error": str(exc)}

        await events.publish(
            events.EVENT_TICKET_CREATED,
            ticket_id=str(ticket.id),
            project_id=str(ticket.project_id),
        )

        ticket_key = f"{project.key}-{ticket.ticket_number}"
        path = ticket_path(project.id, ticket_key)

        return {
            "created": True,
            "key": ticket_key,
            "title": ticket.title,
            "type": ticket.ticket_type,
            "priority": ticket.priority,
            "project_id": str(project.id),
            "path": path,
            "url": absolute_url(path),
            "message": f"Ticket {ticket_key} created successfully.",
        }


class UpdateTicketSkill(BaseSkill):
    name = "update_ticket"
    description = (
        "Update fields on an existing ticket (title, description, priority, "
        "assignee, type, story points, dates, sprint, epic, parent). Requires "
        "Developer role. Does NOT change workflow status — use "
        "transition_ticket_status for that."
    )
    category = "tickets"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "ticket_number": {
                "type": "integer",
                "description": "The ticket number (e.g., 42 for PROJ-42)",
            },
            "title": {
                "type": "string",
                "description": "New title for the ticket",
            },
            "description": {
                "type": "string",
                "description": "New description (replaces the entire description)",
            },
            "ticket_type": {
                "type": "string",
                "enum": ["task", "bug", "story", "epic"],
                "description": "Change ticket type",
            },
            "priority": {
                "type": "string",
                "enum": ["lowest", "low", "medium", "high", "highest"],
                "description": "Change priority",
            },
            "assignee_email": {
                "type": "string",
                "description": "Email of the user to assign, or 'me' for the current user",
            },
            "story_points": {
                "type": "integer",
                "description": "Set story point estimate",
            },
            "due_date": {
                "type": "string",
                "description": "Due date in YYYY-MM-DD format, or null to clear",
            },
            "sprint_name": {
                "type": "string",
                "description": "Sprint name to assign, or 'null' to clear",
            },
            "epic_title": {
                "type": "string",
                "description": "Epic title to assign, or 'null' to clear",
            },
            "parent_ticket_number": {
                "type": "integer",
                "description": "Parent ticket number for reparenting (creates subtask link)",
            },
            "clear_assignee": {
                "type": "boolean",
                "description": "Set to true to remove the current assignee",
            },
        },
        "required": ["project_key", "ticket_number"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        try:
            project = await check_project_access(
                ctx.db, ctx.user, ctx.params["project_key"],
                min_role=ProjectRole.DEVELOPER,
            )
        except SkillPermissionError:
            return {
                "error": (
                    f"You don't have permission to update tickets in project "
                    f"'{ctx.params['project_key']}'. You need at least the Developer role."
                ),
            }

        ticket = await resolve_ticket(ctx.db, project, ctx.params["ticket_number"])
        if ticket is None:
            return {"error": f"Ticket {project.key}-{ctx.params['ticket_number']} not found"}

        kwargs: dict = {}
        for field in ("title", "description", "ticket_type", "priority", "story_points"):
            if field in ctx.params and ctx.params[field] is not None:
                kwargs[field] = ctx.params[field]

        if ctx.params.get("clear_assignee"):
            kwargs["assignee_id"] = None
        elif ctx.params.get("assignee_email"):
            email = ctx.params["assignee_email"]
            assignee_id = await resolve_assignee_id(ctx.db, email, ctx.user)
            if assignee_id is None:
                return {"error": f"User with email '{email}' not found"}
            kwargs["assignee_id"] = assignee_id

        if "due_date" in ctx.params:
            from datetime import date as date_type
            val = ctx.params["due_date"]
            if val is None or val == "" or val == "null":
                kwargs["due_date"] = None
            else:
                try:
                    kwargs["due_date"] = date_type.fromisoformat(val)
                except ValueError:
                    return {"error": f"Invalid date format: '{val}'. Use YYYY-MM-DD."}

        if "sprint_name" in ctx.params:
            val = ctx.params["sprint_name"]
            if val is None or val == "" or val == "null":
                kwargs["sprint_id"] = None
            else:
                sprint_id = await resolve_sprint_id_by_name(ctx.db, project.id, val)
                if sprint_id is None:
                    return {"error": f"Sprint '{val}' not found"}
                kwargs["sprint_id"] = sprint_id

        if "epic_title" in ctx.params:
            val = ctx.params["epic_title"]
            if val is None or val == "" or val == "null":
                kwargs["epic_id"] = None
            else:
                epic_id = await resolve_epic_id_by_title(ctx.db, project.id, val)
                if epic_id is None:
                    return {"error": f"Epic '{val}' not found"}
                kwargs["epic_id"] = epic_id

        if ctx.params.get("parent_ticket_number") is not None:
            parent = await resolve_ticket(
                ctx.db, project, ctx.params["parent_ticket_number"],
            )
            if parent is None:
                return {
                    "error": (
                        f"Parent ticket {project.key}-{ctx.params['parent_ticket_number']} "
                        "not found"
                    ),
                }
            kwargs["parent_ticket_id"] = parent.id

        if not kwargs:
            return {"error": "No fields provided to update"}

        updated = await update_ticket(ctx.db, ticket.id, **kwargs)
        if updated is None:
            return {"error": "Failed to update ticket"}

        changes = list(kwargs.keys())

        await events.publish(
            events.EVENT_TICKET_UPDATED,
            ticket_id=str(ticket.id),
            project_id=str(project.id),
            changed_fields=changes,
        )

        return {
            "updated": True,
            "key": f"{project.key}-{updated.ticket_number}",
            "fields_changed": changes,
            "message": f"Ticket {project.key}-{updated.ticket_number} updated ({', '.join(changes)}).",
        }


class TransitionTicketStatusSkill(BaseSkill):
    name = "transition_ticket_status"
    description = (
        "Change the workflow status of a ticket (e.g., move from 'Open' to "
        "'In Progress'). Requires Developer role. Only valid workflow transitions "
        "are allowed."
    )
    category = "tickets"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "ticket_number": {
                "type": "integer",
                "description": "The ticket number (e.g., 42 for PROJ-42)",
            },
            "status_name": {
                "type": "string",
                "description": "The target status name (e.g., 'In Progress', 'Done', 'Closed')",
            },
            "resolution": {
                "type": "string",
                "description": "Resolution reason when moving to a terminal status (e.g., 'fixed', 'won't fix', 'duplicate')",
            },
        },
        "required": ["project_key", "ticket_number", "status_name"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        try:
            project = await check_project_access(
                ctx.db, ctx.user, ctx.params["project_key"],
                min_role=ProjectRole.DEVELOPER,
            )
        except SkillPermissionError:
            return {
                "error": (
                    f"You don't have permission to update tickets in project "
                    f"'{ctx.params['project_key']}'. You need at least the Developer role."
                ),
            }

        ticket = await resolve_ticket(ctx.db, project, ctx.params["ticket_number"])
        if ticket is None:
            return {"error": f"Ticket {project.key}-{ctx.params['ticket_number']} not found"}

        current_status = await ctx.db.execute(
            select(WorkflowStatus).where(WorkflowStatus.id == ticket.workflow_status_id)
        )
        current = current_status.scalar_one_or_none()
        current_name = current.name if current else "Unknown"

        workflow_id = current.workflow_id if current else None
        if workflow_id is None:
            return {"error": "Could not determine the ticket's workflow"}

        all_statuses = await ctx.db.execute(
            select(WorkflowStatus).where(WorkflowStatus.workflow_id == workflow_id)
        )
        statuses = {s.name.lower(): s for s in all_statuses.scalars().all()}

        target_name = ctx.params["status_name"].strip().lower()
        target_status = statuses.get(target_name)
        if target_status is None:
            available = [s.name for s in statuses.values()]
            return {
                "error": f"Status '{ctx.params['status_name']}' not found in this workflow.",
                "available_statuses": available,
                "current_status": current_name,
            }

        valid_transitions = await ctx.db.execute(
            select(WorkflowTransition).where(
                WorkflowTransition.from_status_id == ticket.workflow_status_id,
                WorkflowTransition.to_status_id == target_status.id,
            )
        )
        if valid_transitions.scalar_one_or_none() is None:
            reachable = await ctx.db.execute(
                select(WorkflowStatus.name).join(
                    WorkflowTransition,
                    WorkflowTransition.to_status_id == WorkflowStatus.id,
                ).where(
                    WorkflowTransition.from_status_id == ticket.workflow_status_id,
                )
            )
            reachable_names = [r[0] for r in reachable.all()]
            return {
                "error": f"Cannot transition from '{current_name}' to '{target_status.name}'.",
                "current_status": current_name,
                "valid_transitions": reachable_names,
            }

        old_status_id = str(ticket.workflow_status_id)

        try:
            updated = await transition_status(
                ctx.db,
                ticket.id,
                target_status.id,
                resolution=ctx.params.get("resolution"),
            )
        except ValueError as exc:
            return {"error": str(exc)}

        await events.publish(
            events.EVENT_TICKET_STATUS_CHANGED,
            ticket_id=str(ticket.id),
            project_id=str(project.id),
            from_status_id=old_status_id,
            to_status_id=str(target_status.id),
        )

        new_status_result = await ctx.db.execute(
            select(WorkflowStatus.name).where(WorkflowStatus.id == updated.workflow_status_id)
        )
        new_status_name = new_status_result.scalar_one_or_none() or target_status.name

        return {
            "updated": True,
            "key": f"{project.key}-{updated.ticket_number}",
            "previous_status": current_name,
            "new_status": new_status_name,
            "message": f"Ticket {project.key}-{updated.ticket_number} moved from '{current_name}' to '{new_status_name}'.",
        }


class SemanticSearchKBSkill(BaseSkill):
    name = "semantic_search_kb"
    description = (
        "Search the knowledge base using semantic/meaning-based search. "
        "Better than keyword search for finding conceptually related content, "
        "answering questions about documentation, or finding pages related to "
        "a topic even when exact keywords don't match."
    )
    category = "knowledge_base"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "query": {
                "type": "string",
                "description": "Natural language search query describing what you're looking for",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results (default 5, max 10)",
                "default": 5,
            },
        },
        "required": ["project_key", "query"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        from app.services.embedding_service import vector_search
        from app.services.llm.factory import is_embedding_configured

        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])

        if not is_embedding_configured():
            return {
                "error": "Semantic search is not available — embedding provider is not configured.",
                "hint": "Use search_knowledge_base for keyword-based search instead.",
            }

        query_text = ctx.params["query"]
        limit = min(ctx.params.get("limit", 5), 10)

        results = await vector_search(
            ctx.db,
            query_text=query_text,
            project_id=project.id,
            content_types=["kb_page", "kb_attachment"],
            limit=limit,
        )

        formatted = []
        for r in results:
            meta = r.get("metadata", {})
            parent_pages = meta.get("parent_pages", [])
            breadcrumb_parts = [p["title"] for p in parent_pages]
            breadcrumb_parts.append(meta.get("page_title", ""))
            breadcrumb = " > ".join(breadcrumb_parts) if breadcrumb_parts else ""

            entry = {
                "title": meta.get("page_title", ""),
                "space": meta.get("space_name", ""),
                "content": r["chunk_text"],
                "similarity": r["similarity"],
                "page_slug": meta.get("page_slug", ""),
                "space_slug": meta.get("space_slug", ""),
                "breadcrumb": breadcrumb,
            }
            if meta.get("source_type") == "attachment":
                entry["source"] = f"attachment: {meta.get('filename', '')}"
            formatted.append(entry)

        return {
            "results": formatted,
            "total": len(formatted),
            "project": project.key,
            "query": query_text,
        }
