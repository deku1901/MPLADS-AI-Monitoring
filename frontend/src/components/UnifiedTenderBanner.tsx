"use client";

import { useState } from "react";
import type { SplitWorkCluster, SplitWorkScanResponse } from "@/lib/types";
import { triggerSplitWorkScan } from "@/lib/api";

interface UnifiedTenderBannerProps {
  cluster: SplitWorkCluster;
  onEnforced: (updated: SplitWorkCluster) => void;
}

function formatInr(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function UnifiedTenderBanner({ cluster, onEnforced }: UnifiedTenderBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enforced = cluster.mandatory_tender_enforced;

  async function handleEnforce() {
    setLoading(true);
    setError(null);
    try {
      const res: SplitWorkScanResponse = await triggerSplitWorkScan();
      const updated =
        res.clusters.find((c) => c.cluster_id === cluster.cluster_id) ??
        res.clusters[0] ??
        null;
      if (updated) {
        onEnforced(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enforcement failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (enforced) {
    return (
      <div className="card border-[#F87171] bg-[#FEF2F2] space-y-4 slide-down shadow-xs">
        <div className="flex items-center justify-between border-b border-[#FECACA] pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔒</span>
            <div>
              <span className="text-[10px] font-bold text-[#B3261E] uppercase tracking-wider">
                ● STATUTORY ENFORCEMENT ACTIVE
              </span>
              <h4 className="text-sm font-bold text-[#991B1B]">
                MANDATORY UNIFIED PUBLIC E-TENDER ENFORCED
              </h4>
            </div>
          </div>
          {cluster.case_id && (
            <span className="font-mono text-xs font-bold text-[#123B6D] bg-white px-2.5 py-1 rounded border border-[#CBD5E1]">
              Intervention Case: {cluster.case_id}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-2.5 rounded bg-white border border-[#FECACA] col-span-full">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Unified Tender Package</span>
            <p className="font-bold text-[#0F172A] mt-0.5">{cluster.unified_tender_title}</p>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Consolidated Tender Value</span>
            <p className="font-mono font-bold text-sm text-[#B3261E] mt-0.5">
              {formatInr(cluster.total_aggregated_cost_inr)}
            </p>
            <span className="text-[10px] text-[#64748B]">{cluster.member_projects.length} works merged into unified package</span>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Assigned Authority</span>
            <p className="font-bold text-[#0F172A] text-sm mt-0.5">District Authority (DA)</p>
            <span className="text-[10px] text-[#64748B]">Varanasi District Collector</span>
          </div>
        </div>

        <div className="space-y-1 text-xs text-[#991B1B] bg-white p-3 rounded border border-[#FECACA]">
          <p className="font-bold text-[11px] uppercase">Compliance Actions Completed:</p>
          <ul className="space-y-0.5 text-[11px]">
            <li>✓ <code className="font-mono">mandatory_tender = true</code> enforced on all member projects in database.</li>
            <li>✓ DA &amp; MoSPI statutory alerts dispatched across multi-channel inboxes.</li>
            <li>✓ Immutable audit events logged: <code className="font-mono text-[#0A2240]">SPLIT_WORK_DETECTED</code> &amp; <code className="font-mono text-[#0A2240]">MANDATORY_TENDER_ENFORCED</code>.</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-[#FCD34D] bg-[#FEF3C7] space-y-4 shadow-xs slide-down">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚡</span>
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B45309]">
            AI STATUTORY PROCUREMENT DIRECTIVE
          </span>
          <h4 className="text-sm font-bold text-[#92400E]">
            Artificial Work-Splitting Anomaly Detected — Action Required
          </h4>
          <p className="text-xs text-[#78350F] leading-relaxed max-w-2xl">
            {cluster.member_projects.length} work orders in <strong className="text-[#0F172A]">{cluster.constituency}</strong> share a physical corridor and category. Individually priced below ₹5.00L to evade e-tender rules, their aggregate of <strong className="text-[#0F172A]">{formatInr(cluster.total_aggregated_cost_inr)}</strong> exceeds the ₹10.00L mandatory tender threshold.
          </p>
        </div>
      </div>

      <div className="p-3 rounded bg-white border border-[#FDE68A] text-xs space-y-1">
        <span className="text-[10px] font-bold text-[#64748B] uppercase">Proposed Consolidated E-Tender</span>
        <p className="font-bold text-[#0F172A]">{cluster.unified_tender_title}</p>
      </div>

      {error && (
        <div className="p-2.5 rounded bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
          <strong>Enforcement Error:</strong> {error}
        </div>
      )}

      <button
        onClick={handleEnforce}
        disabled={loading}
        id="btn-enforce-tender"
        className="w-full py-2.5 rounded bg-[#B45309] hover:bg-[#92400E] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
      >
        {loading ? "Consolidating & Enforcing Unified E-Tender…" : "🔒 Enforce Mandatory Public E-Tender"}
      </button>
    </div>
  );
}
