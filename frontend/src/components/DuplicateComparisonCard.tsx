"use client";

import type { RecommendationScreenRequest, RecommendationScreenResponse } from "@/lib/types";

interface DuplicateComparisonCardProps {
  result: RecommendationScreenResponse;
  proposed: RecommendationScreenRequest;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DuplicateComparisonCard({
  result,
  proposed,
}: DuplicateComparisonCardProps) {
  const isDuplicate = result.is_duplicate;
  const similarityPct = (result.similarity_score * 100).toFixed(1);
  const thresholdPct = (result.threshold * 100).toFixed(1);
  const matched = result.matched_project;

  return (
    <div className="card space-y-6 slide-down border-t-4 border-t-blue-500">
      {/* ── Top Decision Banner ── */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-4 ${
          isDuplicate
            ? "border-red-600/70 bg-red-950/40 text-red-200 shadow-lg shadow-red-950/30"
            : "border-green-600/70 bg-green-950/40 text-green-200 shadow-lg shadow-green-950/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{isDuplicate ? "🚨" : "✅"}</span>
          <div>
            <h3 className="text-base font-bold uppercase tracking-wide">
              {isDuplicate
                ? "Pre-Sanction Duplicate Alert — Work Overlap Detected"
                : "Eligible Unique Work — No Duplication Found"}
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              {isDuplicate
                ? "Proposed recommendation matches existing sanctioned asset in the same constituency."
                : "Semantic scan against all constituency assets verified zero pre-sanction duplication."}
            </p>
          </div>
        </div>

        {/* Dynamic Similarity Score Badge */}
        <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-lg border border-white/10">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              NLP Semantic Similarity
            </p>
            <p className="text-[11px] text-slate-400">
              Threshold: <span className="font-mono text-slate-300">{thresholdPct}%</span>
            </p>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums">
            <span className={isDuplicate ? "text-red-400" : "text-green-400"}>
              {similarityPct}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Comparison ── */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Side-by-Side Asset Comparison
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Proposed Work Column */}
          <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-blue-600/40 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                Proposed Recommendation
              </span>
              <span className="pill pill-accent text-[10px]">NEW PROPOSAL</span>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-200">{proposed.title}</p>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-line">
                {proposed.description}
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase">Constituency</span>
                <p className="font-semibold text-slate-300">{proposed.constituency}</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] uppercase">Estimated Cost</span>
                <p className="font-semibold text-slate-300">{fmt(proposed.estimated_cost_inr)}</p>
              </div>
            </div>
          </div>

          {/* Matched Project Column */}
          <div
            className={`p-4 rounded-xl bg-[var(--bg-base)] border space-y-3 ${
              matched
                ? isDuplicate
                  ? "border-red-600/40"
                  : "border-slate-700"
                : "border-[var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                Matched Existing Asset
              </span>
              {matched ? (
                <span className="font-mono text-xs text-amber-300 font-bold">
                  {matched.project_id}
                </span>
              ) : (
                <span className="text-xs text-slate-500">None</span>
              )}
            </div>

            {matched ? (
              <>
                <div>
                  <p className="text-sm font-bold text-slate-200">{matched.title}</p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {matched.description || "No description recorded."}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">Status</span>
                    <p className="font-semibold text-slate-300">{matched.status}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">
                      Sanctioned Amount
                    </span>
                    <p className="font-semibold text-slate-300">
                      {fmt(matched.sanctioned_amount_inr)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                No overlapping physical project detected in this constituency.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Overlapping Keywords Tags ── */}
      {result.overlapping_keywords && result.overlapping_keywords.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Semantic Overlap Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {result.overlapping_keywords.map((kw) => (
              <span
                key={kw}
                className="px-2.5 py-1 rounded text-xs font-mono bg-blue-950/40 border border-blue-800/60 text-blue-300"
              >
                🏷️ {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Statutory Recommendation Action ── */}
      <div className="p-3.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-strong)] flex items-center justify-between flex-wrap gap-2 text-xs">
        <div>
          <span className="text-[var(--text-muted)] uppercase tracking-wide font-semibold mr-2">
            Statutory AI Recommendation:
          </span>
          <span
            className={`font-bold uppercase tracking-wider ${
              isDuplicate ? "text-red-400" : "text-green-400"
            }`}
          >
            {result.recommendation_action.replace(/_/g, " ")}
          </span>
        </div>

        <span className="text-[11px] text-[var(--text-muted)]">
          Pre-Sanction Screening Risk Score:{" "}
          <span className="font-mono font-bold text-slate-200">{result.risk_score}/100</span>
        </span>
      </div>
    </div>
  );
}
