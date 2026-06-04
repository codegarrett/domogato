from __future__ import annotations

from app.services.llm.context import compact_messages, sanitize_tool_messages


def test_sanitize_drops_orphan_tool_after_assistant():
    messages = [
        {"role": "system", "content": "You are helpful."},
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "list_kb_spaces", "arguments": "{}"}}],
        },
        {"role": "tool", "tool_call_id": "call_1", "content": '{"spaces": []}'},
        {"role": "assistant", "content": "Please approve."},
        {"role": "tool", "tool_call_id": "call_2", "content": '{"status": "approved"}'},
    ]

    sanitized = sanitize_tool_messages(messages)

    roles = [m["role"] for m in sanitized]
    assert roles == ["system", "assistant", "tool", "assistant"]


def test_sanitize_drops_incomplete_tool_group():
    messages = [
        {"role": "system", "content": "system"},
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {"id": "call_1", "type": "function", "function": {"name": "a", "arguments": "{}"}},
                {"id": "call_2", "type": "function", "function": {"name": "b", "arguments": "{}"}},
            ],
        },
        {"role": "tool", "tool_call_id": "call_1", "content": "{}"},
        {"role": "user", "content": "hello"},
    ]

    sanitized = sanitize_tool_messages(messages)
    roles = [m["role"] for m in sanitized]
    assert roles == ["system", "user"]


def test_sanitize_preserves_valid_tool_chain():
    messages = [
        {"role": "system", "content": "system"},
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {"id": "call_1", "type": "function", "function": {"name": "a", "arguments": "{}"}},
                {"id": "call_2", "type": "function", "function": {"name": "b", "arguments": "{}"}},
            ],
        },
        {"role": "tool", "tool_call_id": "call_1", "content": "{}"},
        {"role": "tool", "tool_call_id": "call_2", "content": "{}"},
        {"role": "assistant", "content": "Done."},
    ]

    sanitized = sanitize_tool_messages(messages)
    assert len(sanitized) == 5


def test_compact_messages_keeps_tool_groups_together():
    messages = [
        {"role": "system", "content": "system prompt " * 200},
        {"role": "user", "content": "old " * 500},
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "x", "arguments": "{}"}}],
        },
        {"role": "tool", "tool_call_id": "call_1", "content": "{}"},
        {"role": "assistant", "content": "recent reply"},
        {"role": "user", "content": "latest question"},
    ]

    compacted = compact_messages(
        messages,
        context_window=400,
        max_tokens=50,
    )

    sanitized = sanitize_tool_messages(compacted)
    for i, msg in enumerate(sanitized):
        if msg.get("role") == "tool":
            assert sanitized[i - 1].get("role") == "assistant"
            assert sanitized[i - 1].get("tool_calls")
