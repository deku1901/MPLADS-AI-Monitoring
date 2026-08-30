"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SplitWorkCluster } from "@/lib/types";
import { getSplitWorkClusters, resetDemoSeed } from "@/lib/api";
import SplitWorkClusterCard from "@/components/SplitWorkClusterCard";
import UnifiedTenderBanner from "@/components/UnifiedTenderBanner";
import NotificationDrawer from "@/components/NotificationDrawer";
import HeaderNav from "@/components/HeaderNav";
import GovernmentFooter from "@/components/GovernmentFooter";

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
    red: "text-[#B3261E]",
    amber: "text-[#B45309]",
    blue: "text-[#123B6D]",
    green: "text-[#15803D]",
  };
  const col = accent ? colorMap[accent] : "text-[#0F172A]";
  return (
    <div className="card bg-white border-[#CBD5E1] p-3.5 space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
        {label}
      </div>
      <div className={`text-xl font-black font-mono ${col}`}>{value}</div>
      {sub && <div className="text-[11px] text-[#64748B]">{sub}</div>}
    </div>
  );
}

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

  function handleEnforced(clusterId: string, updated: SplitWorkCluster) {
    setClusters((prev) =>
      prev.map((c) => (c.cluster_id === clusterId ? updated : c))
    );
  }

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
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <HeaderNav
        projectId={DEMO_PROJECT_ID}
        onOpenNotifications={() => setNotifOpen(true)}
        onResetDemo={handleReset}
        isResetting={isResetting}
      />

      <NotificationDrawer
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full space-y-6 fade-in flex-1">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs pb-2 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Dashboard</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">Procurement Compliance</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Split-Work Anomaly &amp; E-Tender Enforcement</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] text-[11px] font-mono font-bold">
            Slice 4: Geospatial Clustering + NLP
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl">🧩</span>
              <div className="space-y-1">
                <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                  SPLIT-WORK PROCUREMENT INTEGRITY &amp; TENDER MONITORING MODULE
                </h1>
                <p className="text-xs text-[#475569] leading-relaxed max-w-3xl">
                  Under MPLADS procurement rules, works with an aggregate cost exceeding ₹10 Lakh mandate public e-tendering.
                  The AI engine continuously inspects sanctioned works to identify artificial contract fragmentation (multiple
                  sub-₹5L orders on a single physical reach or corridor). Enforcing a unified tender consolidates fragmented work
                  orders into a single, compliant public procurement package.
                </p>
              </div>
            </div>

            <button
              onClick={load}
              disabled={loading}
              id="btn-rescan"
              className="px-3 py-1.5 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-xs font-bold text-[#0A2240] hover:bg-[#E2E8F0] transition-colors cursor-pointer shrink-0"
            >
              {loading ? "Scanning…" : "↻ Refresh Anomaly Scan"}
            </button>
          </div>
        </section>

        {/* Summary KPI Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard
              label="Detected Clusters"
              value={clusters.length}
              sub={clusters.length === 1 ? "1 corridor group" : `${clusters.length} corridor groups`}
              accent="amber"
            />
            <SummaryCard
              label="Affected Work Orders"
              value={totalAffectedProjects}
              sub="fragmented work orders"
              accent={totalAffectedProjects > 0 ? "red" : "green"}
            />
            <SummaryCard
              label="Consolidated Tender Value"
              value={totalAggregateValue > 0 ? formatInr(totalAggregateValue) : "₹0"}
              sub="merged package value"
              accent={totalAggregateValue >= 10_00_000 ? "red" : "amber"}
            />
            <SummaryCard
              label="Statutory Threshold"
              value={tenantAnomalies > 0 ? "EXCEEDED" : "COMPLIANT"}
              sub="₹10.00L mandatory ceiling"
              accent={tenantAnomalies > 0 ? "red" : "green"}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <div className="skeleton h-32 w-full rounded" />
            <div className="skeleton h-32 w-full rounded" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-3 rounded bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            <strong>Scan Error:</strong> {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && clusters.length === 0 && (
          <div className="card bg-white border-[#86EFAC] text-center py-10 space-y-2">
            <span className="text-3xl">✅</span>
            <h3 className="font-bold text-sm text-[#166534]">
              No Artificial Work-Splitting Anomalies Detected
            </h3>
            <p className="text-xs text-[#64748B]">
              All active works comply with statutory procurement guidelines.
            </p>
          </div>
        )}

        {/* Cluster list */}
        {!loading && !error && clusters.length > 0 && (
          <div className="space-y-6">
            {clusters.map((cluster) => (
              <div key={cluster.cluster_id} className="space-y-4">
                <SplitWorkClusterCard cluster={cluster} />
                <UnifiedTenderBanner
                  cluster={cluster}
                  onEnforced={(updated) => handleEnforced(cluster.cluster_id, updated)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <GovernmentFooter />
    </div>
  );
}
