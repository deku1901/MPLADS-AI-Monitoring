"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getDaList, getDaDashboard, resetDemoSeed, simulateNoResponse } from "@/lib/api";
import type { DADashboardResponse, DAListItem } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import GovernmentFooter from "@/components/GovernmentFooter";

function fmtLakh(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${(n / 100000).toFixed(2)} L`;
}

export default function DaDashboardPage() {
  const [das, setDas] = useState<DAListItem[]>([]);
  const [selectedDaId, setSelectedDaId] = useState<string>("AUTH-DA-01");
  const [data, setData] = useState<DADashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);
  const [escalatingCaseId, setEscalatingCaseId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async (daId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDaDashboard(daId);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load DA dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getDaList()
      .then((list) => {
        setDas(list);
        if (list.length > 0) {
          const initialId = list.some((d) => d.authority_id === "AUTH-DA-01") ? "AUTH-DA-01" : list[0].authority_id;
          setSelectedDaId(initialId);
          fetchDashboard(initialId);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load DA list.");
        setLoading(false);
      });
  }, [fetchDashboard]);

  function handleDaChange(daId: string) {
    setSelectedDaId(daId);
    fetchDashboard(daId);
  }

  async function handleSimulateEscalate(caseId: string) {
    try {
      setEscalatingCaseId(caseId);
      await simulateNoResponse(caseId);
      await fetchDashboard(selectedDaId);
    } catch (err) {
      alert("Escalation simulation failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setEscalatingCaseId(null);
    }
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      await fetchDashboard(selectedDaId);
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
        {/* Breadcrumb & DA Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs pb-3 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Government of India</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">District Administration</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">DA Operations &amp; Sanctions Command Center</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] font-bold text-[#475569]">District Authority:</label>
            <select
              value={selectedDaId}
              onChange={(e) => handleDaChange(e.target.value)}
              className="px-2.5 py-1 text-xs rounded bg-white border border-[#CBD5E1] text-[#0F172A] font-bold shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#123B6D]"
            >
              {das.map((d) => (
                <option key={d.authority_id} value={d.authority_id}>
                  {d.name} ({d.district}, {d.state})
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
            <span>Loading District Authority operational telemetry…</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 1. Header Banner */}
            <section className="card bg-white border-[#D5DCE5] p-5 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-2xl">
                    ⚖️
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                        {data.da.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#EFF6FF] text-[#1D4ED8]">
                        District Authority (DA)
                      </span>
                    </div>
                    <p className="text-xs text-[#475569] mt-0.5">
                      Jurisdiction: <strong className="text-[#0F172A]">{data.da.district} District</strong>, {data.da.state} | {data.da.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-center">
                    <span className="text-[10px] font-bold text-[#991B1B] uppercase">SLA Breaches</span>
                    <p className="text-sm font-bold font-mono text-[#991B1B]">{data.sla_queue.sla_breaches_count}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-center">
                    <span className="text-[10px] font-bold text-[#B45309] uppercase">Payment Holds</span>
                    <p className="text-sm font-bold font-mono text-[#B45309]">{data.payment_holds.total_holds}</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-center">
                    <span className="text-[10px] font-bold text-[#1D4ED8] uppercase">Active Cases</span>
                    <p className="text-sm font-bold font-mono text-[#1D4ED8]">{data.cases.total_open}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. 45-Day SLA Sanction Queue & Payment Holds */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 45-Day SLA Sanction Queue */}
              <div className="card bg-white border-[#D5DCE5] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                    <span>⏱️</span>
                    <span>45-Day Statutory Sanction SLA Queue ({data.sla_queue.pending_sanctions_count})</span>
                  </h2>
                  <span className="text-[10px] text-[#64748B]">MP Recommendations</span>
                </div>

                {data.sla_queue.items.length === 0 ? (
                  <p className="text-xs text-[#166534] bg-[#F0FDF4] p-4 rounded text-center font-medium">
                    ✅ No pending recommendations awaiting sanction in {data.da.district}.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.sla_queue.items.map((item) => (
                      <div key={item.project_id} className={`p-3 rounded-lg border text-xs flex items-center justify-between ${item.overdue ? "bg-[#FEF2F2] border-[#FECACA]" : "bg-[#F8FAFC] border-[#E2E8F0]"}`}>
                        <div className="space-y-0.5">
                          <Link href={`/projects/${item.project_id}`} className="font-bold text-[#0F172A] hover:underline">
                            {item.title}
                          </Link>
                          <p className="text-[10px] text-[#64748B] font-mono">
                            {item.project_id} • Recommended: {fmtLakh(item.recommended_amount_inr)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.overdue ? "bg-[#B91C1C] text-white" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                            {item.overdue ? "OVERDUE (>45d)" : `${item.remaining_days}d remaining`}
                          </span>
                          <p className="text-[9px] text-[#64748B]">{item.elapsed_days} days elapsed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Payment Holds (Escrow Gate) */}
              <div className="card bg-white border-[#D5DCE5] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛑</span>
                    <span>Active Escrow Payment Holds ({data.payment_holds.total_holds})</span>
                  </h2>
                  <span className="text-[10px] text-[#B45309] font-bold">F1 Financial Firebreak</span>
                </div>

                {data.payment_holds.items.length === 0 ? (
                  <p className="text-xs text-[#166534] bg-[#F0FDF4] p-4 rounded text-center font-medium">
                    ✅ No payment disbursements currently held for review.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.payment_holds.items.map((hold) => (
                      <div key={hold.payment_id} className="p-3 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-xs flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Link href={`/projects/${hold.project_id}`} className="font-bold text-[#0F172A] hover:underline">
                            {hold.project_title}
                          </Link>
                          <p className="text-[10px] text-[#64748B] font-mono">
                            {hold.payment_id} • Requested: {fmtLakh(hold.requested_amount_inr)}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#B45309] text-white">
                            HELD (Risk {hold.ai_risk_score}/100)
                          </span>
                          <div>
                            <Link
                              href={`/projects/${hold.project_id}`}
                              className="text-[10px] font-bold text-[#1D4ED8] hover:underline"
                            >
                              Review Evidence →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Consolidated Case Inbox with SLA Countdowns */}
            <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                    <span>📋</span>
                    <span>DA Accountability Case Inbox ({data.cases.total_open})</span>
                  </h3>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Multi-factor anomaly inquiry cases assigned to District Authority for resolution.
                  </p>
                </div>
                <span className="text-[10px] text-[#1D4ED8] font-bold bg-[#EFF6FF] px-2 py-1 rounded">
                  F16 Escalation Ladder: DA → SNA → MoSPI
                </span>
              </div>

              {data.cases.items.length === 0 ? (
                <p className="text-xs text-[#64748B] p-6 bg-[#F8FAFC] rounded text-center">
                  No active enforcement cases pending action by {data.da.name}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#D5DCE5] text-[11px]">
                        <th className="p-2.5">Case ID</th>
                        <th className="p-2.5">Project</th>
                        <th className="p-2.5">Anomaly Reason Codes</th>
                        <th className="p-2.5">Risk</th>
                        <th className="p-2.5">SLA Countdown</th>
                        <th className="p-2.5 text-right">Demo Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {data.cases.items.map((c) => (
                        <tr key={c.case_id} className="hover:bg-[#F8FAFC]">
                          <td className="p-2.5 font-mono font-bold text-[#0F172A]">{c.case_id}</td>
                          <td className="p-2.5 font-medium">
                            <Link href={`/projects/${c.project_id}`} className="text-[#123B6D] hover:underline">
                              {c.project_title}
                            </Link>
                          </td>
                          <td className="p-2.5">
                            <div className="flex flex-wrap gap-1">
                              {c.reason_codes.map((rc) => (
                                <span key={rc} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#F1F5F9] text-[#475569]">
                                  {rc}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-[#B91C1C]">{c.risk_score_at_creation}/100</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${c.is_overdue ? "bg-[#B91C1C] text-white" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                              {c.is_overdue ? "OVERDUE" : (c.time_remaining_seconds ? `${Math.floor(c.time_remaining_seconds / 3600)}h left` : "Active")}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleSimulateEscalate(c.case_id)}
                              disabled={escalatingCaseId === c.case_id}
                              className="px-2 py-1 text-[10px] font-bold rounded bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {escalatingCaseId === c.case_id ? "Escalating…" : "Simulate SLA Breach → SNA"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 4. District Project Works Table */}
            <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                  <span>📁</span>
                  <span>District Works Portfolio ({data.projects.length})</span>
                </h3>
                <span className="text-[11px] text-[#64748B]">Jurisdiction: {data.da.district}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#D5DCE5] text-[11px]">
                      <th className="p-2.5">Project ID &amp; Title</th>
                      <th className="p-2.5">Constituency</th>
                      <th className="p-2.5">Sanctioned</th>
                      <th className="p-2.5">Risk Score</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {data.projects.map((p) => (
                      <tr key={p.project_id} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-medium">
                          <Link href={`/projects/${p.project_id}`} className="text-[#123B6D] hover:underline font-bold">
                            {p.title}
                          </Link>
                          <p className="text-[10px] text-[#64748B] font-mono">{p.project_id}</p>
                        </td>
                        <td className="p-2.5 text-[#475569]">{p.constituency || "—"}</td>
                        <td className="p-2.5 font-mono font-bold text-[#0F172A]">{fmtLakh(p.sanctioned_amount_inr)}</td>
                        <td className="p-2.5">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                            style={{
                              backgroundColor: p.risk_score >= 70 ? "#FEE2E2" : (p.risk_score >= 40 ? "#FEF3C7" : "#DCFCE7"),
                              color: p.risk_score >= 70 ? "#991B1B" : (p.risk_score >= 40 ? "#92400E" : "#166534"),
                            }}
                          >
                            {p.risk_score}/100
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F1F5F9] text-[#334155]">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <Link
                            href={`/projects/${p.project_id}`}
                            className="px-2 py-1 text-[11px] font-bold rounded bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8]"
                          >
                            View
                          </Link>
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
