"use client";

import type { EvidenceSubmitResponse } from "@/lib/types";

interface CaseResolvedBannerProps {
  result: EvidenceSubmitResponse;
  onDismiss?: () => void;
}

export default function CaseResolvedBanner({
  result,
  onDismiss,
}: CaseResolvedBannerProps) {
  return (
    <div className="rounded-md border border-[#86EFAC] bg-[#F0FDF4] shadow-xs slide-down overflow-hidden">
      {/* Header */}
      <div className="bg-[#15803D] text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">✅</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              CASE RESOLVED — STATUTORY FIREBREAK LIFTED &amp; PAYMENT RELEASED
            </p>
            <p className="text-[10px] text-green-100">
              Authority justification accepted by AI Decision Engine • Risk score decreased to {result.risk_after}/100 • Tranche authorized
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-green-200 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        )}
      </div>

      <div className="p-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded border border-[#BBF7D0]">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Risk Re-Evaluation</span>
            <div className="flex items-center gap-2 mt-0.5 font-mono">
              <span className="text-[#B3261E] font-bold">{result.risk_before}</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="text-[#15803D] font-black text-sm">{result.risk_after} / 100</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Case Status</span>
            <div className="mt-0.5">
              <span className="pill pill-approved">{result.case_status}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Disbursement Action</span>
            <div className="mt-0.5">
              <span className="pill pill-approved">APPROVED_FOR_REVIEW</span>
            </div>
          </div>
        </div>

        {result.llm_summary && (
          <div className="p-3 rounded bg-white border border-[#BBF7D0]">
            <p className="text-[10px] font-bold text-[#15803D] uppercase tracking-wide mb-0.5">
              AI Evidence Verification Record:
            </p>
            <p className="text-[#1E293B] italic leading-relaxed">
              &quot;{result.llm_summary}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
