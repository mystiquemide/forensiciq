"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { ConfidenceLabel, Finding, InvestigationSummary } from "@/types";
import FindingCard from "./FindingCard";

interface Props {
  findings: Finding[];
  summary: InvestigationSummary | null;
  onSourceClick?: (source: string) => void;
  highlightedTool?: string | null;
}

const ALL_LABELS: Array<ConfidenceLabel | "ALL"> = ["ALL", "FACT", "INFERENCE", "HYPOTHESIS"];

const SUMMARY_STYLE: Record<ConfidenceLabel, { text: string; count: string }> = {
  FACT:       { text: "text-fact",       count: "text-fact" },
  INFERENCE:  { text: "text-inference",  count: "text-inference" },
  HYPOTHESIS: { text: "text-hypothesis", count: "text-hypothesis" },
};

export default function FindingsSidebar({ findings, summary, onSourceClick, highlightedTool }: Props) {
  const [filter, setFilter] = useState<ConfidenceLabel | "ALL">("ALL");

  const displayed = filter === "ALL" ? findings : findings.filter((f) => f.label === filter);
  const sorted    = [...displayed].sort((a, b) => b.confidence - a.confidence);

  return (
    <div className="h-full flex flex-col">

      {/* Summary counts - only when data exists */}
      {summary && (
        <div className="grid grid-cols-3 border-b border-border shrink-0">
          {(["FACT", "INFERENCE", "HYPOTHESIS"] as ConfidenceLabel[]).map((lbl) => (
            <button
              key={lbl}
              onClick={() => setFilter((f) => (f === lbl ? "ALL" : lbl))}
              className={`py-3 flex flex-col items-center gap-0.5 transition-opacity border-r last:border-r-0 border-border ${
                filter === lbl ? "opacity-100" : "opacity-40 hover:opacity-70"
              }`}
            >
              <span className={`font-display font-bold text-2xl ${SUMMARY_STYLE[lbl].count}`}>
                {summary[lbl.toLowerCase() as keyof InvestigationSummary]}
              </span>
              <span className={`text-[9px] font-mono uppercase tracking-widest ${SUMMARY_STYLE[lbl].text}`}>
                {lbl}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
        {ALL_LABELS.map((lbl) => (
          <button
            key={lbl}
            onClick={() => setFilter(lbl)}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
              filter === lbl
                ? "bg-teal text-bg-1 font-medium"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {lbl}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-text-muted font-mono shrink-0">
          {sorted.length} {sorted.length === 1 ? "finding" : "findings"}
        </span>
      </div>

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Search size={20} className="text-text-muted opacity-30" />
            <p className="text-text-muted text-xs text-center">
              {findings.length === 0 ? "No findings yet." : "No findings match this filter."}
            </p>
          </div>
        )}
        {sorted.map((f) => (
          <FindingCard key={f.id} finding={f} onSourceClick={onSourceClick} highlightedTool={highlightedTool} />
        ))}
      </div>
    </div>
  );
}
