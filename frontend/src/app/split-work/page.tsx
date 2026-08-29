"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SplitWorkCluster } from "@/lib/types";
import { getSplitWorkClusters, resetDemoSeed } from "@/lib/api";
import SplitWorkClusterCard from "@/components/SplitWorkClusterCard";
import UnifiedTenderBanner from "@/components/UnifiedTenderBanner";
import NotificationDrawer from "@/components/NotificationDrawer";
import HeaderNav from "@/components/HeaderNav";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_PROJECT_ID = "MPL-2026-1042";

function formatInr(amount: number): string {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "red" | "amber" | "blue" | "green";
}) {
  const colorMap = {
    red: "text-red-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    green: "text-emerald-400",
  };
  const col = accent ? colorMap[accent] : "text-[var(--text-primary)]";
  return (
    <div className="card flex flex-col gap-1">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </div>
      <div className={`text-2xl font-bold font-mono ${col}`}>{value}</div>
      {sub && <div className="text-[11px] text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SplitWorkPage() {
  const [clusters, setClusters] = useState<SplitWorkCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const hasFetched = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSplitWorkClusters();
      setClusters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load split-work data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      load();
    }
  }, [load]);

  async function handleReset() {
    setIsResetting(true);
    try {
      await resetDemoSeed();
      await load();
    } finally {
      setIsResetting(false);
    }
  }

  // When a cluster is enforced, patch it in-place in state
  function handleEnforced(clusterId: string, updated: SplitWorkCluster) {
    setClusters((prev) =>
      prev.map((c) => (c.cluster_id === clusterId ? updated : c))
    );
  }

  // Derived stats
  const totalAffectedProjects = clusters.reduce(
    (acc, c) => acc + c.member_projects.length,
    0
  );
  const totalAggregateValue = clusters.reduce(
    (acc, c) => acc + c.total_aggregated_cost_inr,
    0
  );
  const tenantAnomalies = clusters.filter(
    (c) => c.total_aggregated_cost_inr >= 10_00_000
  ).length;

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <HeaderNav
        projectId={DEMO_PROJECT_ID}
        onOpenNotifications={() => setNotifOpen(true)}
        onResetDemo={handleReset}
        isResetting={isResetting}
      />

      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />

      {/* ── Page Header ── */}
      <div className="border-b border-[var(--border-strong)] bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-2xl shadow-inner">
              🔍
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="pill pill-held text-[10px]">⚠ ANOMALY DETECTION</span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                  Vertical Slice 4 — Split-Work NLP
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mb-2">
                Split-Work Anomaly Detection
              </h1>
              <p className="text-sm text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                The AI engine analyses all active MPLADS work orders geographically and semantically.
                When multiple work orders share a corridor, location, and category — and are individually
                priced below the ₹5L direct-quotation ceiling while the aggregate exceeds ₹10L — the
                system flags them as potential artificial procurement splitting designed to evade mandatory
                public e-tendering requirements.
              </p>
            </div>

            {/* Rescan button */}
            <button
              onClick={load}
              disabled={loading}
              id="btn-rescan"
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--text-secondary)] hover:text-white transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin" />
              ) : (
                <span>🔄</span>
              )}
              {loading ? "Scanning…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        {/* ── Summary Cards ── */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 fade-in">
            <SummaryCard
              label="Detected Clusters"
              value={clusters.length}
              sub={clusters.length === 1 ? "corridor group" : "corridor groups"}
              accent="amber"
            />
            <SummaryCard
              label="Affected Work Orders"
              value={totalAffectedProjects}
              sub="fragmented works"
              accent={totalAffectedProjects > 0 ? "red" : "green"}
            />
            <SummaryCard
              label="Aggregate Value"
              value={totalAggregateValue > 0 ? formatInr(totalAggregateValue) : "₹0"}
              sub="consolidated tender"
              accent={totalAggregateValue >= 10_00_000 ? "red" : "amber"}
            />
            <SummaryCard
              label="Tender Anomalies"
              value={tenantAnomalies}
              sub="exceed ₹10L threshold"
              accent={tenantAnomalies > 0 ? "red" : "green"}
            />
          </div>
        )}

        {/* ── Loading State ── */}
        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="card">
                <div className="skeleton h-6 w-2/3 mb-4 rounded" />
                <div className="skeleton h-4 w-full mb-2 rounded" />
                <div className="skeleton h-4 w-4/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* ── Error State ── */}
        {!loading && error && (
          <div className="card border-red-800/50 bg-red-950/20 slide-down">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠</span>
              <div>
                <h3 className="font-bold text-red-300 mb-1">Failed to Load Anomaly Data</h3>
                <p className="text-sm text-[var(--text-secondary)]">{error}</p>
                <button
                  onClick={load}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-800/50 text-red-300 text-xs font-semibold transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {!loading && !error && clusters.length === 0 && (
          <div className="card border-emerald-800/40 bg-emerald-950/10 text-center py-12 fade-in">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-bold text-emerald-300 text-lg mb-1">
              No Split-Work Anomalies Detected
            </h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              All active work orders in the system pass procurement integrity checks. No artificial
              fragmentation patterns were detected.
            </p>
          </div>
        )}

        {/* ── Cluster Cards + Banners ── */}
        {!loading && !error && clusters.length > 0 && (
          <div className="flex flex-col gap-8">
            {/* AI Detection flow header */}
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="text-amber-500">AI DETECTION</span>
              <span>→</span>
              <span>PROCUREMENT ANOMALY</span>
              <span>→</span>
              <span>UNIFIED TENDER</span>
              <span>→</span>
              <span>ENFORCEMENT</span>
              <span>→</span>
              <span>INTERVENTION CASE</span>
            </div>

            {clusters.map((cluster) => (
              <div key={cluster.cluster_id} className="flex flex-col gap-4">
                <SplitWorkClusterCard cluster={cluster} />
                <UnifiedTenderBanner
                  cluster={cluster}
                  onEnforced={(updated) => handleEnforced(cluster.cluster_id, updated)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Help text ── */}
        {!loading && (
          <div className="mt-10 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[11px] text-[var(--text-muted)] leading-relaxed">
            <strong className="text-[var(--text-secondary)]">How the AI detects split-work:</strong>{" "}
            Projects within 3 km of each other, in the same constituency and category, are grouped.
            The NLP engine computes semantic similarity (threshold ≥ 75%) and detects corridor
            patterns (Reach 1/2/3, Phase I/II, from X to Y). If all individual costs are ≤ ₹5L and
            the aggregate is ≥ ₹10L, the cluster is flagged. Enforcement sets{" "}
            <code className="font-mono text-amber-400/80">mandatory_tender=true</code> and creates a
            DA intervention case with full audit trail.
          </div>
        )}
      </div>
    </div>
  );
}
