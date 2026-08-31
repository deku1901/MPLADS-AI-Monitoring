"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getSnaList, getSnaDashboard, resetDemoSeed, simulateNoResponse } from "@/lib/api";
import type { SNADashboardResponse, SNAListItem } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import GovernmentFooter from "@/components/GovernmentFooter";

function fmtLakh(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${(n / 100000).toFixed(2)} L`;
}

function fmtCrore(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${(n / 10000000).toFixed(2)} Cr`;
}

export default function SnaDashboardPage() {
  const [snas, setSnas] = useState<SNAListItem[]>([]);
  const [selectedSnaId, setSelectedSnaId] = useState<string>("AUTH-SNA-01");
  const [data, setData] = useState<SNADashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);
  const [escalatingCaseId, setEscalatingCaseId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (snaId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSnaDashboard(snaId);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load SNA dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSnaList()
      .then((list) => {
        setSnas(list);
        if (list.length > 0) {
          const initialId = list.some((s) => s.authority_id === "AUTH-SNA-01") ? "AUTH-SNA-01" : list[0].authority_id;
          setSelectedSnaId(initialId);
          fetchDashboard(initialId);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load SNA list.");
        setLoading(false);
      });
  }, [fetchDashboard]);

  function handleSnaChange(snaId: string) {
    setSelectedSnaId(snaId);
    fetchDashboard(snaId);
  }

  async function handleEscalateToMinistry(caseId: string) {
    try {
      setEscalatingCaseId(caseId);
      await simulateNoResponse(caseId);
      await fetchDashboard(selectedSnaId);
    } catch (err) {
      alert("Escalation failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setEscalatingCaseId(null);
    }
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      await fetchDashboard(selectedSnaId);
    } catch (err) {
      alert("Reset failed: " + (err instanceof Error ? err.message : "Error"));
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
        {/* Breadcrumb & SNA Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs pb-3 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Government of India</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">State Planning Department</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">State Nodal Authority (SNA) Dashboard</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] font-bold text-[#475569]">Select State:</label>
            <select
              value={selectedSnaId}
              onChange={(e) => handleSnaChange(e.target.value)}
              className="px-2.5 py-1 text-xs rounded bg-white border border-[#CBD5E1] text-[#0F172A] font-bold shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#123B6D]"
            >
              {snas.map((s) => (
                <option key={s.authority_id} value={s.authority_id}>
                  {s.name} ({s.state})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="card bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] text-xs font-semibold p-4">
            ⚠️ {error}
          </div>
        )}

        {loading && !data ? (
          <div className="card bg-white p-12 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-2">
            <span className="text-2xl animate-spin">🔄</span>
            <span>Synthesizing State Nodal Authority portfolio intelligence…</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 1. State Header Banner */}
            <section className="card bg-white border-[#D5DCE5] p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-2xl">
                    🏢
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                        {data.sna.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EFF6FF] text-[#1D4ED8]">
                        State Nodal Authority (SNA)
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">
                      Jurisdiction: <strong className="text-[#0F172A]">{data.sna.state} State</strong> | {data.sna.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Total Sanctioned</span>
                    <p className="text-sm font-bold font-mono text-[#0369A1]">{fmtCrore(data.portfolio_summary.total_sanctioned_inr)}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-center">
                    <span className="text-[10px] font-bold text-[#166534] uppercase">State Utilization</span>
                    <p className="text-sm font-bold font-mono text-[#166534]">{data.portfolio_summary.utilization_pct}%</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-center">
                    <span className="text-[10px] font-bold text-[#991B1B] uppercase">Tier-2 Escalations</span>
                    <p className="text-sm font-bold font-mono text-[#991B1B]">{data.risk_summary.sna_escalations}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Two Columns: District Leaderboard + Tier-2 Escalation Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inter-District Performance Leaderboard */}
              <div className="card bg-white border-[#D5DCE5] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>Inter-District Performance Leaderboard</span>
                  </h2>
                  <span className="text-[10px] text-[#64748B]">Ranked by Performance Score</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#D5DCE5] text-[10px]">
                        <th className="p-2">District / Constituency</th>
                        <th className="p-2">Works</th>
                        <th className="p-2">Utilization</th>
                        <th className="p-2">SLA %</th>
                        <th className="p-2">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {data.district_leaderboard.map((d, idx) => (
                        <tr key={d.constituency} className="hover:bg-[#F8FAFC]">
                          <td className="p-2 font-bold text-[#0F172A]">
                            <span className="text-[#64748B] font-mono mr-1.5">#{idx + 1}</span>
                            {d.constituency}
                          </td>
                          <td className="p-2 font-mono">{d.total_projects}</td>
                          <td className="p-2 font-mono text-[#166534] font-bold">{d.utilization_pct}%</td>
                          <td className="p-2 font-mono">{d.sla_compliance_pct}%</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] font-mono">
                              {d.performance_score}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tier-2 SNA Escalation Queue */}
              <div className="card bg-white border-[#D5DCE5] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                    <span>🚨</span>
                    <span>Tier-2 State Escalation Queue ({data.escalation_queue.length})</span>
                  </h2>
                  <span className="text-[10px] text-[#B91C1C] font-bold">Overdue from DA</span>
                </div>

                {data.escalation_queue.length === 0 ? (
                  <p className="text-xs text-[#166534] bg-[#F0FDF4] p-6 rounded text-center font-medium">
                    ✅ No cases currently escalated to State Nodal Authority tier.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.escalation_queue.map((c) => (
                      <div key={c.case_id} className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Link href={`/projects/${c.project_id}`} className="font-bold text-[#0F172A] hover:underline">
                            {c.project_title || c.project_id}
                          </Link>
                          <p className="text-[10px] text-[#64748B] font-mono">
                            {c.case_id} • Risk at Escalation: {c.risk_score_at_creation}/100
                          </p>
                          <div className="flex gap-1 flex-wrap">
                            {c.reason_codes.map((r) => (
                              <span key={r} className="px-1.5 py-0.2 rounded text-[9px] bg-white text-[#991B1B] font-bold border border-[#FECACA]">
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right space-y-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#B91C1C] text-white">
                            TIER 2 (SNA)
                          </span>
                          <div>
                            <button
                              type="button"
                              onClick={() => handleEscalateToMinistry(c.case_id)}
                              disabled={escalatingCaseId === c.case_id}
                              className="text-[10px] font-bold text-[#991B1B] hover:underline cursor-pointer"
                            >
                              {escalatingCaseId === c.case_id ? "Escalating…" : "Escalate to MoSPI →"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. State MPs SC/ST Statutory Compliance Table */}
            <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
              <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                <span>⚖️</span>
                <span>State MPs Statutory SC/ST Expenditure Compliance ({data.mp_compliance.length} MPs)</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#D5DCE5] text-[11px]">
                      <th className="p-2.5">Member of Parliament</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Constituency</th>
                      <th className="p-2.5">SC Spend (≥15%)</th>
                      <th className="p-2.5">ST Spend (≥7.5%)</th>
                      <th className="p-2.5">Works Sanctioned</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {data.mp_compliance.map((mp) => (
                      <tr key={mp.mp_id} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-bold text-[#0F172A]">{mp.name}</td>
                        <td className="p-2.5 text-[#64748B]">{mp.mp_type}</td>
                        <td className="p-2.5 text-[#475569]">{mp.constituency}</td>
                        <td className="p-2.5 font-mono">
                          <span className={mp.sc_compliant ? "text-[#166534] font-bold" : "text-[#B91C1C] font-bold"}>
                            {mp.sc_spend_pct.toFixed(1)}% {mp.sc_compliant ? "✅" : "⚠️"}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono">
                          <span className={mp.st_compliant ? "text-[#166534] font-bold" : "text-[#B91C1C] font-bold"}>
                            {mp.st_spend_pct.toFixed(1)}% {mp.st_compliant ? "✅" : "⚠️"}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono">{fmtLakh(mp.total_sanctioned_inr)} ({mp.total_projects} works)</td>
                        <td className="p-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${mp.sc_compliant && mp.st_compliant ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                            {mp.sc_compliant && mp.st_compliant ? "COMPLIANT" : "ACTION REQUIRED"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      <GovernmentFooter />
    </div>
  );
}
