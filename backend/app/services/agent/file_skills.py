"""Agent skills for AI conversation file attachments."""
from __future__ import annotations

from uuid import UUID

from app.core.permissions import ProjectRole
from app.services import ai_attachment_service
from app.services.agent.skills import BaseSkill, SkillContext, SkillError


class ListConversationAttachmentsSkill(BaseSkill):
    name = "list_conversation_attachments"
    description = (
        "List files the user has shared in the current AI conversation. "
        "Call this when the user attaches files or asks about shared attachments."
    )
    category = "files"
    parameters_schema = {
        "type": "object",
        "properties": {},
    }

    async def execute(self, ctx: SkillContext) -> dict:
        if ctx.conversation_id is None:
            raise SkillError("No active conversation for file listing")

        attachments = await ai_attachment_service.list_conversation_attachments(
            ctx.db, ctx.conversation_id, ctx.user.id,
        )
        return {
            "attachments": [
                {
                    "id": str(a.id),
                    "filename": a.filename,
                    "content_type": a.content_type,
                    "size_bytes": a.size_bytes,
                    "promoted_to_type": a.promoted_to_type,
                    "message_id": str(a.message_id) if a.message_id else None,
                }
                for a in attachments
            ],
            "total": len(attachments),
        }


class AttachFileToTicketSkill(BaseSkill):
    name = "attach_file_to_ticket"
    description = (
        "Copy a shared conversation file to a ticket as an attachment. "
        "Requires request_approval first. The file must belong to the current "
        "conversation and must not already be promoted."
    )
    category = "files"
    min_role = ProjectRole.DEVELOPER
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "Project key (e.g. 'PROJ')",
            },
            "ticket_number": {
                "type": "integer",
                "description": "Ticket number within the project",
            },
            "attachment_id": {
                "type": "string",
                "description": "UUID of the conversation attachment to promote",
            },
        },
        "required": ["project_key", "ticket_number", "attachment_id"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        try:
            attachment_id = UUID(ctx.params["attachment_id"])
        except (KeyError, ValueError) as exc:
            raise SkillError("Invalid attachment_id") from exc

        try:
            return await ai_attachment_service.promote_to_ticket(
                ctx.db,
                attachment_id=attachment_id,
                conversation_id=ctx.conversation_id,
                user=ctx.user,
                project_key=ctx.params["project_key"],
                ticket_number=int(ctx.params["ticket_number"]),
            )
        except ai_attachment_service.AIAttachmentError as exc:
            raise SkillError(str(exc)) from exc


class AttachFileToIssueReportSkill(BaseSkill):
    name = "attach_file_to_issue_report"
    description = (
        "Copy a shared conversation file to an issue report as an attachment. "
        "Requires request_approval first. The file must belong to the current "
        "conversation and must not already be promoted."
    )
    category = "files"
    min_role = ProjectRole.GUEST
    parameters_schema = {
        "type": "object",
        "properties": {
            "project_key": {
                "type": "string",
                "description": "Project key (e.g. 'PROJ')",
            },
            "report_id": {
                "type": "string",
                "description": "UUID of the issue report",
            },
            "attachment_id": {
                "type": "string",
                "description": "UUID of the conversation attachment to promote",
            },
        },
        "required": ["project_key", "report_id", "attachment_id"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        try:
            attachment_id = UUID(ctx.params["attachment_id"])
            report_id = UUID(ctx.params["report_id"])
        except (KeyError, ValueError) as exc:
            raise SkillError("Invalid attachment_id or report_id") from exc

        try:
            return await ai_attachment_service.promote_to_issue_report(
                ctx.db,
                attachment_id=attachment_id,
                conversation_id=ctx.conversation_id,
                user=ctx.user,
                project_key=ctx.params["project_key"],
                report_id=report_id,
            )
        except ai_attachment_service.AIAttachmentError as exc:
            raise SkillError(str(exc)) from exc
