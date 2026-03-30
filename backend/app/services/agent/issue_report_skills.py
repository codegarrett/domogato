"""AI agent skills for issue report management."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import events
from app.core.permissions import ProjectRole
from app.models.issue_report import IssueReport, IssueReportReporter
from app.models.user import User
from app.services.agent.skills import BaseSkill, SkillContext, SkillPermissionError, check_project_access
from app.services import issue_report_service


class SearchIssueReportsSkill(BaseSkill):
    name = "search_issue_reports"
    description = (
        "Search for existing issue reports in a project by keyword. "
        "Use this to check for similar reports before creating a new one."
    )
    category = "issue_reports"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "query": {
                "type": "string",
                "description": "Search text to match against issue report titles and descriptions",
            },
            "status": {
                "type": "string",
                "enum": ["open", "reviewing", "ticket_created", "dismissed"],
                "description": "Filter by status (default: searches open and reviewing)",
            },
        },
        "required": ["project_key"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])

        query = ctx.params.get("query")
        status_filter = ctx.params.get("status")

        if query:
            results = await issue_report_service.find_similar_reports(
                ctx.db, project.id, query, limit=10,
            )
            if status_filter:
                results = [r for r in results if r["status"] == status_filter]
            return {
                "reports": results,
                "total": len(results),
                "project": project.key,
                "query": query,
            }

        reports, total = await issue_report_service.list_issue_reports(
            ctx.db,
            project.id,
            status=status_filter,
            limit=20,
        )

        result_list = []
        for r in reports:
            result_list.append({
                "id": str(r.id),
                "title": r.title,
                "description": (r.description or "")[:200],
                "status": r.status,
                "priority": r.priority,
                "reporter_count": r.reporter_count,
            })

        return {
            "reports": result_list,
            "total": total,
            "project": project.key,
        }


class CreateIssueReportSkill(BaseSkill):
    name = "create_issue_report"
    description = (
        "Create a new issue report in a project. The current user is automatically "
        "added as the first reporter. You MUST have a title and should have a "
        "description before calling this. Always use request_approval first."
    )
    category = "issue_reports"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "title": {
                "type": "string",
                "description": "Short summary of the issue (max 500 chars)",
            },
            "description": {
                "type": "string",
                "description": "Detailed description of the issue",
            },
            "priority": {
                "type": "string",
                "enum": ["low", "medium", "high", "critical"],
                "description": "Priority level (default: medium)",
            },
        },
        "required": ["project_key", "title"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])

        report = await issue_report_service.create_issue_report(
            ctx.db,
            project_id=project.id,
            title=ctx.params["title"],
            description=ctx.params.get("description"),
            priority=ctx.params.get("priority", "medium"),
            created_by=ctx.user.id,
        )

        await events.publish(
            events.EVENT_ISSUE_REPORT_CREATED,
            issue_report_id=str(report.id),
            project_id=str(project.id),
            actor_id=str(ctx.user.id),
        )

        return {
            "created": True,
            "id": str(report.id),
            "title": report.title,
            "priority": report.priority,
            "status": report.status,
            "message": f"Issue report created: '{report.title}'",
        }


class AddReporterToIssueReportSkill(BaseSkill):
    name = "add_reporter_to_issue_report"
    description = (
        "Add the current user as a reporter to an existing issue report. "
        "Use this when the user's issue matches an existing report instead "
        "of creating a duplicate."
    )
    category = "issue_reports"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "report_id": {
                "type": "string",
                "description": "The UUID of the issue report to add the user to",
            },
            "original_description": {
                "type": "string",
                "description": "The user's own description of the issue they experienced",
            },
        },
        "required": ["project_key", "report_id"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        project = await check_project_access(ctx.db, ctx.user, ctx.params["project_key"])

        report_id = ctx.params["report_id"]
        report = await issue_report_service.get_issue_report(ctx.db, UUID(report_id))
        if report is None or report.project_id != project.id:
            return {"error": f"Issue report '{report_id}' not found in project {project.key}"}

        try:
            await issue_report_service.add_reporter(
                ctx.db,
                UUID(report_id),
                ctx.user.id,
                ctx.params.get("original_description"),
            )
        except ValueError as exc:
            return {"error": str(exc)}

        updated = await issue_report_service.get_issue_report(ctx.db, UUID(report_id))

        await events.publish(
            events.EVENT_ISSUE_REPORT_REPORTER_ADDED,
            issue_report_id=report_id,
            project_id=str(project.id),
            actor_id=str(ctx.user.id),
            reporter_user_id=str(ctx.user.id),
        )

        return {
            "added": True,
            "report_id": report_id,
            "title": updated.title if updated else report.title,
            "reporter_count": updated.reporter_count if updated else report.reporter_count + 1,
            "message": f"You've been added as a reporter to '{report.title}' ({updated.reporter_count if updated else report.reporter_count + 1} total reporters).",
        }


class CreateTicketFromIssueReportsSkill(BaseSkill):
    name = "create_ticket_from_issue_reports"
    description = (
        "Create a ticket from one or more issue reports, automatically linking them. "
        "The issue reports will be marked as 'ticket_created'. Requires Developer role. "
        "Always use request_approval first."
    )
    category = "issue_reports"
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "The project key (e.g., 'PROJ')",
            },
            "issue_report_ids": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of issue report UUIDs to create the ticket from",
                "minItems": 1,
            },
            "title": {
                "type": "string",
                "description": "Title for the new ticket (uses first report's title if omitted)",
            },
            "description": {
                "type": "string",
                "description": "Description for the ticket (auto-generated from reports if omitted)",
            },
            "ticket_type": {
                "type": "string",
                "enum": ["task", "bug", "story"],
                "description": "Ticket type (default: bug)",
            },
            "priority": {
                "type": "string",
                "enum": ["lowest", "low", "medium", "high", "highest"],
                "description": "Ticket priority (default: medium)",
            },
        },
        "required": ["project_key", "issue_report_ids"],
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
                    f"'{ctx.params['project_key']}'. You need at least the Developer role."
                ),
            }

        report_ids = [UUID(rid) for rid in ctx.params["issue_report_ids"]]

        try:
            ticket, linked_count = await issue_report_service.create_ticket_from_reports(
                ctx.db,
                project_id=project.id,
                issue_report_ids=report_ids,
                reporter_id=ctx.user.id,
                title=ctx.params.get("title"),
                description=ctx.params.get("description"),
                ticket_type=ctx.params.get("ticket_type", "bug"),
                priority=ctx.params.get("priority", "medium"),
            )
        except ValueError as exc:
            return {"error": str(exc)}

        await events.publish(
            events.EVENT_TICKET_CREATED_FROM_ISSUES,
            ticket_id=str(ticket.id),
            project_id=str(project.id),
            actor_id=str(ctx.user.id),
            issue_report_ids=[str(rid) for rid in report_ids],
        )

        return {
            "created": True,
            "ticket_key": f"{project.key}-{ticket.ticket_number}",
            "title": ticket.title,
            "type": ticket.ticket_type,
            "priority": ticket.priority,
            "linked_reports": linked_count,
            "message": (
                f"Ticket {project.key}-{ticket.ticket_number} created from "
                f"{linked_count} issue report(s)."
            ),
        }
