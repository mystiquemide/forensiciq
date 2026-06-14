import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import structlog

from forensiciq.api.websocket import manager
from forensiciq.agent import ForensIQAgent
from forensiciq.checkpoint import (
    delete_checkpoint,
    list_checkpoints,
    load_checkpoint,
    save_checkpoint,
)
from forensiciq.evidence_graph import EvidenceGraph

log = structlog.get_logger()
router = APIRouter()

_investigations: dict[str, dict[str, Any]] = {}

_CHECKPOINT_EVENTS = {"finding_new", "finding_updated", "investigation_complete"}


class StartRequest(BaseModel):
    case_path: str


class StartResponse(BaseModel):
    investigation_id: str


async def _broadcast_and_checkpoint(
    investigation_id: str, case_path: str, graph: EvidenceGraph, event: dict
) -> None:
    await manager.broadcast(investigation_id, event)
    if event.get("type") in _CHECKPOINT_EVENTS:
        save_checkpoint(investigation_id, {
            "investigation_id": investigation_id,
            "case_path": case_path,
            "status": _investigations.get(investigation_id, {}).get("status", "running"),
            "saved_at": datetime.now(timezone.utc).isoformat(),
            **graph.to_dict(),
        })


async def _run_investigation(
    investigation_id: str, case_path: str, graph: EvidenceGraph | None = None
) -> None:
    if graph is None:
        graph = EvidenceGraph()
    _investigations[investigation_id]["graph"] = graph
    _investigations[investigation_id]["status"] = "running"

    def broadcast(event: dict) -> Any:
        return asyncio.create_task(
            _broadcast_and_checkpoint(investigation_id, case_path, graph, event)
        )

    agent = ForensIQAgent(
        investigation_id=investigation_id,
        graph=graph,
        broadcast=broadcast,
    )
    try:
        await agent.investigate(case_path)
        _investigations[investigation_id]["status"] = "complete"
        delete_checkpoint(investigation_id)
    except Exception as exc:
        log.error("investigation_failed", investigation_id=investigation_id, error=str(exc))
        _investigations[investigation_id]["status"] = "error"
        _investigations[investigation_id]["error"] = str(exc)
        save_checkpoint(investigation_id, {
            "investigation_id": investigation_id,
            "case_path": case_path,
            "status": "error",
            "saved_at": datetime.now(timezone.utc).isoformat(),
            **graph.to_dict(),
        })
        await manager.broadcast(investigation_id, {"type": "error", "message": str(exc)})


@router.get("/health")
async def health() -> dict:
    return {"ok": True}


@router.post("/investigation/start", response_model=StartResponse)
async def start_investigation(body: StartRequest, background_tasks: BackgroundTasks) -> StartResponse:
    investigation_id = str(uuid.uuid4())
    _investigations[investigation_id] = {"status": "starting", "case_path": body.case_path, "graph": None}
    background_tasks.add_task(_run_investigation, investigation_id, body.case_path)
    log.info("investigation_started", investigation_id=investigation_id, case_path=body.case_path)
    return StartResponse(investigation_id=investigation_id)


@router.post("/investigation/resume/{investigation_id}", response_model=StartResponse)
async def resume_investigation(investigation_id: str, background_tasks: BackgroundTasks) -> StartResponse:
    cp = load_checkpoint(investigation_id)
    if not cp:
        raise HTTPException(status_code=404, detail="No checkpoint found for this investigation")
    graph = EvidenceGraph.from_dict(cp)
    case_path = cp.get("case_path", "")
    _investigations[investigation_id] = {"status": "starting", "case_path": case_path, "graph": graph}
    background_tasks.add_task(_run_investigation, investigation_id, case_path, graph)
    log.info("investigation_resumed", investigation_id=investigation_id, case_path=case_path)
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


@router.get("/checkpoints")
async def get_checkpoints() -> list[dict]:
    result = []
    for inv_id in list_checkpoints():
        cp = load_checkpoint(inv_id)
        if cp:
            result.append({
                "investigation_id": inv_id,
                "status": cp.get("status", "unknown"),
                "case_path": cp.get("case_path", ""),
                "findings_count": len(cp.get("findings", [])),
                "saved_at": cp.get("saved_at", ""),
            })
    return result


@router.delete("/checkpoint/{investigation_id}")
async def delete_checkpoint_route(investigation_id: str) -> dict:
    deleted = delete_checkpoint(investigation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Checkpoint not found")
    return {"deleted": True}


@router.get("/report/{investigation_id}", response_class=HTMLResponse)
async def get_report(investigation_id: str) -> HTMLResponse:
    inv = _investigations.get(investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if inv["status"] not in ("complete", "error"):
        raise HTTPException(status_code=409, detail="Investigation not yet complete")

    from forensiciq.report.generator import generate_html_report
    graph: EvidenceGraph = inv["graph"]
    html = generate_html_report(investigation_id, inv["case_path"], graph)
    return HTMLResponse(content=html)


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
