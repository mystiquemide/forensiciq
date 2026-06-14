"""
Accuracy benchmarking harness for ForensIQ.

Runs the EvidenceGraph against a ground-truth case file and scores how well the
agent's findings match reality. Produces precision, recall, F1, and a
confidence-tier breakdown — the numbers required for the Accuracy Report.

Ground truth format (JSON):
{
  "case_name": "sample-case-001",
  "expected_artifacts": ["ip:192.168.1.100", "exe:evil.exe", "pid:1432"],
  "expected_findings": 5
}

Usage:
    python -m forensiciq.benchmark --ground-truth gt.json --report report.json
"""
import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

from forensiciq.evidence_graph import EvidenceGraph


@dataclass
class BenchmarkResult:
    case_name: str
    expected_artifact_count: int
    found_artifact_count: int
    true_positives: int
    false_positives: int
    false_negatives: int
    precision: float
    recall: float
    f1: float
    facts: int
    inferences: int
    hypotheses: int

    def to_dict(self) -> dict:
        return asdict(self)


def _all_artifacts(graph: EvidenceGraph) -> set[str]:
    found: set[str] = set()
    for f in graph.findings.values():
        found |= f.artifacts
    return found


def score(graph: EvidenceGraph, ground_truth: dict) -> BenchmarkResult:
    expected = set(ground_truth.get("expected_artifacts", []))
    found = _all_artifacts(graph)

    tp = len(expected & found)
    fp = len(found - expected)
    fn = len(expected - found)

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    summary = graph.summary()
    return BenchmarkResult(
        case_name=ground_truth.get("case_name", "unknown"),
        expected_artifact_count=len(expected),
        found_artifact_count=len(found),
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        precision=round(precision, 4),
        recall=round(recall, 4),
        f1=round(f1, 4),
        facts=summary["facts"],
        inferences=summary["inferences"],
        hypotheses=summary["hypotheses"],
    )


def _build_graph_from_findings(findings_json: list[dict]) -> EvidenceGraph:
    """Rebuild an EvidenceGraph from recorded findings (offline scoring)."""
    graph = EvidenceGraph()
    for item in findings_json:
        f = graph.add_finding(
            description=item.get("description", ""),
            tool_name=item.get("tool_name", "unknown"),
            raw_output=item.get("raw_output", ""),
        )
        for src in item.get("extra_sources", []):
            graph.corroborate(f.id, tool_name=src.get("tool"), raw_output=src.get("raw_output", ""))
        for con in item.get("contradictions", []):
            graph.contradict(f.id, tool_name=con)
    return graph


def main() -> None:
    parser = argparse.ArgumentParser(description="ForensIQ accuracy benchmark")
    parser.add_argument("--ground-truth", required=True, help="Path to ground-truth JSON")
    parser.add_argument("--findings", help="Path to recorded findings JSON (offline mode)")
    parser.add_argument("--report", default="benchmark_report.json", help="Output report path")
    args = parser.parse_args()

    ground_truth = json.loads(Path(args.ground_truth).read_text())
    if args.findings:
        findings_json = json.loads(Path(args.findings).read_text())
        graph = _build_graph_from_findings(findings_json)
    else:
        graph = EvidenceGraph()

    result = score(graph, ground_truth)
    Path(args.report).write_text(json.dumps(result.to_dict(), indent=2))

    print(f"Case:       {result.case_name}")
    print(f"Precision:  {result.precision:.1%}")
    print(f"Recall:     {result.recall:.1%}")
    print(f"F1:         {result.f1:.1%}")
    print(f"TP/FP/FN:   {result.true_positives}/{result.false_positives}/{result.false_negatives}")
    print(f"Tiers:      {result.facts} FACT / {result.inferences} INFERENCE / {result.hypotheses} HYPOTHESIS")
    print(f"Report written to {args.report}")


if __name__ == "__main__":
    main()
