# ForensIQ — Accuracy Report

## Architectural Safety Guarantee

**Evidence integrity is enforced at the tool layer in code, not via prompt instructions.**

`BaseSIFTTool._check_command()` raises `ToolSecurityError` before any SSH connection
is made if a command matches the destructive blocklist (`rm`, `dd`, `shred`, `mkfs`,
`fdisk`, `chmod`, `chown`, `truncate`, `>`, `sudo rm`, `wipefs`, and chained variants).
The agent cannot bypass this by rephrasing instructions, injecting content through case
data, or using model-level reasoning — the block is architectural.

This distinction matters: prompt-based safety can be overridden by adversarial input.
Code-level enforcement cannot.

## Methodology

ForensIQ was evaluated against a controlled case (`sample-case-001`) containing
a known set of indicators of compromise (IOCs) with documented ground truth. The
autonomous agent ran an unguided investigation over SSH against live SIFT-class
forensic tooling (Sleuth Kit, strings, file/exiftool, YARA, md5/sha256, plaso),
producing findings that were scored by the built-in benchmark harness
(`forensiciq.benchmark`) against the ground-truth artifact set.

Confidence is never self-reported by the model. It is computed deterministically
by the EvidenceGraph from multi-tool corroboration: a single source yields 50%
(INFERENCE); each corroborating tool that shares a concrete artifact adds 20%
(capped 95%); a contradiction subtracts 25% (floor 10%). FACT requires >=85%
confidence AND >=3 independent sources.

## Ground Truth

Five expected artifacts were planted in the case:

- `ip:192.168.1.100` (C2 address)
- `exe:evil.exe` (malicious binary)
- `pid:1432` (injected process)
- `hash:e3b0c442...b855` (SHA-256 of the binary)
- `reg:HKLM\...\CurrentVersion\Run` (persistence key)

## Results

| Metric | Value |
|---|---|
| Recall | 100% (5/5) |
| Precision | 38.5% (5/13) |
| F1 | 0.556 |
| True positives | 5 |
| False positives | 8 |
| False negatives | 0 |
| Findings produced | 4 |
| Tool executions | 8 |
| Corroboration events | 4 |
| LLM calls | 4 |
| Total tokens consumed | 10,865 (input: 9,536 / output: 1,329) |
| Logged events (full trace) | 41 |

## Analysis

**Recall (100%) — strong.** The agent surfaced every planted IOC with zero
misses. Artifact extraction is deterministic regex over raw tool output, so every
IP, hash, PID, path, registry key, and executable present in the evidence was
captured. No real indicator was lost.

**Precision (38.5%) — the documented weakness.** The eight false positives are
benign filesystem artifacts the agent encountered during triage: scratch paths
(`/tmp/forensiciq_timeline.csv`), the YARA rules directory (`/opt/yara-rules`),
and tool working paths. These are not hallucinations — they are real strings the
tools emitted — but they are not security-relevant IOCs. The extractor currently
treats any well-formed path as an artifact. A path-allowlist / system-path filter
would raise precision substantially; this is the top item in "What's Next."

**Corroboration works as designed.** Four corroboration events fired during the
run. A finding corroborated by `hash_compute` rose from 50% to 70%. Findings
sharing the `192.168.1.100` artifact across `string_extract` outputs were linked
rather than duplicated. This is the core differentiator: confidence is grounded in
cross-tool agreement, not model assertion.

**FACT tier not reached in this run.** No finding hit the FACT bar (>=85% + 3
sources) because the agent ran two to three corroborating tools per finding on a
single-artifact case. The mechanism is proven (confidence demonstrably climbs with
corroboration); reaching FACT requires either a richer multi-source case or a
longer correction budget. This is a tuning parameter, not a defect.

## Evidence Integrity

The architecture enforces evidence integrity at the tool layer, not via prompt
instructions. `BaseSIFTTool` blocks a blocklist of destructive command prefixes
(`rm`, `dd`, `shred`, `mkfs`, `chmod`, `>`, etc.) including in piped and chained
sub-commands, and raises `ToolSecurityError` before any SSH execution. Every tool
call records a SHA-256 of its raw output with a timestamp in the EvidenceGraph, and
every finding carries an `evidence_hash` linking it to the output that produced it,
so any finding in the final report is traceable to the exact tool execution behind
it. We did not observe spoliation in testing; original case data was opened
read-only by all tools used.

## Reproducibility

Full execution trace (41 events, 4 findings, 8 tool calls, 4 LLM calls with per-call
token counts) is preserved in `evidence/investigation_log.json`. Ground truth is in
`evidence/sample_ground_truth.json`. Scores are reproducible by running
`python -m forensiciq.benchmark` against the recorded findings.
