"use client";

interface CitizenFeedbackBadgeProps {
  status: string;
  positiveCount: number;
  negativeCount: number;
}

export default function CitizenFeedbackBadge({
  status,
  positiveCount,
  negativeCount,
}: CitizenFeedbackBadgeProps) {
  const isInspection = status === "INSPECTION_REQUIRED";
  const isVerified = status === "VERIFIED_FUNCTIONAL" || status === "VERIFIED";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isInspection ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-950/70 border border-red-800 text-red-300 animate-pulse">
          <span>🚨</span>
          <span>CITIZEN DISPUTE — INSPECTION TRIGGERED</span>
        </span>
      ) : isVerified ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-green-950/70 border border-green-800 text-green-300">
          <span>✅</span>
          <span>COMMUNITY VERIFIED FUNCTIONAL</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-950/50 border border-blue-800/60 text-blue-300">
          <span>⏳</span>
          <span>OPEN FOR CITIZEN VERIFICATION</span>
        </span>
      )}

      {/* Counts */}
      <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-base)] px-2 py-0.5 rounded border border-[var(--border)]">
        👍 {positiveCount} · 👎 {negativeCount}
      </span>
    </div>
  );
}
