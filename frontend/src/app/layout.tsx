import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForensIQ — Facts, not guesses.",
  description: "Confidence-calibrated autonomous DFIR agent. Every finding labeled FACT, INFERENCE, or HYPOTHESIS based on multi-tool corroboration. SANS Find Evil! 2026.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
  },
  openGraph: {
    title: "ForensIQ — Facts, not guesses.",
    description: "Autonomous DFIR agent that labels every finding FACT, INFERENCE, or HYPOTHESIS. Cryptographic audit trail. SHA-256 chain of custody.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ForensIQ — Facts, not guesses.",
    description: "Autonomous DFIR agent with calibrated confidence scoring. Built for SANS Find Evil! 2026.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-bg-1 text-text-primary">
        {children}
      </body>
    </html>
  );
}
