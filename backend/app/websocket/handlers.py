"""WebSocket endpoint handlers with Redis Pub/Sub relay for cross-instance events."""
from __future__ import annotations

import asyncio
import json

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websocket.manager import manager

logger = structlog.get_logger()

router = APIRouter()

HEARTBEAT_INTERVAL = 30

_pubsub_tasks: dict[str, asyncio.Task] = {}


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    token = ws.query_params.get("token", "")
    user_id = await _authenticate(token)
    if not user_id:
        await ws.close(code=4001, reason="Unauthorized")
        return

    await manager.connect(ws, user_id)
    heartbeat_task = asyncio.create_task(_heartbeat(ws))

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")
            if action == "subscribe":
                channel = msg.get("channel")
                if channel:
                    manager.subscribe(ws, channel)
                    _ensure_pubsub_relay(channel)
                    await ws.send_text(json.dumps({"type": "subscribed", "channel": channel}))
            elif action == "unsubscribe":
                channel = msg.get("channel")
                if channel:
                    manager.unsubscribe(ws, channel)
                    await ws.send_text(json.dumps({"type": "unsubscribed", "channel": channel}))
            elif action == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        heartbeat_task.cancel()
        manager.disconnect(ws, user_id)


def _ensure_pubsub_relay(channel: str) -> None:
    """Start a Redis Pub/Sub listener for this channel if not already running."""
    redis_channel = f"events:{channel.split(':')[-1]}" if ":" in channel else channel
    if redis_channel in _pubsub_tasks and not _pubsub_tasks[redis_channel].done():
        return
    _pubsub_tasks[redis_channel] = asyncio.create_task(_pubsub_listener(redis_channel))


async def _pubsub_listener(redis_channel: str) -> None:
    """Listen on a Redis Pub/Sub channel and relay messages to WebSocket channels."""
    try:
        from app.api.deps import get_redis
        redis = await get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe(redis_channel)

        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                data = json.loads(message["data"])
                ws_channel = data.get("channel", redis_channel)
                await manager.broadcast_to_channel(ws_channel, data)
            except Exception:
                await logger.awarning("pubsub_relay_error", channel=redis_channel)
    except asyncio.CancelledError:
        pass
    except Exception:
        await logger.awarning("pubsub_listener_error", channel=redis_channel)


async def _authenticate(token: str) -> str | None:
    """Validate token and return user_id."""
    if not token:
        return None
    try:
        from app.core.local_jwt import is_local_token, decode_local_token
        if is_local_token(token):
            claims = decode_local_token(token)
            return claims.get("sub")
        from app.core.security import validate_token
        claims = await validate_token(token)
        return claims.get("sub")
    except Exception:
        return None


async def _heartbeat(ws: WebSocket) -> None:
    try:
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            await ws.send_text(json.dumps({"type": "ping"}))
    except Exception:
        pass
