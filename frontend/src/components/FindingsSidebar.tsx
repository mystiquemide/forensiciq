"use client";

import { useState } from "react";
import type { ConfidenceLabel, Finding, InvestigationSummary } from "@/types";
import FindingCard from "./FindingCard";

interface Props {
  findings: Finding[];
  summary: InvestigationSummary | null;
}

const ALL_LABELS: Array<ConfidenceLabel | "ALL"> = ["ALL", "FACT", "INFERENCE", "HYPOTHESIS"];

const LABEL_STYLE: Record<ConfidenceLabel, string> = {
  FACT: "text-fact border-fact-border bg-fact-bg",
  INFERENCE: "text-inference border-inference-border bg-inference-bg",
  HYPOTHESIS: "text-hypothesis border-hypothesis-border bg-hypothesis-bg",
};

export default function FindingsSidebar({ findings, summary }: Props) {
  const [filter, setFilter] = useState<ConfidenceLabel | "ALL">("ALL");

  const displayed = filter === "ALL" ? findings : findings.filter((f) => f.label === filter);
  const sorted = [...displayed].sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="h-full flex flex-col bg-bg-2 border border-border rounded-lg overflow-hidden">
      {/* Summary row */}
      {summary && (
        <div className="flex border-b border-border">
          {(["FACT", "INFERENCE", "HYPOTHESIS"] as ConfidenceLabel[]).map((lbl) => (
            <button
              key={lbl}
              onClick={() => setFilter((f) => (f === lbl ? "ALL" : lbl))}
              className={`flex-1 py-3 text-center transition-colors ${LABEL_STYLE[lbl]} ${filter === lbl ? "opacity-100" : "opacity-50 hover:opacity-75"}`}
            >
              <div className="text-xl font-bold">{summary[lbl.toLowerCase() as keyof InvestigationSummary]}</div>
              <div className="text-xs font-mono uppercase tracking-wider mt-0.5">{lbl}S</div>
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-2 border-b border-border">
        {ALL_LABELS.map((lbl) => (
          <button
            key={lbl}
            onClick={() => setFilter(lbl)}
            className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
              filter === lbl
                ? "bg-teal text-bg-1 font-medium"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {lbl}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-muted self-center">
          {sorted.length} finding{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sorted.length === 0 && (
          <p className="text-text-muted text-sm italic p-4 text-center">
            {findings.length === 0 ? "No findings yet." : "No findings match this filter."}
          </p>
        )}
        {sorted.map((f) => (
          <FindingCard key={f.id} finding={f} />
        ))}
      </div>
    </div>
  );
}
