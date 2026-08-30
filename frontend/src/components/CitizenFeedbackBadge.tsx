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
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B]">
          <span>🚨</span>
          <span>DISPUTE: INSPECTION REQUIRED</span>
        </span>
      ) : isVerified ? (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#DCFCE7] border border-[#86EFAC] text-[#166534]">
          <span>✅</span>
          <span>COMMUNITY VERIFIED FUNCTIONAL</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8]">
          <span>⏳</span>
          <span>OPEN FOR CITIZEN VERIFICATION</span>
        </span>
      )}

      {/* Counts */}
      <span className="text-[11px] font-mono font-semibold text-[#475569] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#CBD5E1]">
        👍 {positiveCount} · 👎 {negativeCount}
      </span>
    </div>
  );
}
