"""WebSocket connection manager with channel-based subscriptions."""
from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._user_connections: dict[str, set[WebSocket]] = defaultdict(set)
        self._channel_subs: dict[str, set[WebSocket]] = defaultdict(set)
        self._ws_channels: dict[int, set[str]] = defaultdict(set)

    async def connect(self, ws: WebSocket, user_id: str) -> None:
        await ws.accept()
        self._user_connections[user_id].add(ws)

    def disconnect(self, ws: WebSocket, user_id: str) -> None:
        self._user_connections[user_id].discard(ws)
        if not self._user_connections[user_id]:
            del self._user_connections[user_id]
        ws_id = id(ws)
        for ch in list(self._ws_channels.get(ws_id, [])):
            self._channel_subs[ch].discard(ws)
            if not self._channel_subs[ch]:
                del self._channel_subs[ch]
        self._ws_channels.pop(ws_id, None)

    def subscribe(self, ws: WebSocket, channel: str) -> None:
        self._channel_subs[channel].add(ws)
        self._ws_channels[id(ws)].add(channel)

    def unsubscribe(self, ws: WebSocket, channel: str) -> None:
        self._channel_subs[channel].discard(ws)
        if not self._channel_subs[channel]:
            del self._channel_subs[channel]
        self._ws_channels[id(ws)].discard(channel)

    async def send_to_user(self, user_id: str, data: dict[str, Any]) -> None:
        conns = self._user_connections.get(user_id, set())
        payload = json.dumps(data, default=str)
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, user_id)

    async def broadcast_to_channel(
        self, channel: str, data: dict[str, Any], *, exclude_user: str | None = None
    ) -> None:
        conns = self._channel_subs.get(channel, set())
        payload = json.dumps(data, default=str)
        dead: list[tuple[WebSocket, str]] = []
        for ws in conns:
            uid = self._find_user(ws)
            if uid and uid == exclude_user:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                if uid:
                    dead.append((ws, uid))
        for ws, uid in dead:
            self.disconnect(ws, uid)

    def _find_user(self, ws: WebSocket) -> str | None:
        for uid, conns in self._user_connections.items():
            if ws in conns:
                return uid
        return None

    @property
    def active_connections(self) -> int:
        return sum(len(c) for c in self._user_connections.values())


manager = ConnectionManager()
