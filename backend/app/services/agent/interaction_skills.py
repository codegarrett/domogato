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
        "needed. For example, when the user's request could refer to multiple "
        "tickets or projects, show them as clickable options."
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
        "create_ticket, update_ticket, or transition_ticket_status. Present a "
        "clear summary of what will be changed so the user can approve or reject."
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
