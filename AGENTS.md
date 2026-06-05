# ForensIQ — Agent & Contributor Guide

## Stack

| Layer | Technology |
|-------|-----------|
| Agent model | claude-sonnet-4-6 via Anthropic Python SDK |
| MCP server | Python + official `mcp` library |
| Backend API | FastAPI + WebSockets |
| Evidence engine | Python in-memory (no external DB) |
| VM communication | asyncssh |
| Report generation | Jinja2 → HTML → PDF (weasyprint) |
| Frontend | Next.js 14 + @xyflow/react + Tailwind CSS |
| Deployment | Docker Compose |

## Architectural Rules

1. **MCP tools are READ-ONLY at the server level.** The MCP server's `call_tool` handler must reject any command containing `rm`, `dd`, `shred`, `mkfs`, `chmod`, `chown`, or write operations. This is enforced in code, not in prompts.

2. **Every tool output is SHA-256 hashed.** Before any output leaves the tool layer, compute `sha256(tool_name + ":" + output + ":" + timestamp)` and store it with the finding.

3. **Confidence is computed by the EvidenceGraph, not the agent.** The Claude agent reports findings; it does not assign confidence. The EvidenceGraph computes confidence based on source count and corroboration.

4. **WebSocket events are the source of truth for UI state.** The frontend should not poll REST endpoints during an active investigation. All real-time state comes from WebSocket events.

5. **No destructive SSH commands.** The SSH executor in `tools/base.py` maintains a blocklist of forbidden command prefixes. Attempted execution raises `ToolSecurityError`.

## Confidence Tiers

| Label | Confidence | Condition |
|-------|-----------|-----------|
| FACT | ≥ 0.85 | 3+ tools corroborate, no contradictions |
| INFERENCE | 0.50 – 0.84 | 1-2 tools, no contradictions |
| HYPOTHESIS | < 0.50 | Single weak signal or contradictions exist |

## Conventions

### Python (backend)
- Python 3.11+, type hints everywhere
- `async`/`await` throughout (asyncio)
- Pydantic models for all API request/response shapes
- Structured logging via `structlog`
- Tool classes inherit from `BaseSIFTTool`

### TypeScript (frontend)
- Strict TypeScript mode
- All API types from `src/types/index.ts` — never inline types
- Components are functional, no class components
- WebSocket state managed via `useWebSocket` hook
- React Flow nodes use custom typed node data

## Team

- **MystiqueMide** — Frontend (Next.js + Tailwind + React Flow), GitHub, docs, demo video, Devpost submission
- **Kingnana** — Backend (Python MCP server, Claude agent, Evidence Graph, FastAPI + WebSocket)

## Hackathon Submission Checklist

- [ ] `POST /api/investigation/start` works end-to-end against real SIFT VM
- [ ] Self-correction loop visible in demo (low-confidence finding triggers re-run)
- [ ] All 8 SIFT tools wrapped and tested
- [ ] SHA-256 audit trail verified
- [ ] Docker Compose `docker compose up` works with zero manual steps
- [ ] Architecture diagram committed to `docs/`
- [ ] 5-minute demo video recorded
- [ ] Accuracy report generated
- [ ] Devpost submission completed
