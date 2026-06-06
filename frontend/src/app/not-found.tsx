import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg-1 flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-md">
        <span className="font-mono text-8xl font-bold text-teal opacity-20 block mb-6">404</span>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-3">
          Case file not found.
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-8">
          This investigation ID does not exist or has been purged. Check the ID and try again.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-teal text-bg-1 font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-teal-dim transition-colors"
        >
          Back to ForensIQ
        </Link>
      </div>
    </div>
  );
}
