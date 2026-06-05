"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import PulseIcon from "@/components/PulseIcon";
import ToolLog from "@/components/ToolLog";
import FindingsSidebar from "@/components/FindingsSidebar";
import { useInvestigation } from "@/hooks/useInvestigation";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { InvestigationState } from "@/types";

const EvidenceGraph = dynamic(() => import("@/components/EvidenceGraph"), { ssr: false });

function pulseState(status: InvestigationState["status"]) {
  if (status === "running") return "investigating";
  if (status === "complete") return "complete";
  if (status === "error") return "error";
  return "idle";
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function InvestigationPage({ params }: Props) {
  const { id } = use(params);
  const { state, handleEvent, dispatch } = useInvestigation();

  useEffect(() => {
    dispatch({ type: "SET_ID", id });
    dispatch({ type: "SET_STATUS", status: "running" });
  }, [id, dispatch]);

  useWebSocket(id, handleEvent);

  return (
    <div className="relative z-10 flex flex-col h-screen">
      {/* Top bar */}
      <header className="flex items-center gap-4 px-6 py-3 border-b border-border bg-bg-2 shrink-0">
        <Link href="/" className="flex items-center gap-2 group">
          <PulseIcon size={28} state={pulseState(state.status)} />
          <span className="font-semibold text-sm">
            Forens<span className="text-teal font-bold">IQ</span>
          </span>
        </Link>

        <div className="h-4 w-px bg-border mx-1" />

        <div className="flex-1 min-w-0">
          <span className="text-xs text-text-muted font-mono truncate block">
            Investigation: {id}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono shrink-0">
          {state.summary && (
            <>
              <span className="text-fact">{state.summary.facts} FACTS</span>
              <span className="text-inference">{state.summary.inferences} INFERENCES</span>
              <span className="text-hypothesis">{state.summary.hypotheses} HYPOTHESES</span>
            </>
          )}
          <span
            className={`px-2 py-1 rounded uppercase tracking-widest text-[10px] ${
              state.status === "complete"
                ? "bg-fact-bg text-fact border border-fact-border"
                : state.status === "error"
                ? "bg-hypothesis-bg text-hypothesis border border-hypothesis-border"
                : "bg-teal-glow text-teal border border-teal/20 animate-pulse"
            }`}
          >
            {state.status}
          </span>
        </div>

        {state.status === "complete" && (
          <a
            href={`/api/report/${id}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs bg-teal text-bg-1 font-semibold px-3 py-1.5 rounded hover:bg-teal-dim transition-colors shrink-0"
          >
            Export Report
          </a>
        )}
      </header>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Left: Tool Log */}
        <div className="w-72 shrink-0 p-3 border-r border-border">
          <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2 px-1">
            Tool Log
          </div>
          <div className="h-[calc(100%-24px)]">
            <ToolLog entries={state.toolLog} />
          </div>
        </div>

        {/* Center: Evidence Graph */}
        <div className="flex-1 min-w-0 p-3 relative">
          <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2 px-1">
            Evidence Graph
          </div>
          <div className="h-[calc(100%-24px)]">
            <EvidenceGraph findings={state.findings} />
          </div>
        </div>

        {/* Right: Findings Sidebar */}
        <div className="w-80 shrink-0 p-3 border-l border-border">
          <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2 px-1">
            Findings
          </div>
          <div className="h-[calc(100%-24px)]">
            <FindingsSidebar findings={state.findings} summary={state.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
