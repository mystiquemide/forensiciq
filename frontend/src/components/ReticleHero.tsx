"use client";

const CHIPS = [
  { label: "FACT", pct: "92%", color: "#10D98A", bg: "rgba(16,217,138,0.08)", border: "rgba(16,217,138,0.25)", top: "8%", right: "-8%", delay: "0s" },
  { label: "INFERENCE", pct: "67%", color: "#F0A832", bg: "rgba(240,168,50,0.08)", border: "rgba(240,168,50,0.25)", top: "44%", right: "-14%", delay: "1s" },
  { label: "HYPOTHESIS", pct: "31%", color: "#F05060", bg: "rgba(240,80,96,0.08)", border: "rgba(240,80,96,0.25)", bottom: "10%", left: "-6%", delay: "2s" },
];

export default function ReticleHero() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 420, height: 420 }}>
      <svg
        viewBox="0 0 420 420"
        width="420"
        height="420"
        className="absolute inset-0"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="reticle-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00D4B8" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#00D4B8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="210" cy="210" r="200" fill="url(#reticle-glow)" />

        {/* Outer dashed ring - slow counter-clockwise */}
        <circle
          cx="210" cy="210" r="190"
          fill="none" stroke="#00D4B8" strokeWidth="1" strokeDasharray="10 7"
          opacity="0.25"
          style={{ transformOrigin: "210px 210px", animation: "spin-reverse 28s linear infinite" }}
        />

        {/* Second ring - slow clockwise */}
        <circle
          cx="210" cy="210" r="145"
          fill="none" stroke="#00D4B8" strokeWidth="1" strokeDasharray="18 10"
          opacity="0.4"
          style={{ transformOrigin: "210px 210px", animation: "spin 20s linear infinite" }}
        />

        {/* Third ring - static */}
        <circle cx="210" cy="210" r="100" fill="none" stroke="#00D4B8" strokeWidth="1.5" opacity="0.55" />

        {/* Radar sweep line */}
        <line
          x1="210" y1="210" x2="210" y2="20"
          stroke="#00D4B8" strokeWidth="1" opacity="0.5"
          style={{ transformOrigin: "210px 210px", animation: "radar-sweep 6s linear infinite" }}
        />

        {/* Cardinal tick marks */}
        <line x1="210" y1="10" x2="210" y2="24" stroke="#00D4B8" strokeWidth="1" opacity="0.4" />
        <line x1="210" y1="396" x2="210" y2="410" stroke="#00D4B8" strokeWidth="1" opacity="0.4" />
        <line x1="10" y1="210" x2="24" y2="210" stroke="#00D4B8" strokeWidth="1" opacity="0.4" />
        <line x1="396" y1="210" x2="410" y2="210" stroke="#00D4B8" strokeWidth="1" opacity="0.4" />

        {/* Inner ring */}
        <circle
          cx="210" cy="210" r="50"
          fill="none" stroke="#00D4B8" strokeWidth="2"
          opacity="0.75"
          style={{ transformOrigin: "210px 210px", animation: "spin-reverse 8s linear infinite" }}
        />

        {/* Center pulse ring */}
        <circle cx="210" cy="210" r="18" fill="none" stroke="#00D4B8" strokeWidth="1.5" opacity="0.6"
          style={{ animation: "pulse-teal 2s ease-in-out infinite" }}
        />

        {/* Center dot */}
        <circle cx="210" cy="210" r="5" fill="#00D4B8" />
        <circle cx="210" cy="210" r="2.5" fill="#E8EDF7" />
      </svg>

      {/* Floating evidence chips */}
      {CHIPS.map((chip) => (
        <div
          key={chip.label}
          className="absolute rounded-lg px-3 py-2 text-xs font-mono whitespace-nowrap"
          style={{
            background: chip.bg,
            border: `1px solid ${chip.border}`,
            top: chip.top,
            right: chip.right,
            bottom: chip.bottom,
            left: chip.left,
            animation: `float-chip 3s ease-in-out ${chip.delay} infinite`,
          }}
        >
          <span style={{ color: chip.color }} className="font-medium">{chip.label}</span>
          <span className="text-text-muted ml-1.5">{chip.pct}</span>
        </div>
      ))}
    </div>
  );
}
