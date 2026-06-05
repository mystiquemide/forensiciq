# ForensIQ — Architecture Document

## System Overview

ForensIQ is a three-tier system: a Next.js frontend, a Python FastAPI backend (containing the Claude agent and evidence engine), and a SIFT Workstation VM where forensic tools execute.

```
┌─────────────────────────────────────────────────────┐
│              Web UI (Next.js + React Flow)           │
│  Evidence graph · Tool log · Findings sidebar        │
└────────────────────┬────────────────────────────────┘
                     │ REST + WebSocket
┌────────────────────▼────────────────────────────────┐
│            FastAPI Backend (Python 3.11)             │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  ForensIQAgent (Claude claude-sonnet-4-6)    │   │
│  │  ├── Anthropic tool_use loop                 │   │
│  │  ├── EvidenceGraph (confidence scoring)      │   │
│  │  └── Self-correction (3 max iterations)      │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  MCP Tool Layer (8 tools)                    │   │
│  │  ├── log2timeline  ├── volatility            │   │
│  │  ├── regripper     ├── sleuthkit             │   │
│  │  ├── yara_scan     ├── strings               │   │
│  │  ├── file_identify └── hash_compute          │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  Security boundary: ToolSecurityError blocks        │
│  any command containing rm/dd/shred/mkfs/chmod      │
└────────────────────┬────────────────────────────────┘
                     │ asyncssh (SSH key auth)
┌────────────────────▼────────────────────────────────┐
│           SIFT Workstation VM (Ubuntu)               │
│           VirtualBox, host-only network              │
│           200+ pre-installed forensic tools          │
└─────────────────────────────────────────────────────┘
```

---

## Confidence Scoring (ADR-001)

**Decision:** Confidence is computed by the EvidenceGraph, never by the Claude agent.

**Formula:**
- Base: 0.50 (single tool reports a finding)
- Corroboration: +0.20 per additional tool that agrees (cap: 0.95)
- Contradiction: -0.25 per tool that contradicts (floor: 0.10)
- FACT: confidence ≥ 0.85 AND sources.length ≥ 3
- INFERENCE: confidence ≥ 0.50
- HYPOTHESIS: confidence < 0.50

**Rationale:** Separating confidence calculation from the LLM prevents hallucinated confidence scores. The formula is deterministic and auditable.

---

## Self-Correction Loop (ADR-002)

**Decision:** After each tool execution batch, review all findings with confidence below 0.70 and request additional tool runs for those findings.

**Max iterations:** 3 (configurable via `MAX_CORRECTION_ITERATIONS`)

**Rationale:** Unlimited correction creates infinite loops. Three iterations is sufficient for the sample cases and keeps investigation time bounded.

**Self-correction is distinct from error recovery.** It fires on low confidence, not on tool failures. Tool failures are handled by returning an error string and logging the failure.

---

## Security Boundaries (ADR-003)

**Decision:** Destructive command blocking is implemented in `BaseSIFTTool._check_command()` at the tool layer, not in the agent system prompt.

**Blocked prefixes:** `rm`, `dd`, `shred`, `mkfs`, `fdisk`, `chmod`, `chown`, `truncate`, `> /`, `sudo rm`, `sudo dd`

**Rationale:** Prompt-based safety ("don't run destructive commands") can be overridden by adversarial case data or model confusion. Architectural enforcement cannot.

**ToolSecurityError** is a hard exception that propagates up through the agent and is broadcast to the frontend as a `tool_error` event. The investigation continues but the blocked tool call is logged.

---

## Data Flow

```
1. POST /api/investigation/start
   → Creates investigation record
   → Spawns background task: ForensIQAgent.investigate(case_path)

2. ForensIQAgent sends messages to Claude API
   → Claude responds with tool_use blocks
   → Agent executes each tool via SSH to SIFT VM
   → Tool result returned to Claude as tool_result

3. Each tool execution:
   → Broadcasts tool_start to WebSocket clients
   → Executes command on SIFT VM via asyncssh
   → SHA-256 hashes the output
   → Calls EvidenceGraph.add_finding() or .corroborate()
   → Broadcasts tool_complete + finding_new/finding_updated

4. After each Claude response:
   → Check EvidenceGraph.get_low_confidence_findings(0.70)
   → If any exist and iterations < 3: append correction instruction to messages
   → Broadcast self_correction events

5. When Claude calls finish_investigation:
   → Broadcast investigation_complete with summary
   → Report available at GET /api/report/:id
```

---

## File Structure

```
forensiciq/
├── backend/
│   ├── main.py                  FastAPI app entry point
│   ├── forensiciq/
│   │   ├── config.py            Pydantic settings from env
│   │   ├── agent.py             Claude agent + tool_use loop
│   │   ├── evidence_graph.py    Confidence scoring engine
│   │   ├── tools/
│   │   │   ├── base.py          SSH executor + security blocklist
│   │   │   ├── log2timeline.py  Plaso super-timeline
│   │   │   ├── volatility.py    Memory forensics
│   │   │   ├── regripper.py     Registry extraction
│   │   │   ├── sleuthkit.py     File system (fls/icat)
│   │   │   ├── yara_scan.py     Malware signatures
│   │   │   ├── strings_tool.py  String extraction
│   │   │   ├── file_identify.py file + exiftool
│   │   │   └── hash_compute.py  md5/sha1/sha256
│   │   ├── api/
│   │   │   ├── routes.py        REST endpoints + WebSocket
│   │   │   └── websocket.py     ConnectionManager
│   │   └── report/
│   │       ├── generator.py     HTML report from EvidenceGraph
│   │       └── templates/
│   │           └── report.html.j2
│   └── tests/
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                  Landing + case path form
│       │   └── investigation/[id]/       Live dashboard
│       ├── components/
│       │   ├── EvidenceGraph.tsx         React Flow graph
│       │   ├── ToolLog.tsx               Real-time tool feed
│       │   ├── FindingCard.tsx           Collapsible finding
│       │   ├── ConfidenceBar.tsx         Label + progress bar
│       │   ├── FindingsSidebar.tsx       Filtered findings list
│       │   └── PulseIcon.tsx             Animated status icon
│       ├── hooks/
│       │   ├── useWebSocket.ts           WS connection + reconnect
│       │   └── useInvestigation.ts       State reducer
│       └── types/index.ts               Shared TypeScript types
│
├── docs/                        PRD · TASKS · ARCHITECTURE
├── docker-compose.yml
└── AGENTS.md
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key |
| `SIFT_HOST` | Yes | `192.168.56.101` | SIFT VM IP |
| `SIFT_PORT` | No | `22` | SSH port |
| `SIFT_USER` | No | `sansforensics` | SSH username |
| `SIFT_SSH_KEY_PATH` | Yes | — | Path to SSH private key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-6` | Claude model ID |
| `MAX_CORRECTION_ITERATIONS` | No | `3` | Self-correction cap |
| `CONFIDENCE_CORRECTION_THRESHOLD` | No | `0.70` | Trigger threshold |
