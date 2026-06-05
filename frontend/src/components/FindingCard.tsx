"use client";

import { useState } from "react";
import { type Finding, LABEL_COLORS } from "@/types";
import ConfidenceBar from "./ConfidenceBar";

interface Props {
  finding: Finding;
}

export default function FindingCard({ finding }: Props) {
  const [expanded, setExpanded] = useState(false);
  const color = LABEL_COLORS[finding.label];

  return (
    <button
      onClick={() => setExpanded((v) => !v)}
      className="w-full text-left bg-bg-2 border border-border rounded-lg p-4 hover:border-opacity-60 transition-colors"
      style={{ borderLeftColor: color, borderLeftWidth: 2 }}
    >
      <ConfidenceBar confidence={finding.confidence} label={finding.label} />

      <p className="mt-3 text-sm text-text-primary leading-relaxed line-clamp-2">
        {finding.description}
      </p>

      {expanded && (
        <div className="mt-3 space-y-2">
          {finding.artifact_ref && (
            <div className="text-xs font-mono text-text-muted truncate">
              Artifact: {finding.artifact_ref}
            </div>
          )}
          <div className="text-xs text-text-muted">
            <span className="text-teal">Sources:</span>{" "}
            {finding.sources.join(", ")}
          </div>
          {finding.contradictions.length > 0 && (
            <div className="text-xs text-hypothesis">
              Contradictions: {finding.contradictions.join(", ")}
            </div>
          )}
          <div className="text-xs font-mono text-text-muted break-all">
            SHA-256: {finding.evidence_hash}
          </div>
          <div className="text-xs text-text-muted">
            {new Date(finding.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </button>
  );
}
