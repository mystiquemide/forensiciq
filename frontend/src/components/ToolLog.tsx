"use client";

import { useEffect, useRef } from "react";
import type { ToolLogEntry } from "@/types";

interface Props {
  entries: ToolLogEntry[];
}

const STATUS_COLOR: Record<ToolLogEntry["status"], string> = {
  running: "text-teal",
  complete: "text-fact",
  error: "text-hypothesis",
};

const STATUS_ICON: Record<ToolLogEntry["status"], string> = {
  running: "▶",
  complete: "✓",
  error: "✗",
};

export default function ToolLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length]);

  return (
    <div className="h-full overflow-y-auto bg-bg-2 rounded-lg border border-border p-3 font-mono text-xs">
      {entries.length === 0 && (
        <p className="text-text-muted italic">Waiting for investigation to start...</p>
      )}
      {entries.map((entry) => (
        <div key={entry.id} className="mb-2 last:mb-0">
          <div className="flex items-start gap-2">
            <span className={`${STATUS_COLOR[entry.status]} shrink-0 mt-0.5`}>
              {STATUS_ICON[entry.status]}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-teal">{entry.tool}</span>
              {entry.duration_ms !== undefined && (
                <span className="text-text-muted ml-2">{entry.duration_ms}ms</span>
              )}
              <span className="text-text-muted ml-2">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              {entry.note && (
                <div className="text-inference mt-0.5">⚠ {entry.note}</div>
              )}
              {entry.output_hash && (
                <div className="text-text-muted truncate mt-0.5 text-[10px]">
                  {entry.output_hash.slice(0, 16)}…
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
