"use client";

import type { SplitWorkCluster, SplitWorkMemberProject } from "@/lib/types";

function formatInr(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)}L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

interface MemberRowProps {
  project: SplitWorkMemberProject;
  thresholdInr: number;
  index: number;
}

function MemberRow({ project, thresholdInr, index }: MemberRowProps) {
  const amount = project.sanctioned_amount_inr ?? 0;
  const belowThreshold = amount <= thresholdInr;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-[#0A2240] font-mono font-bold text-[10px] flex items-center justify-center">
          R{index + 1}
        </span>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold text-[#123B6D]">{project.project_id}</span>
            {project.mandatory_tender ? (
              <span className="pill pill-held text-[9px]">E-Tender Enforced</span>
            ) : (
              <span className="pill pill-approved text-[9px]">Direct Quotation Claimed</span>
            )}
          </div>
          <p className="font-semibold text-[#0F172A] text-xs mt-0.5">{project.title}</p>
        </div>
      </div>

      <div className="flex items-center sm:flex-col sm:items-end gap-1">
        <span className="font-mono font-bold text-xs text-[#0F172A]">{formatInr(amount)}</span>
        {belowThreshold && (
          <span className="text-[10px] text-[#B45309] font-medium bg-[#FEF3C7] px-1.5 py-0.2 rounded border border-[#FCD34D]">
            ≤ ₹5.00L ceiling
          </span>
        )}
      </div>
    </div>
  );
}

export default function SplitWorkClusterCard({ cluster }: { cluster: SplitWorkCluster }) {
  const simPct = Math.round(cluster.nlp_corridor_similarity * 100);
  const totalFormatted = formatInr(cluster.total_aggregated_cost_inr);
  const thresholdFormatted = formatInr(cluster.individual_threshold_inr);
  const exceedsThreshold = cluster.total_aggregated_cost_inr >= 10_00_000;

  return (
    <div className="card border-[#D5DCE5] bg-white shadow-xs space-y-4">
      {/* Header */}
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="pill pill-held text-[9px]">STATUTORY PROCUREMENT ANOMALY</span>
            {cluster.mandatory_tender_enforced && (
              <span className="pill pill-held text-[9px]">🔒 MANDATORY TENDER ENFORCED</span>
            )}
            {cluster.case_id && (
              <span className="font-mono font-bold text-[10px] bg-[#EFF6FF] text-[#1D4ED8] px-1.5 py-0.5 rounded border border-[#BFDBFE]">
                Case Ref: {cluster.case_id}
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm text-[#0A2240] pt-1">
            {cluster.corridor_name}
          </h3>
          <p className="text-[11px] text-[#64748B]">
            Constituency: {cluster.constituency} · Sector: {cluster.category.replace(/_/g, " ")}
          </p>
        </div>

        {/* Similarity pill */}
        <div className="bg-white p-2.5 rounded border border-[#CBD5E1] text-right">
          <span className="text-[9px] font-bold text-[#64748B] uppercase">NLP Semantic Overlap</span>
          <p className="text-xl font-black font-mono text-[#B3261E]">{simPct}%</p>
          <span className="text-[9px] text-[#64748B]">Corridor Match</span>
        </div>
      </div>

      {/* Threshold Analysis Tile */}
      <div className="p-3.5 rounded bg-[#F8FAFC] border border-[#CBD5E1] space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
          Statutory Procurement Threshold Verification
        </span>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded bg-white border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B]">Individual Split Cost</span>
            <p className="font-mono font-bold text-[#B45309] text-sm mt-0.5">
              ~{formatInr(Math.round(cluster.total_aggregated_cost_inr / Math.max(cluster.member_projects.length, 1)))}
            </p>
            <span className="text-[9px] text-[#B45309]">≤ {thresholdFormatted} Ceiling (Direct Quote)</span>
          </div>

          <div className="flex flex-col items-center justify-center text-xs text-[#64748B]">
            <span className="text-[10px] font-bold text-[#0F172A]">{cluster.member_projects.length} Split Orders</span>
            <span className="text-lg text-[#123B6D]">→</span>
            <span className="text-[9px]">Artificially Divided</span>
          </div>

          <div className="p-2 rounded bg-white border border-[#E2E8F0]">
            <span className="text-[10px] text-[#64748B]">Consolidated Cost</span>
            <p className="font-mono font-bold text-[#B3261E] text-sm mt-0.5">
              {totalFormatted}
            </p>
            <span className="text-[9px] text-[#B3261E] font-bold">≥ ₹10.00L Mandatory Tender</span>
          </div>
        </div>

        {exceedsThreshold && (
          <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[11px] text-[#991B1B]">
            <strong>Violation Detected:</strong> Consolidated corridor value ({totalFormatted}) exceeds the ₹10L statutory threshold while each individual order is kept below ₹5L — indicating artificial fragmentation to evade mandatory public e-tendering.
          </div>
        )}
      </div>

      {/* Member Projects */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
          Fragmented Member Work Orders ({cluster.member_projects.length})
        </span>
        <div className="space-y-1.5">
          {cluster.member_projects.map((proj, idx) => (
            <MemberRow
              key={proj.project_id}
              project={proj}
              thresholdInr={cluster.individual_threshold_inr}
              index={idx}
            />
          ))}
        </div>
      </div>

      {/* Keywords */}
      {cluster.overlapping_corridor_tokens.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-[#E2E8F0]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
            Shared Physical Reach &amp; Corridor Tokens
          </span>
          <div className="flex flex-wrap gap-1">
            {cluster.overlapping_corridor_tokens.map((token) => (
              <span
                key={token}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-[#0A2240] bg-[#EFF6FF] border border-[#BFDBFE]"
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
