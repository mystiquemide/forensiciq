import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          1: "#0A0E1A",
          2: "#0F1629",
          3: "#141D35",
        },
        border: "#1E2D4D",
        text: {
          primary: "#E8EDF7",
          secondary: "#7A8DB0",
          muted: "#4A5878",
        },
        teal: {
          DEFAULT: "#00D4B8",
          dim: "#00A090",
          glow: "rgba(0,212,184,0.12)",
        },
        fact: {
          DEFAULT: "#10D98A",
          bg: "rgba(16,217,138,0.08)",
          border: "rgba(16,217,138,0.25)",
        },
        inference: {
          DEFAULT: "#F0A832",
          bg: "rgba(240,168,50,0.08)",
          border: "rgba(240,168,50,0.25)",
        },
        hypothesis: {
          DEFAULT: "#F05060",
          bg: "rgba(240,80,96,0.08)",
          border: "rgba(240,80,96,0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "Fira Code", "monospace"],
        display: ["var(--font-space)", "system-ui", "sans-serif"],
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "pulse-teal": "pulse-teal 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-teal": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
