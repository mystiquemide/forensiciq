# memory.md — ForensIQ

## ■ PROJECT OVERVIEW
- Autonomous DFIR agent for the SANS Find Evil! hackathon (findevil.devpost.com, deadline June 15 2026, $10K first place, $22K total)
- Every forensic finding is labeled FACT / INFERENCE / HYPOTHESIS based on calibrated confidence scoring from multi-tool corroboration — no other submission does this
- Status: **MVP — active build**
- Backend: Python 3.11, FastAPI, Anthropic SDK (tool_use), asyncssh
- Frontend: Next.js 14, React Flow (@xyflow/react), Tailwind CSS
- Key goal right now: get end-to-end demo working on real SIFT VM by June 14

## ■ HACKATHON CONTEXT
- **Judging criteria (ranked):** Autonomous Execution Quality (tiebreaker) → IR Accuracy → Breadth/Depth → Constraint Implementation → Audit Trail → Usability
- **Critical:** Judges penalize prompt-based safety — architectural guardrails required
- **Critical:** Tiebreaker rewards self-correction and failure handling, not just speed
- **Competitors researched:** `iffystrayer/find-evil-agent` (LangGraph multi-agent, FAISS tool selection, 4 UIs), `marez8505/find-evil` (custom MCP server, Flask GUI, precision/recall scoring)
- **Our gap:** Neither competitor labels findings by confidence tier or does multi-tool corroboration — ForensIQ owns this
- **3,991 registered participants** — field is large, differentiation is essential

## ■■ PROJECT STRUCTURE
```
forensiciq/
├── backend/              Python backend — Kingnana owns this
│   ├── main.py           FastAPI entry, CORS, structlog
│   ├── forensiciq/
│   │   ├── agent.py      Claude tool_use loop + self-correction
│   │   ├── evidence_graph.py  Confidence scoring engine (FACT/INFERENCE/HYPOTHESIS)
│   │   ├── config.py     Pydantic settings from .env
│   │   ├── tools/        8 SIFT tool wrappers (SSH to VM)
│   │   ├── api/          FastAPI routes + WebSocket manager
│   │   └── report/       Jinja2 HTML report generator
│   └── tests/
├── frontend/             Next.js — MystiqueMide owns this
│   └── src/
│       ├── app/          Landing page + /investigation/[id] dashboard
│       ├── components/   EvidenceGraph, ToolLog, FindingCard, FindingsSidebar, PulseIcon, ConfidenceBar
│       ├── hooks/        useWebSocket, useInvestigation
│       └── types/        Shared TypeScript types (Finding, WSEvent, etc.)
├── docs/                 PRD.md, TASKS.md, ARCHITECTURE.md
├── docker-compose.yml
├── AGENTS.md
└── memory.md
```

## ■ CORE MODULES & WHAT THEY DO
| File/Module | Purpose |
|---|---|
| `backend/forensiciq/agent.py` | Drives Claude tool_use loop, manages self-correction iterations, broadcasts WS events |
| `backend/forensiciq/evidence_graph.py` | Computes confidence per finding from source corroboration; labels FACT/INFERENCE/HYPOTHESIS |
| `backend/forensiciq/tools/base.py` | asyncssh executor with security blocklist (blocks rm/dd/shred/mkfs at code level) |
| `backend/forensiciq/tools/log2timeline.py` | Wraps plaso super-timeline generation |
| `backend/forensiciq/tools/volatility.py` | Wraps Volatility (pslist, netscan, malfind, dlllist, cmdline) |
| `backend/forensiciq/tools/regripper.py` | Wraps RegRipper for registry hive extraction |
| `backend/forensiciq/tools/sleuthkit.py` | Wraps fls/icat (Sleuth Kit) for filesystem listing |
| `backend/forensiciq/tools/yara_scan.py` | Wraps YARA malware signature scanning |
| `backend/forensiciq/tools/strings_tool.py` | Wraps strings with optional grep filter |
| `backend/forensiciq/tools/file_identify.py` | Wraps file + exiftool for metadata extraction |
| `backend/forensiciq/tools/hash_compute.py` | Wraps md5sum / sha1sum / sha256sum |
| `backend/forensiciq/api/routes.py` | POST start, GET status, GET report, WebSocket endpoint |
| `backend/forensiciq/api/websocket.py` | ConnectionManager — broadcasts events to all WS clients per investigation |
| `backend/forensiciq/report/generator.py` | Renders Jinja2 HTML report from EvidenceGraph |
| `backend/forensiciq/report/templates/report.html.j2` | Dark-themed report template with FACT/INFERENCE/HYPOTHESIS sections + audit trail |
| `frontend/src/types/index.ts` | Single source of truth for Finding, WSEvent, ToolCall, ConfidenceLabel types |
| `frontend/src/hooks/useWebSocket.ts` | WS connection with auto-reconnect (2s delay on non-1000 close) |
| `frontend/src/hooks/useInvestigation.ts` | useReducer — handles all WS events, updates findings/toolLog/summary |
| `frontend/src/components/EvidenceGraph.tsx` | React Flow graph; nodes colored green/amber/red by confidence tier |
| `frontend/src/app/investigation/[id]/page.tsx` | Three-panel dashboard: ToolLog / EvidenceGraph / FindingsSidebar |

## ■■ DATABASE / DATA MODELS
- **EvidenceGraph** (in-memory, per-investigation dict — no DB)
- **Finding**: id, description, confidence (float 0–1), label (FACT/INFERENCE/HYPOTHESIS), sources[], contradictions[], evidence_hash (SHA-256), timestamp, artifact_ref, raw_outputs{}
- **ToolCallRecord**: tool_name, params, output_hash (SHA-256), timestamp, duration_ms, success

Confidence formula:
- Base 0.50 (single source) → +0.20 per corroborating tool (cap 0.95) → -0.25 per contradiction (floor 0.10)
- FACT = confidence ≥ 0.85 AND sources.length ≥ 3

## ■ APIs & INTEGRATIONS
| Service | Purpose | Auth |
|---|---|---|
| Anthropic API | Claude claude-sonnet-4-6 tool_use loop | `ANTHROPIC_API_KEY` |
| SIFT VM (asyncssh) | Execute forensic tools over SSH | SSH key — `SIFT_SSH_KEY_PATH` |

## ■■ ENVIRONMENT VARIABLES
```
ANTHROPIC_API_KEY
SIFT_HOST / SIFT_PORT / SIFT_USER / SIFT_SSH_KEY_PATH
FORENSICIQ_HOST / FORENSICIQ_PORT / CORS_ORIGINS
CLAUDE_MODEL / MAX_TOKENS
MAX_CORRECTION_ITERATIONS / CONFIDENCE_CORRECTION_THRESHOLD
NEXT_PUBLIC_API_URL / NEXT_PUBLIC_WS_URL
```

## ■ ACTIVE WORK & IN-PROGRESS
- [ ] Test all 8 tool wrappers against real SIFT VM (Kingnana — Day 1 priority)
- [ ] SSH key setup from dev machine to SIFT VM
- [ ] Wire real WebSocket to frontend — replace mock data (MystiqueMide)
- [ ] Full integration test: POST start → WS events → findings appear in UI
- [ ] Architecture diagram PNG for submission (docs/)
- [ ] Accuracy report vs known ground truth on SANS sample case
- [ ] 5-minute demo video recording (Day 9)
- [ ] All 8 Devpost submission components (Day 10)

## ■ COMPLETED FEATURES
- Full project scaffold: 54 files across backend, frontend, docs, Docker
- EvidenceGraph engine with deterministic confidence scoring
- All 8 SIFT tool wrappers with SSH executor + security blocklist
- Claude agent with tool_use loop and 3-iteration self-correction
- FastAPI: REST routes + WebSocket ConnectionManager
- Jinja2 HTML report generator with dark-themed template
- All frontend components: EvidenceGraph, ToolLog, FindingCard, FindingsSidebar, PulseIcon, ConfidenceBar
- useWebSocket (auto-reconnect) + useInvestigation (full event reducer)
- Landing page + three-panel investigation dashboard
- Docker Compose, Dockerfiles for both services
- docs/PRD.md, docs/TASKS.md, docs/ARCHITECTURE.md, AGENTS.md, README.md

## ■ KNOWN BUGS / TECH DEBT
- `agent.py:145` — finding description truncated to 300 chars from raw tool output; needs structured extraction
- `next.config.js` rewrite rule only works in dev; production Docker needs a proper reverse proxy (nginx) between frontend and backend
- No auth on any API endpoint — acceptable for hackathon, not production
- `EvidenceGraph` is in-memory only — investigation state lost on backend restart

## ■ KEY DEPENDENCIES
| Package | Version | Why |
|---|---|---|
| anthropic | ≥0.28.0 | Claude tool_use API |
| asyncssh | ≥2.14.0 | Non-blocking SSH to SIFT VM |
| fastapi | ≥0.111.0 | REST + WebSocket API |
| pydantic-settings | ≥2.3.0 | Typed env var config |
| jinja2 | ≥3.1.4 | HTML report templates |
| @xyflow/react | ^12.3.0 | Evidence graph visualization |
| next | 14.2.4 | Frontend framework |
| tailwindcss | ^3.4.4 | Styling |

## ■ IMPORTANT DECISIONS MADE
- **Confidence computed by EvidenceGraph, not Claude** — prevents hallucinated confidence scores; formula is deterministic and auditable
- **Destructive command blocking at tool layer** — `BaseSIFTTool._check_command()` raises `ToolSecurityError` before SSH connects; architectural, not prompt-based (directly targets judging criterion #4)
- **tool_use via Anthropic SDK, not full MCP client-server** — simpler for hackathon, same semantics; MCP server concept is represented by the tool layer architecture
- **In-memory state only** — no DB needed for hackathon scope; each investigation is ephemeral
- **Self-correction capped at 3 iterations** — prevents infinite loops; 3 is sufficient for sample cases

## ■ BRAND IDENTITY (locked)
- **Name:** ForensIQ
- **Tagline:** "Facts, not guesses. Evidence, not vibes."
- **Positioning:** The only DFIR agent that knows what it doesn't know
- **Logo:** Circular reticle — 3 concentric arcs + center dot. `Forens` regular weight, `IQ` semibold teal
- **Colors:** Background `#0A0E1A`, Teal `#00D4B8`, FACT `#10D98A`, INFERENCE `#F0A832`, HYPOTHESIS `#F05060`, Text `#E8EDF7`
- **Fonts:** Inter (UI), JetBrains Mono (logs/hashes/code), Space Grotesk (headings)
- **Mascot:** The "Pulse" — animated reticle SVG with states: idle (slow spin), investigating (fast spin), correcting (amber pulse), complete (steady green), error (red)
- **No traditional cartoon mascot** — audience is serious SANS security professionals
- **Pitch deck:** Dark slides, thin teal accent line, large contrast typography for problem/solution slides

## ■ SESSION LOG
### Session 1 — 2026-06-05
**Hackathon strategy:**
- Analyzed findevil.devpost.com — $22K prize, June 15 deadline, 3,991 participants, Protocol SIFT / MCP framework
- Researched 2 existing strong submissions and identified the gap: no one does confidence quantification
- Evaluated 4 ideas (SentinelTrace, GhostBench, CampaignMind, ForensicNarrator) → selected SentinelTrace / ForensIQ
- Team clarified: 2-person team (MystiqueMide frontend + Kingnana backend)
- Name chosen: **ForensIQ** (from shortlist of ForensIQ / SigmaTrace / VeritasIR / AxiomDF)

**Brand design:**
- Full identity system designed: logo direction, color palette, typography, Pulse icon, landing page layout, pitch deck slide-by-slide direction, image generation prompts
- Brand locked, implementation ready

**Project scaffold (54 files written):**
- Backend: `evidence_graph.py`, `agent.py`, 8 tool wrappers, FastAPI routes, WebSocket manager, Jinja2 report
- Frontend: all 6 components, 2 hooks, landing page, investigation dashboard, types
- Config: Docker Compose, Dockerfiles, pyproject.toml, package.json, Tailwind config, postcss
- Docs: PRD.md, TASKS.md, ARCHITECTURE.md, AGENTS.md, README.md, memory.md
- memory.md reformatted to follow the memory.md skill guide template (■ section headers)
