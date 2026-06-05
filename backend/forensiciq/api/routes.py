import asyncio
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import structlog

from forensiciq.api.websocket import manager
from forensiciq.agent import ForensIQAgent
from forensiciq.evidence_graph import EvidenceGraph

log = structlog.get_logger()
router = APIRouter()

_investigations: dict[str, dict[str, Any]] = {}


class StartRequest(BaseModel):
    case_path: str


class StartResponse(BaseModel):
    investigation_id: str


async def _run_investigation(investigation_id: str, case_path: str) -> None:
    graph = EvidenceGraph()
    _investigations[investigation_id]["graph"] = graph
    _investigations[investigation_id]["status"] = "running"

    agent = ForensIQAgent(
        investigation_id=investigation_id,
        graph=graph,
        broadcast=lambda event: asyncio.create_task(manager.broadcast(investigation_id, event)),
    )
    try:
        await agent.investigate(case_path)
        _investigations[investigation_id]["status"] = "complete"
    except Exception as exc:
        log.error("investigation_failed", investigation_id=investigation_id, error=str(exc))
        _investigations[investigation_id]["status"] = "error"
        _investigations[investigation_id]["error"] = str(exc)
        await manager.broadcast(investigation_id, {"type": "error", "message": str(exc)})


@router.get("/health")
async def health() -> dict:
    return {"ok": True}


@router.post("/investigation/start", response_model=StartResponse)
async def start_investigation(body: StartRequest, background_tasks: BackgroundTasks) -> StartResponse:
    import uuid
    investigation_id = str(uuid.uuid4())
    _investigations[investigation_id] = {"status": "starting", "case_path": body.case_path, "graph": None}
    background_tasks.add_task(_run_investigation, investigation_id, body.case_path)
    log.info("investigation_started", investigation_id=investigation_id, case_path=body.case_path)
    return StartResponse(investigation_id=investigation_id)


@router.get("/investigation/{investigation_id}")
async def get_investigation(investigation_id: str) -> dict:
    inv = _investigations.get(investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    graph: EvidenceGraph | None = inv.get("graph")
    return {
        "investigation_id": investigation_id,
        "status": inv["status"],
        "case_path": inv["case_path"],
        **(graph.to_dict() if graph else {"findings": [], "tool_calls": [], "summary": {}}),
    }


@router.get("/report/{investigation_id}")
async def get_report(investigation_id: str) -> dict:
    inv = _investigations.get(investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if inv["status"] not in ("complete", "error"):
        raise HTTPException(status_code=409, detail="Investigation not yet complete")

    from forensiciq.report.generator import generate_html_report
    graph: EvidenceGraph = inv["graph"]
    html = generate_html_report(investigation_id, inv["case_path"], graph)
    return {"html": html}


@router.websocket("/ws/investigation/{investigation_id}")
async def ws_investigation(ws: WebSocket, investigation_id: str) -> None:
    if investigation_id not in _investigations:
        await ws.close(code=4004)
        return
    await manager.connect(investigation_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(investigation_id, ws)
