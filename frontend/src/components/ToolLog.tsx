"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Loader, RefreshCw } from "lucide-react";
import type { ToolLogEntry } from "@/types";

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDuration(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function matches(tool: string, highlighted: string) {
  return tool === highlighted || highlighted.startsWith(tool) || tool.startsWith(highlighted);
}

interface Props {
  entries: ToolLogEntry[];
  highlightedTool?: string | null;
}

export default function ToolLog({ entries, highlightedTool }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="h-full flex items-start px-4 pt-4">
        <span className="text-teal opacity-40 font-mono text-xs mr-2">&gt;_</span>
        <span className="text-text-muted font-mono text-xs">waiting for agent to start...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-3 py-3 font-mono text-xs space-y-2">
      {entries.map((e) => {
        const lit = highlightedTool ? matches(e.tool, highlightedTool) : false;
        const isSelfCorrection = e.tool === "self-correction";
        return (
          <div
            key={e.id}
            className={`rounded-lg p-2.5 border transition-all duration-200 ${
              lit
                ? "bg-teal/8 border-teal/40 shadow-[0_0_8px_rgba(0,212,184,0.1)]"
                : "bg-bg-1 border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              {e.status === "running"  && !isSelfCorrection && <Loader    size={10} className="text-inference animate-spin shrink-0" />}
              {e.status === "complete" && !isSelfCorrection && <CheckCircle2 size={10} className="text-fact shrink-0" />}
              {e.status === "error"                          && <XCircle  size={10} className="text-hypothesis shrink-0" />}
              {isSelfCorrection                              && <RefreshCw size={10} className="text-inference shrink-0" />}
              <span className={`flex-1 truncate ${
                e.status === "error"   ? "text-hypothesis"
                : isSelfCorrection     ? "text-inference"
                : lit                  ? "text-teal"
                : "text-text-primary"
              }`}>
                {e.tool}
              </span>
            </div>

            <div className="flex items-center justify-between mt-1.5 text-[9px] text-text-muted opacity-60">
              <span>{fmt(e.timestamp)}</span>
              {e.duration_ms !== undefined && (
                <span className="text-fact opacity-100">{fmtDuration(e.duration_ms)}</span>
              )}
            </div>

            {e.note && (
              <p className="mt-1.5 text-[9px] text-text-muted leading-relaxed opacity-70">{e.note}</p>
            )}
            {e.output_hash && (
              <p className="mt-1 text-[9px] text-text-muted opacity-25 truncate">{e.output_hash}</p>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
