import json
from typing import Any

from fastapi import WebSocket
import structlog

log = structlog.get_logger()


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, investigation_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(investigation_id, []).append(ws)
        log.info("ws_connected", investigation_id=investigation_id)

    def disconnect(self, investigation_id: str, ws: WebSocket) -> None:
        conns = self._connections.get(investigation_id, [])
        if ws in conns:
            conns.remove(ws)
        log.info("ws_disconnected", investigation_id=investigation_id)

    async def broadcast(self, investigation_id: str, event: dict[str, Any]) -> None:
        conns = self._connections.get(investigation_id, [])
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(json.dumps(event))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(investigation_id, ws)


manager = ConnectionManager()
