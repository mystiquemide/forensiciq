import hashlib
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from forensiciq.artifacts import extract_artifacts, shared_artifacts

ConfidenceLabel = Literal["FACT", "INFERENCE", "HYPOTHESIS"]

_CONFIDENCE_BASE = 0.50
_CONFIDENCE_PER_SOURCE = 0.20
_CONFIDENCE_MAX = 0.95
_CONFIDENCE_CONTRADICTION_PENALTY = 0.25
_CONFIDENCE_FLOOR = 0.10
_FACT_THRESHOLD = 0.85
_FACT_MIN_SOURCES = 3
_INFERENCE_THRESHOLD = 0.50


def _label_for(confidence: float, sources: list[str]) -> ConfidenceLabel:
    if confidence >= _FACT_THRESHOLD and len(sources) >= _FACT_MIN_SOURCES:
        return "FACT"
    if confidence >= _INFERENCE_THRESHOLD:
        return "INFERENCE"
    return "HYPOTHESIS"


@dataclass
class Finding:
    id: str
    description: str
    confidence: float
    sources: list[str]
    contradictions: list[str]
    evidence_hash: str
    timestamp: str
    artifact_ref: str
    raw_outputs: dict[str, str] = field(default_factory=dict)
    artifacts: set[str] = field(default_factory=set)

    @property
    def label(self) -> ConfidenceLabel:
        return _label_for(self.confidence, self.sources)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "description": self.description,
            "confidence": round(self.confidence, 4),
            "label": self.label,
            "sources": self.sources,
            "contradictions": self.contradictions,
            "evidence_hash": self.evidence_hash,
            "timestamp": self.timestamp,
            "artifact_ref": self.artifact_ref,
            "artifacts": sorted(self.artifacts),
        }


@dataclass
class ToolCallRecord:
    tool_name: str
    params: dict
    output_hash: str
    timestamp: str
    duration_ms: int
    success: bool

    def to_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "params": self.params,
            "output_hash": self.output_hash,
            "timestamp": self.timestamp,
            "duration_ms": self.duration_ms,
            "success": self.success,
        }


class EvidenceGraph:
    def __init__(self) -> None:
        self.findings: dict[str, Finding] = {}
        self.tool_calls: list[ToolCallRecord] = []

    def _hash(self, tool_name: str, raw_output: str) -> str:
        ts = datetime.now(timezone.utc).isoformat()
        payload = f"{tool_name}:{raw_output}:{ts}".encode()
        return hashlib.sha256(payload).hexdigest()

    def add_finding(
        self,
        description: str,
        tool_name: str,
        raw_output: str,
        artifact_ref: str = "",
    ) -> Finding:
        finding = Finding(
            id=str(uuid.uuid4()),
            description=description,
            confidence=_CONFIDENCE_BASE,
            sources=[tool_name],
            contradictions=[],
            evidence_hash=self._hash(tool_name, raw_output),
            timestamp=datetime.now(timezone.utc).isoformat(),
            artifact_ref=artifact_ref,
            raw_outputs={tool_name: raw_output},
            artifacts=extract_artifacts(raw_output),
        )
        self.findings[finding.id] = finding
        return finding

    def corroborate(self, finding_id: str, tool_name: str, raw_output: str) -> Finding:
        f = self.findings[finding_id]
        if tool_name not in f.sources:
            f.sources.append(tool_name)
            f.raw_outputs[tool_name] = raw_output
            f.artifacts |= extract_artifacts(raw_output)
            extra_sources = len(f.sources) - 1
            f.confidence = min(_CONFIDENCE_MAX, _CONFIDENCE_BASE + extra_sources * _CONFIDENCE_PER_SOURCE)
        return f

    def contradict(self, finding_id: str, tool_name: str) -> Finding:
        f = self.findings[finding_id]
        if tool_name not in f.contradictions:
            f.contradictions.append(tool_name)
            f.confidence = max(_CONFIDENCE_FLOOR, f.confidence - _CONFIDENCE_CONTRADICTION_PENALTY)
        return f

    def find_matching_finding(self, raw_output: str, exclude_id: str | None = None) -> Finding | None:
        """
        Return an existing finding that shares at least one concrete artifact
        (IP, PID, hash, path, registry key, domain, executable) with the given
        raw output. Basis for automatic deterministic corroboration.
        """
        incoming = extract_artifacts(raw_output)
        if not incoming:
            return None
        for f in self.findings.values():
            if f.id == exclude_id:
                continue
            if shared_artifacts(incoming, f.artifacts):
                return f
        return None

    def record_tool_call(
        self,
        tool_name: str,
        params: dict,
        raw_output: str,
        duration_ms: int,
        success: bool,
    ) -> ToolCallRecord:
        record = ToolCallRecord(
            tool_name=tool_name,
            params=params,
            output_hash=hashlib.sha256(raw_output.encode()).hexdigest(),
            timestamp=datetime.now(timezone.utc).isoformat(),
            duration_ms=duration_ms,
            success=success,
        )
        self.tool_calls.append(record)
        return record

    def get_low_confidence_findings(self, threshold: float) -> list[Finding]:
        return [f for f in self.findings.values() if f.confidence < threshold]

    def summary(self) -> dict:
        facts = sum(1 for f in self.findings.values() if f.label == "FACT")
        inferences = sum(1 for f in self.findings.values() if f.label == "INFERENCE")
        hypotheses = sum(1 for f in self.findings.values() if f.label == "HYPOTHESIS")
        return {"facts": facts, "inferences": inferences, "hypotheses": hypotheses}

    def to_dict(self) -> dict:
        return {
            "findings": [f.to_dict() for f in self.findings.values()],
            "tool_calls": [t.to_dict() for t in self.tool_calls],
            "summary": self.summary(),
        }
