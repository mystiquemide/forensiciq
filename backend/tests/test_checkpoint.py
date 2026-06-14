"""Tests for crash-recovery checkpointing."""
import tempfile
from pathlib import Path

import forensiciq.checkpoint as cp


def _setup(tmp):
    cp.CHECKPOINT_DIR = Path(tmp)


def test_save_and_load_roundtrip():
    with tempfile.TemporaryDirectory() as tmp:
        _setup(tmp)
        state = {"status": "running", "findings": [{"id": "abc", "confidence": 0.7}]}
        cp.save_checkpoint("inv-1", state)
        assert cp.load_checkpoint("inv-1") == state


def test_load_missing_returns_none():
    with tempfile.TemporaryDirectory() as tmp:
        _setup(tmp)
        assert cp.load_checkpoint("nope") is None


def test_list_checkpoints():
    with tempfile.TemporaryDirectory() as tmp:
        _setup(tmp)
        cp.save_checkpoint("inv-1", {"a": 1})
        cp.save_checkpoint("inv-2", {"b": 2})
        assert set(cp.list_checkpoints()) == {"inv-1", "inv-2"}


def test_delete_checkpoint():
    with tempfile.TemporaryDirectory() as tmp:
        _setup(tmp)
        cp.save_checkpoint("inv-1", {"a": 1})
        assert cp.delete_checkpoint("inv-1") is True
        assert cp.load_checkpoint("inv-1") is None
        assert cp.delete_checkpoint("inv-1") is False


def test_corrupt_checkpoint_returns_none():
    with tempfile.TemporaryDirectory() as tmp:
        _setup(tmp)
        bad = Path(tmp) / "inv-bad.json"
        bad.write_text("{ this is not json")
        assert cp.load_checkpoint("inv-bad") is None
