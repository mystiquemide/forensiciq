"""Tests for deterministic artifact-based finding correlation."""
from forensiciq.artifacts import extract_artifacts
from forensiciq.evidence_graph import EvidenceGraph


def test_extracts_ip():
    a = extract_artifacts("Connection to 192.168.1.100:4444 established")
    assert "ip:192.168.1.100" in a

def test_extracts_pid():
    a = extract_artifacts("svchost.exe PID 1432 running")
    assert "pid:1432" in a

def test_extracts_hash():
    a = extract_artifacts("sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
    assert "hash:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" in a

def test_extracts_exe():
    a = extract_artifacts("Found evil.exe in temp")
    assert "exe:evil.exe" in a

def test_no_artifacts_returns_empty():
    a = extract_artifacts("RWX region at 0x7ff000")
    assert a == set()

def test_matching_finding_by_shared_ip():
    graph = EvidenceGraph()
    f1 = graph.add_finding("Network beacon", tool_name="volatility.netscan", raw_output="192.168.1.100:4444")
    match = graph.find_matching_finding("Outbound to 192.168.1.100 on port 4444")
    assert match is not None
    assert match.id == f1.id

def test_no_match_when_no_shared_artifact():
    graph = EvidenceGraph()
    graph.add_finding("Network beacon", tool_name="volatility.netscan", raw_output="192.168.1.100:4444")
    match = graph.find_matching_finding("Registry run key HKLM\\Software\\Run set")
    assert match is None

def test_corroboration_via_shared_artifact_elevates_confidence():
    graph = EvidenceGraph()
    f1 = graph.add_finding("C2 connection", tool_name="volatility.netscan", raw_output="192.168.1.100:4444")
    assert f1.confidence == 0.50
    match = graph.find_matching_finding("strings found C2 192.168.1.100 in binary")
    assert match is not None
    graph.corroborate(match.id, tool_name="strings_tool", raw_output="C2 192.168.1.100")
    assert f1.confidence == 0.70
    assert "192.168.1.100" in " ".join(f1.artifacts)

def test_artifacts_merge_on_corroboration():
    graph = EvidenceGraph()
    f1 = graph.add_finding("Malware", tool_name="volatility.pslist", raw_output="evil.exe PID 1432")
    graph.corroborate(f1.id, tool_name="volatility.cmdline", raw_output="C:\\temp\\evil.exe spawned 192.168.1.100")
    assert "pid:1432" in f1.artifacts
    assert "ip:192.168.1.100" in f1.artifacts
