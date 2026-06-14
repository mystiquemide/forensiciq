# ForensIQ — Build Handoff & Work Log
**Author:** Almond (Kingnanaweb3) — Backend
**Date:** June 14, 2026
**Branch:** `kingnana/corroboration-checkpoint-benchmark`
**Hackathon:** SANS Find Evil! — deadline June 15, 2026

---

## 1. What ForensIQ Is

An autonomous DFIR (Digital Forensics & Incident Response) agent. It drives
SIFT-class forensic tools over SSH, investigates a case without human guidance,
and labels every finding **FACT / INFERENCE / HYPOTHESIS** based on calibrated
confidence computed from multi-tool corroboration — not from the model's own
say-so. This directly attacks the core risk of AI-driven forensics: hallucinated
findings presented as truth.

---

## 2. My Contribution (Backend — ~40%)

The frontend, agent loop, tool wrappers, WebSocket layer, and base confidence
engine were built by my teammate Mide (~80% pre-existing). I added three backend
capabilities that did not exist before and that make the core "confidence"
promise actually function.

### Files I created

| File | Purpose |
|---|---|
| backend/forensiciq/artifacts.py | Regex IOC extractor — pulls IPs, hashes, PIDs, paths, registry keys, executables from raw tool output. Enables corroboration. |
| backend/forensiciq/checkpoint.py | JSON crash-recovery: save/load/list/delete investigation state atomically. Survives mid-run crashes. |
| backend/forensiciq/benchmark.py | Accuracy harness: scores findings vs ground truth — precision / recall / F1 / tier counts. CLI runnable. |
| backend/demo.py | Clean single-command demo runner for the video. |
| backend/tests/test_corroboration.py | 9 tests |
| backend/tests/test_checkpoint.py | 5 tests |
| backend/tests/test_benchmark.py | 3 tests |

### Files I modified

| File | Change |
|---|---|
| backend/forensiciq/evidence_graph.py | Added artifacts field to findings, artifact tracking in add/corroborate, and find_matching_finding() so the agent corroborates instead of duplicating. This is the fix that made confidence actually climb — previously every finding sat at 50% forever. |
| backend/forensiciq/agent.py | On each new tool output, the agent now checks for an existing finding sharing artifacts — corroborates (confidence up) instead of always creating a new finding. Also added optional base_url support for the LLM client. |
| backend/forensiciq/config.py | Added anthropic_base_url setting. |
| backend/.env.example | Placeholder template (no real keys). |

### How it all interacts

    Case data (memory dump / disk image / logs)
      -> Agent (Claude brain) sequences forensic tools over SSH
      -> Tool raw output -> artifacts.py extracts IOCs
      -> EvidenceGraph: same artifact seen by 2+ tools? -> corroborate -> confidence rises
      -> FACT (>=85% + 3 sources) / INFERENCE (>=50%) / HYPOTHESIS
         each finding gets a SHA-256 audit hash
      -> benchmark.py scores it | checkpoint.py can save/restore it

---

## 3. What I Proved (Live End-to-End Run)

A real investigation was executed — agent connected over SSH to live forensic
tools on an Ubuntu workstation, ran them, extracted IOCs, and corroborated
findings.

**Results:**
- 100% recall — every planted IOC found (5/5, zero misses)
- 38.5% precision — 8 benign filesystem paths surfaced as false positives
- F1 = 0.556
- 4 findings, 8 tool calls, 4 corroboration events, 37 logged events
- Corroboration verified live: a finding rose 50% -> 70% via hash_compute

Evidence committed to evidence/:
- investigation_log.json — full execution trace (submission component #8)
- ACCURACY_REPORT.md — submission component #6
- DATASET.md — submission component #5
- benchmark_results.json, sample_ground_truth.json

---

## 4. Environment Setup (for reproducing)

- **Platform:** GitHub Codespaces (x86_64 Ubuntu) — chosen because the dev Mac is
  Apple Silicon, ruling out a local SIFT VirtualBox VM.
- **Forensic tools installed:** sleuthkit, yara, binutils (strings), file,
  regripper via apt; volatility3 via pip.
- **SSH-to-self:** sshd runs on port 2222 in Codespaces (not 22). Key at
  ~/.ssh/sift_key, user codespace. The agent's asyncssh reaches the tools at
  127.0.0.1:2222.
- **.env (gitignored, never committed):**

      ANTHROPIC_API_KEY=<real key>
      CLAUDE_MODEL=claude-sonnet-4-5
      SIFT_HOST=127.0.0.1
      SIFT_PORT=2222
      SIFT_USER=codespace
      SIFT_SSH_KEY_PATH=/home/codespace/.ssh/sift_key
      CORS_ORIGINS=http://localhost:3000

### Run the demo (for the video)

    cd backend && python3 demo.py

Shows the agent choosing tools, creating findings, and corroboration events live.

---

## 5. Key Technical Decisions & Gotchas

- **LLM provider:** Tried OpenRouter first to save cost. OpenRouter's OpenAI-format
  endpoint (/chat/completions) works, but it does NOT support the Anthropic SDK's
  /messages endpoint — the SDK returned a 404 HTML page. Switched to a direct
  Anthropic API key (zero code changes, agent already built for the Anthropic SDK).

- **Branch mismatch:** The Codespace was on main, which lacked my feature files
  (artifacts.py etc.). Findings came back with empty artifacts until I checked out
  my feature branch in the Codespace. Always confirm the running branch.

- **Tool inputs:** SIFT tools expect specific formats. fls/log2timeline need real
  disk images; on a text case they error. strings/file/hash work on any file. The
  agent must be pointed at the file, not the directory.

- **FACT tier not reached** in the sample run: needs >=3 corroborating sources;
  the single-artifact case ran only 2-3 tools per finding. Mechanism is proven;
  it is a tuning parameter, not a defect.

---

## 6. Costs Incurred

| Item | Cost |
|---|---|
| GitHub Codespaces | Free tier (within monthly included hours) |
| Forensic tools (apt/pip) | $0 — open source |
| OpenRouter trial | ~$0 — failed on SDK compat before meaningful spend; key revoked |
| Anthropic API (investigation + tests) | < $1 — a handful of Sonnet calls |
| **Total out-of-pocket** | **Under $1** |

Two API keys were leaked into screenshots/commits during debugging and were
**revoked and replaced**: one OpenRouter key, one Anthropic key. Current key is in
.env only (gitignored). .env.example holds a placeholder. GitHub push protection
caught the leak before it reached the public repo.

---

## 7. Submission Status (8 required components)

| # | Component | Status | Owner |
|---|---|---|---|
| 1 | Code repo (public, MIT) | DONE | — |
| 2 | Demo video (5 min) | TODO | Mide |
| 3 | Architecture diagram | TODO | Mide |
| 4 | Written project description | TODO | Mide |
| 5 | Dataset documentation | DONE — evidence/DATASET.md | Almond |
| 6 | Accuracy report | DONE — evidence/ACCURACY_REPORT.md | Almond |
| 7 | Try-it-out instructions (README) | TODO | Mide |
| 8 | Agent execution logs | DONE — evidence/investigation_log.json | Almond |

---

## 8. What Mide Needs To Do

1. **Merge my PR** (kingnana/corroboration-checkpoint-benchmark) — 25 tests green, CI passing.
2. **Demo video (5 min):** run `cd backend && python3 demo.py` on camera — shows
   findings and confidence climbing 50% -> 70% via corroboration. Narrate the
   FACT/INFERENCE/HYPOTHESIS distinction.
3. **Architecture diagram:** agent -> tool layer -> SIFT tools -> EvidenceGraph.
   Mark the SSH command blocklist as architectural security enforcement (it blocks
   rm/dd/shred/etc. before execution and raises ToolSecurityError) — this is
   enforced in code, not prompt, and judges score that.
4. **Devpost write-up:** headline = the corroboration engine (confidence grounded
   in cross-tool agreement, not model assertion). Cover what it does, how built,
   challenges, what's next.
5. **README try-it-out section:** local setup steps.
6. **Fix the README:** it currently lists "Splunk integration" under my name —
   that's a copy-paste error from a different project. Should read: corroboration
   engine / checkpoint recovery / accuracy benchmarking.

---

## 9. Honest "What's Next" (good for Devpost — judges reward documented limits)

- **Precision filter:** add a system-path allowlist to drop benign filesystem
  paths (the main false-positive source) — would lift precision well above 38%.
- **Richer corroboration:** run more independent tools per artifact so findings
  reach the FACT tier.
- **Real SANS images:** swap the synthetic case for the SANS starter images on a
  full SIFT workstation (architecture is already image-agnostic).
- **MCP tool wrappers:** formalize the tool layer as MCP servers for portability.
