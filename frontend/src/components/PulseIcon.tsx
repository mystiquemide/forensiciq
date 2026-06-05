"use client";

type PulseState = "idle" | "investigating" | "correcting" | "complete" | "error";

interface Props {
  size?: number;
  state?: PulseState;
}

const STATE_COLORS: Record<PulseState, string> = {
  idle: "#00D4B880",
  investigating: "#00D4B8",
  correcting: "#F0A832",
  complete: "#10D98A",
  error: "#F05060",
};

const STATE_ANIM: Record<PulseState, string> = {
  idle: "animate-pulse-teal",
  investigating: "animate-spin-slow",
  correcting: "animate-pulse",
  complete: "",
  error: "",
};

export default function PulseIcon({ size = 32, state = "idle" }: Props) {
  const color = STATE_COLORS[state];
  const anim = STATE_ANIM[state];
  const r = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={anim}
      aria-label={`ForensIQ status: ${state}`}
    >
      {/* Outer arc */}
      <circle cx={r} cy={r} r={r - 2} fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.4"
        strokeDasharray="3 3" />
      {/* Middle arc */}
      <circle cx={r} cy={r} r={r - 7} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.65"
        strokeDasharray="6 3" />
      {/* Inner arc */}
      <circle cx={r} cy={r} r={r - 13} fill="none" stroke={color} strokeWidth="2" />
      {/* Center dot */}
      <circle cx={r} cy={r} r="3" fill={color} />
    </svg>
  );
}
