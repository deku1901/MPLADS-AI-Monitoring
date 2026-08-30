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
    <div className="card border-[#D5DCE5] bg-white space-y-4 shadow-xs slide-down">
      {/* Decision Banner */}
      <div
        className={`p-4 rounded border flex items-center justify-between flex-wrap gap-4 ${
          isDuplicate
            ? "border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]"
            : "border-[#86EFAC] bg-[#F0FDF4] text-[#166534]"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{isDuplicate ? "⚠️" : "✅"}</span>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider">
              {isDuplicate
                ? "PRE-SANCTION DUPLICATE ALERT — POTENTIAL OVERLAPPING WORK"
                : "STATUTORY PRE-SANCTION CLEARANCE — UNIQUE ASSET VERIFIED"}
            </h3>
            <p className="text-[11px] opacity-90 mt-0.5">
              {isDuplicate
                ? "Proposed recommendation exhibits significant semantic overlap with an existing sanctioned work in the same constituency."
                : "No duplicate or overlapping works detected in the constituency database. Eligible for technical estimate and administrative sanction."}
            </p>
          </div>
        </div>

        {/* Similarity Score Pill */}
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded border border-[#CBD5E1]">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wider text-[#64748B] font-bold">
              NLP Semantic Overlap
            </p>
            <p className="text-[10px] text-[#64748B]">
              Threshold: <span className="font-mono font-bold text-[#0F172A]">{thresholdPct}%</span>
            </p>
          </div>
          <span className={`text-xl font-black font-mono ${isDuplicate ? "text-[#B3261E]" : "text-[#15803D]"}`}>
            {similarityPct}%
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison Columns */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
          Side-by-Side Comparative Work Record
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Proposed Work Column */}
          <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] space-y-2">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
              <span className="font-bold text-[#123B6D] text-[11px] uppercase">
                1. Proposed Work Proposal
              </span>
              <span className="pill pill-accent text-[9px]">NEW PROPOSAL</span>
            </div>

            <div>
              <p className="font-bold text-[#0F172A]">{proposed.title}</p>
              <p className="text-[#334155] mt-1 leading-relaxed">
                {proposed.description}
              </p>
            </div>

            <div className="pt-2 border-t border-[#E2E8F0] grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Constituency</span>
                <p className="font-semibold text-[#0F172A]">{proposed.constituency}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Estimated Cost</span>
                <p className="font-semibold text-[#0F172A]">{fmt(proposed.estimated_cost_inr)}</p>
              </div>
            </div>
          </div>

          {/* Matched Work Column */}
          <div
            className={`p-3.5 rounded border space-y-2 ${
              matched
                ? isDuplicate
                  ? "bg-[#FEF2F2] border-[#FCA5A5]"
                  : "bg-[#F8FAFC] border-[#CBD5E1]"
                : "bg-[#F8FAFC] border-[#CBD5E1]"
            }`}
          >
            <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
              <span className="font-bold text-[#991B1B] text-[11px] uppercase">
                2. Matched Sanctioned Work in Constituency
              </span>
              {matched ? (
                <span className="font-mono text-[10px] font-bold text-[#0F172A] bg-white px-1.5 py-0.2 rounded border border-[#CBD5E1]">
                  {matched.project_id}
                </span>
              ) : (
                <span className="text-[#64748B] text-[10px]">None</span>
              )}
            </div>

            {matched ? (
              <>
                <div>
                  <p className="font-bold text-[#0F172A]">{matched.title}</p>
                  <p className="text-[#334155] mt-1 leading-relaxed">
                    {matched.description || "No description on file."}
                  </p>
                </div>

                <div className="pt-2 border-t border-black/10 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Status</span>
                    <p className="font-semibold text-[#0F172A]">{matched.status}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#64748B] uppercase font-bold">Sanctioned Amount</span>
                    <p className="font-semibold text-[#0F172A]">{fmt(matched.sanctioned_amount_inr)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-[#64748B]">
                No overlapping physical project detected in this constituency.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Semantic Overlap Tags */}
      {result.overlapping_keywords && result.overlapping_keywords.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
            Overlapping Semantic Keyword Tokens
          </p>
          <div className="flex flex-wrap gap-1">
            {result.overlapping_keywords.map((kw) => (
              <span
                key={kw}
                className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]"
              >
                🏷️ {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation Action Strip */}
      <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1] flex items-center justify-between flex-wrap gap-2 text-xs">
        <div>
          <span className="text-[#64748B] font-bold uppercase text-[10px] mr-2">
            Recommended Action:
          </span>
          <span
            className={`font-bold uppercase tracking-wider ${
              isDuplicate ? "text-[#B3261E]" : "text-[#15803D]"
            }`}
          >
            {result.recommendation_action.replace(/_/g, " ")}
          </span>
        </div>

        <span className="text-[11px] text-[#64748B]">
          Pre-Sanction Risk Score:{" "}
          <span className="font-mono font-bold text-[#0F172A]">{result.risk_score}/100</span>
        </span>
      </div>
    </div>
  );
}
