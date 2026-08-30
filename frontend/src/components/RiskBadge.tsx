"use client";

import { useMemo } from "react";

interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

/**
 * Government Administrative Risk Score Badge.
 * Color standard: Low 0-39 (Green) | Medium 40-69 (Amber) | High 70-100 (Red)
 */
export default function RiskBadge({ score, size = "md", pulse = false }: RiskBadgeProps) {
  const { label, colorClass, bgClass, borderClass, levelTag } = useMemo(() => {
    if (score >= 70)
      return {
        label: "CRITICAL ACTION REQUIRED",
        colorClass: "text-[#B3261E]",
        bgClass: "bg-[#FEE2E2]",
        borderClass: "border-[#F87171]",
        levelTag: "HIGH / CRITICAL",
      };
    if (score >= 40)
      return {
        label: "ATTENTION REQUIRED",
        colorClass: "text-[#B45309]",
        bgClass: "bg-[#FEF3C7]",
        borderClass: "border-[#FCD34D]",
        levelTag: "MEDIUM RISK",
      };
    return {
      label: "STATUTORY NORMAL",
      colorClass: "text-[#15803D]",
      bgClass: "bg-[#DCFCE7]",
      borderClass: "border-[#86EFAC]",
      levelTag: "LOW RISK",
    };
  }, [score]);

  if (size === "sm") {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border ${bgClass} ${borderClass}`}>
        <span className={`text-xs font-bold font-mono ${colorClass}`}>{score}/100</span>
        <span className={`text-[10px] font-bold uppercase ${colorClass}`}>● {levelTag}</span>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-xs p-4 rounded-md border text-center ${bgClass} ${borderClass} shadow-2xs`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#475569] mb-1">
        AI COMPOSITE RISK SCORE
      </p>
      <div className="flex items-baseline justify-center gap-1 my-1">
        <span className={`text-4xl md:text-5xl font-black font-mono tracking-tight ${colorClass} ${pulse ? "animate-pulse" : ""}`}>
          {score}
        </span>
        <span className="text-sm font-bold text-[#64748B]">/ 100</span>
      </div>
      <div className="mt-2 pt-2 border-t border-black/10">
        <span className={`inline-block text-[11px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${colorClass}`}>
          {label}
        </span>
      </div>
    </div>
  );
}
