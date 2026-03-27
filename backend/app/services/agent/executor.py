"""Agent executor — orchestrates the tool-use loop.

Implements a ReAct-style loop: non-streaming LLM calls for tool selection,
then a streaming call for the final user-facing response.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import structlog

from app.models.user import User
from app.services.agent.skills import (
    BaseSkill,
    SkillContext,
    SkillError,
    SkillRegistry,
)
from app.services.agent.interaction_skills import INTERACTION_TOOLS
from app.services.llm.base import BaseLLMProvider, LLMError
from app.services.llm.context import compact_messages

from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()

MAX_TOOL_ROUNDS = 6


def _sse_event(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def _execute_skill(
    skill: BaseSkill,
    params: dict,
    db: AsyncSession,
    user: User,
) -> dict:
    """Execute a single skill with error handling."""
    ctx = SkillContext(db=db, user=user, params=params)
    try:
        return await skill.execute(ctx)
    except SkillError as exc:
        return {"error": str(exc)}
    except Exception as exc:
        await logger.aerror("skill_execution_error", skill=skill.name, error=str(exc))
        return {"error": f"Skill '{skill.name}' encountered an unexpected error."}


def _summarize_result(name: str, result: dict) -> str:
    """Generate a short summary of a tool result for SSE."""
    if "error" in result:
        return f"Error: {result['error']}"
    if "total" in result:
        return f"Found {result['total']} result(s)"
    if "sprint" in result and result["sprint"]:
        sprint = result["sprint"]
        return f"Sprint '{sprint.get('name', '?')}' is {sprint.get('status', '?')}"
    if "message" in result:
        return result["message"]
    return "Completed"


async def run_agent_turn(
    provider: BaseLLMProvider,
    messages: list[dict],
    registry: SkillRegistry,
    db: AsyncSession,
    user: User,
    *,
    max_tokens: int,
    context_window: int = 131072,
    temperature: float,
    max_tool_rounds: int = MAX_TOOL_ROUNDS,
) -> AsyncIterator[str]:
    """Run a single agent turn: tool-calling loop + streaming final response.

    Yields SSE event strings suitable for StreamingResponse.
    """
    tools = registry.to_openai_tools() if len(registry) > 0 else None
    tool_call_history: list[dict] = []
    used_tools = False

    for round_num in range(max_tool_rounds):
        messages = compact_messages(
            messages,
            context_window=context_window,
            max_tokens=max_tokens,
        )
        try:
            response = await provider.chat_completion(
                messages,
                tools=tools,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        except LLMError as exc:
            await logger.aerror("agent_llm_error", round=round_num, error=str(exc))
            yield _sse_event({
                "type": "error",
                "message": "The AI provider returned an error. Please try again.",
            })
            return
        except Exception as exc:
            await logger.aerror("agent_unexpected_error", round=round_num, error=str(exc))
            yield _sse_event({
                "type": "error",
                "message": "An unexpected error occurred.",
            })
            return

        if not response.tool_calls:
            break

        used_tools = True
        assistant_msg = {
            "role": "assistant",
            "content": response.content or None,
            "tool_calls": response.tool_calls,
        }
        messages.append(assistant_msg)
        tool_call_history.append(assistant_msg)

        interaction_triggered = False

        for tc in response.tool_calls:
            func_name = tc["function"]["name"]
            try:
                func_args = json.loads(tc["function"]["arguments"])
            except (json.JSONDecodeError, KeyError):
                func_args = {}

            if func_name in INTERACTION_TOOLS:
                if func_name == "present_choices":
                    yield _sse_event({
                        "type": "choice_request",
                        "question": func_args.get("question", ""),
                        "options": func_args.get("options", []),
                    })
                elif func_name == "request_approval":
                    yield _sse_event({
                        "type": "approval_request",
                        "action": func_args.get("action", ""),
                        "details": func_args.get("details", {}),
                    })

                tool_msg = {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps({"status": "awaiting_user_response"}),
                }
                messages.append(tool_msg)
                tool_call_history.append(tool_msg)
                interaction_triggered = True
                break

            yield _sse_event({
                "type": "tool_start",
                "name": func_name,
                "arguments": func_args,
            })

            skill = registry.get(func_name)
            if skill is None:
                result = {"error": f"Unknown skill: {func_name}"}
            else:
                result = await _execute_skill(skill, func_args, db, user)

            result_json = json.dumps(result, default=str)
            tool_msg = {
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result_json,
            }
            messages.append(tool_msg)
            tool_call_history.append(tool_msg)

            yield _sse_event({
                "type": "tool_result",
                "name": func_name,
                "summary": _summarize_result(func_name, result),
            })

        if interaction_triggered:
            content = response.content or ""
            if content:
                yield _sse_event({"type": "chunk", "content": content})
            yield _sse_event({
                "type": "_agent_done",
                "content": content,
                "model": provider.model,
                "prompt_tokens": response.prompt_tokens,
                "completion_tokens": response.completion_tokens,
                "tool_call_history": tool_call_history,
            })
            return
    else:
        yield _sse_event({
            "type": "error",
            "message": "The agent exceeded the maximum number of tool-calling rounds.",
        })
        return

    full_content = ""
    prompt_tokens = None
    completion_tokens = None
    model_name = provider.model

    if used_tools:
        messages = compact_messages(
            messages,
            context_window=context_window,
            max_tokens=max_tokens,
        )
        try:
            async for event in provider.chat_completion_stream_with_usage(
                messages,
                max_tokens=max_tokens,
                temperature=temperature,
            ):
                if event.is_done:
                    prompt_tokens = event.prompt_tokens
                    completion_tokens = event.completion_tokens
                    model_name = event.model or model_name
                else:
                    if event.reasoning:
                        yield _sse_event({"type": "reasoning", "content": event.reasoning})
                    if event.content:
                        full_content += event.content
                        yield _sse_event({"type": "chunk", "content": event.content})
        except LLMError as exc:
            await logger.aerror("agent_stream_error", error=str(exc))
            yield _sse_event({
                "type": "error",
                "message": "The AI provider returned an error. Please try again.",
            })
            return
        except Exception as exc:
            await logger.aerror("agent_stream_unexpected_error", error=str(exc))
            yield _sse_event({
                "type": "error",
                "message": "An unexpected error occurred.",
            })
            return
    else:
        # No tools were called — the non-streaming call already produced
        # the final response. Use it directly instead of a redundant second call.
        full_content = response.content or ""
        prompt_tokens = response.prompt_tokens
        completion_tokens = response.completion_tokens
        model_name = response.model or model_name
        if full_content:
            yield _sse_event({"type": "chunk", "content": full_content})

    if not full_content:
        full_content = "*The model used all available tokens on reasoning without producing a response. Try a simpler prompt or increase the token limit.*"
        yield _sse_event({"type": "chunk", "content": full_content})

    yield _sse_event({
        "type": "_agent_done",
        "content": full_content,
        "model": model_name,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "tool_call_history": tool_call_history,
    })
