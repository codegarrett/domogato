"""Utility built-in agent skills."""
from __future__ import annotations

from app.services.agent.calculator_service import calculate
from app.services.agent.skills import BaseSkill, SkillContext


class CalculatorSkill(BaseSkill):
    name = "calculator"
    description = (
        "Evaluate a deterministic arithmetic expression. Use for precise math instead of "
        "mental calculation. Supports +, -, *, /, //, %, **, parentheses, and unary minus."
    )
    category = "utility"
    parameters_schema = {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "Arithmetic expression, e.g. '(12 + 4) * 0.15'",
            },
        },
        "required": ["expression"],
    }

    async def execute(self, ctx: SkillContext) -> dict:
        expression = ctx.params.get("expression", "")
        try:
            result = calculate(str(expression))
        except ValueError as exc:
            return {"error": str(exc)}
        return {"expression": str(expression), "result": result}
