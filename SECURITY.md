# Security Policy

## Reporting a Vulnerability

Email `mide27145@gmail.com` with the subject line `[ForensIQ Security]`.

Do not open a public GitHub issue for security bugs. You can expect a response within 5 business days. If the issue is confirmed, a fix will be prioritized and you will be credited in the changelog (unless you prefer otherwise).

## Scope

In scope: the ForensIQ application code in this repository (backend agent, tool wrappers, FastAPI routes, frontend).

Out of scope: the SIFT Workstation OS and its installed tools, the Anthropic API, third-party npm or pip packages (report those to the relevant upstream maintainer).

## Architecture Security Guarantees

Three security properties are enforced at the code level, not at the prompt level:

**1. Destructive command blocking**
`BaseSIFTTool._check_command()` in `backend/forensiciq/tools/base.py` raises `ToolSecurityError` before any SSH connection is made if the command matches the blocklist (`rm`, `dd`, `shred`, `mkfs`, `fdisk`, `wipefs`, `truncate`, `mv`, `cp`, `chmod`, `chown`, `ln`). The Claude agent cannot bypass this by constructing a different prompt.

**2. Read-only SSH credentials**
The SSH key configured via `SIFT_SSH_KEY_PATH` should be scoped to read access only on the SIFT VM. The agent cannot write, delete, move, or exfiltrate any file on the workstation regardless of what it attempts.

**3. Hash before LLM**
Every tool output is SHA-256 hashed before the LLM sees it. Content injected into artifacts, filenames, or log entries cannot overwrite the cryptographic record of what the tool actually returned.
