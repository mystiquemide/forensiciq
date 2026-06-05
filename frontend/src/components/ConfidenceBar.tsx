import { LABEL_COLORS, type ConfidenceLabel } from "@/types";

interface Props {
  confidence: number;
  label: ConfidenceLabel;
  showPercent?: boolean;
}

export default function ConfidenceBar({ confidence, label, showPercent = true }: Props) {
  const color = LABEL_COLORS[label];
  const pct = Math.round(confidence * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span
          className="text-xs font-mono font-medium uppercase tracking-widest px-2 py-0.5 rounded"
          style={{
            color,
            background: `${color}14`,
            border: `1px solid ${color}40`,
          }}
        >
          {label}
        </span>
        {showPercent && (
          <span className="text-xs text-text-secondary font-mono">{pct}%</span>
        )}
      </div>
      <div className="h-1 w-full bg-bg-1 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
