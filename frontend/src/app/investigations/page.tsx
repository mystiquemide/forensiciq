"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader, AlertTriangle, FolderOpen } from "lucide-react";
import PulseIcon from "@/components/PulseIcon";

interface InvestigationRecord {
  id: string;
  status: "running" | "complete" | "error";
  created_at: string;
  duration_ms?: number;
  findings: { facts: number; inferences: number; hypotheses: number };
  case_path?: string;
}

const STATUS_STYLE: Record<InvestigationRecord["status"], string> = {
  running:  "bg-teal/10 text-teal border border-teal/20",
  complete: "bg-fact-bg text-fact border border-fact-border",
  error:    "bg-hypothesis-bg text-hypothesis border border-hypothesis-border",
};

function fmtDuration(ms: number) {
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

export default function InvestigationsPage() {
  const [records, setRecords] = useState<InvestigationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/investigations")
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then((data: InvestigationRecord[]) => {
        setRecords(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-bg-1">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-bg-2">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <PulseIcon size={22} state="idle" />
          <span className="font-display font-semibold text-sm tracking-tight">
            Forens<span className="text-teal font-bold">IQ</span>
          </span>
        </Link>
        <h1 className="font-mono text-xs uppercase tracking-widest text-text-muted">Investigations</h1>
        <Link
          href="/"
          className="flex items-center gap-2 bg-teal text-bg-1 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-teal-dim transition-colors"
        >
          New Investigation <ArrowRight size={13} />
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {loading && (
          <div className="flex items-center justify-center py-32 gap-3">
            <Loader size={16} className="text-teal animate-spin" />
            <span className="text-text-muted font-mono text-sm">Fetching investigations...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertTriangle size={24} className="text-hypothesis opacity-50" />
            <p className="text-text-muted text-sm text-center">
              Could not reach the backend.<br />
              <span className="font-mono text-xs opacity-60">{error}</span>
            </p>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <FolderOpen size={28} className="text-text-muted opacity-20" />
            <p className="text-text-muted text-sm">No investigations yet.</p>
            <Link
              href="/"
              className="text-teal font-mono text-sm hover:underline"
            >
              Start your first investigation
            </Link>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-bg-2 border-b border-border">
              {["Case ID", "Status", "Started", "Duration", "Findings"].map((h) => (
                <span key={h} className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{h}</span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {records.map((r) => (
                <Link
                  key={r.id}
                  href={`/investigation/${r.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-4 hover:bg-bg-2/50 transition-colors items-center group"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-text-primary truncate block">{r.id}</span>
                    {r.case_path && (
                      <span className="font-mono text-[10px] text-text-muted opacity-50 truncate block mt-0.5">{r.case_path}</span>
                    )}
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md uppercase tracking-widest whitespace-nowrap ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>

                  <span className="font-mono text-xs text-text-secondary whitespace-nowrap">
                    {fmtDate(r.created_at)}
                  </span>

                  <span className="font-mono text-xs text-text-muted whitespace-nowrap">
                    {r.duration_ms ? fmtDuration(r.duration_ms) : "--"}
                  </span>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-fact">{r.findings.facts}F</span>
                    <span className="text-inference">{r.findings.inferences}I</span>
                    <span className="text-hypothesis">{r.findings.hypotheses}H</span>
                    <ArrowRight size={12} className="text-text-muted opacity-0 group-hover:opacity-60 transition-opacity ml-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
