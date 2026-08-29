"use client";

import { useMemo } from "react";

interface RiskBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  /** Show pulsing animation when in high-risk state */
  pulse?: boolean;
}

/**
 * Displays a risk score with colour-coded label.
 * Low 0-39 → green | Medium 40-69 → amber | High 70-100 → red
 */
export default function RiskBadge({ score, size = "md", pulse = false }: RiskBadgeProps) {
  const { label, colorClass, bgClass, ringClass } = useMemo(() => {
    if (score >= 70)
      return {
        label: "HIGH RISK",
        colorClass: "text-red-400",
        bgClass: "bg-red-950/60",
        ringClass: "ring-red-500/40",
      };
    if (score >= 40)
      return {
        label: "MEDIUM RISK",
        colorClass: "text-amber-400",
        bgClass: "bg-amber-950/60",
        ringClass: "ring-amber-500/40",
      };
    return {
      label: "LOW RISK",
      colorClass: "text-green-400",
      bgClass: "bg-green-950/60",
      ringClass: "ring-green-500/40",
    };
  }, [score]);

  const sizeClasses = {
    sm: { number: "text-2xl", label: "text-[9px]", wrap: "w-16 h-16" },
    md: { number: "text-4xl", label: "text-[10px]", wrap: "w-24 h-24" },
    lg: { number: "text-6xl", label: "text-xs",    wrap: "w-36 h-36" },
  }[size];

  return (
    <div
      className={`
        ${sizeClasses.wrap}
        ${bgClass}
        ${colorClass}
        ring-2 ${ringClass}
        rounded-full
        flex flex-col items-center justify-center gap-0.5
        transition-all duration-700 ease-in-out
        ${pulse ? "risk-pulse" : ""}
      `}
    >
      <span className={`${sizeClasses.number} font-bold tabular-nums leading-none`}>
        {score}
      </span>
      <span className={`${sizeClasses.label} font-semibold tracking-widest opacity-80`}>
        {label}
      </span>
    </div>
  );
}
