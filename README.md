# ForensIQ

**Facts, not guesses. Evidence, not vibes.**

The only DFIR agent that knows what it doesn't know. Every forensic finding is labeled **FACT**, **INFERENCE**, or **HYPOTHESIS** — backed by calibrated confidence scores from multi-tool corroboration.

Built for the [SANS Find Evil! Hackathon](https://findevil.devpost.com) · June 2026

---

## Confidence Tiers

| Label | Confidence | Condition |
|-------|-----------|-----------|
| **FACT** | ≥ 85% | 3+ tools corroborate, no contradictions |
| **INFERENCE** | 50–84% | 1–2 tools agree |
| **HYPOTHESIS** | < 50% | Single signal or contradictions exist |

---

## Quick Start

### Prerequisites
- SIFT Workstation VM running (VirtualBox, accessible via SSH)
- SSH key configured for the SIFT VM
- Anthropic API key

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and SIFT VM details
```

### 2. Start with Docker Compose

```bash
docker compose up
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000/docs

### 3. Run in development

**Backend:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # fill in your values
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## Architecture

```
Web UI (Next.js + React Flow)
       ↕ REST + WebSocket
FastAPI Backend + Claude Agent
       ↕ asyncssh
SIFT Workstation VM (Ubuntu)
```

The Claude agent drives the investigation via tool_use. Each tool executes on the SIFT VM over SSH. The MCP tool layer physically blocks destructive commands (`rm`, `dd`, `shred`, etc.) — this is enforced in code, not prompts.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full details.

---

## Submission Components

- [x] Public GitHub repo (MIT license)
- [ ] Demo video (5 min)
- [ ] Architecture diagram
- [ ] Devpost project description
- [ ] Dataset documentation
- [ ] Accuracy report
- [ ] Try-it-out instructions
- [ ] Agent execution logs

---

## Team

- **MystiqueMide** — Frontend, DevOps, documentation, demo
- **Kingnana** — Backend, Claude agent, MCP tools, evidence engine

---

## License

MIT
