"use client";

import type { PaymentSubmitResponse } from "@/lib/types";

interface InterventionBannerProps {
  result: PaymentSubmitResponse;
  previousRisk: number;
  onDismiss?: () => void;
}

const REASON_LABELS: Record<string, { label: string; icon: string }> = {
  COST_VARIANCE:       { label: "Cost Variance",        icon: "💰" },
  PHOTO_DUPLICATE:     { label: "Photo Duplicate",      icon: "🖼️" },
  PROGRESS_MISMATCH:   { label: "Progress Mismatch",    icon: "📊" },
  SANCTION_DELAY:      { label: "Sanction Delay",       icon: "⏱️" },
  DOCUMENT_GAP:        { label: "Document Gap",         icon: "📄" },
  AMOUNT_ANOMALY:      { label: "Amount Anomaly",       icon: "⚠️" },
  ML_ANOMALY:          { label: "ML Anomaly Detected",  icon: "🤖" },
  MISSING_COMPLETION:  { label: "Missing Completion Date", icon: "📅" },
};

function ReasonTag({ code }: { code: string }) {
  const { label, icon } = REASON_LABELS[code] ?? { label: code, icon: "🔴" };
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-950/60 text-red-300 border border-red-800/50">
      {icon} {label}
    </span>
  );
}

/**
 * Shown after POST /api/payments returns a high-risk / held result.
 * Displays data directly from the backend response — nothing is hardcoded.
 */
export default function InterventionBanner({
  result,
  previousRisk,
  onDismiss,
}: InterventionBannerProps) {
  const isHeld = result.status === "HELD_FOR_REVIEW";

  return (
    <div className="slide-down rounded-xl overflow-hidden border border-red-700/60 shadow-2xl shadow-red-950/40">

      {/* ── Header stripe ── */}
      <div className="bg-red-900/70 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="text-sm font-bold text-red-200 uppercase tracking-wide">
              Financial Firebreak Activated
            </p>
            <p className="text-xs text-red-400 mt-0.5">
              AI detected high-risk indicators — automatic intervention triggered
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-400 hover:text-red-200 text-xs transition-colors ml-auto"
            aria-label="Dismiss"
          >
            ✕ dismiss
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="bg-red-950/30 px-5 py-5 space-y-5">

        {/* Risk transition row */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            {/* Previous risk */}
            <div className="text-center">
              <p className="text-3xl font-bold text-green-400 tabular-nums">{previousRisk}</p>
              <p className="text-[10px] text-green-600 uppercase tracking-wider">Before</p>
            </div>

            {/* Arrow + label */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-2xl text-red-400">→</div>
              <p className="text-[9px] text-red-500 uppercase tracking-widest font-semibold">Risk</p>
            </div>

            {/* New risk */}
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400 tabular-nums risk-pulse">
                {result.risk_score}
              </p>
              <p className="text-[10px] text-red-500 uppercase tracking-wider">After</p>
            </div>
          </div>

          {/* Vertical divider */}
          <div className="hidden md:block w-px h-12 bg-red-800/50" />

          {/* Payment status */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Payment Status</p>
            <span className={`pill ${isHeld ? "pill-held" : "pill-accent"} text-sm px-4 py-1`}>
              {result.status.replace(/_/g, " ")}
            </span>
          </div>

          {/* Vertical divider */}
          <div className="hidden md:block w-px h-12 bg-red-800/50" />

          {/* Case ID */}
          {result.case_id && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">Case Created</p>
              <p className="font-mono text-sm font-bold text-amber-300">{result.case_id}</p>
            </div>
          )}
        </div>

        {/* Anomaly reason tags */}
        {result.reason_codes.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-2">
              Anomaly Flags
            </p>
            <div className="flex flex-wrap gap-2">
              {result.reason_codes.map((code) => (
                <ReasonTag key={code} code={code} />
              ))}
            </div>
          </div>
        )}

        {/* Action summary */}
        <div className="rounded-lg bg-black/30 px-4 py-3 border border-red-900/40">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">System Action</p>
          <p className="text-sm text-[var(--text-secondary)]">
            {result.action || "Payment held pending authority review and evidence submission."}
          </p>
        </div>

      </div>
    </div>
  );
}
