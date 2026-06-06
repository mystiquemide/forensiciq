"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FileDown, Wifi, WifiOff, Loader, Volume2, VolumeX, RefreshCw, AlertTriangle, CheckCircle2, Network, Clock } from "lucide-react";
import { useSound } from "@/hooks/useSound";
import PulseIcon from "@/components/PulseIcon";
import ToolLog from "@/components/ToolLog";
import FindingsSidebar from "@/components/FindingsSidebar";
import AuditTimeline from "@/components/AuditTimeline";
import { useInvestigation } from "@/hooks/useInvestigation";
import { useWebSocket, type WSStatus } from "@/hooks/useWebSocket";
import type { InvestigationState } from "@/types";

const EvidenceGraph = dynamic(() => import("@/components/EvidenceGraph"), { ssr: false });

function pulseState(status: InvestigationState["status"]) {
  if (status === "running" || status === "starting") return "investigating";
  if (status === "correcting") return "correcting";
  if (status === "complete") return "complete";
  if (status === "error") return "error";
  return "idle";
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function WsIndicator({ status, onReconnect }: { status: WSStatus; onReconnect: () => void }) {
  if (status === "connected")
    return <Wifi size={13} className="text-fact" aria-label="Connected" />;
  if (status === "reconnecting" || status === "connecting")
    return <Loader size={13} className="text-inference animate-spin" aria-label="Reconnecting" />;
  return (
    <button
      onClick={onReconnect}
      className="flex items-center gap-1.5 text-hypothesis hover:text-hypothesis/80 transition-colors"
      aria-label="Reconnect"
      title="Connection lost — click to retry"
    >
      <WifiOff size={13} />
      <span className="font-mono text-[9px] uppercase tracking-widest">retry</span>
    </button>
  );
}

interface Props {
  params: { id: string };
}

export default function InvestigationPage({ params }: Props) {
  const { id } = params;
  const { state, handleEvent, dispatch } = useInvestigation();
  const { wsStatus, reconnect } = useWebSocket(id, handleEvent);
  const { muted, toggleMute, playFactPing, playToolStart } = useSound();
  const prevFacts = useRef(0);
  const prevToolLog = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState<"graph" | "timeline">("graph");
  const [highlightedTool, setHighlightedTool] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"log" | "evidence" | "findings">("log");

  const handleSourceClick = useCallback((source: string) => {
    setHighlightedTool((prev) => (prev === source ? null : source));
  }, []);

  useEffect(() => {
    dispatch({ type: "SET_ID", id });
    dispatch({ type: "SET_STATUS", status: "starting" });
  }, [id, dispatch]);

  const facts      = state.findings.filter((f) => f.label === "FACT").length;
  const inferences = state.findings.filter((f) => f.label === "INFERENCE").length;
  const hypotheses = state.findings.filter((f) => f.label === "HYPOTHESIS").length;
  const hasFindings = state.findings.length > 0;

  useEffect(() => {
    if (facts > prevFacts.current) playFactPing();
    prevFacts.current = facts;
  }, [facts, playFactPing]);

  useEffect(() => {
    if (state.toolLog.length > prevToolLog.current) playToolStart();
    prevToolLog.current = state.toolLog.length;
  }, [state.toolLog.length, playToolStart]);

  // Elapsed timer — starts on first "running" or "correcting", freezes on complete/error
  useEffect(() => {
    const active = state.status === "running" || state.status === "correcting";
    if (!active) return;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAtRef.current!) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [state.status]);

  return (
    <div className="flex flex-col h-screen bg-bg-1">

      {/* Top bar */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-border bg-bg-2 shrink-0">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <PulseIcon size={24} state={pulseState(state.status)} />
          <span className="font-display font-semibold text-sm">
            Forens<span className="text-teal font-bold">IQ</span>
          </span>
        </Link>

        <div className="h-4 w-px bg-border shrink-0" />

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-text-muted font-mono text-xs shrink-0">case /</span>
          <span className="text-text-secondary text-xs font-mono truncate">{id}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {hasFindings && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-fact">{facts} FACT</span>
              <span className="text-inference">{inferences} INF</span>
              <span className="text-hypothesis">{hypotheses} HYP</span>
            </div>
          )}

          {state.status === "correcting" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-inference-bg border border-inference-border">
              <RefreshCw size={11} className="text-inference animate-spin" />
              <span className="text-inference text-[10px] font-mono uppercase tracking-widest">
                Correction {state.correctionPass}/3
              </span>
            </div>
          )}

          {(state.status === "running" || state.status === "correcting" || (state.status === "complete" && elapsed > 0)) && (
            <span className="text-text-muted font-mono text-xs tabular-nums">{formatElapsed(elapsed)}</span>
          )}

          <button
            onClick={toggleMute}
            className="text-text-muted hover:text-teal transition-colors p-1"
            aria-label={muted ? "Enable sound" : "Mute"}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <span className="font-mono text-[9px] text-text-muted opacity-40 hidden xl:block">claude-3-5-sonnet</span>

          <WsIndicator status={wsStatus} onReconnect={reconnect} />

          <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-widest font-mono ${
            state.status === "complete"  ? "bg-fact-bg text-fact border border-fact-border"
            : state.status === "error"   ? "bg-hypothesis-bg text-hypothesis border border-hypothesis-border"
            : state.status === "correcting" ? "bg-inference-bg text-inference border border-inference-border animate-pulse"
            : "bg-teal-glow text-teal border border-teal/20 animate-pulse"
          }`}>
            {state.status}
          </span>

          {state.status === "complete" && (
            <a
              href={`/api/report/${id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs bg-teal text-bg-1 font-semibold px-3 py-1.5 rounded-lg hover:bg-teal-dim transition-colors"
            >
              <FileDown size={13} />
              Export Report
            </a>
          )}
        </div>
      </header>

      {/* Error banner */}
      {state.status === "error" && (
        <div className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 bg-hypothesis-bg border-b border-hypothesis-border">
          <AlertTriangle size={13} className="text-hypothesis shrink-0" />
          <span className="text-hypothesis text-xs font-mono">
            {state.errorMessage ?? "Investigation failed. Check backend connection and retry."}
          </span>
        </div>
      )}

      {/* Complete banner */}
      {state.status === "complete" && (
        <div className="shrink-0 flex items-center gap-2.5 px-5 py-2.5 bg-fact-bg border-b border-fact-border">
          <CheckCircle2 size={13} className="text-fact shrink-0" />
          <span className="text-fact text-xs font-mono">
            Investigation complete. {facts} facts, {inferences} inferences, {hypotheses} hypotheses confirmed.
            {state.summary?.narrative && (
              <span className="text-text-secondary ml-2">{state.summary.narrative}</span>
            )}
          </span>
        </div>
      )}

      {/* Dev simulation panel — only in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="shrink-0 flex items-center gap-2 px-5 py-1.5 border-b border-border bg-bg-1">
          <span className="text-text-muted font-mono text-[10px] uppercase tracking-widest mr-1">simulate</span>
          <button onClick={() => { dispatch({ type: "TOOL_START", tool: "volatility.malfind", note: "Scanning for injected code: prior pslist anomaly in svchost.exe PID 1432" }); dispatch({ type: "SET_STATUS", status: "running" }); }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-2 border border-border text-teal hover:border-teal/40 transition-colors">
            tool start
          </button>
          <button onClick={() => { dispatch({ type: "TOOL_COMPLETE", tool: "volatility.malfind", duration_ms: 1240, output_hash: "sha256:abc123def456" }); }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-2 border border-border text-fact hover:border-fact-border transition-colors">
            tool complete
          </button>
          <button onClick={() => { dispatch({ type: "FINDING_NEW", finding: { id: Math.random().toString(36).slice(2), description: "Suspicious process hollowing detected in svchost.exe. Memory region RWX with no backing file.", confidence: 0.91, label: "FACT", sources: ["volatility.malfind", "volatility.cmdline"], contradictions: [], evidence_hash: "sha256:deadbeef", timestamp: new Date().toISOString() } }); }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-2 border border-border text-fact hover:border-fact-border transition-colors">
            + FACT
          </button>
          <button onClick={() => { dispatch({ type: "FINDING_NEW", finding: { id: Math.random().toString(36).slice(2), description: "Registry run key modified within 10 minutes of suspicious process start. Possible persistence mechanism.", confidence: 0.67, label: "INFERENCE", sources: ["regripper"], contradictions: [], evidence_hash: "sha256:cafebabe", timestamp: new Date().toISOString() } }); }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-2 border border-border text-inference hover:border-inference-border transition-colors">
            + INF
          </button>
          <button onClick={() => { dispatch({ type: "SELF_CORRECTION", finding_id: "1", reason: "Confidence below threshold, re-running corroborating tool" }); }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-2 border border-border text-inference hover:border-inference-border transition-colors">
            correcting
          </button>
          <button onClick={() => { dispatch({ type: "SET_ERROR", message: "SSH connection to SIFT VM timed out after 30s." }); }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-2 border border-border text-hypothesis hover:border-hypothesis-border transition-colors">
            error
          </button>
          <button onClick={() => { dispatch({ type: "COMPLETE", summary: { facts: facts || 1, inferences: inferences || 1, hypotheses: hypotheses || 0, narrative: "Agent identified process hollowing as the primary attack vector with high confidence." } }); }}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-2 border border-border text-fact hover:border-fact-border transition-colors">
            complete
          </button>
        </div>
      )}

      {/* Mobile tab bar */}
      <div className="md:hidden shrink-0 flex border-b border-border bg-bg-2">
        {(["log", "evidence", "findings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMobileTab(t)}
            className={`flex-1 py-2.5 font-mono text-[10px] uppercase tracking-widest transition-colors border-b-2 ${
              mobileTab === t ? "text-teal border-teal" : "text-text-muted border-transparent"
            }`}
          >
            {t === "log" ? "Tool Log" : t === "evidence" ? "Evidence" : "Findings"}
          </button>
        ))}
      </div>

      {/* Mobile: single active panel */}
      <div className="md:hidden flex-1 min-h-0 flex flex-col">
        {mobileTab === "log" && (
          <div className="flex-1 min-h-0">
            <ToolLog entries={state.toolLog} highlightedTool={highlightedTool} />
          </div>
        )}
        {mobileTab === "evidence" && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
              <button
                onClick={() => setActiveTab("graph")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  activeTab === "graph" ? "bg-teal text-bg-1 font-medium" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <Network size={11} />
                Evidence Graph
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  activeTab === "timeline" ? "bg-teal text-bg-1 font-medium" : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <Clock size={11} />
                Audit Trail
              </button>
            </div>
            <div className="flex-1 min-h-0 relative">
              {activeTab === "graph"
                ? <EvidenceGraph findings={state.findings} />
                : <AuditTimeline toolLog={state.toolLog} findings={state.findings} caseId={id} onSourceClick={handleSourceClick} highlightedTool={highlightedTool} />
              }
            </div>
          </div>
        )}
        {mobileTab === "findings" && (
          <div className="flex-1 min-h-0">
            <FindingsSidebar
              findings={state.findings}
              summary={state.summary}
              onSourceClick={handleSourceClick}
              highlightedTool={highlightedTool}
            />
          </div>
        )}
      </div>

      {/* Desktop: Three-panel layout */}
      <div className="hidden md:flex flex-1 min-h-0">

        {/* Left: Tool Log */}
        <div className="w-72 shrink-0 flex flex-col border-r border-border">
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <span className="text-xs font-mono uppercase tracking-widest text-text-muted">Tool Log</span>
          </div>
          <div className="flex-1 min-h-0">
            <ToolLog entries={state.toolLog} highlightedTool={highlightedTool} />
          </div>
        </div>

        {/* Center: Evidence Graph / Audit Timeline */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                activeTab === "graph" ? "bg-teal text-bg-1 font-medium" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Network size={11} />
              Evidence Graph
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                activeTab === "timeline" ? "bg-teal text-bg-1 font-medium" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <Clock size={11} />
              Audit Trail
            </button>
          </div>
          <div className="flex-1 min-h-0 relative">
            {activeTab === "graph"
              ? <EvidenceGraph findings={state.findings} />
              : <AuditTimeline toolLog={state.toolLog} findings={state.findings} caseId={id} onSourceClick={handleSourceClick} highlightedTool={highlightedTool} />
            }
          </div>
        </div>

        {/* Right: Findings */}
        <div className="w-80 shrink-0 flex flex-col border-l border-border">
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <span className="text-xs font-mono uppercase tracking-widest text-text-muted">Findings</span>
          </div>
          <div className="flex-1 min-h-0">
            <FindingsSidebar
              findings={state.findings}
              summary={state.summary}
              onSourceClick={handleSourceClick}
              highlightedTool={highlightedTool}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
