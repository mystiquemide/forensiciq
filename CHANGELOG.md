# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-14

### Added

- Corroboration engine (`artifacts.py`): deterministic artifact extraction and cross-tool matching. When two tool outputs reference the same IP, PID, hash, path, registry key, domain, or executable, the finding is automatically corroborated and confidence rises without LLM involvement.
- Checkpoint recovery (`checkpoint.py`): investigation state is written to disk atomically after every `finding_new` and `finding_updated` event. Backend restart mid-investigation does not lose findings. Checkpoint is deleted on clean completion.
- `POST /api/investigation/resume/{id}` endpoint: restores graph state from checkpoint and continues the investigation.
- `GET /api/checkpoints` endpoint: lists all resumable investigations with status, case path, findings count, and save timestamp.
- `DELETE /api/checkpoint/{id}` endpoint: clears a checkpoint manually.
- Accuracy benchmarking CLI (`benchmark.py`): scores agent findings against a ground truth JSON file, producing precision, recall, F1, TP/FP/FN, and a confidence tier breakdown.
- `EvidenceGraph.from_dict()`: restores a full graph from serialized state for checkpoint recovery and offline scoring.
- `finding_updated` WebSocket event now fires when a finding is corroborated, so confidence changes propagate to the UI in real time.
- Elapsed timer now starts correctly on first `tool_start` event.
- Export report now returns an HTML response directly (previously returned `{"html": "..."}` JSON).
- Evidence directory with benchmark results, accuracy report, dataset documentation, and a full investigation log from a real run.

### Fixed

- `finding_corroborated` backend event was silently dropped by the frontend handler. Renamed to `finding_updated` to match the existing handler.
- Report export opened a JSON payload in the browser tab instead of rendered HTML.
- Investigation status stayed `"starting"` throughout the investigation. Now transitions to `"running"` on first tool event so the elapsed timer starts.

## [0.1.0] - 2026-06-06

### Added

- Landing page: preloader boot sequence, hero with animated reticle, confidence tier explainer, mock investigation feed, features section, how-it-works steps, security guardrails callout, FAQ accordion, footer
- Investigation dashboard: three-panel layout (Tool Log, Evidence Graph, Findings Sidebar), mobile tab switcher, WebSocket streaming, cross-panel source linking, audit timeline
- InvestigationModal with animated radar background for case path submission
- FastAPI backend: Claude tool_use agent loop with three-pass self-correction
- EvidenceGraph: deterministic confidence scoring engine (FACT / INFERENCE / HYPOTHESIS tiers)
- Eight SIFT tool wrappers over asyncssh: Volatility, RegRipper, log2timeline, YARA, Sleuth Kit, strings, file identification, hash computation
- SHA-256 hash of every tool output before LLM processing
- Jinja2 HTML report generation with full cryptographic audit trail
- CI workflow: parallel frontend (lint, typecheck, build) and backend (ruff, pytest) jobs
- CodeQL security analysis for TypeScript and Python
- Dependabot for npm, pip, and GitHub Actions dependency updates
- Docker Compose deployment with backend and frontend services
