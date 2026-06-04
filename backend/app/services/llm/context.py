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
    content = message.get("content") or ""
    if isinstance(content, list):
        tokens += estimate_tokens(json.dumps(content, default=str))
    else:
        tokens += estimate_tokens(content)
    if message.get("tool_calls"):
        tokens += estimate_tokens(json.dumps(message["tool_calls"], default=str))
    if message.get("role"):
        tokens += 1
    if message.get("name"):
        tokens += estimate_tokens(message["name"])
    return tokens


def sanitize_tool_messages(messages: list[dict]) -> list[dict]:
    """Ensure OpenAI-compatible tool-call chains in message history.

    Drops orphaned tool messages and incomplete tool-call groups that can
    occur when DB timestamps collide or context compaction splits a turn.
    """
    if not messages:
        return messages

    start = 1 if messages[0].get("role") == "system" else 0
    result = messages[:start]
    pending_tool_ids: set[str] | None = None
    group_start = len(result)

    for msg in messages[start:]:
        role = msg.get("role")

        if role == "assistant" and msg.get("tool_calls"):
            if pending_tool_ids is not None:
                result = result[:group_start]
            group_start = len(result)
            result.append(msg)
            pending_tool_ids = {
                tc["id"] for tc in msg["tool_calls"] if tc.get("id")
            }
            continue

        if role == "tool":
            if pending_tool_ids is not None:
                tool_call_id = msg.get("tool_call_id")
                if tool_call_id and tool_call_id in pending_tool_ids:
                    result.append(msg)
                    pending_tool_ids.discard(tool_call_id)
                    if not pending_tool_ids:
                        pending_tool_ids = None
            continue

        if pending_tool_ids is not None:
            result = result[:group_start]
            pending_tool_ids = None

        result.append(msg)
        group_start = len(result)

    if pending_tool_ids is not None:
        result = result[:group_start]

    return result


def _message_groups(messages: list[dict]) -> list[list[dict]]:
    """Split non-system messages into atomic groups for safe compaction."""
    start = 1 if messages and messages[0].get("role") == "system" else 0
    groups: list[list[dict]] = []
    i = start
    while i < len(messages):
        msg = messages[i]
        if msg.get("role") == "assistant" and msg.get("tool_calls"):
            group = [msg]
            i += 1
            while i < len(messages) and messages[i].get("role") == "tool":
                group.append(messages[i])
                i += 1
            groups.append(group)
        else:
            groups.append([msg])
            i += 1
    return groups


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

    messages = sanitize_tool_messages(messages)

    input_budget = int(context_window - max_tokens - (context_window * reserve_ratio))
    if input_budget <= 0:
        input_budget = context_window // 2

    system_msg = messages[0] if messages[0].get("role") == "system" else None
    system_cost = estimate_message_tokens(system_msg) if system_msg else 0

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

    groups = _message_groups(messages)
    group_costs = [sum(estimate_message_tokens(m) for m in group) for group in groups]
    total = sum(group_costs)

    if total <= input_budget:
        return messages

    kept_groups: list[list[dict]] = []
    kept_cost = 0
    for i in range(len(groups) - 1, -1, -1):
        cost = group_costs[i]
        if kept_cost + cost > available:
            break
        kept_groups.insert(0, groups[i])
        kept_cost += cost

    if not kept_groups:
        kept_groups = [groups[-1]]

    dropped = len(groups) - len(kept_groups)
    kept = [msg for group in kept_groups for msg in group]

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
    return sanitize_tool_messages(result)
