"""AI chat service — conversation management and LLM interaction."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from uuid import UUID

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ai_conversation import AIConversation
from app.models.ai_message import AIMessage
from app.models.user import User
from app.services.llm import get_llm_provider
from app.services.agent import registry as skill_registry
from app.services.agent.executor import run_agent_turn

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are ProjectHub Assistant, an AI integrated into the ProjectHub "
    "project management platform. You help users with their projects, "
    "tickets, documentation, and workflows.\n\n"

    "## Tools\n"
    "You have tools to look up real project data. ALWAYS call tools immediately "
    "instead of saying you will — never respond with 'let me check' without "
    "actually calling a tool in the same turn. You can call multiple tools "
    "in sequence across rounds to gather all the information you need.\n\n"

    "When using tools, identify the project by its key (e.g., 'PROJ'). "
    "If the user doesn't specify a project, call list_my_projects first, "
    "then use present_choices to let them pick which project they mean.\n\n"

    "## Approval Required for Mutations\n"
    "Before calling create_ticket, update_ticket, or transition_ticket_status, "
    "you MUST first call request_approval with a clear summary of what will be "
    "changed. Only proceed with the actual action after the user approves. "
    "If the user rejects, acknowledge their decision and ask what they'd like "
    "to do instead. Never perform a mutating action without approval.\n\n"

    "## Asking Clarifying Questions\n"
    "When the user's request could refer to multiple items (e.g., multiple "
    "tickets, projects, or statuses), use the present_choices tool to show "
    "them clickable options. Only use present_choices when there are concrete "
    "options to pick from — for open-ended questions, just ask in plain text.\n\n"
    "When key details are missing for a task, ask a brief clarifying question "
    "before proceeding. For example, if asked to 'create a ticket' but no "
    "description is given, ask what the ticket should cover. Only ask when "
    "genuinely needed — if the user already provided enough context, proceed.\n\n"

    "## Knowledge Base Search\n"
    "You have two tools for searching the knowledge base:\n"
    "- **search_knowledge_base**: Keyword/full-text search. Best for exact terms, "
    "specific phrases, or known page titles.\n"
    "- **semantic_search_kb**: Meaning-based search using AI embeddings. Best for "
    "conceptual questions like 'how does authentication work?' or 'what is our "
    "deployment process?' — even when the exact words don't appear in the docs.\n\n"
    "When a user asks about documentation or knowledge base content, prefer "
    "semantic_search_kb first for broad questions. If it returns no results or "
    "the user is looking for a specific term, fall back to search_knowledge_base.\n\n"

    "## Response Style\n"
    "Be concise, helpful, and use markdown formatting when it improves readability."
)

MAX_TITLE_LENGTH = 80


def _generate_title(text: str) -> str:
    """Create a short title from the first user message."""
    text = text.strip().replace("\n", " ")
    if len(text) <= MAX_TITLE_LENGTH:
        return text
    truncated = text[:MAX_TITLE_LENGTH]
    last_space = truncated.rfind(" ")
    if last_space > MAX_TITLE_LENGTH // 2:
        truncated = truncated[:last_space]
    return truncated + "..."


async def create_conversation(
    db: AsyncSession,
    user_id: UUID,
    title: str | None = None,
    model: str | None = None,
) -> AIConversation:
    conversation = AIConversation(
        user_id=user_id,
        title=title,
        model=model,
    )
    db.add(conversation)
    await db.flush()
    return conversation


async def list_conversations(
    db: AsyncSession,
    user_id: UUID,
    offset: int = 0,
    limit: int = 20,
) -> tuple[list[AIConversation], int]:
    count_q = select(func.count()).select_from(AIConversation).where(
        AIConversation.user_id == user_id,
        AIConversation.is_archived == False,
    )
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(AIConversation)
        .where(
            AIConversation.user_id == user_id,
            AIConversation.is_archived == False,
        )
        .order_by(AIConversation.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    conversations = list(result.scalars().all())

    for conv in conversations:
        msg_count_q = select(func.count()).select_from(AIMessage).where(
            AIMessage.conversation_id == conv.id
        )
        conv._message_count = (await db.execute(msg_count_q)).scalar() or 0

    return conversations, total


async def get_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
) -> AIConversation | None:
    q = (
        select(AIConversation)
        .options(selectinload(AIConversation.messages))
        .where(
            AIConversation.id == conversation_id,
            AIConversation.user_id == user_id,
        )
    )
    result = await db.execute(q)
    return result.scalar_one_or_none()


async def delete_conversation(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: UUID,
) -> bool:
    conv = await get_conversation(db, conversation_id, user_id)
    if conv is None:
        return False
    await db.delete(conv)
    await db.flush()
    return True


async def _build_llm_messages(
    db: AsyncSession,
    conversation_id: UUID,
) -> list[dict]:
    """Load conversation history and prepend system prompt.

    Handles regular messages and tool-calling messages (role='assistant'
    with tool_calls, role='tool' with tool_call_id).
    """
    q = (
        select(AIMessage)
        .where(AIMessage.conversation_id == conversation_id)
        .order_by(AIMessage.created_at)
    )
    result = await db.execute(q)
    messages_db = result.scalars().all()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in messages_db:
        if msg.role == "assistant" and msg.tool_calls and isinstance(msg.tool_calls, list):
            messages.append({
                "role": "assistant",
                "content": msg.content or None,
                "tool_calls": msg.tool_calls,
            })
        elif msg.role == "tool" and msg.tool_calls and isinstance(msg.tool_calls, dict):
            messages.append({
                "role": "tool",
                "tool_call_id": msg.tool_calls.get("tool_call_id", ""),
                "content": msg.content,
            })
        else:
            messages.append({"role": msg.role, "content": msg.content})

    return messages


async def send_message_stream(
    db: AsyncSession,
    user: User,
    conversation_id: UUID | None,
    user_message: str,
) -> AsyncIterator[str]:
    """Process a chat message and yield SSE events.

    Uses the agent executor for tool-enabled conversations.
    Creates a new conversation if conversation_id is None.
    Saves both user and assistant messages to the database.
    """
    from app.core.config import settings

    provider = get_llm_provider()
    model_name = settings.LLM_MODEL

    if conversation_id is None:
        title = _generate_title(user_message)
        conversation = await create_conversation(db, user.id, title=title, model=model_name)
        conversation_id = conversation.id
    else:
        conversation = await get_conversation(db, conversation_id, user.id)
        if conversation is None:
            yield _sse_event({"type": "error", "message": "Conversation not found"})
            return

    yield _sse_event({"type": "conversation", "conversation_id": str(conversation_id)})

    user_msg = AIMessage(
        conversation_id=conversation_id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)
    await db.flush()

    llm_messages = await _build_llm_messages(db, conversation_id)

    from app.services.llm.context import compact_messages
    llm_messages = compact_messages(
        llm_messages,
        context_window=settings.LLM_CONTEXT_WINDOW,
        max_tokens=settings.LLM_MAX_TOKENS,
    )

    agent_result = None
    async for sse_str in run_agent_turn(
        provider=provider,
        messages=llm_messages,
        registry=skill_registry,
        db=db,
        user=user,
        max_tokens=settings.LLM_MAX_TOKENS,
        context_window=settings.LLM_CONTEXT_WINDOW,
        temperature=settings.LLM_TEMPERATURE,
    ):
        parsed = json.loads(sse_str.removeprefix("data: ").strip())
        if parsed.get("type") == "_agent_done":
            agent_result = parsed
        else:
            yield sse_str

    if agent_result is None:
        return

    full_content = agent_result.get("content", "")
    model_name = agent_result.get("model", model_name)
    prompt_tokens = agent_result.get("prompt_tokens")
    completion_tokens = agent_result.get("completion_tokens")
    tool_call_history = agent_result.get("tool_call_history", [])

    for tc_msg in tool_call_history:
        role = tc_msg.get("role")
        if role == "assistant":
            db.add(AIMessage(
                conversation_id=conversation_id,
                role="assistant",
                content=tc_msg.get("content") or "",
                tool_calls=tc_msg.get("tool_calls"),
            ))
        elif role == "tool":
            db.add(AIMessage(
                conversation_id=conversation_id,
                role="tool",
                content=tc_msg.get("content", ""),
                tool_calls={
                    "tool_call_id": tc_msg.get("tool_call_id", ""),
                    "name": "",
                },
            ))

    assistant_msg = AIMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=full_content,
        model=model_name,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    db.add(assistant_msg)

    conversation.updated_at = func.now()
    await db.flush()

    yield _sse_event({
        "type": "done",
        "message_id": str(assistant_msg.id),
        "model": model_name,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
    })


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"
