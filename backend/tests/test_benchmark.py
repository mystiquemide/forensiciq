"""Tests for the accuracy benchmark harness."""
from forensiciq.benchmark import score
from forensiciq.evidence_graph import EvidenceGraph


def test_perfect_score():
    graph = EvidenceGraph()
    graph.add_finding("C2", tool_name="netscan", raw_output="192.168.1.100:4444 evil.exe")
    gt = {"case_name": "t", "expected_artifacts": ["ip:192.168.1.100", "exe:evil.exe"]}
    result = score(graph, gt)
    assert result.precision == 1.0
    assert result.recall == 1.0
    assert result.f1 == 1.0


def test_false_negative():
    graph = EvidenceGraph()
    graph.add_finding("partial", tool_name="netscan", raw_output="192.168.1.100")
    gt = {"case_name": "t", "expected_artifacts": ["ip:192.168.1.100", "exe:missed.exe"]}
    result = score(graph, gt)
    assert result.false_negatives == 1
    assert result.recall == 0.5


def test_false_positive():
    graph = EvidenceGraph()
    graph.add_finding("noise", tool_name="strings", raw_output="10.0.0.5 extra.exe 192.168.1.100")
    gt = {"case_name": "t", "expected_artifacts": ["ip:192.168.1.100"]}
    result = score(graph, gt)
    assert result.false_positives == 2
    assert result.true_positives == 1
