"""Context window management — token estimation and message compaction.

Keeps conversation history within the model's context window by estimating
token counts and trimming older messages when the budget is exceeded.
"""
from __future__ import annotations

import json

import structlog

logger = structlog.get_logger()

CHARS_PER_TOKEN = 4
OVERHEAD_PER_MESSAGE = 4


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English text."""
    return max(1, len(text) // CHARS_PER_TOKEN)


def estimate_message_tokens(message: dict) -> int:
    """Estimate the token cost of a single chat message."""
    tokens = OVERHEAD_PER_MESSAGE
    tokens += estimate_tokens(message.get("content") or "")
    if message.get("tool_calls"):
        tokens += estimate_tokens(json.dumps(message["tool_calls"], default=str))
    if message.get("role"):
        tokens += 1
    if message.get("name"):
        tokens += estimate_tokens(message["name"])
    return tokens


def compact_messages(
    messages: list[dict],
    *,
    context_window: int,
    max_tokens: int,
    reserve_ratio: float = 0.1,
) -> list[dict]:
    """Trim older messages so the conversation fits in the context window.

    Keeps the system prompt (index 0) and as many recent messages as fit.
    Inserts a compaction notice when messages are dropped so the model knows
    context was truncated.

    Args:
        messages: Full message list (system prompt first).
        context_window: Total context window size in tokens.
        max_tokens: Tokens reserved for the completion response.
        reserve_ratio: Extra fraction of context_window held back as safety buffer.
    """
    if not messages:
        return messages

    input_budget = int(context_window - max_tokens - (context_window * reserve_ratio))
    if input_budget <= 0:
        input_budget = context_window // 2

    msg_costs = [estimate_message_tokens(m) for m in messages]
    total = sum(msg_costs)

    if total <= input_budget:
        return messages

    system_msg = messages[0] if messages[0].get("role") == "system" else None
    system_cost = msg_costs[0] if system_msg else 0

    compaction_notice = {
        "role": "system",
        "content": (
            "[Context compacted] Earlier conversation history was trimmed to fit "
            "within the context window. Some older messages have been removed. "
            "Focus on the most recent messages below."
        ),
    }
    notice_cost = estimate_message_tokens(compaction_notice)

    available = input_budget - system_cost - notice_cost

    kept: list[dict] = []
    kept_cost = 0
    for i in range(len(messages) - 1, 0, -1):
        cost = msg_costs[i]
        if kept_cost + cost > available:
            break
        kept.insert(0, messages[i])
        kept_cost += cost

    if not kept:
        kept = [messages[-1]]

    dropped = len(messages) - 1 - len(kept)

    result: list[dict] = []
    if system_msg:
        result.append(system_msg)
    if dropped > 0:
        result.append(compaction_notice)
        logger.info(
            "context_compacted",
            dropped_messages=dropped,
            kept_messages=len(kept),
            estimated_input_tokens=system_cost + notice_cost + kept_cost,
            budget=input_budget,
        )
    result.extend(kept)
    return result
