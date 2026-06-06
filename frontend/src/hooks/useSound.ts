"use client";

import { useCallback, useRef, useState } from "react";

let sharedCtx: AudioContext | null = null;

// Only returns existing context — never creates one (creation must happen in a click handler)
function getCtx(): AudioContext | null {
  return sharedCtx;
}

// Only called from inside a click handler — creates the AudioContext while user gesture is active,
// which means Chrome starts it in "running" state immediately (no resume needed)
function createCtx(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    const Ctor = window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  // Safari may still start suspended even in click handler — call resume() synchronously
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume().catch(() => {});
  }
  return sharedCtx;
}

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  endFreq: number,
  duration: number,
  gain: number,
  startOffset = 0,
) {
  if (ctx.state !== "running") return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(ctx.destination);
  osc.type = "sine";
  const t = ctx.currentTime + startOffset;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration * 0.8);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__forensiciq_testSound = () => {
    const ctx = getCtx();
    if (!ctx || ctx.state !== "running") {
      console.warn("[ForensIQ] Click the sound toggle first, then retry.");
      return;
    }
    scheduleTone(ctx, 880, 880, 0.4, 0.06, 0);
    scheduleTone(ctx, 1320, 1320, 0.4, 0.06, 0.12);
    console.log("[ForensIQ] FACT ping played.");
  };
}

export function useSound() {
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("forensiciq_mute");
    return stored === null ? true : stored === "1";
  });
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // Must be called directly from a click handler so AudioContext is created with user gesture
  const enableSound = useCallback(() => {
    mutedRef.current = false;
    setMuted(false);
    localStorage.setItem("forensiciq_mute", "0");
    const ctx = createCtx(); // created IN click handler = running state in Chrome
    scheduleTone(ctx, 1200, 420, 0.45, 0.07); // play immediately
  }, []);

  const disableSound = useCallback(() => {
    mutedRef.current = true;
    setMuted(true);
    localStorage.setItem("forensiciq_mute", "1");
  }, []);

  const toggleMute = useCallback(() => {
    if (mutedRef.current) enableSound();
    else disableSound();
  }, [enableSound, disableSound]);

  // Safe to call from intervals — only plays when context already exists and is running
  const playRadarPing = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx || ctx.state !== "running") return;
    scheduleTone(ctx, 1200, 420, 0.45, 0.07);
  }, []);

  const playFactPing = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx || ctx.state !== "running") return;
    scheduleTone(ctx, 880, 880, 0.4, 0.06, 0);
    scheduleTone(ctx, 1320, 1320, 0.4, 0.06, 0.12);
  }, []);

  const playToolStart = useCallback(() => {
    if (mutedRef.current) return;
    const ctx = getCtx();
    if (!ctx || ctx.state !== "running") return;
    scheduleTone(ctx, 2000, 2000, 0.06, 0.04);
  }, []);

  return { muted, toggleMute, playRadarPing, playFactPing, playToolStart };
}
