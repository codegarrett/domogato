"""Productivity agent skills — search, dashboard, comments, watchers."""
from __future__ import annotations

from app.core import events
from app.core.permissions import ProjectRole
from app.services.agent.skills import (
    BaseSkill,
    SkillContext,
    SkillPermissionError,
    check_project_access,
    resolve_ticket,
)
from app.services import comment_service, dashboard_service, search_service, watcher_service


class GlobalSearchSkill(BaseSkill):
    name = "global_search"
    description = (
        "Search across tickets, knowledge base pages, and comments. "
        "Use for broad 'find anything about X' queries."
    )
    category = "search"
    parameters_schema = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query text",
            },
            "project_key": {
                "type": "string",
                "description": "Optional project key to scope results",
            },
            "types": {
                "type": "array",
                "items": {
                    "type": "string",
                    "enum": ["ticket", "kb_page", "comment"],
                },
                "description": "Optional filter by result type",
            },
        },
        "required": ["query"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project_id = None
        project_key = ctx.params.get("project_key")
        if project_key:
            project = await check_project_access(ctx.db, ctx.user, project_key)
            project_id = project.id

        raw = await search_service.global_search(
            ctx.db,
            user_id=ctx.user.id,
            query=ctx.params["query"],
            types=ctx.params.get("types"),
            project_id=project_id,
            limit=15,
            is_system_admin=ctx.user.is_system_admin,
        )

        results = [
            {
                "type": r.get("type"),
                "title": r.get("title"),
                "subtitle": r.get("subtitle"),
                "url": r.get("url"),
                "highlight": (r.get("highlight") or "")[:200],
            }
            for r in raw.get("results", [])[:15]
        ]

        return {
            "results": results,
            "total": raw.get("total", len(results)),
            "query": ctx.params["query"],
        }


class GetMyDashboardSkill(BaseSkill):
    name = "get_my_dashboard"
    description = (
        "Get the current user's personal dashboard: assigned tickets, overdue count, "
        "watched tickets, active sprints, and recent activity."
    )
    category = "productivity"
    parameters_schema = {
        "type": "object",
        "properties": {},
        "required": [],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        data = await dashboard_service.get_dashboard_data(ctx.db, ctx.user.id)
        return {
            "assigned_tickets": data.get("assigned_tickets", []),
            "overdue_count": data.get("overdue_count", 0),
            "watched_recent": data.get("watched_recent", []),
            "active_sprints": data.get("active_sprints", []),
            "recent_activity": data.get("recent_activity", []),
        }


class ListTicketCommentsSkill(BaseSkill):
    name = "list_ticket_comments"
    description = "List comments on a ticket. Use before summarizing discussion threads."
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
            "limit": {
                "type": "integer",
                "description": "Maximum comments to return (default 20, max 50)",
                "default": 20,
            },
        },
        "required": ["project_key", "ticket_number"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])
        ticket = await resolve_ticket(ctx.db, project, ctx.params["ticket_number"])
        if ticket is None:
            return {"error": f"Ticket {project.key}-{ctx.params['ticket_number']} not found"}

        limit = min(ctx.params.get("limit", 20), 50)
        comments, total = await comment_service.list_comments(
            ctx.db, ticket.id, limit=limit,
        )

        return {
            "key": f"{project.key}-{ticket.ticket_number}",
            "comments": comments,
            "total": total,
        }


class AddTicketCommentSkill(BaseSkill):
    name = "add_ticket_comment"
    description = (
        "Add a comment to a ticket. Requires Developer role. "
        "Always use request_approval first."
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
            "body": {
                "type": "string",
                "description": "Comment text (markdown supported)",
            },
        },
        "required": ["project_key", "ticket_number", "body"],
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
                    f"You don't have permission to comment on tickets in project "
                    f"'{ctx.params['project_key']}'. You need at least the Developer role."
                ),
            }

        ticket = await resolve_ticket(ctx.db, project, ctx.params["ticket_number"])
        if ticket is None:
            return {"error": f"Ticket {project.key}-{ctx.params['ticket_number']} not found"}

        comment = await comment_service.create_comment(
            ctx.db,
            ticket_id=ticket.id,
            author_id=ctx.user.id,
            body=ctx.params["body"],
        )

        await events.publish(
            events.EVENT_COMMENT_ADDED,
            ticket_id=str(ticket.id),
            project_id=str(project.id),
            comment_id=str(comment.id),
            actor_id=str(ctx.user.id),
            actor_name=ctx.user.display_name,
        )

        return {
            "added": True,
            "key": f"{project.key}-{ticket.ticket_number}",
            "comment_id": str(comment.id),
            "message": f"Comment added to {project.key}-{ticket.ticket_number}.",
        }


class WatchTicketSkill(BaseSkill):
    name = "watch_ticket"
    description = "Subscribe the current user to ticket update notifications."
    category = "productivity"
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

        await watcher_service.add_watcher(
            ctx.db, ticket_id=ticket.id, user_id=ctx.user.id,
        )

        return {
            "watching": True,
            "key": f"{project.key}-{ticket.ticket_number}",
            "message": f"You are now watching {project.key}-{ticket.ticket_number}.",
        }


class UnwatchTicketSkill(BaseSkill):
    name = "unwatch_ticket"
    description = "Unsubscribe the current user from ticket update notifications."
    category = "productivity"
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

        removed = await watcher_service.remove_watcher(
            ctx.db, ticket_id=ticket.id, user_id=ctx.user.id,
        )

        return {
            "watching": False,
            "key": f"{project.key}-{ticket.ticket_number}",
            "removed": removed,
            "message": f"You are no longer watching {project.key}-{ticket.ticket_number}.",
        }
