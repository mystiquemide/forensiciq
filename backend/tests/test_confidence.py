"""Tests for the EvidenceGraph confidence scoring engine."""

from forensiciq.evidence_graph import EvidenceGraph


def test_single_source_is_inference():
    graph = EvidenceGraph()
    finding = graph.add_finding("Suspicious process found", tool_name="volatility.pslist", raw_output="svchost.exe PID 1432")
    assert finding.confidence == 0.50
    assert finding.label == "INFERENCE"


def test_contradicted_finding_is_hypothesis():
    graph = EvidenceGraph()
    finding = graph.add_finding("Suspicious process found", tool_name="volatility.pslist", raw_output="svchost.exe PID 1432")
    graph.contradict(finding.id, tool_name="file_identify")
    assert finding.confidence < 0.50
    assert finding.label == "HYPOTHESIS"


def test_two_sources_is_inference():
    graph = EvidenceGraph()
    finding = graph.add_finding("Suspicious process found", tool_name="volatility.pslist", raw_output="svchost.exe PID 1432")
    graph.corroborate(finding.id, tool_name="volatility.malfind", raw_output="RWX region at 0x7ff000")
    assert finding.confidence == 0.70
    assert finding.label == "INFERENCE"


def test_three_sources_is_fact():
    graph = EvidenceGraph()
    finding = graph.add_finding("Process hollowing detected", tool_name="volatility.pslist", raw_output="svchost.exe PID 1432")
    graph.corroborate(finding.id, tool_name="volatility.malfind", raw_output="RWX region at 0x7ff000")
    graph.corroborate(finding.id, tool_name="volatility.cmdline", raw_output="cmd: C:\\Windows\\temp\\evil.exe")
    assert finding.confidence >= 0.85
    assert finding.label == "FACT"


def test_contradiction_lowers_confidence():
    graph = EvidenceGraph()
    finding = graph.add_finding("Suspicious network connection", tool_name="volatility.netscan", raw_output="192.168.1.100:4444")
    graph.corroborate(finding.id, tool_name="volatility.pslist", raw_output="svchost.exe PID 1432")
    before = finding.confidence
    graph.contradict(finding.id, tool_name="strings_tool")
    assert finding.confidence < before


def test_confidence_floor():
    graph = EvidenceGraph()
    finding = graph.add_finding("Weak signal", tool_name="strings_tool", raw_output="suspicious string")
    for tool in ["tool_a", "tool_b", "tool_c", "tool_d"]:
        graph.contradict(finding.id, tool_name=tool)
    assert finding.confidence >= 0.10


def test_confidence_ceiling():
    graph = EvidenceGraph()
    finding = graph.add_finding("Strong signal", tool_name="volatility.pslist", raw_output="data")
    for i, tool in enumerate(["tool_a", "tool_b", "tool_c", "tool_d", "tool_e"]):
        graph.corroborate(finding.id, tool_name=tool, raw_output=f"output {i}")
    assert finding.confidence <= 0.95


def test_summary_counts():
    graph = EvidenceGraph()
    f1 = graph.add_finding("Finding 1", tool_name="volatility.pslist", raw_output="data")
    graph.corroborate(f1.id, tool_name="volatility.malfind", raw_output="data2")
    graph.corroborate(f1.id, tool_name="volatility.cmdline", raw_output="data3")

    f2 = graph.add_finding("Finding 2", tool_name="regripper", raw_output="run key data")

    f3 = graph.add_finding("Finding 3", tool_name="strings_tool", raw_output="suspicious string")
    graph.contradict(f3.id, tool_name="file_identify")

    summary = graph.summary()
    assert summary["facts"] == 1
    assert summary["inferences"] == 1
    assert summary["hypotheses"] == 1
