"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Play, AlertTriangle } from "lucide-react";

type LogItem = {
  type: "run" | "ok" | "warn";
  tool: string;
  text: string;
};

type Finding = {
  tier: "FACT" | "INFERENCE" | "HYPOTHESIS";
  confidence: number;
  title: string;
  sources: number;
};

type FeedEvent =
  | { kind: "log"; item: LogItem }
  | { kind: "finding"; item: Finding }
  | { kind: "complete" };

const SCRIPT: Array<FeedEvent & { t: number }> = [
  { t: 0,    kind: "log",     item: { type: "run", tool: "volatility",   text: "pslist — scanning process table" } },
  { t: 900,  kind: "log",     item: { type: "ok",  tool: "volatility",   text: "47 processes identified" } },
  { t: 1300, kind: "log",     item: { type: "run", tool: "strings",      text: "deep analysis on pid:1892" } },
  { t: 2100, kind: "log",     item: { type: "ok",  tool: "strings",      text: "C2 domain in memory: evil.ru" } },
  { t: 2500, kind: "finding", item: { tier: "FACT",       confidence: 92, title: "Malicious outbound connection from pid:1892 (svchost.exe)", sources: 4 } },
  { t: 3200, kind: "log",     item: { type: "run", tool: "yara",         text: "APT_Backdoor_v3 ruleset scan" } },
  { t: 4000, kind: "log",     item: { type: "ok",  tool: "yara",         text: "3 signature matches in pid:1892" } },
  { t: 4400, kind: "finding", item: { tier: "INFERENCE",  confidence: 67, title: "APT_Backdoor_v3 signature in process memory region", sources: 2 } },
  { t: 5200, kind: "log",     item: { type: "run", tool: "log2timeline", text: "event correlation across artifacts" } },
  { t: 6100, kind: "log",     item: { type: "warn", tool: "log2timeline", text: "pid:1892 spawned at 03:42 UTC — anomalous" } },
  { t: 6600, kind: "finding", item: { tier: "HYPOTHESIS", confidence: 38, title: "Lateral movement via SMB to 192.168.1.44", sources: 1 } },
  { t: 7400, kind: "complete" },
];

const LOOP_RESET_AT = 10000;

const TIER_STYLES = {
  FACT:       { color: "text-fact",       bg: "bg-fact-bg",       border: "border-fact-border" },
  INFERENCE:  { color: "text-inference",  bg: "bg-inference-bg",  border: "border-inference-border" },
  HYPOTHESIS: { color: "text-hypothesis", bg: "bg-hypothesis-bg", border: "border-hypothesis-border" },
};

export default function MockFeed() {
  const [logs, setLogs]         = useState<LogItem[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [done, setDone]         = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  function boot() {
    setLogs([]);
    setFindings([]);
    setDone(false);

    const ids = SCRIPT.map((step) =>
      setTimeout(() => {
        if (step.kind === "log")      setLogs((l) => [...l, step.item]);
        if (step.kind === "finding")  setFindings((f) => [...f, step.item]);
        if (step.kind === "complete") setDone(true);
      }, step.t)
    );

    ids.push(setTimeout(boot, LOOP_RESET_AT));
    timers.current = ids;
  }

  useEffect(() => {
    boot();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <section className="py-24 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="mb-14">
          <h2 className="font-display text-4xl font-bold text-text-primary max-w-xl">
            Watch the agent work in real time.
          </h2>
          <p className="mt-4 text-text-secondary text-base max-w-lg">
            Every tool call streams as it runs. Findings appear the moment confidence crosses a threshold.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

          {/* Tool log panel */}
          <div className="bg-bg-2 border border-border rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-hypothesis opacity-60" />
              <span className="w-2.5 h-2.5 rounded-full bg-inference opacity-60" />
              <span className="w-2.5 h-2.5 rounded-full bg-fact opacity-60" />
              <span className="font-mono text-xs text-text-muted ml-2">forensiciq — tool log</span>
              {!done && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />}
              {done  && <span className="ml-auto font-mono text-xs text-fact">complete</span>}
            </div>

            <div
              ref={logRef}
              className="flex-1 overflow-y-auto p-5 space-y-3 font-mono text-xs min-h-[320px] max-h-[400px]"
            >
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 items-start animate-slide-up">
                  <span className="shrink-0 mt-0.5">
                    {log.type === "run"  && <Play        size={12} className="text-teal" />}
                    {log.type === "ok"   && <CheckCircle2 size={12} className="text-fact" />}
                    {log.type === "warn" && <AlertTriangle size={12} className="text-inference" />}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-teal font-medium">{log.tool}</span>
                    <span className={
                      log.type === "run"  ? "text-text-muted" :
                      log.type === "warn" ? "text-inference"  :
                      "text-text-secondary"
                    }>
                      {log.text}
                    </span>
                  </div>
                </div>
              ))}

              {!done && logs.length > 0 && (
                <div className="flex gap-3 items-center">
                  <span className="w-3 h-3 shrink-0" />
                  <span className="inline-block w-0.5 h-3.5 bg-teal animate-pulse" />
                </div>
              )}
            </div>
          </div>

          {/* Findings panel */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs uppercase tracking-widest text-text-muted">Findings</span>
              <span className="font-mono text-xs text-text-muted">{findings.length} / 3</span>
            </div>

            {findings.map((f, i) => {
              const s = TIER_STYLES[f.tier];
              return (
                <div
                  key={i}
                  className={`${s.bg} border ${s.border} rounded-xl p-4 flex flex-col gap-3 animate-slide-up`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`${s.color} font-mono font-semibold text-xs tracking-widest`}>
                      {f.tier}
                    </span>
                    <span className={`${s.color} font-mono font-bold text-sm`}>
                      {f.confidence}%
                    </span>
                  </div>
                  <p className="text-text-primary text-sm font-medium leading-snug">{f.title}</p>
                  <p className="text-text-muted text-xs font-mono">
                    {f.sources} {f.sources === 1 ? "source" : "sources"} corroborated
                  </p>
                </div>
              );
            })}

            {findings.length === 0 && (
              <div className="flex-1 flex items-center justify-center border border-dashed border-border rounded-xl min-h-[200px]">
                <p className="text-text-muted font-mono text-xs">awaiting analysis...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
