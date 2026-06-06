"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/hooks/useSound";

const BOOT_TEXT = "initializing forensic agent...";
const CHAR_DELAY = 36;

export default function Preloader({ onDone }: { onDone: () => void }) {
  const [charIndex, setCharIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const { muted, toggleMute, playRadarPing } = useSound();

  useEffect(() => {
    if (charIndex >= BOOT_TEXT.length) return;
    const t = setTimeout(() => setCharIndex((c) => c + 1), CHAR_DELAY);
    return () => clearTimeout(t);
  }, [charIndex]);

  useEffect(() => {
    if (charIndex < BOOT_TEXT.length) return;
    const t = setTimeout(() => setReady(true), 200);
    return () => clearTimeout(t);
  }, [charIndex]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setExiting(true), 420);
    return () => clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => onDoneRef.current(), 700);
    return () => clearTimeout(t);
  }, [exiting]);

  // Radar ping synced to the 2s sweep animation — fires once typing is done
  useEffect(() => {
    if (charIndex < BOOT_TEXT.length || exiting) return;
    playRadarPing();
    const id = setInterval(playRadarPing, 2000);
    return () => clearInterval(id);
  }, [charIndex, exiting, playRadarPing]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-bg-1 transition-transform ease-in-out ${
        exiting ? "duration-[650ms] -translate-y-full" : "duration-0 translate-y-0"
      }`}
    >
      <div className="relative mb-10" style={{ width: 260, height: 260 }}>
        <svg viewBox="0 0 260 260" width="260" height="260" style={{ overflow: "visible" }}>
          <defs>
            <radialGradient id="pre-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00D4B8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#00D4B8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="130" cy="130" r="122" fill="url(#pre-glow)" />
          <circle
            cx="130" cy="130" r="118" fill="none" stroke="#00D4B8"
            strokeWidth="1" strokeDasharray="10 7" opacity="0.2"
            style={{ transformOrigin: "130px 130px", animation: "spin-reverse 28s linear infinite" }}
          />
          <circle
            cx="130" cy="130" r="88" fill="none" stroke="#00D4B8"
            strokeWidth="1" strokeDasharray="16 9" opacity="0.35"
            style={{ transformOrigin: "130px 130px", animation: "spin 18s linear infinite" }}
          />
          <circle cx="130" cy="130" r="60" fill="none" stroke="#00D4B8" strokeWidth="1.5" opacity="0.5" />
          <line x1="130" y1="6"   x2="130" y2="20"  stroke="#00D4B8" strokeWidth="1" opacity="0.4" />
          <line x1="130" y1="240" x2="130" y2="254" stroke="#00D4B8" strokeWidth="1" opacity="0.4" />
          <line x1="6"   y1="130" x2="20"  y2="130" stroke="#00D4B8" strokeWidth="1" opacity="0.4" />
          <line x1="240" y1="130" x2="254" y2="130" stroke="#00D4B8" strokeWidth="1" opacity="0.4" />
          <line
            x1="130" y1="130" x2="130" y2="12"
            stroke="#00D4B8" strokeWidth="1.5" opacity="0.7"
            style={{ transformOrigin: "130px 130px", animation: "radar-sweep 2s linear infinite" }}
          />
          <circle
            cx="130" cy="130" r="30" fill="none" stroke="#00D4B8" strokeWidth="2" opacity="0.7"
            style={{ transformOrigin: "130px 130px", animation: "spin-reverse 5s linear infinite" }}
          />
          <circle
            cx="130" cy="130" r="11" fill="none" stroke="#00D4B8" strokeWidth="1.5" opacity="0.6"
            style={{ animation: "pulse-teal 2s ease-in-out infinite" }}
          />
          <circle cx="130" cy="130" r="5"   fill="#00D4B8" />
          <circle cx="130" cy="130" r="2.5" fill="#E8EDF7" />
        </svg>
      </div>

      <button
        onClick={toggleMute}
        className="absolute bottom-5 right-5 flex items-center gap-1.5 text-text-muted hover:text-teal transition-colors text-xs font-mono"
        aria-label={muted ? "Enable sound" : "Mute"}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        <span>{muted ? "enable sound" : "sound on"}</span>
      </button>

      <div className="font-mono text-sm tracking-wider flex items-center gap-2 h-6">
        <span className="text-teal opacity-50">&gt;</span>
        <span className="text-text-secondary">{BOOT_TEXT.slice(0, charIndex)}</span>
        {charIndex < BOOT_TEXT.length && (
          <span className="inline-block w-0.5 h-4 bg-teal animate-pulse" />
        )}
        {ready && (
          <span className="text-fact font-semibold tracking-widest ml-1">[READY]</span>
        )}
      </div>
    </div>
  );
}
