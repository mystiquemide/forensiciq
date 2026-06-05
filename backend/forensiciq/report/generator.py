from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from forensiciq.evidence_graph import EvidenceGraph

_TEMPLATES_DIR = Path(__file__).parent / "templates"
_env = Environment(loader=FileSystemLoader(str(_TEMPLATES_DIR)), autoescape=True)


def generate_html_report(investigation_id: str, case_path: str, graph: EvidenceGraph) -> str:
    template = _env.get_template("report.html.j2")
    findings = [f.to_dict() for f in graph.findings.values()]
    facts = [f for f in findings if f["label"] == "FACT"]
    inferences = [f for f in findings if f["label"] == "INFERENCE"]
    hypotheses = [f for f in findings if f["label"] == "HYPOTHESIS"]
    tool_calls = [t.to_dict() for t in graph.tool_calls]
    return template.render(
        investigation_id=investigation_id,
        case_path=case_path,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        summary=graph.summary(),
        facts=facts,
        inferences=inferences,
        hypotheses=hypotheses,
        tool_calls=tool_calls,
    )
