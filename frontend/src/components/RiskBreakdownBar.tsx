"use client";

import { RiskBreakdown } from "@/lib/types";

interface RiskBreakdownBarProps {
  breakdown: RiskBreakdown;
}

const LABELS: Record<string, string> = {
  financial:   "Financial Anomalies",
  duplicate:   "Duplicate Evidence / Works",
  cv:          "Physical Progress / CV",
  timeline:    "Sanction Delay SLA",
  compliance:  "Statutory SC/ST / Docs",
};

function getBarColor(score: number) {
  if (score >= 70) return "bg-[#B3261E]";
  if (score >= 40) return "bg-[#D97706]";
  return "bg-[#2E7D32]";
}

export default function RiskBreakdownBar({ breakdown }: RiskBreakdownBarProps) {
  const entries = Object.entries(breakdown).filter(
    ([, v]) => typeof v === "number"
  ) as [string, number][];

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-[#E2E8F0]">
      <p className="text-[10px] text-[#475569] uppercase tracking-wider font-bold">
        Statutory Sub-Score Breakdown
      </p>
      <div className="space-y-2">
        {entries.map(([key, score]) => (
          <div key={key} className="space-y-0.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-[#334155] text-[11px]">{LABELS[key] ?? key}</span>
              <span className="font-mono font-bold text-[#0F172A] text-[11px]">{score}</span>
            </div>
            <div className="w-full h-1.5 rounded bg-[#E2E8F0] overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-500 ${getBarColor(score)}`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
