"use client";

import { useEffect, useState } from "react";
import { getPortfolioDashboard, resetDemoSeed } from "@/lib/api";
import type { PortfolioDashboardResponse } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import GovernmentFooter from "@/components/GovernmentFooter";
import PortfolioSummaryCards from "@/components/dashboard/PortfolioSummaryCards";
import RiskDistributionWidget from "@/components/dashboard/RiskDistributionWidget";
import InterventionsCommandCenter from "@/components/dashboard/InterventionsCommandCenter";
import AuthorityWorkloadCard from "@/components/dashboard/AuthorityWorkloadCard";
import PortfolioProjectsTable from "@/components/dashboard/PortfolioProjectsTable";
import RecentInterventionsFeed from "@/components/dashboard/RecentInterventionsFeed";

export default function UnifiedDashboardPage() {
  const [data, setData] = useState<PortfolioDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  useEffect(() => {
    let ignore = false;
    async function fetchInitial() {
      try {
        const dash = await getPortfolioDashboard();
        if (!ignore) {
          setData(dash);
          setLastRefreshed(new Date().toLocaleTimeString("en-IN"));
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
          setLoading(false);
        }
      }
    }

    fetchInitial();

    // Auto-refresh telemetry every 15 seconds
    const interval = setInterval(() => {
      getPortfolioDashboard()
        .then((dash) => {
          if (!ignore) {
            setData(dash);
            setLastRefreshed(new Date().toLocaleTimeString("en-IN"));
          }
        })
        .catch(() => {
          // non-critical background refresh
        });
    }, 15000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  async function handleRefresh() {
    try {
      setLoading(true);
      setError(null);
      const dash = await getPortfolioDashboard();
      setData(dash);
      setLastRefreshed(new Date().toLocaleTimeString("en-IN"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      await handleRefresh();
    } catch (err) {
      alert("Failed to reset demo state: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setResettingSeed(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <HeaderNav
        projectId="MPL-2026-1042"
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={resettingSeed}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full space-y-6 fade-in flex-1">
        {/* Breadcrumb & Real-Time Sync Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs pb-2 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Government of India</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">MoSPI MPLADS Oversight</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Unified AI Command &amp; Decision Dashboard</span>
          </div>

          <div className="flex items-center gap-2">
            {lastRefreshed && (
              <span className="text-[11px] text-[#64748B] font-mono">
                Synced at {lastRefreshed}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="px-2.5 py-1 rounded bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>🔄</span>
              <span>Refresh Telemetry</span>
            </button>
            <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[11px] font-mono font-bold">
              Slice 8 (F15)
            </span>
          </div>
        </div>

        {/* Executive Header Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-3xl">🏛️</span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base md:text-xl font-bold text-[#0A2240] uppercase tracking-wide">
                    MPLADS UNIFIED AI PORTFOLIO DECISION &amp; INTERVENTION DASHBOARD
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E8F5E9] text-[#166534] border border-[#86EFAC]">
                    ● All 8 AI Engines Active
                  </span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed max-w-4xl">
                  Centralized decision-support command center aggregating continuous autonomous surveillance across
                  recommendation screening (NLP), procurement splitting, milestone perceptual image audits (pHash), optical
                  satellite change verification, timeline velocity modeling, fiscal expenditure pacing, and multi-tier cost overrun detection.
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="card bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] text-xs font-semibold p-4">
            ⚠️ {error}
          </div>
        )}

        {loading && !data ? (
          <div className="card bg-white p-12 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-2">
            <span className="text-2xl animate-spin">🔄</span>
            <span>Synthesizing portfolio intelligence across F1–F14 detection channels…</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 1. Top Portfolio KPIs */}
            <PortfolioSummaryCards summary={data.portfolio_summary} />

            {/* 2. Autonomous Enforcement Matrix (F1–F14) */}
            <InterventionsCommandCenter
              interventions={data.active_interventions}
              modules={data.module_health_status}
              defaultProjectId="MPL-2026-1042"
            />

            {/* 3. Two-Column Analytics: Risk Distribution + Authority Workload */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RiskDistributionWidget distribution={data.risk_distribution} />
              <AuthorityWorkloadCard
                authorities={data.authority_workload}
                openCases={data.open_cases}
              />
            </div>

            {/* 4. Full Constituency Projects Table */}
            <PortfolioProjectsTable projects={data.projects} />

            {/* 5. Live Recent Interventions Audit Stream */}
            <RecentInterventionsFeed activity={data.recent_activity} />
          </div>
        ) : null}
      </main>

      <GovernmentFooter />
    </div>
  );
}
