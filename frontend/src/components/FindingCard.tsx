"use client";

import { type Finding, LABEL_COLORS } from "@/types";

function ConfidenceRing({ value, color }: { value: number; color: string }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke={`${color}20`} strokeWidth="2.5" />
      <circle
        cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${circ * value} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

const LABEL_STYLE: Record<string, string> = {
  FACT:       "bg-fact-bg text-fact border-fact-border",
  INFERENCE:  "bg-inference-bg text-inference border-inference-border",
  HYPOTHESIS: "bg-hypothesis-bg text-hypothesis border-hypothesis-border",
};

interface Props {
  finding: Finding;
  onSourceClick?: (source: string) => void;
  highlightedTool?: string | null;
}

export default function FindingCard({ finding, onSourceClick, highlightedTool }: Props) {
  const color = LABEL_COLORS[finding.label];
  const pct   = Math.round(finding.confidence * 100);

  return (
    <div
      className="group relative bg-bg-2 border border-border rounded-xl overflow-hidden hover:border-teal/20 transition-all duration-200 cursor-default"
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: `${color}08` }} />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <span className={`shrink-0 text-[10px] font-mono font-semibold tracking-widest px-2 py-0.5 rounded border ${LABEL_STYLE[finding.label]}`}>
            {finding.label}
          </span>

          <div className="relative flex items-center justify-center shrink-0">
            <ConfidenceRing value={finding.confidence} color={color} />
            <span className="absolute text-[10px] font-mono font-semibold" style={{ color }}>
              {pct}%
            </span>
          </div>
        </div>

        <p className="mt-3 text-sm text-text-primary leading-relaxed line-clamp-3">
          {finding.description}
        </p>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {finding.sources.map((s) => {
            const isActive = highlightedTool && (s === highlightedTool || s.startsWith(highlightedTool) || highlightedTool.startsWith(s));
            return (
              <button
                key={s}
                onClick={() => onSourceClick?.(s)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                  isActive ? "bg-teal/20 text-teal" : "bg-teal-glow text-teal hover:bg-teal/15"
                }`}
              >
                {s}
              </button>
            );
          })}
          {finding.contradictions.length > 0 && (
            <span className="text-[10px] font-mono text-hypothesis">
              {finding.contradictions.length} contradiction{finding.contradictions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="mt-2.5 text-[9px] font-mono text-text-muted opacity-50">
          {finding.sources.length} tool{finding.sources.length !== 1 ? "s" : ""} corroborated
          {" · "}
          {finding.contradictions.length > 0
            ? `${finding.contradictions.length} contradiction${finding.contradictions.length !== 1 ? "s" : ""}`
            : "0 contradictions"}
        </div>

        <div className="mt-1 font-mono text-[9px] text-text-muted opacity-0 group-hover:opacity-30 transition-opacity truncate">
          {finding.evidence_hash}
        </div>
      </div>
    </div>
  );
}
