<!-- ForensIQ is built by MystiqueMide and Kingnanaweb3 for hackathon submission review. -->

# ForensIQ

**Facts, not guesses. Evidence, not vibes.**

ForensIQ is a confidence-calibrated DFIR agent that labels every finding as **FACT**, **INFERENCE**, or **HYPOTHESIS** using deterministic multi-tool evidence scoring, cryptographic output hashes, and a self-correction loop. Built for the [SANS Find Evil! Hackathon](https://findevil.devpost.com), June 2026.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/mystiquemide/forensiciq/actions/workflows/ci.yml/badge.svg)](https://github.com/mystiquemide/forensiciq/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python 3.11](https://img.shields.io/badge/python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)

Most DFIR tools return a flat list of findings and leave the analyst to guess which ones are solid. ForensIQ makes the evidentiary weight explicit. Every finding carries a deterministic confidence tier backed by corroborating tool output, contradictions, and a hashable audit trail.

## Product Screens

### Landing page
![ForensIQ landing page](docs/assets/product-screens/landing.png)

### Investigation dashboard
![ForensIQ investigation dashboard](docs/assets/product-screens/dashboard.png)

## Why this exists

Incident responders need speed, but blind automation can be dangerous. ForensIQ keeps the agent useful without pretending every output is equally true. It separates confirmed facts from lower-confidence hypotheses so a reviewer can act quickly without losing chain-of-custody discipline.

## Team

- **MystiqueMide** - Frontend, product direction, repo polish, demo flow, submission
- **Kingnanaweb3** - Backend, API, Splunk integration

## Confidence Tiers

| Tier | Threshold | Meaning |
|---|---|---|
| **FACT** | >= 85% confidence, 3+ independent sources | Multiple tools confirmed this. High evidential weight. |
| **INFERENCE** | >= 50% confidence, 1-2 sources | Corroborated but not fully confirmed. Review before acting. |
| **HYPOTHESIS** | < 50% confidence | Single source, low confidence. Do not rely on this finding. |

The scoring is deterministic: base `0.50`, `+0.20` per corroborating tool capped at `0.95`, and `-0.25` per contradiction floored at `0.10`. No black-box LLM confidence numbers.

## Features

- **Calibrated Confidence Scoring** - Every finding starts at 50% and adjusts through deterministic corroboration and contradiction rules.
- **Live Evidence Graph** - Findings render as nodes in a React Flow graph, colored by confidence tier in real time.
- **8 SIFT Tool Wrappers** - Volatility, RegRipper, log2timeline, YARA, Sleuth Kit, strings, file identification, and hash computation.
- **Self-Correction Loop** - Findings below the confidence threshold trigger targeted corroboration attempts.
- **Cryptographic Audit Trail** - Every tool call records a SHA-256 hash of raw output for verifiable review.
- **Structured HTML Report** - Exports FACT, INFERENCE, and HYPOTHESIS sections with the full audit trail.

## Architecture

```text
Web UI (Next.js 16 + React Flow + WebSocket)
           REST + WebSocket
FastAPI backend + Claude agent tool loop
           asyncssh with read-only credentials
SIFT Workstation VM (Ubuntu)
```

- **Agent layer** (`backend/forensiciq/agent.py`) drives investigation and self-correction passes.
- **Confidence engine** (`backend/forensiciq/evidence_graph.py`) handles deterministic scoring and summary counts.
- **Tool layer** (`backend/forensiciq/tools/`) wraps SIFT/DFIR tools behind a security blocklist.
- **API layer** (`backend/forensiciq/api/`) exposes REST endpoints and investigation WebSocket events.
- **Frontend** (`frontend/`) provides the launch page, investigation dashboard, product screens, and live graph UI.

Full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- SIFT Workstation VM reachable over SSH
- Anthropic API key

### Docker Compose, recommended

```bash
git clone https://github.com/mystiquemide/forensiciq.git
cd forensiciq
cp .env.example .env
# Edit .env with ANTHROPIC_API_KEY, SIFT_HOST, SIFT_USER, and SIFT_SSH_KEY_PATH
docker compose up --build
```

Frontend: `http://localhost:3000`
Backend API docs: `http://localhost:8000/docs`

### Development mode

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn main:app --reload --port 8000

# Frontend, separate terminal
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend dev server: `http://localhost:3001`

## Environment Variables

| Variable | Required | Description |
|---|---:|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for the agent runtime |
| `SIFT_HOST` | Yes | IP or hostname of the SIFT VM |
| `SIFT_PORT` | No | SSH port, default `22` |
| `SIFT_USER` | Yes | SSH username on the SIFT VM |
| `SIFT_SSH_KEY_PATH` | Yes | Path to the SSH private key |
| `FORENSICIQ_HOST` | No | Backend bind host, default `0.0.0.0` |
| `FORENSICIQ_PORT` | No | Backend port, default `8000` |
| `CORS_ORIGINS` | No | Comma-separated allowed frontend origins |
| `CLAUDE_MODEL` | No | Claude model ID |
| `MAX_TOKENS` | No | Max tokens per agent call |
| `MAX_CORRECTION_ITERATIONS` | No | Self-correction passes |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for frontend |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL for frontend |

Use `.env.example`, `backend/.env.example`, and `frontend/.env.local.example` as safe templates. They contain placeholders only.

## API Contract

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/investigation/start` | Start an investigation for a case path |
| `GET` | `/api/investigation/{id}` | Fetch investigation state |
| `GET` | `/api/report/{id}` | Fetch generated HTML report after completion |
| `WS` | `/api/ws/investigation/{id}` | Stream investigation events to the frontend |

Start request:

```json
{
  "case_path": "/cases/test"
}
```

Start response:

```json
{
  "investigation_id": "uuid"
}
```

## Scripts

```bash
# Frontend
cd frontend
npm run dev        # development server
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit

# Backend
cd backend
ruff check .       # linting
pytest tests/ -v   # tests
```

## What to test

- Start the backend and confirm `GET http://localhost:8000/api/health` returns `{ "ok": true }`.
- Start the frontend and confirm the landing page loads at `http://localhost:3001`.
- Submit or simulate an investigation and confirm the dashboard receives WebSocket events.
- Confirm the evidence graph separates FACT, INFERENCE, and HYPOTHESIS findings.
- Confirm report generation works after an investigation completes or errors.
- Run `npm run lint`, `npm run typecheck`, `npm run build`, `ruff check .`, and `pytest tests/ -v` before submitting.

## Verification Status

Current local verification for this branch:

- Frontend lint: passing
- Frontend type-check: passing
- Frontend production build: passing
- Backend lint/tests: covered by the separate backend CI fix PR
- Supply-chain IOC scan: no affected package or persistence IOC hits found

## Repository Layout

```text
forensiciq/
├── backend/
│   ├── main.py
│   └── forensiciq/
│       ├── agent.py
│       ├── evidence_graph.py
│       ├── tools/
│       ├── api/
│       └── report/
├── frontend/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       └── types/
├── docs/
│   ├── assets/product-screens/
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── PRD.md
│   └── TASKS.md
├── docker-compose.yml
├── AGENTS.md
└── .env.example
```

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Submission Notes

For hackathon judging, include this repo URL, the demo URL if deployed, product screens, a short demo video, and a short explanation of how the confidence tiers are produced. Make the SIFT VM setup clear if judges need to reproduce the backend locally.

## License

MIT. See [LICENSE](LICENSE).
