export type ConfidenceLabel = "FACT" | "INFERENCE" | "HYPOTHESIS";

export interface Finding {
  id: string;
  description: string;
  confidence: number; // 0.0 – 1.0
  label: ConfidenceLabel;
  sources: string[];
  contradictions: string[];
  evidence_hash: string;
  timestamp: string;
  artifact_ref?: string;
}

export interface ToolCall {
  tool_name: string;
  params: Record<string, unknown>;
  output_hash: string;
  timestamp: string;
  duration_ms: number;
  success: boolean;
}

// WebSocket events
export type WSEvent =
  | { type: "tool_start"; tool: string; params: Record<string, unknown>; reasoning?: string }
  | { type: "tool_complete"; tool: string; finding_ids?: string[]; duration_ms: number; output_hash?: string; success?: boolean }
  | { type: "finding_new"; finding: Finding }
  | { type: "finding_updated"; finding: Finding }
  | { type: "self_correction"; finding_id: string; reason: string; current_sources: string[] }
  | { type: "iteration_complete"; iteration: number; low_confidence_count: number }
  | { type: "investigation_complete"; summary: InvestigationSummary }
  | { type: "error"; message: string }
  | { type: "tool_error"; tool: string; error: string };

export interface InvestigationSummary {
  facts: number;
  inferences: number;
  hypotheses: number;
  narrative?: string;
}

export type InvestigationStatus = "idle" | "starting" | "running" | "correcting" | "complete" | "error";

export interface InvestigationState {
  id: string | null;
  status: InvestigationStatus;
  findings: Finding[];
  toolLog: ToolLogEntry[];
  summary: InvestigationSummary | null;
  correctionPass: number;
  errorMessage: string | null;
}

export interface ToolLogEntry {
  id: string;
  tool: string;
  timestamp: number;
  status: "running" | "complete" | "error";
  duration_ms?: number;
  output_hash?: string;
  note?: string;
}

export const LABEL_COLORS: Record<ConfidenceLabel, string> = {
  FACT: "#10D98A",
  INFERENCE: "#F0A832",
  HYPOTHESIS: "#F05060",
};

export const LABEL_BG: Record<ConfidenceLabel, string> = {
  FACT: "rgba(16,217,138,0.08)",
  INFERENCE: "rgba(240,168,50,0.08)",
  HYPOTHESIS: "rgba(240,80,96,0.08)",
};

export const LABEL_BORDER: Record<ConfidenceLabel, string> = {
  FACT: "rgba(16,217,138,0.25)",
  INFERENCE: "rgba(240,168,50,0.25)",
  HYPOTHESIS: "rgba(240,80,96,0.25)",
};
