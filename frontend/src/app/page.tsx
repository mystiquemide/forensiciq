"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PulseIcon from "@/components/PulseIcon";

export default function HomePage() {
  const router = useRouter();
  const [casePath, setCasePath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!casePath.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/investigation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_path: casePath.trim() }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      router.push(`/investigation/${data.investigation_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start investigation");
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <PulseIcon size={48} state="idle" />
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Forens<span className="text-teal font-bold">IQ</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1">Facts, not guesses. Evidence, not vibes.</p>
        </div>
      </div>

      {/* Tagline */}
      <p className="text-text-secondary text-center max-w-md mb-12 leading-relaxed">
        The only DFIR agent that knows what it doesn&apos;t know. Every finding is labeled{" "}
        <span className="text-fact font-medium font-mono">FACT</span>,{" "}
        <span className="text-inference font-medium font-mono">INFERENCE</span>, or{" "}
        <span className="text-hypothesis font-medium font-mono">HYPOTHESIS</span> — with confidence scores backed by multi-tool corroboration.
      </p>

      {/* Confidence tier legend */}
      <div className="flex gap-4 mb-12">
        {[
          { label: "FACT", desc: "≥85% · 3+ tools", color: "text-fact", bg: "bg-fact-bg border-fact-border" },
          { label: "INFERENCE", desc: "50–84% · 1-2 tools", color: "text-inference", bg: "bg-inference-bg border-inference-border" },
          { label: "HYPOTHESIS", desc: "<50% · needs review", color: "text-hypothesis", bg: "bg-hypothesis-bg border-hypothesis-border" },
        ].map(({ label, desc, color, bg }) => (
          <div key={label} className={`${bg} border rounded-lg px-4 py-3 text-center`}>
            <div className={`${color} font-mono font-medium text-sm`}>{label}</div>
            <div className="text-text-muted text-xs mt-1">{desc}</div>
          </div>
        ))}
      </div>

      {/* Start form */}
      <form onSubmit={handleStart} className="w-full max-w-lg">
        <div className="bg-bg-2 border border-border rounded-xl p-6">
          <label className="block text-xs text-text-secondary mb-2 font-medium uppercase tracking-widest">
            Case Path (SIFT VM)
          </label>
          <input
            type="text"
            value={casePath}
            onChange={(e) => setCasePath(e.target.value)}
            placeholder="/cases/incident-2026-06/disk.img"
            disabled={loading}
            className="w-full bg-bg-1 border border-border rounded-lg px-4 py-3 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal transition-colors disabled:opacity-50"
          />
          {error && (
            <p className="text-hypothesis text-sm mt-3 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-hypothesis shrink-0" />
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !casePath.trim()}
            className="w-full mt-4 bg-teal text-bg-1 font-semibold py-3 rounded-lg hover:bg-teal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting investigation...
              </>
            ) : (
              "Begin Investigation"
            )}
          </button>
        </div>
      </form>

      {/* Footer */}
      <p className="mt-12 text-text-muted text-xs text-center">
        Built for SANS Find Evil! Hackathon · June 2026
      </p>
    </main>
  );
}
