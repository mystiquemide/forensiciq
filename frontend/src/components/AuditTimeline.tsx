"use client";

import type { Finding, ToolLogEntry } from "@/types";
import { LABEL_COLORS } from "@/types";

function SessionHeader({ caseId, startTs, eventCount, hash }: {
  caseId: string;
  startTs: number | null;
  eventCount: number;
  hash: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[9px]">
      <span className="text-text-muted uppercase tracking-widest">case_id</span>
      <span className="text-text-secondary truncate">{caseId}</span>
      <span className="text-text-muted uppercase tracking-widest">model</span>
      <span className="text-teal">claude-3-5-sonnet-20241022</span>
      <span className="text-text-muted uppercase tracking-widest">started</span>
      <span className="text-text-secondary">{startTs ? new Date(startTs).toLocaleTimeString("en-US", { hour12: false }) : "pending"}</span>
      <span className="text-text-muted uppercase tracking-widest">events</span>
      <span className="text-text-secondary">{eventCount}</span>
      <span className="text-text-muted uppercase tracking-widest">run_hash</span>
      <span className="text-teal opacity-70 truncate">{hash ? `sha256:${hash}` : "pending"}</span>
    </div>
  );
}

type TimelineEvent =
  | { kind: "tool";    ts: number; entry: ToolLogEntry }
  | { kind: "finding"; ts: number; finding: Finding };

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDuration(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

interface Props {
  toolLog: ToolLogEntry[];
  findings: Finding[];
  caseId?: string;
  onSourceClick?: (source: string) => void;
  highlightedTool?: string | null;
}

function runHash(id: string, count: number): string {
  let h = 5381;
  const s = id + count;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0").repeat(2);
}

export default function AuditTimeline({ toolLog, findings, caseId, onSourceClick, highlightedTool }: Props) {
  const events: TimelineEvent[] = [
    ...toolLog.map((e): TimelineEvent => ({ kind: "tool", ts: e.timestamp, entry: e })),
    ...findings.map((f): TimelineEvent => ({ kind: "finding", ts: new Date(f.timestamp).getTime(), finding: f })),
  ].sort((a, b) => a.ts - b.ts);

  const startTs = events.length > 0 ? events[0].ts : null;
  const hash = caseId ? runHash(caseId, events.length) : null;

  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col">
        {caseId && (
          <div className="shrink-0 mx-6 mt-5 mb-4 p-3 rounded-lg bg-bg-2 border border-border/50">
            <SessionHeader caseId={caseId} startTs={null} eventCount={0} hash={hash} />
          </div>
        )}
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-muted font-mono text-xs opacity-40">&gt;_ audit trail populates as agent runs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-5">
      {caseId && (
        <div className="mb-5 p-3 rounded-lg bg-bg-2 border border-border/50">
          <SessionHeader caseId={caseId} startTs={startTs} eventCount={events.length} hash={hash} />
        </div>
      )}
      <div className="relative">
        <div className="absolute left-[5.25rem] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-5">
          {events.map((evt, i) => {
            if (evt.kind === "tool") {
              const e = evt.entry;
              const isSelf = e.tool === "self-correction";
              const dotColor =
                e.status === "complete" ? "#10D98A"
                : e.status === "error"  ? "#F05060"
                : "#F0A832";

              return (
                <div key={e.id} className="flex gap-4 items-start">
                  <span className="w-[4.5rem] shrink-0 text-right font-mono text-[10px] text-text-muted opacity-50 pt-0.5">
                    {fmt(e.timestamp)}
                  </span>

                  <div className="relative z-10 mt-1 shrink-0 w-3 flex items-center justify-center">
                    <div
                      className={`w-2 h-2 rounded-full ${e.status === "running" ? "animate-pulse" : ""}`}
                      style={{ background: dotColor }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-xs font-medium ${
                        isSelf           ? "text-inference"
                        : e.status === "error" ? "text-hypothesis"
                        : "text-text-primary"
                      }`}>
                        {e.tool}
                      </span>
                      {e.status === "running" && (
                        <span className="text-[9px] font-mono text-inference opacity-70">running</span>
                      )}
                      {e.duration_ms !== undefined && (
                        <span className="text-[9px] font-mono text-fact">{fmtDuration(e.duration_ms)}</span>
                      )}
                    </div>
                    {e.note && (
                      <p className="mt-0.5 text-[10px] text-text-muted leading-relaxed">{e.note}</p>
                    )}
                    {e.output_hash && (
                      <p className="mt-0.5 font-mono text-[9px] text-text-muted opacity-25 truncate">{e.output_hash}</p>
                    )}
                  </div>
                </div>
              );
            } else {
              const f = evt.finding;
              const color = LABEL_COLORS[f.label];
              return (
                <div key={f.id} className="flex gap-4 items-start">
                  <span className="w-[4.5rem] shrink-0 text-right font-mono text-[10px] text-text-muted opacity-50 pt-0.5">
                    {fmt(new Date(f.timestamp).getTime())}
                  </span>

                  <div className="relative z-10 mt-0.5 shrink-0 w-3 flex items-center justify-center">
                    <div
                      className="w-2.5 h-2.5 rotate-45"
                      style={{ background: color, borderRadius: "2px" }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-semibold" style={{ color }}>{f.label}</span>
                      <span className="text-[10px] font-mono text-text-muted opacity-60">{Math.round(f.confidence * 100)}%</span>
                    </div>
                    <p className="mt-0.5 text-xs text-text-secondary leading-relaxed line-clamp-2">{f.description}</p>
                    <div className="mt-1.5 flex gap-1 flex-wrap">
                      {f.sources.map((s) => (
                        <button
                          key={s}
                          onClick={() => onSourceClick?.(s)}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                            highlightedTool && (s === highlightedTool || s.startsWith(highlightedTool) || highlightedTool.startsWith(s))
                              ? "bg-teal/20 text-teal"
                              : "bg-teal/5 text-teal hover:bg-teal/15"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                      {f.contradictions.length > 0 && (
                        <span className="text-[9px] font-mono text-hypothesis">
                          {f.contradictions.length} contradiction{f.contradictions.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-[9px] text-text-muted opacity-20 truncate">{f.evidence_hash}</p>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}
