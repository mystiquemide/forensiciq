# ForensIQ — Task List

Legend: S = small (<2h) · M = medium (2-4h) · L = large (4-8h) · [K] = Kingnana · [M] = MystiqueMide

---

## Phase 1: Setup (Days 1-2)

- [x] [M] Create GitHub repo, branch strategy, set MIT license — S
- [x] [M] Scaffold frontend (Next.js + Tailwind + React Flow) — S
- [x] [K] Scaffold backend (FastAPI + pyproject.toml + Dockerfile) — S
- [ ] [K] Download and boot SIFT Workstation VM in VirtualBox — M
- [ ] [K] Verify all 8 SIFT tools respond on the VM (vol, log2timeline, etc.) — M
- [ ] [K] Set up SSH key auth from dev machine to SIFT VM — S
- [ ] [K] Set up Protocol SIFT on the VM — S
- [ ] [M] Deploy mock WebSocket server for frontend development — S

## Phase 2: Backend Core (Days 3-4)

- [x] [K] `EvidenceGraph` class with confidence scoring — M
- [x] [K] `BaseSIFTTool` with SSH executor and security blocklist — M
- [x] [K] MCP tool: `log2timeline` (plaso super-timeline) — S
- [x] [K] MCP tool: `memory_analyze` (Volatility — pslist/netscan/malfind) — S
- [x] [K] MCP tool: `registry_extract` (RegRipper) — S
- [x] [K] MCP tool: `filesystem_list` (Sleuth Kit fls) — S
- [x] [K] MCP tool: `malware_scan` (YARA) — S
- [x] [K] MCP tool: `string_extract` (strings) — S
- [x] [K] MCP tool: `file_identify` (file + exiftool) — S
- [x] [K] MCP tool: `hash_compute` (md5/sha1/sha256) — S
- [ ] [K] Test each tool against real SIFT VM — M

## Phase 3: Agent + API (Days 5-6)

- [x] [K] `ForensIQAgent` with full Claude tool_use loop — L
- [x] [K] Self-correction loop (review low-confidence findings after each iteration) — M
- [x] [K] `ConnectionManager` for WebSocket broadcasting — S
- [x] [K] FastAPI routes: start, status, report, health — M
- [x] [K] WebSocket endpoint with reconnection handling — S
- [ ] [K] Wire agent broadcast to WebSocket manager — S
- [ ] [K] Integration test: start investigation → receives events end-to-end — M

## Phase 4: Frontend (Days 3-6 parallel)

- [x] [M] `PulseIcon` animated status component — S
- [x] [M] `ConfidenceBar` with label badge — S
- [x] [M] `FindingCard` with expandable details — S
- [x] [M] `ToolLog` with real-time scroll — S
- [x] [M] `FindingsSidebar` with FACT/INFERENCE/HYPOTHESIS filter — M
- [x] [M] `EvidenceGraph` (React Flow nodes colored by confidence tier) — M
- [x] [M] `useWebSocket` hook with auto-reconnect — S
- [x] [M] `useInvestigation` reducer with all event handlers — M
- [x] [M] Landing page with case path input — S
- [x] [M] Investigation dashboard (three-panel layout) — M
- [ ] [M] Hook WebSocket to real backend (replace mock) — S
- [ ] [M] Export report button → opens `/api/report/:id` — S
- [ ] [M] Add `postcss.config.js` for Tailwind — S

## Phase 5: Report + Polish (Days 7-8)

- [x] [K] Jinja2 HTML report template — M
- [x] [K] Report generator (FACT/INFERENCE/HYPOTHESIS sections + audit trail) — S
- [ ] [K] Add PDF export via weasyprint — S
- [ ] [M] Add investigation history list to landing page — S
- [ ] [M] Responsive layout for 1080p+ screens — S
- [ ] [M] Architecture diagram (draw.io / Excalidraw → PNG in docs/) — M

## Phase 6: Demo + Submission (Days 9-10)

- [ ] [K+M] Run full investigation on SANS sample case data — M
- [ ] [K] Generate accuracy report vs known ground truth — M
- [ ] [M] Record 5-minute demo video — L
- [ ] [M] Write Devpost project description — M
- [ ] [M] Dataset documentation (which case data, reproducibility) — S
- [ ] [M] Final README with one-command Docker setup — S
- [ ] [M] Tag v1.0.0 release on GitHub — S
- [ ] [M] Submit all 8 required components on Devpost — S
