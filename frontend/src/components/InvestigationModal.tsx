"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, Terminal, ArrowRight, AlertCircle, Lock } from "lucide-react";
import PulseIcon from "./PulseIcon";

interface Props {
  open: boolean;
  onClose: () => void;
}

const TIERS = [
  { label: "FACT",       color: "text-fact",       bg: "bg-fact-bg",       border: "border-fact-border" },
  { label: "INFERENCE",  color: "text-inference",   bg: "bg-inference-bg",  border: "border-inference-border" },
  { label: "HYPOTHESIS", color: "text-hypothesis",  bg: "bg-hypothesis-bg", border: "border-hypothesis-border" },
];

export default function InvestigationModal({ open, onClose }: Props) {
  const router = useRouter();
  const [casePath, setCasePath] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setTimeout(() => inputRef.current?.focus(), 80);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleClose() {
    if (loading) return;
    setError("");
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!casePath.trim() || loading) return;
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
      onClose();
      router.push(`/investigation/${data.investigation_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start investigation");
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-bg-1 z-[100] flex items-center justify-center px-4"
      onClick={handleClose}
    >
      {/* Full-screen radar background */}
      <svg
        viewBox="0 0 420 420"
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ width: 900, height: 900, top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.13 }}
      >
        <circle
          cx="210" cy="210" r="190"
          fill="none" stroke="#00D4B8" strokeWidth="0.8" strokeDasharray="10 7"
          style={{ transformOrigin: "210px 210px", animation: "spin-reverse 28s linear infinite" }}
        />
        <circle
          cx="210" cy="210" r="145"
          fill="none" stroke="#00D4B8" strokeWidth="0.8" strokeDasharray="18 10"
          style={{ transformOrigin: "210px 210px", animation: "spin 20s linear infinite" }}
        />
        <circle cx="210" cy="210" r="100" fill="none" stroke="#00D4B8" strokeWidth="1" />
        <line
          x1="210" y1="210" x2="210" y2="20"
          stroke="#00D4B8" strokeWidth="1"
          style={{ transformOrigin: "210px 210px", animation: "radar-sweep 6s linear infinite" }}
        />
        <line x1="210" y1="10"  x2="210" y2="24"  stroke="#00D4B8" strokeWidth="0.8" />
        <line x1="210" y1="396" x2="210" y2="410" stroke="#00D4B8" strokeWidth="0.8" />
        <line x1="10"  y1="210" x2="24"  y2="210" stroke="#00D4B8" strokeWidth="0.8" />
        <line x1="396" y1="210" x2="410" y2="210" stroke="#00D4B8" strokeWidth="0.8" />
        <circle
          cx="210" cy="210" r="50"
          fill="none" stroke="#00D4B8" strokeWidth="1.2"
          style={{ transformOrigin: "210px 210px", animation: "spin-reverse 8s linear infinite" }}
        />
        <circle cx="210" cy="210" r="18" fill="none" stroke="#00D4B8" strokeWidth="1"
          style={{ animation: "pulse-teal 2s ease-in-out infinite" }}
        />
        <circle cx="210" cy="210" r="5" fill="#00D4B8" />
      </svg>

      {/* Modal panel */}
      <div
        className="relative w-full max-w-md bg-bg-2 border border-border rounded-2xl p-8 animate-slide-up shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <PulseIcon size={22} state="investigating" />
            <span className="font-display font-semibold text-sm tracking-tight text-text-primary">
              Forens<span className="text-teal font-bold">IQ</span>
            </span>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-text-muted hover:text-text-secondary transition-colors disabled:opacity-40 p-1 -mr-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-t border-border mb-6" />

        <h2 className="font-display font-bold text-xl text-text-primary mb-2">
          Start investigation
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          Enter the path to your evidence on the SIFT workstation. The agent connects over SSH and begins immediately.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex items-center gap-3 bg-bg-3 border border-border rounded-xl px-4 py-3 focus-within:border-teal transition-colors">
            <Terminal size={15} className="text-text-muted shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={casePath}
              onChange={(e) => setCasePath(e.target.value)}
              placeholder="/cases/incident-2026-06/disk.img"
              disabled={loading}
              className="flex-1 bg-transparent font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !casePath.trim()}
            className="w-full flex items-center justify-center gap-2 bg-teal text-bg-1 font-semibold text-sm py-3 rounded-xl hover:bg-teal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </>
            ) : (
              <>Begin Investigation <ArrowRight size={15} /></>
            )}
          </button>

          {error && (
            <p className="flex items-center gap-1.5 text-hypothesis text-sm">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </p>
          )}
        </form>

        <div className="flex items-center gap-2 mt-6">
          {TIERS.map(({ label, color, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-md px-2.5 py-1`}>
              <span className={`${color} font-mono font-medium text-xs`}>{label}</span>
            </div>
          ))}
          <span className="text-text-muted text-xs ml-1">confidence tiers assigned automatically</span>
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <Lock size={12} className="text-text-muted shrink-0" />
          <span className="text-text-muted text-xs">Evidence never leaves your network.</span>
        </div>
      </div>
    </div>
  );
}
