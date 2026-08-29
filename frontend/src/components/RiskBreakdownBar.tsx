"use client";

import { RiskBreakdown } from "@/lib/types";

interface RiskBreakdownBarProps {
  breakdown: RiskBreakdown;
}

const LABELS: Record<string, string> = {
  financial:   "Financial",
  duplicate:   "Duplicate Evidence",
  cv:          "Computer Vision",
  timeline:    "Timeline",
  compliance:  "Compliance",
};

function getBarColor(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-400";
  return "bg-green-500";
}

/**
 * Displays a breakdown of the composite risk score as horizontal bars.
 */
export default function RiskBreakdownBar({ breakdown }: RiskBreakdownBarProps) {
  const entries = Object.entries(breakdown).filter(
    ([, v]) => typeof v === "number"
  ) as [string, number][];

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2 mt-4">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
        Risk Sub-scores
      </p>
      {entries.map(([key, score]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-36 shrink-0 text-xs text-[var(--text-secondary)]">
            {LABELS[key] ?? key}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getBarColor(score)}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="w-8 text-right text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
            {score}
          </span>
        </div>
      ))}
    </div>
  );
}
