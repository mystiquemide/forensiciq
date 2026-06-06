# Contributing to ForensIQ

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker 24+ and Docker Compose v2
- A SIFT Workstation VM accessible over SSH
- An Anthropic API key

## Setup

```bash
git clone https://github.com/mystiquemide/forensiciq.git
cd forensiciq
cp .env.example .env
# Edit .env with your credentials
docker compose up --build
```

## Development workflow

**Backend** (port 8000):
```bash
cd backend
pip install -e ".[dev]"
cp .env.example .env
uvicorn main:app --reload --port 8000
```

**Frontend** (port 3001):
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Checks before opening a PR

Run all of these and make sure they pass:

```bash
# Frontend
cd frontend
npm run lint
npm run typecheck

# Backend
cd backend
ruff check .
mypy forensiciq/
pytest tests/ -v
```

## PR process

- Branch from `main` with a descriptive name
- Keep the PR focused on one thing
- One reviewer required before merge
- CI must pass before merge

## Architecture conventions

See [AGENTS.md](AGENTS.md) for tool-layer rules, security boundaries, naming conventions, and what the agent is and is not allowed to do.

## Hard rules

- Never commit `.env`, `.env.local`, or any file containing real credentials
- Never commit SSH private keys or passphrases
- Never commit case data, disk images, memory dumps, or evidence files (`backend/case_data/`, `backend/evidence/` are gitignored)
- Never add arbitrary shell execution paths to the agent tool registry
