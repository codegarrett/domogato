"""Safe arithmetic evaluation for the calculator skill."""
from __future__ import annotations

import ast
import operator
from typing import Any

_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


def _eval_node(node: ast.AST) -> Any:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Only numeric constants are allowed")
    if isinstance(node, ast.Num):  # pragma: no cover - py3.8 compat
        return node.n
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval_node(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("Exponent too large")
        return _OPS[type(node.op)](left, right)
    raise ValueError("Unsupported expression")


def calculate(expression: str) -> float | int:
    expr = expression.strip()
    if not expr:
        raise ValueError("Expression is empty")
    if len(expr) > 500:
        raise ValueError("Expression too long")
    tree = ast.parse(expr, mode="eval")
    result = _eval_node(tree)
    if not isinstance(result, (int, float)):
        raise ValueError("Result is not a number")
    if isinstance(result, float) and (result != result or abs(result) == float("inf")):
        raise ValueError("Result is not finite")
    return result
