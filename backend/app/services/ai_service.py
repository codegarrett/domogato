"""AI chat service — conversation management and LLM interaction."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone
from uuid import UUID

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ai_conversation import AIConversation
from app.models.ai_message import AIMessage
from app.models.user import User
from app.services import ai_attachment_service
from app.services.llm.context import compact_messages, sanitize_tool_messages
from app.services.llm.vision import build_user_message_content
from app.services.llm import get_llm_provider
from app.services.agent.registry_builder import build_skill_registry
from app.services.agent.executor import run_agent_turn
from app.services.agent.debug_events import maybe_debug_sse

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

    "## Project Selection\n"
    "When a tool needs a project_key and the user did not name one explicitly:\n"
    "1. ALWAYS call list_my_projects first (returns key, name, description, organization).\n"
    "2. If total is 1, use that project's key immediately — do NOT ask.\n"
    "3. If multiple projects, infer the best match from the user's message using "
    "project name, key, and description (e.g. legal, IT, finance, or development context).\n"
    "4. Only call present_choices when two or more projects are equally plausible "
    "or none match confidently.\n"
    "5. Never ask 'which project?' without calling list_my_projects first.\n\n"

    "## Approval Required for Mutations\n"
    "Before calling any mutating tool, you MUST first call request_approval with "
    "a clear summary of what will be changed. Mutating tools that require approval:\n"
    "- create_ticket, update_ticket, transition_ticket_status\n"
    "- create_issue_report, create_ticket_from_issue_reports\n"
    "- create_kb_page\n"
    "- add_ticket_comment\n"
    "- attach_file_to_ticket, attach_file_to_issue_report\n"
    "Only proceed with the actual action after the user approves. If the user "
    "rejects, acknowledge their decision and ask what they'd like to do instead. "
    "Never perform a mutating action without approval. Personal actions like "
    "watch_ticket and unwatch_ticket do not require approval.\n\n"

    "## Issue Reports\n"
    "When a user reports a problem or bug, always search first:\n"
    "1. Call search_issue_reports with the project key and relevant keywords.\n"
    "2. If similar open/reviewing reports exist, use present_choices so the user "
    "can pick a match, then call add_reporter_to_issue_report to consolidate.\n"
    "3. If no match, ask clarifying questions if needed, then request_approval "
    "and call create_issue_report.\n"
    "4. To promote reports to a formal ticket (Developer+ role), use "
    "request_approval then create_ticket_from_issue_reports.\n\n"

    "## Subtasks\n"
    "Subtasks are created with create_ticket using parent_ticket_number (the "
    "parent ticket's number in the same project). Subtasks inherit sprint/epic "
    "from the parent when not specified.\n\n"

    "## Productivity Tools\n"
    "Use global_search for cross-entity queries (tickets, KB pages, comments). "
    "Use get_my_dashboard when the user asks what's on their plate, what's "
    "overdue, or what they're watching. Use list_ticket_comments before "
    "summarizing a ticket's discussion. Use watch_ticket when the user wants "
    "to follow a ticket. Use get_ticket_transitions before transition_ticket_status "
    "to see valid next statuses.\n\n"

    "## Shared Files\n"
    "When the user attaches files in chat, call list_conversation_attachments "
    "to see what is available. For image attachments, describe what you see "
    "(vision) and offer to attach relevant files to a ticket or issue report. "
    "When creating a ticket or issue report, ask whether shared files should "
    "be attached. Use request_approval before attach_file_to_ticket or "
    "attach_file_to_issue_report.\n\n"

    "## Asking Clarifying Questions\n"
    "When the user's request could refer to multiple items (e.g., multiple "
    "tickets, projects, or statuses), use the present_choices tool to show "
    "them clickable options. Only use present_choices when there are concrete "
    "options to pick from — for open-ended questions, just ask in plain text.\n\n"
    "When key details are missing for a task, ask a brief clarifying question "
    "before proceeding. For example, if asked to 'create a ticket' but no "
    "description is given, ask what the ticket should cover. Only ask when "
    "genuinely needed — if the user already provided enough context, proceed.\n\n"

    "## Descriptions\n"
    "Ticket and issue report description fields support Markdown formatting "
    "(headings, bullet lists, bold, code blocks). When creating or updating "
    "descriptions, write well-structured markdown rather than plain unformatted "
    "paragraphs.\n\n"

    "## Created Resources\n"
    "When a tool returns a `url` or `path` after creating a resource, include a "
    "markdown link in your reply (e.g. [PROJ-42](url)). Always give the user a "
    "direct link immediately after successful creation.\n\n"

    "## Knowledge Base Search\n"
    "You have two tools for searching the knowledge base:\n"
    "- **search_knowledge_base**: Keyword/full-text search. Best for exact terms, "
    "specific phrases, or known page titles.\n"
    "- **semantic_search_kb**: Meaning-based search using AI embeddings. Best for "
    "conceptual questions like 'how does authentication work?' or 'what is our "
    "deployment process?' — even when the exact words don't appear in the docs.\n"
    "- **search_project_documents**: Semantic search over ticket attachments and "
    "uploaded project documents (not KB pages).\n\n"
    "## Calculator\n"
    "Use **calculator** for precise arithmetic (percentages, totals, dates-as-numbers). "
    "Do not do mental math when accuracy matters.\n\n"
    "When a user asks about documentation or knowledge base content, prefer "
    "semantic_search_kb first for broad questions. For uploaded files or ticket "
    "attachments, use search_project_documents. If it returns no results or "
    "the user is looking for a specific term, fall back to search_knowledge_base.\n\n"

    "## Knowledge Base Management\n"
    "When the user wants to create documentation, a wiki page, KB page, or "
    "knowledge base article, use create_kb_page — NOT create_ticket. Tickets "
    "track work items; KB pages store documentation.\n"
    "Call list_kb_spaces when the KB space is unknown. Infer the space from its "
    "name or description when possible. Use markdown for page content.\n\n"

    "## Response Style\n"
    "Be concise, helpful, and use markdown formatting when it improves readability."
)

SUPPORTED_LOCALES = frozenset({"en", "es"})

LOCALE_LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
}


def resolve_user_locale(
    user: User,
    request_locale: str | None = None,
) -> str:
    """Resolve the user's preferred locale from the request or stored preferences."""
    if request_locale and request_locale in SUPPORTED_LOCALES:
        return request_locale
    prefs = user.preferences or {}
    pref_locale = prefs.get("locale")
    if isinstance(pref_locale, str) and pref_locale in SUPPORTED_LOCALES:
        return pref_locale
    return "en"


def build_system_prompt(locale: str = "en") -> str:
    """Build the system prompt with locale-specific language instructions."""
    locale = locale if locale in SUPPORTED_LOCALES else "en"
    language_name = LOCALE_LANGUAGE_NAMES[locale]
    language_section = (
        f"\n\n## Language\n"
        f"The user's preferred interface language is {language_name} ({locale}). "
        f"Respond in {language_name} by default — greetings, explanations, "
        f"questions, and summaries should be in {language_name}. "
        f"If the user explicitly asks for a response in another language or "
        f"requests a translation, honor that request for that message or task. "
        f"Content created via tools (ticket titles, descriptions, KB pages, "
        f"comments) should use the language the user is using in the conversation "
        f"unless they specify otherwise."
    )
    return SYSTEM_PROMPT + language_section

MAX_TITLE_LENGTH = 80

APPROVAL_APPROVE_PHRASES = frozenset({
    "yes, go ahead",
    "yes",
    "y",
    "approve",
    "approved",
    "go ahead",
    "ok",
    "okay",
})
APPROVAL_REJECT_PHRASES = frozenset({
    "no, cancel that",
    "no",
    "n",
    "reject",
    "rejected",
    "cancel",
    "cancel that",
})

PENDING_ACTION_MESSAGES = {
    "en": "Please review the request above and approve or reject to continue.",
    "es": "Revisa la solicitud anterior y aprueba o rechaza para continuar.",
}


def _next_save_time(cursor: datetime) -> datetime:
    """Return monotonic timestamps so message order is stable in the DB."""
    return cursor + timedelta(milliseconds=1)


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
    await ai_attachment_service.delete_all_conversation_attachments(db, conversation_id)
    await db.delete(conv)
    await db.flush()
    return True


def _parse_approval_interaction(content: str) -> dict | None:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return None
    if data.get("type") == "approval":
        return data
    return None


def _classify_approval_response(user_message: str) -> str | None:
    normalized = user_message.strip().lower()
    if normalized in APPROVAL_APPROVE_PHRASES:
        return "approved"
    if normalized in APPROVAL_REJECT_PHRASES:
        return "rejected"
    return None


async def _sync_interaction_tool_message(
    db: AsyncSession,
    conversation_id: UUID,
    tool_name: str,
    tool_content: dict,
) -> None:
    """Update the pending interaction tool result so the LLM sees the user's decision."""
    q = (
        select(AIMessage)
        .where(
            AIMessage.conversation_id == conversation_id,
            AIMessage.role == "tool",
        )
        .order_by(AIMessage.created_at.desc())
    )
    result = await db.execute(q)
    for tool_msg in result.scalars():
        tc = tool_msg.tool_calls
        if not isinstance(tc, dict) or tc.get("name") != tool_name:
            continue
        try:
            existing = json.loads(tool_msg.content)
        except json.JSONDecodeError:
            existing = {}
        if existing.get("status") == "awaiting_user_response":
            tool_msg.content = json.dumps(tool_content)
            return


async def _resolve_pending_approval(
    db: AsyncSession,
    conversation_id: UUID,
    user_message: str,
    decided_at: datetime,
) -> bool:
    """Resolve the latest pending approval interaction from the user's reply."""
    decision = _classify_approval_response(user_message)
    if decision is None:
        return False

    q = (
        select(AIMessage)
        .where(
            AIMessage.conversation_id == conversation_id,
            AIMessage.role == "interaction",
        )
        .order_by(AIMessage.created_at.desc())
    )
    result = await db.execute(q)
    for msg in result.scalars():
        interaction = _parse_approval_interaction(msg.content)
        if interaction is None or interaction.get("status") != "pending":
            continue
        interaction["status"] = decision
        interaction["decided_at"] = decided_at.isoformat()
        msg.content = json.dumps(interaction)
        await _sync_interaction_tool_message(
            db,
            conversation_id,
            "request_approval",
            {
                "status": decision,
                "action": interaction.get("action"),
                "details": interaction.get("details", {}),
            },
        )
        await db.flush()
        return True
    return False


def _parse_choice_interaction(content: str) -> dict | None:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return None
    if data.get("type") == "choice":
        return data
    return None


def _match_choice_option(user_message: str, options: list) -> str | None:
    """Return the canonical option text if user_message matches one option."""
    normalized = user_message.strip().lower()
    if not normalized:
        return None
    for option in options:
        if str(option).strip().lower() == normalized:
            return str(option)
    return None


async def _resolve_pending_choice(
    db: AsyncSession,
    conversation_id: UUID,
    user_message: str,
    decided_at: datetime,
) -> bool:
    """Resolve the latest pending choice interaction from the user's reply."""
    trimmed = user_message.strip()
    if not trimmed:
        return False

    q = (
        select(AIMessage)
        .where(
            AIMessage.conversation_id == conversation_id,
            AIMessage.role == "interaction",
        )
        .order_by(AIMessage.created_at.desc())
    )
    result = await db.execute(q)
    for msg in result.scalars():
        interaction = _parse_choice_interaction(msg.content)
        if interaction is None or interaction.get("status") != "pending":
            continue
        options = interaction.get("options") or []
        matched = _match_choice_option(trimmed, options)
        selected = matched if matched is not None else trimmed
        interaction["status"] = "answered"
        interaction["selected_option"] = selected
        interaction["decided_at"] = decided_at.isoformat()
        msg.content = json.dumps(interaction)
        await _sync_interaction_tool_message(
            db,
            conversation_id,
            "present_choices",
            {
                "status": "answered",
                "selected_option": selected,
                "question": interaction.get("question"),
            },
        )
        await db.flush()
        return True
    return False


async def _build_llm_messages(
    db: AsyncSession,
    conversation_id: UUID,
    *,
    locale: str = "en",
    vision_for_latest_user: bool = True,
) -> list[dict]:
    """Load conversation history and prepend system prompt.

    Handles regular messages and tool-calling messages (role='assistant'
    with tool_calls, role='tool' with tool_call_id).
    """
    q = (
        select(AIMessage)
        .where(AIMessage.conversation_id == conversation_id)
        .order_by(AIMessage.created_at, AIMessage.id)
    )
    result = await db.execute(q)
    messages_db = list(result.scalars().all())

    message_ids = [m.id for m in messages_db]
    attachments_by_message = await ai_attachment_service.get_attachments_by_message_ids(
        db, message_ids,
    )

    latest_user_msg_id = None
    for msg in reversed(messages_db):
        if msg.role == "user":
            latest_user_msg_id = msg.id
            break

    from app.core.config import settings
    vision_enabled = settings.LLM_VISION_ENABLED

    messages = [{"role": "system", "content": build_system_prompt(locale)}]
    for msg in messages_db:
        if msg.role == "interaction":
            continue
        if msg.role == "assistant" and msg.tool_calls and isinstance(msg.tool_calls, list):
            messages.append({
                "role": "assistant",
                "content": msg.content or None,
                "tool_calls": msg.tool_calls,
            })
        elif msg.role == "tool" and isinstance(msg.tool_calls, dict):
            tool_call_id = msg.tool_calls.get("tool_call_id", "")
            if tool_call_id:
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": msg.content,
                })
        elif msg.role == "user" and vision_for_latest_user and msg.id == latest_user_msg_id:
            attachments = attachments_by_message.get(msg.id, [])
            if attachments and vision_enabled:
                base_text = msg.content
                summary_prefix = ai_attachment_service.format_attachment_summary(attachments)
                if summary_prefix and summary_prefix in base_text:
                    base_text = base_text.replace("\n\n" + summary_prefix, "").replace(summary_prefix, "").strip()
                content = await build_user_message_content(
                    base_text,
                    attachments,
                    vision_enabled=True,
                    max_image_bytes=settings.LLM_VISION_MAX_IMAGE_BYTES,
                )
                messages.append({"role": "user", "content": content})
            else:
                messages.append({"role": msg.role, "content": msg.content})
        else:
            messages.append({"role": msg.role, "content": msg.content})

    return sanitize_tool_messages(messages)


async def send_message_stream(
    db: AsyncSession,
    user: User,
    conversation_id: UUID | None,
    user_message: str,
    attachment_ids: list[UUID] | None = None,
    locale: str | None = None,
) -> AsyncIterator[str]:
    """Process a chat message and yield SSE events.

    Uses the agent executor for tool-enabled conversations.
    Creates a new conversation if conversation_id is None.
    Saves both user and assistant messages to the database.
    """
    from app.core.config import settings

    provider = get_llm_provider()
    model_name = settings.LLM_MODEL
    user_locale = resolve_user_locale(user, locale)

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

    linked_attachments: list = []
    if attachment_ids:
        try:
            linked_attachments = await ai_attachment_service.link_attachments_to_message(
                db,
                attachment_ids=attachment_ids,
                message_id=user_msg.id,
                conversation_id=conversation_id,
                user_id=user.id,
            )
        except ai_attachment_service.AIAttachmentError as exc:
            yield _sse_event({"type": "error", "message": str(exc)})
            return
        if linked_attachments:
            summary = ai_attachment_service.format_attachment_summary(linked_attachments)
            user_msg.content = f"{user_message}\n\n{summary}" if user_message.strip() else summary
            await db.flush()

    await _resolve_pending_approval(
        db,
        conversation_id,
        user_message,
        user_msg.created_at,
    )
    await _resolve_pending_choice(
        db,
        conversation_id,
        user_message,
        user_msg.created_at,
    )

    if dbg := maybe_debug_sse(
        user,
        "user_message_received",
        {
            "conversation_id": str(conversation_id),
            "locale": user_locale,
            "message": user_message,
            "attachment_count": len(attachment_ids or []),
        },
    ):
        yield dbg

    llm_messages = await _build_llm_messages(
        db, conversation_id, locale=user_locale,
    )

    llm_messages = compact_messages(
        llm_messages,
        context_window=settings.LLM_CONTEXT_WINDOW,
        max_tokens=settings.LLM_MAX_TOKENS,
    )
    llm_messages = sanitize_tool_messages(llm_messages)

    if dbg := maybe_debug_sse(
        user,
        "llm_context_built",
        {"message_count": len(llm_messages), "locale": user_locale},
    ):
        yield dbg

    agent_result = None
    user_registry = await build_skill_registry(db, user)
    async for sse_str in run_agent_turn(
        provider=provider,
        messages=llm_messages,
        registry=user_registry,
        db=db,
        user=user,
        conversation_id=conversation_id,
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
        if dbg := maybe_debug_sse(user, "agent_turn_failed", {"reason": "no_agent_done"}):
            yield dbg
        return

    full_content = agent_result.get("content", "")
    model_name = agent_result.get("model", model_name)
    prompt_tokens = agent_result.get("prompt_tokens")
    completion_tokens = agent_result.get("completion_tokens")
    tool_call_history = agent_result.get("tool_call_history", [])

    has_interaction = any(m.get("role") == "interaction" for m in tool_call_history)
    if not full_content.strip() and has_interaction:
        full_content = PENDING_ACTION_MESSAGES.get(
            user_locale, PENDING_ACTION_MESSAGES["en"],
        )
        yield _sse_event({"type": "chunk", "content": full_content})

    if dbg := maybe_debug_sse(
        user,
        "agent_turn_complete",
        {
            "content_length": len(full_content),
            "tool_messages": len(tool_call_history),
            "has_interaction": has_interaction,
            "model": model_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
        },
    ):
        yield dbg

    save_time = datetime.now(timezone.utc)
    for tc_msg in tool_call_history:
        role = tc_msg.get("role")
        save_time = _next_save_time(save_time)
        if role == "assistant":
            db.add(AIMessage(
                conversation_id=conversation_id,
                role="assistant",
                content=tc_msg.get("content") or "",
                tool_calls=tc_msg.get("tool_calls"),
                created_at=save_time,
            ))
        elif role == "interaction":
            db.add(AIMessage(
                conversation_id=conversation_id,
                role="interaction",
                content=tc_msg.get("content", ""),
                created_at=save_time,
            ))
        elif role == "tool":
            db.add(AIMessage(
                conversation_id=conversation_id,
                role="tool",
                content=tc_msg.get("content", ""),
                tool_calls={
                    "tool_call_id": tc_msg.get("tool_call_id", ""),
                    "name": tc_msg.get("name", ""),
                },
                created_at=save_time,
            ))

    save_time = _next_save_time(save_time)
    assistant_msg = AIMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=full_content,
        model=model_name,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        created_at=save_time,
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
