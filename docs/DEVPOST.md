# ForensIQ — Devpost Submission

## Inspiration

Every DFIR tool gives you a list of findings. None of them tell you how confident to be. An analyst ends up treating a "maybe this is malware" flag the same as a confirmed C2 beacon because the tool doesn't distinguish them. We wanted to build an agent that thinks like a senior analyst: sequence the evidence, recognize when something doesn't add up, dig deeper, and only commit to a conclusion when the evidence actually supports it.

The specific insight: if you let the model assign its own confidence, it will be confidently wrong. The only way to get calibrated confidence is to compute it from what the tools actually found, across multiple independent runs, deterministically.

## What it does

ForensIQ is an autonomous DFIR agent that investigates digital evidence on a SIFT Workstation over SSH. You point it at a case path. It sequences forensic tools, extracts indicators of compromise, and labels every finding with one of three tiers:

- **FACT** — three or more independent tools corroborated the same concrete artifact, confidence at or above 85%. Act on this.
- **INFERENCE** — two tools agree, confidence between 50% and 84%. Investigate further.
- **HYPOTHESIS** — single source, below 50%. Do not rely on this without corroboration.

The label is computed deterministically by the corroboration engine, not reported by the language model. The model cannot inflate its own confidence score.

The self-correction loop fires automatically after each tool batch: any finding below 70% confidence triggers a targeted re-run, choosing the best corroborating tool from the available set. This repeats for up to three passes. The agent corrects itself without human prompting.

Every tool execution is SHA-256 hashed. Every finding links back to the hash of the exact tool output that produced it. The full execution trace — with timestamps and token counts per LLM call — is preserved in a structured log. The chain of custody is verifiable.

## How we built it

**Backend (Python 3.11 / FastAPI):**

The corroboration engine is the core of the system. It uses deterministic regex extraction to pull typed artifact tokens (IP addresses, process IDs, hashes, file paths, registry keys, executables, domains) from raw SIFT tool output. When two tool outputs share a typed artifact token, they are treated as describing the same underlying event. The EvidenceGraph corroborates the existing finding rather than creating a duplicate, and confidence climbs according to a fixed formula: base 50%, +20% per corroborating source, capped at 95%, -25% per contradiction, floor 10%. No LLM involvement at any stage of the scoring.

Eight SIFT tool wrappers drive the analysis: log2timeline, Volatility 3, RegRipper, SleuthKit, YARA, strings, file/exiftool, and sha256/md5sum. Each wrapper executes over asyncssh with a command blocklist enforced before any SSH connection is made.

The security boundary is architectural. `BaseSIFTTool._check_command()` raises `ToolSecurityError` before execution if the command matches the destructive blocklist (`rm`, `dd`, `shred`, `mkfs`, `fdisk`, `chmod`, `chown`, `truncate`, `>`, `sudo rm`, and chained variants). The agent cannot bypass this by rephrasing instructions or injecting content through case data. It is enforced in code, not in a prompt.

Checkpoint recovery saves investigation state atomically (`.json.tmp` → `.json`) after every finding event, so an interrupted investigation can be resumed without re-running completed tool executions.

**Frontend (Next.js 15 / React Flow):**

The investigation dashboard streams live events over WebSocket. Tool executions appear in a real-time log panel as they happen. Findings appear in a sidebar with their current confidence tier, updating live as corroboration fires. The evidence graph renders findings as nodes colored by tier (green for FACT, amber for INFERENCE, red for HYPOTHESIS), with edges connecting corroborated findings. An audit timeline records every significant event with timestamps.

## Challenges we ran into

**Calibrated confidence without LLM self-reporting.** The obvious approach is to ask the model how confident it is. The problem is the model is systematically overconfident on cases it has pattern-matched but not actually verified. We had to design a system where the model's opinion of its own confidence is irrelevant — what matters is whether independent tools found the same thing.

**Precision vs. recall tradeoff in artifact extraction.** The first version of the extractor treated every well-formed filesystem path in tool output as a potential IOC. This produced 100% recall (every planted indicator was found) at 38.5% precision (8 false positives from tool working paths like `/tmp/forensiciq_timeline.csv` and `/opt/yara-rules`). The fix was a noise filter for known system paths and loopback IPs. Honest false-positive analysis is in the accuracy report — we'd rather document the weakness than hide it.

**Tool failure on real forensic input.** Several SIFT tools require a formatted disk image or memory dump — they produce "command not found" or parsing errors against arbitrary input. We added detection logic to distinguish tool failures from findings: when a tool returns error output, the agent gets a `TOOL_UNAVAILABLE` signal and moves to the next tool rather than treating the error message as evidence.

**WebSocket event contract alignment.** The frontend and backend independently defined the event types. The `finding_corroborated` event type the backend emitted had no handler in the frontend. We mapped the full event contract, found the mismatch, and standardized on `finding_updated` for both corroboration and new findings.

## Accomplishments we're proud of

The FACT tier actually fires in a live run. When three independent tools — `hash_compute`, `string_extract`, and `file_identify` — all surface the same executable artifact from a multi-file case, confidence climbs from 50% to 70% to 90%, crosses the FACT threshold, and the node in the evidence graph turns green. That sequence, happening automatically without human intervention and computed from actual tool agreement rather than model assertion, is the whole point of the project. It works.

The security boundary is genuinely architectural. Judges can grep the codebase: there is no prompt that says "don't run destructive commands." The enforcement is in `tools/base.py`, and `test_security.py` has 19 parametrized test cases that prove it, including chained command injection attempts. This is closer to what a production DFIR tool needs than a safety prompt.

## What we learned

Deterministic systems are harder to build than LLM-based ones, and worth it. Asking the model to do everything — including scoring its own confidence — is the fast path but it breaks the one thing DFIR analysts actually need: trust in the output. Once you commit to computing confidence from tool agreement rather than model assertion, you have to build a real extraction and corroboration engine. That engineering work is what makes the system trustworthy.

Self-correction is not a prompt technique. The self-correction loop works because it has a specific definition of "needs correction" (any finding below 70% confidence after the first pass), a specific action (select and re-run the best corroborating tool for that finding), and a budget (three passes). Vague instructions to "check your work" do not produce measurable behavior. Specific criteria do.

## What's next

- **Precision filter:** a system-path allowlist to drop benign forensic tool working paths from artifact extraction. Would push precision well above 38%.
- **Richer corroboration:** longer tool budgets and more independent tool wrappers per artifact type, so findings reach FACT tier on more case types.
- **Real SANS images:** the architecture is image-agnostic. Running against SANS starter disk and memory images on a full SIFT Workstation is the next validation step.
- **MCP tool wrappers:** formalizing the tool layer as typed MCP server functions for stronger architectural enforcement and portability across forensic environments.
- **Deployed instance:** a public demo with a pre-loaded sample case so evaluators don't need a SIFT VM to see the agent run.
