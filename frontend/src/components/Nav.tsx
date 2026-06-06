"use client";

import Link from "next/link";
import { GitFork, FolderOpen } from "lucide-react";
import PulseIcon from "./PulseIcon";

interface NavProps {
  onBeginInvestigation: () => void;
}

const NAV_LINKS = [
  { label: "Features",     id: "features" },
  { label: "How it Works", id: "how-it-works" },
  { label: "FAQ",          id: "faq" },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Nav({ onBeginInvestigation }: NavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 pt-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-bg-2 border border-border rounded-xl px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <PulseIcon size={22} state="idle" />
          <span className="font-display font-semibold text-sm tracking-tight">
            Forens<span className="text-teal font-bold">IQ</span>
          </span>
        </Link>

        <div className="flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => scrollTo(link.id)}
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              {link.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/investigations"
            className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            <FolderOpen size={14} className="opacity-60" />
            Investigations
          </Link>
          <a
            href="https://github.com/mystiquemide/forensiciq"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-text-secondary hover:text-text-primary transition-colors p-1"
          >
            <GitFork size={18} />
          </a>
          <button
            onClick={onBeginInvestigation}
            className="bg-teal text-bg-1 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-teal-dim transition-colors"
          >
            Begin Investigation
          </button>
        </div>
      </div>
    </nav>
  );
}
