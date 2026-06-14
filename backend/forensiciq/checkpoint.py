"""
Crash-recovery checkpointing for investigations.

The EvidenceGraph lives in memory, so a backend restart mid-investigation
loses all findings. This module persists a JSON snapshot of an investigation
and restores it on demand. Pure stdlib, no DB.

Checkpoints are written to CHECKPOINT_DIR (default: ./checkpoints) as
<investigation_id>.json.
"""
import json
import os
from pathlib import Path
from typing import Any

CHECKPOINT_DIR = Path(os.environ.get("CHECKPOINT_DIR", "checkpoints"))


def _path(investigation_id: str) -> Path:
    return CHECKPOINT_DIR / f"{investigation_id}.json"


def save_checkpoint(investigation_id: str, state: dict[str, Any]) -> None:
    """Atomically write the investigation state snapshot to disk."""
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    target = _path(investigation_id)
    tmp = target.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, default=str)
    tmp.replace(target)


def load_checkpoint(investigation_id: str) -> dict[str, Any] | None:
    """Return the saved state for an investigation, or None if absent."""
    target = _path(investigation_id)
    if not target.exists():
        return None
    try:
        with target.open(encoding="utf-8") as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None


def list_checkpoints() -> list[str]:
    """Return investigation IDs that have a saved checkpoint."""
    if not CHECKPOINT_DIR.exists():
        return []
    return [p.stem for p in CHECKPOINT_DIR.glob("*.json")]


def delete_checkpoint(investigation_id: str) -> bool:
    """Remove a checkpoint. Returns True if a file was deleted."""
    target = _path(investigation_id)
    if target.exists():
        target.unlink()
        return True
    return False
