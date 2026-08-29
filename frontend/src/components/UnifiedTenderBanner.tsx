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
      // Find the cluster matching this cluster's corridor in the response
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

  // ── POST-ENFORCEMENT STATE ──────────────────────────────────────────────
  if (enforced) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-red-700/50 slide-down"
        style={{ background: "linear-gradient(135deg, rgba(127,29,29,0.35) 0%, rgba(30,10,10,0.95) 100%)" }}
      >
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top, rgba(239,68,68,0.12) 0%, transparent 65%)" }}
        />

        <div className="relative p-6">
          {/* Status banner */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-900/50 border border-red-600/50 text-xl">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-red-400 animate-pulse">
                  ● ACTIVE
                </span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  Statutory Enforcement
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-red-300 tracking-tight mt-0.5">
                MANDATORY TENDER ENFORCED
              </h2>
            </div>
          </div>

          {/* Enforcement details grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {/* Unified Tender Title */}
            <div className="col-span-full p-3 rounded-xl bg-black/30 border border-red-900/50">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Unified E-Tender
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                {cluster.unified_tender_title}
              </p>
            </div>

            {/* Aggregate Value */}
            <div className="p-3 rounded-xl bg-black/30 border border-red-900/50">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Consolidated Tender Value
              </div>
              <div className="text-xl font-bold font-mono text-red-300">
                {formatInr(cluster.total_aggregated_cost_inr)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {cluster.member_projects.length} work orders merged
              </div>
            </div>

            {/* Case ID */}
            <div className="p-3 rounded-xl bg-black/30 border border-red-900/50">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
                Intervention Case
              </div>
              {cluster.case_id ? (
                <div className="font-mono font-bold text-sm text-red-200">
                  {cluster.case_id}
                </div>
              ) : (
                <div className="text-sm text-[var(--text-muted)]">—</div>
              )}
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Assigned → District Authority (DA)
              </div>
            </div>
          </div>

          {/* Status checklist */}
          <div className="flex flex-col gap-1.5">
            {[
              `${cluster.member_projects.length} fragmented work orders consolidated`,
              `mandatory_tender = true on all member projects`,
              "DA notified via INAPP + EMAIL channels",
              "MoSPI monitoring alert dispatched",
              "Audit trail: SPLIT_WORK_DETECTED · MANDATORY_TENDER_ENFORCED · CASE_CREATED",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[11px] text-red-200/80">
                <span className="flex-shrink-0 text-emerald-400">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Demo disclaimer */}
          <div className="mt-4 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/30 text-[10px] text-amber-400/70">
            DEMO DISCLAIMER — All payment holds and tender enforcements are simulated UI state changes. No real government system connections exist.
          </div>
        </div>
      </div>
    );
  }

  // ── PRE-ENFORCEMENT STATE ───────────────────────────────────────────────
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-700/50 slide-down"
      style={{ background: "linear-gradient(135deg, rgba(92,60,0,0.3) 0%, rgba(15,10,2,0.95) 100%)" }}
    >
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(217,119,6,0.10) 0%, transparent 65%)" }}
      />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-900/40 border border-amber-600/40 text-xl flex-shrink-0">
            ⚡
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-0.5">
              AI Detection — Procurement Integrity
            </div>
            <h2 className="text-lg font-bold text-amber-200 leading-tight">
              Artificial Work-Splitting Anomaly Detected
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 max-w-xl leading-relaxed">
              The AI engine has identified {cluster.member_projects.length} work orders in the{" "}
              <strong className="text-amber-300">{cluster.constituency}</strong> constituency that
              appear to be artificially fragmented below the ₹5L per-work direct-quotation limit,
              while the aggregate of{" "}
              <strong className="text-amber-300">{formatInr(cluster.total_aggregated_cost_inr)}</strong>{" "}
              exceeds the ₹10L mandatory public e-tender threshold. Enforcing a unified tender will
              consolidate these works into a single, publicly tendered contract.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="text-center p-3 rounded-xl bg-black/25 border border-amber-900/40">
            <div className="text-xl font-bold font-mono text-amber-300">
              {cluster.member_projects.length}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Affected Work Orders</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-black/25 border border-amber-900/40">
            <div className="text-xl font-bold font-mono text-red-400">
              {formatInr(cluster.total_aggregated_cost_inr)}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Aggregate Tender Value</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-black/25 border border-amber-900/40">
            <div className="text-xl font-bold font-mono text-amber-300">
              {Math.round(cluster.nlp_corridor_similarity * 100)}%
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">Corridor Similarity</div>
          </div>
        </div>

        {/* Proposed unified tender */}
        <div className="mb-5 p-3 rounded-xl bg-black/25 border border-amber-900/40">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Proposed Unified E-Tender
          </div>
          <p className="text-sm text-amber-200 font-medium">{cluster.unified_tender_title}</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-950/50 border border-red-700/50 text-[11px] text-red-300">
            <span className="flex-shrink-0 text-base">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {/* Enforce button */}
        <button
          onClick={handleEnforce}
          disabled={loading}
          id="btn-enforce-tender"
          className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-lg ${
            loading
              ? "bg-amber-900/40 border border-amber-800/40 text-amber-500 cursor-not-allowed"
              : "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-yellow-400 border border-amber-500/50 text-black hover:shadow-amber-500/20 hover:shadow-xl active:scale-[0.98]"
          }`}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin flex-shrink-0" />
              Scanning &amp; Enforcing…
            </>
          ) : (
            <>
              <span>🔒</span>
              Enforce Unified Public E-Tender
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
          This action sets <code className="font-mono text-amber-400/80">mandatory_tender=true</code>{" "}
          on all member projects and creates a DA intervention case. It is idempotent.
        </p>
      </div>
    </div>
  );
}
