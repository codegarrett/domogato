"""Tests for safe calculator evaluation."""
from __future__ import annotations

import pytest

from app.services.agent.calculator_service import calculate
from app.services.agent.utility_skills import CalculatorSkill
from app.services.agent.skills import SkillContext


def test_basic_arithmetic():
    assert calculate("2 + 3") == 5
    assert calculate("(12 + 4) * 0.15") == pytest.approx(2.4)
    assert calculate("10 // 3") == 3
    assert calculate("2 ** 8") == 256


def test_unary_minus():
    assert calculate("-5 + 10") == 5


def test_rejects_unsafe_expression():
    with pytest.raises(ValueError):
        calculate("__import__('os').system('ls')")


def test_rejects_empty():
    with pytest.raises(ValueError, match="empty"):
        calculate("   ")


@pytest.mark.asyncio
async def test_calculator_skill_execute():
    skill = CalculatorSkill()
    ctx = SkillContext(db=None, user=None, params={"expression": "3 * 7"})
    result = await skill.execute(ctx)
    assert result["result"] == 21
