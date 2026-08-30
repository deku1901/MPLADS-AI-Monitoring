"use client";

import type { PaymentSubmitResponse } from "@/lib/types";

interface InterventionBannerProps {
  result: PaymentSubmitResponse;
  previousRisk: number;
  onDismiss?: () => void;
}

const REASON_LABELS: Record<string, string> = {
  COST_VARIANCE:       "Cost Variance Exceeds Benchmark",
  PHOTO_DUPLICATE:     "Duplicate Evidence Photo (pHash Match)",
  PROGRESS_MISMATCH:   "Progress Mismatch (Reported vs AI Evidence)",
  SANCTION_DELAY:      "Statutory Sanction Delay (>45 Days)",
  DOCUMENT_GAP:        "Missing Mandatory Estimate / Sanction Docs",
  AMOUNT_ANOMALY:      "Financial Discrepancy Flag",
  ML_ANOMALY:          "IsolationForest Financial Outlier",
  MISSING_COMPLETION:  "Unspecified Completion Target",
};

export default function InterventionBanner({
  result,
  previousRisk,
  onDismiss,
}: InterventionBannerProps) {
  return (
    <div className="rounded-md border border-[#F87171] bg-[#FEF2F2] shadow-xs slide-down overflow-hidden">
      {/* Header */}
      <div className="bg-[#B3261E] text-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🚨</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              STATUTORY FINANCIAL FIREBREAK ACTIVATED — TRANCHE HELD
            </p>
            <p className="text-[10px] text-red-100">
              Automated compliance check failed: High risk score ({result.risk_score}/100) triggered statutory intervention
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-red-200 hover:text-white underline cursor-pointer"
          >
            Dismiss Alert
          </button>
        )}
      </div>

      {/* Details Row */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded border border-[#FECACA] text-xs">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Risk Escalation</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono font-bold text-[#15803D]">{previousRisk}</span>
              <span className="text-[#94A3B8]">→</span>
              <span className="font-mono font-black text-[#B3261E] text-sm">{result.risk_score} / 100</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Payment Status</span>
            <div className="mt-0.5">
              <span className="pill pill-held">{result.status.replace(/_/g, " ")}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Assigned Case</span>
            <div className="mt-0.5">
              <span className="font-mono font-bold text-[#123B6D]">{result.case_id || "CASE-1042"}</span>
              <span className="text-[11px] text-[#64748B] ml-1.5">(District Authority)</span>
            </div>
          </div>
        </div>

        {/* Flagged reasons */}
        {result.reason_codes.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">
              Flagged Statutory Violations:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {result.reason_codes.map((code) => (
                <span
                  key={code}
                  className="px-2 py-0.5 rounded bg-white text-[#991B1B] border border-[#FCA5A5] text-[11px] font-semibold"
                >
                  ⚠️ {REASON_LABELS[code] || code}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155]">
          <strong>Next Action:</strong> District Authority must review technical estimate and upload field verification evidence in the Case Review panel below to resolve.
        </div>
      </div>
    </div>
  );
}
