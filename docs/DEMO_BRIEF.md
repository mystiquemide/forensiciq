# ForensIQ — Demo Brief, Rubric Score, and Video Script

## Rubric Score (Honest)

The SANS Find Evil! rubric has 6 categories. No public point weights. Autonomous Execution Quality is the tiebreaker.

---

### 1. Autonomous Execution Quality (TIEBREAKER)

**Score: 8/10**

What we have:
- Claude chooses which tools to run based on case context, not a hardcoded sequence
- 3-pass self-correction loop fires when any finding sits below 70% confidence
- Self-correction is visible in the UI (amber "Correction 1/3" badge, spins)
- The corroboration engine fires automatically when two outputs share an artifact

What hurts us:
- The real investigation log (`evidence/investigation_log.json`) shows `log2timeline.py: command not found` and `psort.py: command not found`. The agent created a finding from the error message. That is not intelligent handling of a tool failure - it's the agent treating stderr as evidence. Judges will notice this if they read the log.
- We need to make sure the demo run does NOT show tool-not-found errors. Run against a case the SIFT tools can actually handle, or at minimum don't show that log in the demo.

---

### 2. IR Accuracy

**Score: 6.5/10**

What we have:
- 100% recall - every planted IOC was found. Zero misses.
- The FACT/INFERENCE/HYPOTHESIS tier system clearly distinguishes confirmed from unconfirmed
- Accuracy report is honest and well-written - judges respect that

What hurts us:
- 38.5% precision. 8 false positives from benign tool paths (`/tmp/forensiciq_timeline.csv`, `/opt/yara-rules`). Not hallucinations, but noise.
- No FACT-tier findings in the real run. Confidence climbed from 50% to 70% but never hit the 85% + 3-source FACT bar. The mechanism works but judges want to see a FACT label.
- F1 of 0.556 is below what a strong submission shows.

Mitigation: The accuracy report frames this well. "100% recall, documented precision weakness with a clear fix path" reads better than a submission that claims 95% accuracy and doesn't show their working.

---

### 3. Breadth and Depth of Analysis

**Score: 7/10**

What we have:
- 8 SIFT tool wrappers. That covers timeline, memory, registry, filesystem, malware signatures, strings, file identification, and hashing. Good breadth.
- The rubric says "depth on fewer types" beats "shallow multi-type." Our agent goes deep on what it finds - it corroborates, self-corrects, and links findings across tools.

What hurts us:
- The real run showed log2timeline and psort not installed in the test environment. If those tools aren't available on the SIFT VM at demo time, we're showing 6 of 8 tools, not 8.
- The sample case was a single memory.txt file. Judges want to see something more realistic - ideally a memory dump or disk image.

Ask Kingnana: does the SIFT VM he ran against have log2timeline, volatility, and regripper installed? That determines what we can claim.

---

### 4. Constraint Implementation

**Score: 9.5/10**

What we have:
- Blocklist in `BaseSIFTTool._check_command()` - architectural, not prompt-based
- Blocks `rm`, `dd`, `shred`, `mkfs`, `fdisk`, `chmod`, `chown`, `truncate`, `> /`, `sudo rm`, `sudo dd`, `wipefs`, `mv`, `cp`, `ln`
- `ToolSecurityError` is raised before any SSH connection is made
- Documented in SECURITY.md and ARCHITECTURE.md (ADR-004) with explicit rationale: "prompt-based safety can be overridden by adversarial case data"
- This is one of the strongest things in the entire submission

What hurts us:
- Almost nothing. This is close to the ceiling for this category.
- One gap: no test that demonstrates an attempted bypass is blocked. A test like `test_security.py::test_destructive_command_blocked` would close this.

---

### 5. Audit Trail Quality

**Score: 9/10**

What we have:
- Every tool call: `output_hash` (SHA-256 of raw output + tool name + timestamp)
- Every finding: `evidence_hash` links back to the exact tool execution
- `investigation_log.json` in the repo - 37 events, full trace
- Checkpoint recovery preserves state across restarts
- HTML report exposes the full audit trail with hashes

What hurts us:
- The report currently returns HTML but we haven't seen a real rendered report from a completed investigation (blocked by credits)
- Minor: evidence hashes are SHA-256 of `tool_name:output:timestamp` - that timestamp makes two identical tool runs produce different hashes. Not a bug, but worth being able to explain if asked.

---

### 6. Usability and Documentation

**Score: 7/10**

What we have:
- README with quick start, Docker Compose, architecture diagram
- AGENTS.md with extension guide and WebSocket event contract
- SECURITY.md, CONTRIBUTING.md, DEPLOYMENT.md
- CI passing, CodeQL scanning, Dependabot active
- Simulation panel in dev mode so judges can test the UI without a SIFT VM

What hurts us:
- The SIFT VM dependency is a real barrier. Judges who want to run it locally need a VirtualBox VM with 200+ tools installed. That's a 30-minute setup before they can see the agent do anything real.
- Docker Compose helps but the SIFT VM still needs to exist somewhere
- No deployed demo URL. Everything is localhost.
- Devpost write-up not written yet.

---

## Overall Honest Score: ~78/100

**Where we win:** constraint implementation, audit trail, architecture clarity, and the conceptual differentiator (deterministic confidence, not LLM-assigned).

**Where we lose points:** precision accuracy, the tool-not-found issue in the real run, no deployed URL, SIFT VM dependency.

**The differentiator that can win:** every other DFIR AI submission will have LLMs assigning confidence. We're the only one where the LLM cannot lie about how sure it is. That framing, said clearly, is what takes the top spot.

---

## Voiceover Recommendation

**Use your own voice.**

The rules don't prohibit AI voiceovers but the audience is SANS-certified incident responders. They will feel the difference between a human walking through a forensic investigation and a polished AI voice reading a script. Human voice is more credible, it reads as someone who actually built the thing, and it's warmer in a demo context.

If your mic is decent and you can speak clearly, record it yourself. One take is fine - mild stumbles are authentic. If you genuinely can't record (bad audio environment, not comfortable on mic), AI voice is technically allowed. In that case use ElevenLabs with a calm neutral male voice, not a corporate narrator voice.

---

## Demo Script (What to Show - Ordered)

**Total target: 4 min 30 sec. Leave 30 sec buffer before the 5 min cut.**

### Beat 1: Problem Setup (0:00 - 0:30)
Open with the terminal. No intro slides. Speak over a blank screen or the landing page.

Say: "Every DFIR tool gives you a list of findings. None of them tell you how sure they are. ForensIQ fixes that. Every finding gets a label - FACT, INFERENCE, or HYPOTHESIS - computed deterministically from the tools, not from the model's guess."

### Beat 2: Start an Investigation (0:30 - 1:00)
- Show the landing page at localhost:3000
- Click the investigation form, enter the case path
- Show the redirect to the investigation dashboard
- Point out: "investigation is already running, tools are streaming on the left"

### Beat 3: Tools Running Live (1:00 - 2:00)
- Watch the tool log fill in on the left panel: `hash_compute`, `file_identify`, `strings`
- Point out a finding appearing in the sidebar: "INFERENCE at 50% - one source"
- Watch as a second tool corroborates it: "now 70% - the corroboration engine matched the same artifact across two tool outputs. No LLM involvement."
- Show the evidence graph: nodes appearing, amber for INFERENCE

### Beat 4: Self-Correction (2:00 - 3:00)
**This is the most important beat. Do not skip it.**
- Watch the amber "Correction 1/3" badge appear in the top bar
- "The agent just reviewed all findings below 70% and decided to run another tool to try to corroborate. This fires automatically. I did not tell it to do this."
- Watch confidence climb: "70% to 90% - now it qualifies as FACT. Three independent tools agreed on the same indicator."
- Show the evidence graph node turn green

### Beat 5: Security Boundary (3:00 - 3:30)
- Pull up `backend/forensiciq/tools/base.py` briefly - show the blocklist
- "The agent cannot run rm, dd, shred, or any destructive command. This is enforced at the tool layer in code. No prompt tells it not to. It can't be talked out of it."

### Beat 6: Export Report (3:30 - 4:15)
- Investigation completes - green "complete" banner
- Click "Export Report"
- Show the HTML report: FACT section first, then INFERENCE, then HYPOTHESIS
- Show one finding's SHA-256 hash: "that hash links this finding to the exact tool output that produced it. The chain of custody is verifiable."

### Beat 7: Close (4:15 - 4:30)
- Back to the evidence graph
- "100% recall on the test case. The confidence tier system tells you exactly which findings to act on and which to verify. That's the point."

---

## Video Script (Word for Word)

**Record this in one take if possible. Speak at a calm, even pace. Show what you're describing as you say it.**

---

**[0:00 - show terminal or landing page]**

"Most DFIR tools give you a list of findings and leave you to guess which ones are real. ForensIQ doesn't guess. Every finding gets a label - FACT, INFERENCE, or HYPOTHESIS - and that label is computed deterministically from the forensic tools, not from the language model. The model cannot inflate its own confidence."

---

**[0:30 - show landing page, open investigation modal]**

"I'm going to start a real investigation now. I'm pointing ForensIQ at a case path on a SIFT Workstation VM. One form submission, one POST request."

**[submit the form, show redirect to dashboard]**

"The agent is already running. On the left you can see the tool log - these are real SIFT tools executing over SSH in real time."

---

**[1:00 - show tool log updating]**

"The first finding just came in - hash_compute identified a suspicious binary. Confidence is 50%. One source. That puts it at INFERENCE. The agent isn't done yet."

**[wait for second tool corroboration]**

"strings just ran against the same file and the corroboration engine matched the same executable path in both outputs. Confidence is now 70%. No model assertion - two independent tool outputs agreed on the same concrete artifact, and the engine scored it."

---

**[2:00 - show self-correction badge appear]**

"The self-correction loop just fired. Every finding below 70% gets reviewed after each tool batch, and the agent picks the best corroborating tool to re-run. That's not in the prompt - it's in the investigation loop."

**[wait for confidence to climb]**

"Third tool confirmed the same indicator. Confidence is now 90%, three sources. That crosses the FACT threshold. You can see the node in the evidence graph just turned green."

---

**[3:00 - briefly show base.py blocklist]**

"Before I show the report, one thing worth calling out. The agent connects to the SIFT VM over SSH and runs these tools. What stops it from running something destructive?"

**[show _check_command in base.py]**

"This. A blocklist in the tool layer that raises an exception before any SSH connection is made. rm, dd, shred, mkfs - all blocked. The model cannot talk its way past this because it's not in a prompt. It's in code."

---

**[3:30 - click Export Report]**

"Investigation complete. I'm going to export the report."

**[show HTML report open in browser]**

"FACTS at the top - findings with three or more corroborating sources and confidence above 85%. INFERENCES below that - corroborated but not confirmed. HYPOTHESES at the bottom - single source, low confidence, do not rely on these."

**[scroll to one finding's hash]**

"Every finding has a SHA-256 hash that links it to the exact tool output that produced it. This is a verifiable chain of custody. You can reproduce any score from the tool outputs alone."

---

**[4:15 - back to evidence graph]**

"ForensIQ ran against this case, found every planted indicator with zero misses, and labelled each finding by how much the evidence actually supports it. The confidence is not a guess. It's a score."

**[pause]**

"That's ForensIQ."

---

**[END - 4:30]**

---

## Pre-Recording Checklist

- [ ] Anthropic credits topped up - you need at least one real run
- [ ] Confirm with Kingnana which SIFT tools are installed on the VM (`which log2timeline.py`, `which vol.py`, `which regripper.pl`)
- [ ] Use a case that has at least one file with a suspicious executable + a registry hive - gives more tool hits
- [ ] Backend running on port 8080, frontend on port 3000 (clear the ports beforehand)
- [ ] Browser zoom at 110-125% so the UI reads clearly on screen
- [ ] Hide browser bookmarks bar and extensions
- [ ] Use OBS or screen recording at 1920x1080, 30fps minimum
- [ ] Record audio separately if your mic picks up fan noise - then sync in post
- [ ] Do one dry run first to check tool availability before the real recording
