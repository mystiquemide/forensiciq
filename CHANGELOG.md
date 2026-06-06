# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-06

### Added

- Landing page: preloader boot sequence, hero with animated reticle, confidence tier explainer, mock investigation feed, features, how it works, security guardrails, FAQ, footer
- Investigation dashboard: 3-panel layout (Tool Log, Evidence Graph, Findings Sidebar), mobile tab switcher, WebSocket streaming, cross-panel source linking
- Investigations list page with status badges, dates, durations, and finding counts
- AuditTimeline with deterministic SHA-256 run hash and merged tool/finding event log
- InvestigationModal with animated radar background
- FastAPI backend: Claude tool_use agent loop with 3-pass self-correction
- EvidenceGraph: deterministic confidence scoring engine (FACT, INFERENCE, HYPOTHESIS)
- 8 SIFT tool wrappers over asyncssh: Volatility, RegRipper, log2timeline, YARA, Sleuth Kit, strings, file identification, hash computation
- SHA-256 hash of every tool output before LLM processing
- Jinja2 HTML report generation with full cryptographic audit trail
- CI workflow: parallel frontend (lint, typecheck, build) and backend (ruff, mypy, pytest) jobs
- CodeQL security analysis for TypeScript and Python
- Dependabot for npm, pip, and GitHub Actions dependency updates
- Docker Compose deployment with backend and frontend services
