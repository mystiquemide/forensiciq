"""
Deterministic artifact extraction for finding correlation.

Pulls concrete indicators (IPs, PIDs, hashes, file paths, domains, registry
keys) out of raw SIFT tool output. Two findings that share an artifact are
treated as describing the same underlying event, which lets the EvidenceGraph
corroborate them instead of creating duplicate low-confidence findings.

No LLM involved: extraction is pure regex so the correlation is reproducible
and auditable, matching ForensIQ's "facts, not guesses" philosophy.
"""
import re

_IPV4 = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"
)
_HASH = re.compile(r"\b[a-fA-F0-9]{64}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{32}\b")
_PID = re.compile(r"\bPID[:\s]+(\d{1,7})\b", re.IGNORECASE)
_WIN_PATH = re.compile(r"\b[A-Za-z]:\\(?:[^\s\"<>|]+\\)*[^\s\"<>|]+")
_UNIX_PATH = re.compile(r"(?<!\w)/(?:[\w.\-]+/)+[\w.\-]+")
_REG_KEY = re.compile(r"\b(?:HKLM|HKCU|HKU|HKCR)\\[^\s\"<>|]+", re.IGNORECASE)
_DOMAIN = re.compile(
    r"\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+"
    r"(?:com|net|org|io|ru|cn|info|biz|xyz|top|live|onion)\b",
    re.IGNORECASE,
)
_EXE = re.compile(r"\b[\w\-]+\.(?:exe|dll|sys|bat|ps1|vbs|scr)\b", re.IGNORECASE)


def extract_artifacts(text: str) -> set[str]:
    """Return a normalized set of typed artifact tokens found in tool output."""
    if not text:
        return set()

    artifacts: set[str] = set()
    for ip in _IPV4.findall(text):
        artifacts.add(f"ip:{ip}")
    for h in _HASH.findall(text):
        artifacts.add(f"hash:{h.lower()}")
    for pid in _PID.findall(text):
        artifacts.add(f"pid:{pid}")
    for path in _WIN_PATH.findall(text):
        artifacts.add(f"path:{path.lower().rstrip('.')}")
    for path in _UNIX_PATH.findall(text):
        if len(path) > 6:
            artifacts.add(f"path:{path.lower()}")
    for key in _REG_KEY.findall(text):
        artifacts.add(f"reg:{key.lower()}")
    for domain in _DOMAIN.findall(text):
        artifacts.add(f"domain:{domain.lower()}")
    for exe in _EXE.findall(text):
        artifacts.add(f"exe:{exe.lower()}")
    return artifacts


def shared_artifacts(a: set[str], b: set[str]) -> set[str]:
    """Artifacts common to two findings — the basis for corroboration."""
    return a & b
