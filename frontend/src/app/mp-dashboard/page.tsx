"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getMpList, getMpDashboard, resetDemoSeed } from "@/lib/api";
import type { MPDashboardResponse, MPListItem } from "@/lib/types";
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

export default function MpDashboardPage() {
  const [mps, setMps] = useState<MPListItem[]>([]);
  const [selectedMpId, setSelectedMpId] = useState<string>("MP-UP-042");
  const [data, setData] = useState<MPDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  const fetchDashboard = useCallback(async (mpId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMpDashboard(mpId);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load MP dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getMpList()
      .then((list) => {
        setMps(list);
        if (list.length > 0) {
          const initialId = list.some((m) => m.mp_id === "MP-UP-042") ? "MP-UP-042" : list[0].mp_id;
          setSelectedMpId(initialId);
          fetchDashboard(initialId);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load MP list.");
        setLoading(false);
      });
  }, [fetchDashboard]);

  function handleMpChange(mpId: string) {
    setSelectedMpId(mpId);
    fetchDashboard(mpId);
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      await fetchDashboard(selectedMpId);
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
        {/* Breadcrumb & MP Selector */}
        <div className="flex items-center justify-between flex-wrap gap-3 text-xs pb-3 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Government of India</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">Sansad e-SAKSHI Integration</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">MP Constituency Dashboard</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] font-bold text-[#475569]">Select MP:</label>
            <select
              value={selectedMpId}
              onChange={(e) => handleMpChange(e.target.value)}
              className="px-2.5 py-1 text-xs rounded bg-white border border-[#CBD5E1] text-[#0F172A] font-bold shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#123B6D]"
            >
              {mps.map((m) => (
                <option key={m.mp_id} value={m.mp_id}>
                  {m.name} ({m.mp_type} — {m.constituency}, {m.state})
                </option>
              ))}
            </select>

            <Link
              href="/recommend"
              className="px-3 py-1 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>➕</span>
              <span>New Recommendation</span>
            </Link>
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
            <span>Synthesizing Member of Parliament constituency metrics…</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 1. MP Profile Header Banner */}
            <section className="rounded-lg bg-gradient-to-r from-[#0A2240] to-[#123B6D] text-white border-0 shadow-md p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl">
                    🇮🇳
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg md:text-xl font-bold uppercase tracking-wide">
                        {data.mp.name}
                      </h1>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E8F5E9] text-[#166534]">
                        {data.mp.mp_type} MP
                      </span>
                    </div>
                    <p className="text-xs text-white/80 mt-0.5">
                      Constituency: <strong className="text-white">{data.mp.constituency}</strong> | State: <strong className="text-white">{data.mp.state}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                  <div className="text-right">
                    <span className="text-[10px] text-white/70 uppercase font-semibold">Annual Allocation</span>
                    <p className="text-base font-bold font-mono text-[#FACC15]">
                      {fmtCrore(data.budget_summary.annual_budget_inr)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-right">
                    <span className="text-[10px] text-white/70 uppercase font-semibold">Fund Utilization</span>
                    <p className="text-base font-bold font-mono text-[#4ADE80]">
                      {data.budget_summary.sanctioned_utilization_pct}%
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Key Metrics & Statutory SC/ST Compliance */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Financial Status */}
              <div className="card bg-white border-[#D5DCE5] p-4 space-y-2">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Sanctioned vs Disbursed</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-[#0369A1]">
                    {fmtLakh(data.budget_summary.total_sanctioned_inr)}
                  </span>
                  <span className="text-xs text-[#166534] font-bold font-mono">
                    {fmtLakh(data.budget_summary.total_disbursed_inr)} paid
                  </span>
                </div>
                <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0369A1] h-full rounded-full"
                    style={{ width: `${Math.min(data.budget_summary.sanctioned_utilization_pct, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#64748B]">
                  Unspent Escrow Balance: <strong className="text-[#0F172A]">{fmtLakh(data.budget_summary.unspent_balance_inr)}</strong>
                </p>
              </div>

              {/* SC Statutory Spend */}
              <div className={`card p-4 space-y-2 ${data.statutory_compliance.sc_compliant ? "bg-white border-[#86EFAC]" : "bg-[#FEF2F2] border-[#FECACA]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">SC Statutory Spend (≥15%)</span>
                  <span className={`text-xs ${data.statutory_compliance.sc_compliant ? "text-[#166534]" : "text-[#B91C1C]"}`}>
                    {data.statutory_compliance.sc_compliant ? "✅ Compliant" : "⚠️ Deficit"}
                  </span>
                </div>
                <p className={`text-2xl font-bold font-mono ${data.statutory_compliance.sc_compliant ? "text-[#166534]" : "text-[#B91C1C]"}`}>
                  {data.statutory_compliance.sc_spend_pct.toFixed(1)}%
                </p>
                <p className="text-[10px] text-[#64748B]">
                  Mandatory threshold: 15.0% for Scheduled Caste habitations.
                </p>
              </div>

              {/* ST Statutory Spend */}
              <div className={`card p-4 space-y-2 ${data.statutory_compliance.st_compliant ? "bg-white border-[#86EFAC]" : "bg-[#FEF2F2] border-[#FECACA]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">ST Statutory Spend (≥7.5%)</span>
                  <span className={`text-xs ${data.statutory_compliance.st_compliant ? "text-[#166534]" : "text-[#B91C1C]"}`}>
                    {data.statutory_compliance.st_compliant ? "✅ Compliant" : "⚠️ Deficit"}
                  </span>
                </div>
                <p className={`text-2xl font-bold font-mono ${data.statutory_compliance.st_compliant ? "text-[#166534]" : "text-[#B91C1C]"}`}>
                  {data.statutory_compliance.st_spend_pct.toFixed(1)}%
                </p>
                <p className="text-[10px] text-[#64748B]">
                  Mandatory threshold: 7.5% for Scheduled Tribe habitations.
                </p>
              </div>

              {/* Citizen Feedback Score */}
              <div className="card bg-white border-[#D5DCE5] p-4 space-y-2">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Citizen Ground Verification</span>
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-bold font-mono text-[#0A2240]">
                    {data.citizen_summary.satisfaction_pct != null ? `${data.citizen_summary.satisfaction_pct}%` : "100%"}
                  </p>
                  <span className="text-xs text-[#64748B] font-bold">
                    {data.citizen_summary.total_reports} reports
                  </span>
                </div>
                <p className="text-[10px] text-[#166534] font-medium">
                  {data.citizen_summary.positive_reports} Verified Functional • {data.citizen_summary.negative_reports} Inquiries
                </p>
              </div>
            </div>

            {/* 3. Lifecycle Pipeline Funnel */}
            <section className="card bg-white border-[#D5DCE5] p-5">
              <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span>🔄</span>
                <span>Work Recommendation &amp; Execution Lifecycle Pipeline</span>
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                  <span className="text-[10px] font-bold uppercase text-[#64748B]">1. Recommended</span>
                  <p className="text-xl font-bold font-mono text-[#0F172A] mt-1">{data.pipeline.recommended}</p>
                  <span className="text-[9px] text-[#64748B]">Pending DA Review</span>
                </div>
                <div className="p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                  <span className="text-[10px] font-bold uppercase text-[#1D4ED8]">2. Sanctioned</span>
                  <p className="text-xl font-bold font-mono text-[#1D4ED8] mt-1">{data.pipeline.sanctioned}</p>
                  <span className="text-[9px] text-[#1D4ED8]">Tender Ready</span>
                </div>
                <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
                  <span className="text-[10px] font-bold uppercase text-[#B45309]">3. In Execution</span>
                  <p className="text-xl font-bold font-mono text-[#B45309] mt-1">{data.pipeline.execution}</p>
                  <span className="text-[9px] text-[#B45309]">Active On-Site</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                  <span className="text-[10px] font-bold uppercase text-[#166534]">4. Completed</span>
                  <p className="text-xl font-bold font-mono text-[#166534] mt-1">{data.pipeline.completed}</p>
                  <span className="text-[9px] text-[#166534]">Physical Done</span>
                </div>
                <div className="p-3 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0]">
                  <span className="text-[10px] font-bold uppercase text-[#047857]">5. AI Verified</span>
                  <p className="text-xl font-bold font-mono text-[#047857] mt-1">{data.pipeline.verified}</p>
                  <span className="text-[9px] text-[#047857]">Multi-Signal Pass</span>
                </div>
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA]">
                  <span className="text-[10px] font-bold uppercase text-[#B91C1C]">6. Inquiries</span>
                  <p className="text-xl font-bold font-mono text-[#B91C1C] mt-1">{data.pipeline.inspection_required}</p>
                  <span className="text-[9px] text-[#B91C1C]">Active Flag</span>
                </div>
              </div>
            </section>

            {/* 4. Two Column: Sector Distribution + SLA Countdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sector Breakdown */}
              <div className="card bg-white border-[#D5DCE5] p-5 space-y-3">
                <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                  <span>📊</span>
                  <span>Constituency Sector Allocation</span>
                </h3>
                <div className="space-y-2">
                  {data.sector_breakdown.map((s) => (
                    <div key={s.category} className="text-xs flex items-center justify-between p-2 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="font-semibold text-[#0F172A]">{s.category.replace(/_/g, " ")}</span>
                      <div className="text-right">
                        <span className="font-bold font-mono text-[#0369A1]">{fmtLakh(s.sanctioned_inr)}</span>
                        <span className="text-[10px] text-[#64748B] ml-2">({s.count} works)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 45-Day SLA Queue */}
              <div className="card bg-white border-[#D5DCE5] p-5 space-y-3">
                <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                  <span>⏱️</span>
                  <span>District Authority 45-Day Sanction Status</span>
                </h3>
                {data.sla_pending_sanctions.length === 0 ? (
                  <p className="text-xs text-[#64748B] p-4 bg-[#F8FAFC] rounded text-center">
                    All recommended works have been sanctioned by the District Authority.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {data.sla_pending_sanctions.map((item) => (
                      <div key={item.project_id} className={`p-2.5 rounded border text-xs flex items-center justify-between ${item.overdue ? "bg-[#FEF2F2] border-[#FECACA]" : "bg-[#F8FAFC] border-[#E2E8F0]"}`}>
                        <div>
                          <p className="font-bold text-[#0F172A]">{item.title}</p>
                          <span className="text-[10px] text-[#64748B] font-mono">{item.project_id} • {item.elapsed_days} days elapsed</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.overdue ? "bg-[#B91C1C] text-white" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                          {item.overdue ? "SLA BREACHED" : `${item.remaining_days}d left`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Constituency Project Portfolio Table */}
            <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                  <span>📁</span>
                  <span>Constituency Project Works ({data.projects.length})</span>
                </h3>
                <span className="text-[11px] text-[#64748B]">Sorted by AI Risk Score</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#D5DCE5] text-[11px]">
                      <th className="p-2.5">Project ID &amp; Title</th>
                      <th className="p-2.5">Sector</th>
                      <th className="p-2.5">Sanctioned</th>
                      <th className="p-2.5">Progress</th>
                      <th className="p-2.5">Risk Score</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {data.projects.map((p) => (
                      <tr key={p.project_id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-2.5 font-medium">
                          <Link href={`/projects/${p.project_id}`} className="text-[#123B6D] hover:underline font-bold">
                            {p.title}
                          </Link>
                          <p className="text-[10px] text-[#64748B] font-mono">{p.project_id}</p>
                        </td>
                        <td className="p-2.5 text-[#475569]">{p.category.replace(/_/g, " ")}</td>
                        <td className="p-2.5 font-mono font-bold text-[#0F172A]">{fmtLakh(p.sanctioned_amount_inr)}</td>
                        <td className="p-2.5 font-mono">
                          {p.reported_progress_pct != null ? `${p.reported_progress_pct}%` : "—"}
                        </td>
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
