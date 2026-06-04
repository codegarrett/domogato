"""Interaction skills — user-facing prompts that pause the agent loop.

These skills do not perform backend actions. Instead, the executor detects
them and sends SSE events to the frontend, which renders interactive UI
(multiple-choice buttons, approval dialogs, etc.). The agent turn ends
immediately, and the user's response arrives as the next message.
"""
from __future__ import annotations

from app.services.agent.skills import BaseSkill, SkillContext

INTERACTION_TOOLS = frozenset({"present_choices", "request_approval"})


class PresentChoicesSkill(BaseSkill):
    name = "present_choices"
    description = (
        "Present the user with multiple-choice options when clarification is "
        "needed and the answer is ambiguous. Use ONLY when there are 2–6 concrete "
        "options and you cannot infer the correct choice (e.g. two equally "
        "plausible projects or tickets). Do NOT use this as the default after "
        "list_my_projects — infer the project from name/description first, or "
        "auto-select when the user has only one project."
    )
    category = "interaction"
    parameters_schema = {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": "The question to ask the user",
            },
            "options": {
                "type": "array",
                "items": {"type": "string"},
                "description": "List of options for the user to choose from (2-6 options)",
                "minItems": 2,
                "maxItems": 6,
            },
        },
        "required": ["question", "options"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        return {"status": "awaiting_user_response"}


class RequestApprovalSkill(BaseSkill):
    name = "request_approval"
    description = (
        "Request explicit approval from the user before performing a mutating "
        "action (creating, updating, or deleting data). ALWAYS call this before "
        "create_ticket, update_ticket, transition_ticket_status, "
        "create_issue_report, create_ticket_from_issue_reports, "
        "create_kb_page, "
        "add_ticket_comment, attach_file_to_ticket, or "
        "attach_file_to_issue_report. Present a clear summary of what will be changed "
        "so the user can approve or reject."
    )
    category = "interaction"
    parameters_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "description": "Brief label for the action, e.g. 'Create ticket' or 'Update priority'",
            },
            "details": {
                "type": "object",
                "description": "Key-value pairs summarizing what will be changed",
            },
        },
        "required": ["action", "details"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        return {"status": "awaiting_user_response"}
