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
    <div className="slide-down rounded-xl overflow-hidden border border-green-600/60 shadow-2xl shadow-green-950/40">
      {/* ── Top Header Stripe ── */}
      <div className="bg-green-900/70 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-bold text-green-200 uppercase tracking-wide">
              Case Successfully Resolved — Financial Firebreak Lifted
            </p>
            <p className="text-xs text-green-300 mt-0.5">
              Authority evidence verified by AI · Risk reduced below threshold · Held payment released
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-green-400 hover:text-green-200 text-xs transition-colors ml-auto"
            aria-label="Dismiss"
          >
            ✕ dismiss
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="bg-green-950/30 px-5 py-5 space-y-4">
        {/* Risk Transition Metrics */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Risk Score Drop */}
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400 tabular-nums">
                {result.risk_before}
              </p>
              <p className="text-[10px] text-red-400 uppercase tracking-wider">Before</p>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <div className="text-2xl text-green-400">→</div>
              <p className="text-[9px] text-green-400 uppercase tracking-widest font-semibold">
                Risk
              </p>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold text-green-400 tabular-nums">
                {result.risk_after}
              </p>
              <p className="text-[10px] text-green-400 uppercase tracking-wider">After</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-12 bg-green-800/50" />

          {/* Case Status Pill */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Case Status
            </p>
            <span className="pill pill-approved text-sm px-4 py-1">
              {result.case_status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="hidden md:block w-px h-12 bg-green-800/50" />

          {/* Payment Status Pill */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Payment Action
            </p>
            <span className="pill pill-approved text-sm px-4 py-1">
              APPROVED FOR REVIEW (RELEASED)
            </span>
          </div>
        </div>

        {/* AI LLM Summary Callout */}
        {result.llm_summary && (
          <div className="rounded-lg bg-black/40 px-4 py-3 border border-green-800/40 space-y-1">
            <p className="text-xs font-semibold text-green-400 uppercase tracking-wide">
              🤖 AI Evidence Verification Summary
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">
              {result.llm_summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
