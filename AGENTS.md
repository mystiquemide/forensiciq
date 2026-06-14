# ForensIQ — Agent and Contributor Guide

## Stack

| Layer | Technology |
|---|---|
| Agent model | claude-sonnet-4-6 via Anthropic Python SDK |
| Backend API | FastAPI + WebSockets |
| Evidence engine | Python in-memory with disk checkpoint recovery |
| VM communication | asyncssh |
| Report generation | Jinja2 HTML |
| Frontend | Next.js 15 + @xyflow/react + Tailwind CSS |
| Deployment | Docker Compose / Railway |

## Architectural Rules

1. **Tool wrappers are READ-ONLY at the server level.** The SSH executor in `tools/base.py` rejects any command containing `rm`, `dd`, `shred`, `mkfs`, `chmod`, `chown`, `truncate`, `> /`, `fdisk`, or `wipefs`. This is enforced in code, not in prompts.

2. **Every tool output is SHA-256 hashed before the LLM sees it.** Before any output leaves the tool layer, compute `sha256(tool_name + ":" + output + ":" + timestamp)` and attach it to the finding.

3. **Confidence is computed by the EvidenceGraph, never by the agent.** The Claude agent reports findings. It does not assign or modify confidence. The EvidenceGraph computes confidence from source count, corroboration, and contradictions.

4. **Corroboration is deterministic.** The corroboration engine in `artifacts.py` uses regex-based artifact extraction (IPs, PIDs, hashes, paths, registry keys, domains, executables). When two tool outputs share an artifact, the finding is automatically corroborated. The LLM is not involved in this decision.

5. **WebSocket events are the source of truth for UI state.** The frontend does not poll REST endpoints during an active investigation. All real-time state comes from WebSocket events defined in `src/types/index.ts`.

6. **Checkpoints are written atomically.** `checkpoint.py` uses a write-then-rename pattern (`*.json.tmp` → `*.json`) so a crash mid-write never corrupts the saved state.

## Confidence Tiers

| Label | Confidence | Condition |
|---|---|---|
| FACT | >= 0.85 | 3+ tools corroborate, confidence at or above threshold |
| INFERENCE | 0.50 - 0.84 | 1-2 tools, confidence at or above threshold |
| HYPOTHESIS | < 0.50 | Single weak signal or contradictions present |

**Formula:**
- Base: `0.50`
- Corroboration: `+0.20` per additional tool (cap `0.95`)
- Contradiction: `-0.25` per contradicting tool (floor `0.10`)

## WebSocket Event Contract

All events are JSON objects with a `type` field. The full union type is in `frontend/src/types/index.ts`.

| Event type | Direction | Payload |
|---|---|---|
| `tool_start` | backend → frontend | `tool`, `params`, `reasoning?` |
| `tool_complete` | backend → frontend | `tool`, `duration_ms`, `output_hash?`, `success?` |
| `tool_error` | backend → frontend | `tool`, `error` |
| `finding_new` | backend → frontend | `finding` (full Finding object) |
| `finding_updated` | backend → frontend | `finding` (updated Finding object, e.g. after corroboration) |
| `self_correction` | backend → frontend | `finding_id`, `reason`, `current_sources` |
| `iteration_complete` | backend → frontend | `iteration`, `low_confidence_count` |
| `investigation_complete` | backend → frontend | `summary` |
| `error` | backend → frontend | `message` |

## Conventions

### Python (backend)

- Python 3.11+, type hints everywhere
- `async`/`await` throughout
- Pydantic models for all API request/response shapes
- Structured logging via `structlog`
- Tool classes inherit from `BaseSIFTTool`
- New tools must implement `anthropic_tool_definition` and `run(**kwargs) -> ToolResult`

### TypeScript (frontend)

- Strict TypeScript mode
- All API and WebSocket types defined in `src/types/index.ts` - never inline
- Components are functional, no class components
- WebSocket state managed via `useWebSocket` hook
- Investigation state managed via `useInvestigation` reducer

## Adding a New Tool

1. Create `backend/forensiciq/tools/my_tool.py` extending `BaseSIFTTool`
2. Implement `name`, `anthropic_tool_definition`, and `run()`
3. Register the tool in `ForensIQAgent.__init__()` in `agent.py`
4. Add tests in `backend/tests/`

## Hard Rules

- Never commit `.env`, `.env.local`, or any file containing real credentials
- Never commit SSH private keys or passphrases
- Never commit case data, disk images, memory dumps, or evidence files
- Never add shell execution paths to the tool registry that bypass `BaseSIFTTool`
- Never assign confidence values in agent code - only in `EvidenceGraph`
