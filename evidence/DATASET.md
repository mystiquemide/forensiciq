# Dataset Documentation

## Source

ForensIQ was tested against a controlled synthetic case, `sample-case-001`,
constructed for reproducible accuracy measurement. The case is a memory-capture-
style artifact (`cases/sample/memory.txt`) seeded with a known set of indicators
of compromise representing a typical intrusion: an injected process, a C2 network
connection, a malicious binary, a persistence registry key, and a file hash.

A synthetic case with documented ground truth was chosen deliberately: it lets us
measure precision, recall, and false-positive rate against a known answer key,
which raw third-party images cannot provide without prior manual analysis. The
architecture is image-agnostic — the same agent and tool wrappers operate on disk
images, memory dumps, and log files; the SANS-provided starter images
(sansorg.egnyte.com sample set) can be substituted by pointing the agent at their
path on the SIFT workstation.

## Planted Indicators (Ground Truth)

| Artifact | Type | Represents |
|---|---|---|
| 192.168.1.100 | IP | Command-and-control address |
| evil.exe | Executable | Malicious binary |
| PID 1432 | Process ID | Injected / hollowed process |
| e3b0c442...b855 | SHA-256 | Hash of the malicious binary |
| HKLM\...\CurrentVersion\Run | Registry key | Persistence mechanism |

Ground truth is recorded in `evidence/sample_ground_truth.json`.

## What the Agent Found

The agent recovered all five planted indicators (100% recall) across 8 tool
executions, producing 4 findings with 4 corroboration events. It additionally
surfaced 8 benign filesystem paths (tool scratch files, the YARA rules directory)
counted as false positives. Full results are in `evidence/benchmark_results.json`
and the complete execution trace in `evidence/investigation_log.json`.

## Environment

- Platform: SIFT-class Ubuntu workstation (forensic tools installed via apt:
  sleuthkit, yara, binutils/strings, file, regripper; volatility3 via pip)
- Agent connects over SSH; tools run remotely, output parsed before returning to
  the LLM to prevent context-window overload
- Model: Claude (Anthropic API) via tool_use

## Reproducing

1. Place a case at a path on the workstation (e.g. `cases/sample/memory.txt`)
2. Run the agent against that path
3. Score with `python -m forensiciq.benchmark --ground-truth <gt.json> --findings <log>`
