"""Workflow-related agent skills."""
from __future__ import annotations

from sqlalchemy import select

from app.models.workflow import WorkflowStatus, WorkflowTransition
from app.services.agent.skills import BaseSkill, SkillContext, check_project_access, resolve_ticket


class GetTicketTransitionsSkill(BaseSkill):
    name = "get_ticket_transitions"
    description = (
        "Get the current workflow status and valid next statuses for a ticket. "
        "Call this before transition_ticket_status to avoid invalid transitions."
    )
    category = "workflows"
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

        current_status = await ctx.db.execute(
            select(WorkflowStatus).where(WorkflowStatus.id == ticket.workflow_status_id)
        )
        current = current_status.scalar_one_or_none()
        if current is None:
            return {"error": "Could not determine the ticket's workflow status"}

        workflow_id = current.workflow_id

        all_statuses_result = await ctx.db.execute(
            select(WorkflowStatus).where(
                WorkflowStatus.workflow_id == workflow_id,
            ).order_by(WorkflowStatus.position)
        )
        all_statuses = [
            {
                "name": s.name,
                "category": s.category,
                "is_initial": s.is_initial,
                "is_terminal": s.is_terminal,
            }
            for s in all_statuses_result.scalars().all()
        ]

        reachable = await ctx.db.execute(
            select(WorkflowStatus.name, WorkflowStatus.category).join(
                WorkflowTransition,
                WorkflowTransition.to_status_id == WorkflowStatus.id,
            ).where(
                WorkflowTransition.from_status_id == ticket.workflow_status_id,
            )
        )
        valid_next = [
            {"name": row[0], "category": row[1]}
            for row in reachable.all()
        ]

        return {
            "key": f"{project.key}-{ticket.ticket_number}",
            "current_status": current.name,
            "valid_next_statuses": valid_next,
            "all_statuses": all_statuses,
        }
