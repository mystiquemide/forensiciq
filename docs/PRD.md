# ForensIQ — Product Requirements Document

## Overview

ForensIQ is an autonomous DFIR (Digital Forensics and Incident Response) agent built on the SANS SIFT Workstation and Protocol SIFT / MCP framework. Unlike every existing submission, ForensIQ quantifies uncertainty: every forensic finding is labeled FACT, INFERENCE, or HYPOTHESIS based on calibrated confidence scoring derived from multi-tool corroboration.

**Hackathon:** SANS Find Evil! (findevil.devpost.com)
**Deadline:** June 15, 2026
**Prize:** $10,000 first place

---

## User Roles

| Role | Description |
|------|-------------|
| DFIR Analyst | Loads case data, monitors live investigation, reviews findings |
| SOC Lead | Reviews final report, exports to PDF, makes triage decisions |
| SANS Judge | Evaluates autonomous execution quality, accuracy, and audit trail |

---

## Core Features (MVP)

### F1 — Investigation Start
- Analyst provides a path to case data on the SIFT VM
- Backend starts investigation as a background task
- Frontend redirects to live dashboard
- **Acceptance:** `POST /api/investigation/start` returns `investigation_id` within 2 seconds

### F2 — Live Evidence Graph
- React Flow visualization of all findings as nodes
- Node color = confidence tier (green/amber/red)
- Node size proportional to confidence
- Edges connect findings that share corroborating tools
- Updates in real time via WebSocket
- **Acceptance:** New finding appears on graph within 500ms of `finding_new` event

### F3 — Confidence Scoring Engine
- Each finding starts at 50% confidence (single source)
- Each additional corroborating tool adds 20% (capped at 95%)
- Each contradicting tool removes 25% (floor at 10%)
- FACT: ≥85% AND 3+ sources; INFERENCE: 50-84%; HYPOTHESIS: <50%
- **Acceptance:** Running two tools that agree on a finding elevates it from INFERENCE to 70% confidence

### F4 — Self-Correction Loop
- After each tool completes, agent reviews all findings with confidence < 70%
- Agent selects the best corroborating tool for each low-confidence finding and re-runs it
- Maximum 3 correction iterations per investigation
- Self-correction events broadcast via WebSocket and visible in tool log
- **Acceptance:** A finding at 54% confidence triggers at least one re-run

### F5 — Cryptographic Audit Trail
- Every tool call: SHA-256 of raw output + timestamp + tool name stored in EvidenceGraph
- Every finding: SHA-256 evidence_hash links it to the tool output that created it
- Final report exposes full audit trail
- **Acceptance:** Every finding in the report has a SHA-256 hash; every tool call has an output hash

### F6 — Structured Report
- HTML report with sections: FACTS, INFERENCES, HYPOTHESES, Audit Trail
- Each finding shows: confidence score, label, sources, contradictions, hash
- Accessible at `GET /api/report/{id}` when investigation is complete
- **Acceptance:** Report renders correctly and includes all three tiers

### F7 — Tool Log (Real-Time)
- Left panel displays live tool execution feed in monospace font
- Shows: tool name, status (running/complete/error), duration, SHA-256 snippet
- Self-correction events highlighted in amber
- **Acceptance:** Tool log updates within 200ms of tool_start WebSocket event

---

## Out of Scope (MVP)

- User authentication / API keys in the UI
- Persistence layer / database (in-memory only)
- Multi-case comparison
- MITRE ATT&CK mapping (nice-to-have, not required)
- Live endpoint analysis (nice-to-have)
- Real-time collaboration / multi-user

---

## KPIs

| Metric | Target |
|--------|--------|
| End-to-end investigation time | < 3 minutes on sample case |
| Finding accuracy vs ground truth | > 80% precision |
| Self-correction rate | At least 1 correction per investigation |
| Findings per investigation | ≥ 5 |
| Docker Compose startup | < 60 seconds |

---

## Acceptance Criteria Summary

- [ ] Investigation starts from a SIFT VM case path with one HTTP call
- [ ] Evidence graph populates in real time
- [ ] At least one self-correction visible in the tool log
- [ ] Final report shows FACT/INFERENCE/HYPOTHESIS labeled findings with hashes
- [ ] `docker compose up` produces a working system
