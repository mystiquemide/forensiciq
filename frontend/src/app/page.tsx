"use client";

import { useState, useEffect } from "react";
import { ArrowRight, FolderOpen, Cpu, GitMerge, FileDown } from "lucide-react";
import Nav from "@/components/Nav";
import ReticleHero from "@/components/ReticleHero";
import PulseIcon from "@/components/PulseIcon";
import Preloader from "@/components/Preloader";
import MockFeed from "@/components/MockFeed";
import InvestigationModal from "@/components/InvestigationModal";

const TIERS = [
  { label: "FACT", desc: "3+ tools, 85%+", color: "text-fact", bg: "bg-fact-bg", border: "border-fact-border" },
  { label: "INFERENCE", desc: "1-2 tools, 50-84%", color: "text-inference", bg: "bg-inference-bg", border: "border-inference-border" },
  { label: "HYPOTHESIS", desc: "Single source, below 50%", color: "text-hypothesis", bg: "bg-hypothesis-bg", border: "border-hypothesis-border" },
];

const FEATURES = [
  {
    id: "01",
    title: "Calibrated Confidence Scoring",
    desc: "Every finding starts at 50% and adjusts deterministically. Each corroborating tool adds 20%, each contradiction removes 25%. No hallucinated confidence scores.",
  },
  {
    id: "02",
    title: "Live Evidence Graph",
    desc: "Findings render as nodes in a React Flow graph, colored by confidence tier in real time. Edges connect findings that share corroborating sources.",
  },
  {
    id: "03",
    title: "8 SIFT Tool Wrappers",
    desc: "Volatility, RegRipper, log2timeline, YARA, Sleuth Kit, strings, file identification, and hash computation all run autonomously over SSH.",
  },
  {
    id: "04",
    title: "Self-Correction Loop",
    desc: "After each tool run, the agent reviews findings below 70% confidence and selects the best corroborating tool to re-run. Up to 3 correction passes per investigation.",
  },
  {
    id: "05",
    title: "Cryptographic Audit Trail",
    desc: "Every tool call produces a SHA-256 hash of its raw output. Every finding links back to the exact tool output that created it. Fully verifiable chain of custody.",
  },
  {
    id: "06",
    title: "Structured HTML Report",
    desc: "One click exports a complete report with FACT, INFERENCE, and HYPOTHESIS sections plus the full audit trail. Ready for incident review or court submission.",
  },
];

const STEPS = [
  {
    icon: FolderOpen,
    step: "01",
    title: "Provide Case Path",
    desc: "Enter the path to your evidence on the SIFT VM. ForensIQ connects over SSH and begins immediately.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Agent Investigates",
    desc: "Claude autonomously selects and runs forensic tools. Every execution streams live to your tool log.",
  },
  {
    icon: GitMerge,
    step: "03",
    title: "Evidence Builds",
    desc: "Findings appear in the evidence graph labeled FACT, INFERENCE, or HYPOTHESIS as confidence scores update in real time.",
  },
  {
    icon: FileDown,
    step: "04",
    title: "Export Report",
    desc: "When complete, export a cryptographically audited HTML report with every finding, source, and hash.",
  },
];

const FAQS = [
  {
    q: "What makes ForensIQ different from running forensic tools manually?",
    a: "Manual DFIR requires an analyst to choose tools, run them, interpret output, and decide what to corroborate next. ForensIQ automates the entire loop: tool selection, execution, confidence scoring, and self-correction, all over SSH to your existing SIFT workstation. An analyst can start an investigation and return to a structured, auditable report.",
  },
  {
    q: "How does confidence scoring work?",
    a: "Every finding starts at 50%. Each additional tool that independently corroborates it adds 20%. Each contradiction removes 25%. The math is deterministic and fully transparent, so a FACT at 92% means four independent tools confirmed it. No black-box LLM confidence numbers.",
  },
  {
    q: "Can I trust the findings in a legal or court context?",
    a: "Every tool call produces a SHA-256 hash of its raw output. Every finding links back to the exact tool output that produced it. The exported HTML report includes the full audit trail, so the chain of custody from evidence to conclusion is cryptographically verifiable.",
  },
  {
    q: "Does this replace a human forensic analyst?",
    a: "No, and it's not designed to. ForensIQ handles the mechanical work: running tools, correlating output, scoring confidence, and generating the initial report. The analyst still owns the investigation, reviews findings, and makes the final call. ForensIQ just eliminates the hours of manual tool execution.",
  },
  {
    q: "What forensic tools does it support?",
    a: "The current build includes wrappers for Volatility, RegRipper, log2timeline, YARA, The Sleuth Kit, strings, file identification, and hash computation. All tools run remotely over SSH on your SIFT workstation, so nothing needs to be installed on the analyst's machine.",
  },
  {
    q: "What evidence formats are supported?",
    a: "Any evidence path accessible on the SIFT VM works: disk images (.img, .dd, .E01), memory dumps, and log directories. ForensIQ passes the path directly to the appropriate tools.",
  },
];

function FaqList() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="flex flex-col divide-y divide-border">
      {FAQS.map(({ q, a }, i) => (
        <div key={i} className="py-5">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-start justify-between gap-4 text-left group"
          >
            <span className="font-display font-medium text-text-primary text-base group-hover:text-teal transition-colors">
              {q}
            </span>
            <span className={`shrink-0 font-mono text-teal text-lg leading-none mt-0.5 transition-transform duration-200 ${open === i ? "rotate-45" : "rotate-0"}`}>
              +
            </span>
          </button>
          {open === i && (
            <p className="mt-4 text-text-secondary text-sm leading-relaxed animate-slide-up">
              {a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [toolsCount, setToolsCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.tools_available) setToolsCount(data.tools_available); })
      .catch(() => {});
  }, []);

  return (
    <>
      {!preloaderDone && <Preloader onDone={() => setPreloaderDone(true)} />}
      <InvestigationModal open={showModal} onClose={() => setShowModal(false)} />
      <Nav onBeginInvestigation={() => setShowModal(true)} />

      <main className="relative z-10">

        {/* Hero */}
        <section className="min-h-screen flex items-center px-6 pt-24 pb-16">
          <div className="max-w-7xl mx-auto w-full flex items-center gap-16 xl:gap-24">

            {/* Left column */}
            <div className="flex-1 min-w-0 max-w-2xl">
              <h1 className="font-display text-6xl xl:text-7xl font-bold leading-tight text-text-primary">
                {preloaderDone ? (
                  <>
                    {["Facts", "and", "evidence."].map((word, i, arr) => (
                      <span key={i} className="inline-block animate-slide-up" style={{ animationDelay: `${i * 70}ms`, marginRight: i < arr.length - 1 ? "0.25em" : 0 }}>
                        {word}
                      </span>
                    ))}
                    <br />
                    {["No", "guesses."].map((word, i, arr) => (
                      <span key={i} className="inline-block animate-slide-up" style={{ animationDelay: `${240 + i * 70}ms`, marginRight: i < arr.length - 1 ? "0.25em" : 0 }}>
                        {word}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="opacity-0">Facts and evidence.<br />No guesses.</span>
                )}
              </h1>

              <p className="mt-6 text-text-secondary text-lg leading-relaxed max-w-lg">
                The only DFIR agent that labels every finding FACT, INFERENCE, or HYPOTHESIS
                based on calibrated confidence scoring from multi-tool corroboration.
              </p>

              <div id="start" className="mt-10">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-teal text-bg-1 font-semibold text-sm px-6 py-3 rounded-xl hover:bg-teal-dim transition-colors"
                >
                  Begin Investigation <ArrowRight size={15} />
                </button>
              </div>

              <div className="flex items-center gap-3 mt-8">
                {TIERS.map(({ label, desc, color, bg, border }) => (
                  <div key={label} className={`${bg} border ${border} rounded-lg px-3 py-2 text-center`}>
                    <div className={`${color} font-mono font-medium text-xs`}>{label}</div>
                    <div className="text-text-muted text-xs mt-0.5">{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column */}
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <ReticleHero />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-14 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
            {[
              { stat: toolsCount !== null ? String(toolsCount) : "8", label: "Forensic Tools" },
              { stat: "3",       label: "Confidence Tiers" },
              { stat: "SHA-256", label: "Audit Chain" },
              { stat: "0",       label: "Hallucinated Scores" },
            ].map(({ stat, label }) => (
              <div key={label} className="flex flex-col gap-2">
                <span className="font-display font-bold text-5xl text-text-primary">{stat}</span>
                <span className="font-mono text-xs uppercase tracking-widest text-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Mock Feed */}
        <MockFeed />

        {/* Features */}
        <section id="features" className="py-24 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="mb-14">
              <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">Features</p>
              <h2 className="font-display text-4xl font-bold text-text-primary max-w-xl">
                Built for analysts who need to know what they know.
              </h2>
            </div>
            <div className="divide-y divide-border">
              {FEATURES.map(({ id, title, desc }, i) => (
                <div
                  key={title}
                  className="grid grid-cols-3 gap-8 py-8 animate-slide-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="col-span-1">
                    <span className="font-mono text-[10px] text-teal opacity-60 block mb-2">{id}</span>
                    <h3 className="font-display font-semibold text-text-primary text-base">{title}</h3>
                  </div>
                  <p className="col-span-2 text-text-secondary text-sm leading-relaxed self-center">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="mb-14">
              <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">How it Works</p>
              <h2 className="font-display text-4xl font-bold text-text-primary max-w-xl">
                From evidence path to verified report in minutes.
              </h2>
            </div>
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="absolute top-[13px] left-[calc(12.5%+14px)] right-[calc(12.5%+14px)] h-px border-t border-dashed border-border/50 pointer-events-none hidden md:block" />
              {STEPS.map(({ icon: Icon, step, title, desc }, i) => (
                <div
                  key={step}
                  className="relative flex flex-col gap-4 animate-slide-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="font-mono text-[10px] text-teal bg-bg-1 border border-border rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                      {step}
                    </span>
                    <Icon size={15} className="text-teal opacity-50" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-text-primary text-base mb-1">{title}</h3>
                    <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security Guardrails */}
        <section className="py-24 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="mb-14">
              <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">Security Guardrails</p>
              <h2 className="font-display text-4xl font-bold text-text-primary max-w-xl">
                Built so the agent cannot go off-script.
              </h2>
              <p className="mt-4 text-text-secondary text-base max-w-2xl leading-relaxed">
                Every boundary is enforced at the architecture level, not just the prompt. The agent operates inside a narrow execution envelope it cannot escape.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
              {[
                {
                  id: "01",
                  title: "SSH Read-Only Session",
                  desc: "The agent connects with credentials scoped to read access only. It cannot write, delete, move, or exfiltrate any file on the SIFT workstation. Evidence integrity is architectural, not policy.",
                },
                {
                  id: "02",
                  title: "Predefined Tool Registry",
                  desc: "The agent selects from a fixed registry of 8 forensic tool wrappers. There is no exec, shell, or eval path. Arbitrary command execution is not possible regardless of what the evidence contains.",
                },
                {
                  id: "03",
                  title: "Hash Before LLM",
                  desc: "Every tool output is SHA-256 hashed before the LLM processes it. Content injected into artifacts, filenames, or log entries cannot overwrite the cryptographic record of what the tool actually returned.",
                },
                {
                  id: "04",
                  title: "Session Isolation",
                  desc: "Each investigation runs in a sealed context. Tool outputs, findings, and confidence scores from one case cannot propagate to another. There is no shared state between investigations.",
                },
                {
                  id: "05",
                  title: "Confidence Floor Suppression",
                  desc: "Any finding that cannot corroborate to INFERENCE tier (50% confidence) via at least one independent tool is suppressed from the final report. Unsubstantiated claims never reach the analyst.",
                },
                {
                  id: "06",
                  title: "Correction Depth Limit",
                  desc: "The self-correction loop is capped at 3 passes per investigation. This prevents unbounded re-evaluation loops, keeps execution time predictable, and ensures the agent terminates with a deterministic result.",
                },
              ].map(({ id, title, desc }) => (
                <div key={id} className="bg-bg-1 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-teal opacity-40">{id}</span>
                    <h3 className="font-display font-semibold text-text-primary text-sm">{title}</h3>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="py-16 px-6 border-t border-border">
          <div className="max-w-7xl mx-auto">
            <div className="border border-teal/20 bg-teal-glow rounded-2xl px-8 py-8">
              <h3 className="font-display font-semibold text-text-primary text-lg mb-2">
                Your evidence never leaves your network.
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed max-w-2xl">
                ForensIQ connects to your SIFT workstation over SSH and executes all forensic tools in place.
                Evidence files, memory dumps, and disk images are never uploaded, transmitted, or stored on any
                external service. The agent reads tool output remotely and processes it locally.
                Your chain of custody stays intact.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 px-6 border-t border-border">
          <div className="max-w-3xl mx-auto">
            <div className="mb-14">
              <p className="font-mono text-xs uppercase tracking-widest text-teal mb-3">FAQ</p>
              <h2 className="font-display text-4xl font-bold text-text-primary">
                Common questions.
              </h2>
            </div>
            <FaqList />
          </div>
        </section>

        {/* Second CTA */}
        <section className="py-24 px-6 border-t border-border">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-4xl font-bold text-text-primary mb-4">
              Ready to find evil?
            </h2>
            <p className="text-text-secondary text-base mb-10 max-w-lg mx-auto">
              Point ForensIQ at your evidence. The agent takes it from there.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-teal text-bg-1 font-semibold text-sm px-6 py-3 rounded-xl hover:bg-teal-dim transition-colors"
            >
              Begin Investigation <ArrowRight size={15} />
            </button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border mt-8">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-3 gap-12">
          {/* Column 1: Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <PulseIcon size={22} state="idle" />
              <span className="font-display font-semibold text-sm">
                Forens<span className="text-teal font-bold">IQ</span>
              </span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed max-w-xs">
              Facts and evidence. No guesses. Autonomous DFIR agent with calibrated confidence scoring.
            </p>
            <div className="flex items-center gap-3 mt-1">
              <a
                href="https://github.com/mystiquemide/forensiciq"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="text-text-muted hover:text-text-secondary transition-colors"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <button
                type="button"
                aria-label="X (coming soon)"
                disabled
                className="text-text-muted opacity-40 cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-widest text-text-muted">Product</p>
            <div className="flex flex-col gap-3">
              {[
                { label: "Features", href: "#features" },
                { label: "How it Works", href: "#how-it-works" },
                { label: "FAQ", href: "#faq" },
                { label: "Begin Investigation", href: "#start" },
              ].map(({ label, href }) => (
                <a key={label} href={href} className="text-text-secondary hover:text-text-primary text-sm transition-colors">
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Column 3: Built With */}
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase tracking-widest text-text-muted">Built With</p>
            <div className="flex flex-col gap-3">
              {[
                { label: "Anthropic SDK", href: "https://docs.anthropic.com/" },
                { label: "SIFT Workstation", href: "https://www.sans.org/tools/sift-workstation/" },
                { label: "SANS Find Evil!", href: "https://findevil.devpost.com/" },
                { label: "asyncssh", href: "https://asyncssh.readthedocs.io/" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-text-secondary hover:text-text-primary text-sm transition-colors"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border px-6 py-4">
          <div className="max-w-7xl mx-auto text-xs text-text-muted">
            <span>&copy; 2026 ForensIQ. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
