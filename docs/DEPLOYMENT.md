# Deployment

## Prerequisites

- Docker 24+ and Docker Compose v2
- SIFT Workstation VM running and reachable over SSH (VirtualBox host-only network recommended: `192.168.56.101`)
- SSH key pair configured for the SIFT VM (read-only credentials)
- Anthropic API key

## Docker Compose (recommended)

```bash
git clone https://github.com/mystiquemide/forensiciq.git
cd forensiciq
cp .env.example .env
# Edit .env - minimum required: ANTHROPIC_API_KEY, SIFT_HOST, SIFT_USER, SIFT_SSH_KEY_PATH
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API docs: `http://localhost:8000/docs`

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic API key |
| `SIFT_HOST` | Yes | - | SIFT VM IP or hostname |
| `SIFT_PORT` | No | 22 | SSH port |
| `SIFT_USER` | Yes | - | SSH username on SIFT VM |
| `SIFT_SSH_KEY_PATH` | Yes | - | Path to SSH private key |
| `FORENSICIQ_HOST` | No | 0.0.0.0 | Backend bind host |
| `FORENSICIQ_PORT` | No | 8000 | Backend port |
| `CORS_ORIGINS` | No | * | Comma-separated allowed origins |
| `CLAUDE_MODEL` | No | claude-sonnet-4-6 | Claude model ID |
| `MAX_TOKENS` | No | 4096 | Max tokens per agent call |
| `MAX_CORRECTION_ITERATIONS` | No | 3 | Self-correction passes |
| `NEXT_PUBLIC_API_URL` | No | http://localhost:8000 | Backend URL (frontend) |
| `NEXT_PUBLIC_WS_URL` | No | ws://localhost:8000 | WebSocket URL (frontend) |

## SSH Key Setup

Generate a key pair and copy the public key to the SIFT VM:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/sift_id_rsa -C "forensiciq-agent"
ssh-copy-id -i ~/.ssh/sift_id_rsa.pub sansforensics@<SIFT_HOST>
```

Set `SIFT_SSH_KEY_PATH=~/.ssh/sift_id_rsa` in your `.env`.

## Development Mode (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
# http://localhost:3001
```

## Vercel Deployment (frontend only)

The `vercel.json` at repo root tells Vercel to use `frontend/` as the root directory.

1. Connect the repo to Vercel
2. Vercel auto-detects Next.js from `vercel.json`
3. Set these environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` - your backend URL (Railway, VPS, or tunnel)
   - `NEXT_PUBLIC_WS_URL` - your backend WebSocket URL

The backend must run separately. Vercel only hosts the frontend.

## Post-deploy Verification

```bash
# Backend health
curl http://localhost:8000/health

# Start an investigation
curl -X POST http://localhost:8000/api/investigation/start \
  -H "Content-Type: application/json" \
  -d '{"case_path": "/cases/test"}'
```

## Troubleshooting

**SSH connection refused**
- Check `SIFT_HOST` and `SIFT_PORT` are correct
- Confirm the SSH key is copied to the SIFT VM (`ssh-copy-id`)
- Test manually: `ssh -i ~/.ssh/sift_id_rsa sansforensics@<SIFT_HOST>`

**CORS error in browser**
- Set `CORS_ORIGINS` to include your frontend origin (e.g. `http://localhost:3001`)
- In Docker, the compose file handles this automatically

**WebSocket connection fails**
- Confirm `NEXT_PUBLIC_WS_URL` matches the backend host and port
- Check the backend is running and `FORENSICIQ_PORT` matches

**Claude API rate limit**
- Reduce `MAX_TOKENS` or add retry logic in `agent.py`
- Check your Anthropic usage tier at console.anthropic.com
