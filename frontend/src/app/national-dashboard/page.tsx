"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getMospiDashboard, resetDemoSeed } from "@/lib/api";
import type { MoSPIDashboardResponse } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import GovernmentFooter from "@/components/GovernmentFooter";

function fmtCrore(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${(n / 10000000).toFixed(2)} Cr`;
}

function fmtLakh(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₹${(n / 100000).toFixed(2)} L`;
}

export default function NationalDashboardPage() {
  const [data, setData] = useState<MoSPIDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await getMospiDashboard();
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load MoSPI dashboard.");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await getMospiDashboard();
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load MoSPI dashboard.");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      await fetchDashboard();
    } catch (err) {
      alert("Reset failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setResettingSeed(false);
    }
  }

  function handleExportCsv() {
    if (!data) return;
    const headers = "State,Total Projects,Sanctioned (INR),Disbursed (INR),Utilization %,Avg Risk,SLA Compliance %\n";
    const rows = data.state_matrix.map(
      (s) => `"${s.state}",${s.total_projects},${s.sanctioned_inr},${s.disbursed_inr},${s.utilization_pct},${s.avg_risk_score},${s.sla_compliance_pct}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mospi_state_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {/* Breadcrumb */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs pb-3 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Government of India</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">Ministry of Statistics &amp; Programme Implementation (MoSPI)</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">All-India National Oversight Command Center</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!data}
              className="px-3 py-1 text-xs rounded bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] font-bold text-[#0F172A] flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <span>📥</span>
              <span>Export State Matrix (CSV)</span>
            </button>
            <span className="px-2.5 py-0.5 rounded bg-[#123B6D] text-white text-[11px] font-bold">
              National HQ
            </span>
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
            <span>Synthesizing all-India national portfolio intelligence across 6 states…</span>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 1. National High-Level KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
                <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">All-India Works</span>
                <p className="text-2xl font-bold font-mono text-[#0A2240] mt-1">{data.national_kpis.total_projects}</p>
                <p className="text-[10px] text-[#166534] font-semibold mt-0.5">{data.national_kpis.active_works} Active on Ground</p>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
                <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">States &amp; UTs</span>
                <p className="text-2xl font-bold font-mono text-[#123B6D] mt-1">{data.national_kpis.total_states}</p>
                <p className="text-[10px] text-[#64748B] mt-0.5">{data.national_kpis.total_mps} Monitored MPs</p>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
                <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">Sanctioned Outlay</span>
                <p className="text-xl font-bold font-mono text-[#0369A1] mt-1">{fmtCrore(data.national_kpis.total_sanctioned_inr)}</p>
                <p className="text-[10px] text-[#64748B] mt-0.5">Central Budget Allocated</p>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
                <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">Total Disbursed</span>
                <p className="text-xl font-bold font-mono text-[#166534] mt-1">{fmtCrore(data.national_kpis.total_disbursed_inr)}</p>
                <p className="text-[10px] text-[#166534] font-semibold mt-0.5">{data.national_kpis.overall_utilization_pct}% National Rate</p>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
                <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">AI Interventions</span>
                <p className="text-2xl font-bold font-mono text-[#B45309] mt-1">{data.national_kpis.open_cases_count}</p>
                <p className="text-[10px] text-[#B45309] font-semibold mt-0.5">Active Inquiry Cases</p>
              </div>

              <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
                <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-wider">Tier-3 Escalations</span>
                <p className="text-2xl font-bold font-mono text-[#B91C1C] mt-1">{data.risk_summary.ministry_escalations}</p>
                <p className="text-[10px] text-[#B91C1C] font-semibold mt-0.5">Ministry Level Cases</p>
              </div>
            </div>

            {/* 2. AI Fiscal Protection Ledger */}
            <section className="rounded-lg bg-gradient-to-r from-[#0A2240] to-[#123B6D] text-white border-0 p-6 shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🛡️</span>
                    <h2 className="text-base md:text-lg font-bold uppercase tracking-wide">
                      MoSPI AI Fiscal Protection &amp; Risk Interception Ledger
                    </h2>
                  </div>
                  <p className="text-xs text-white/80 mt-1">
                    Continuous autonomous fund protection intercepting irregular payments, tender splits, and unverified completion claims.
                  </p>
                </div>

                <div className="text-right bg-white/10 px-4 py-2 rounded-lg border border-white/10">
                  <span className="text-[10px] text-white/70 uppercase font-semibold">Funds at Monitored Risk</span>
                  <p className="text-xl font-bold font-mono text-[#FACC15]">
                    {fmtLakh(data.fiscal_ledger.funds_at_risk_inr)}
                  </p>
                  <span className="text-[10px] text-white/70">({data.fiscal_ledger.funds_at_risk_pct}% of total outlay)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/70 uppercase">Escrow Payment Holds (F1)</span>
                  <p className="text-base font-bold font-mono text-white mt-1">
                    {data.fiscal_ledger.payment_holds_count} Holds Active
                  </p>
                  <p className="text-[10px] text-white/60 mt-0.5">{fmtLakh(data.fiscal_ledger.total_held_inr)} held in escrow</p>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/70 uppercase">Tender Split Interventions (F4)</span>
                  <p className="text-base font-bold font-mono text-white mt-1">
                    {data.fiscal_ledger.mandatory_tender_enforcements} Enforced
                  </p>
                  <p className="text-[10px] text-white/60 mt-0.5">Mandatory public e-tender</p>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/70 uppercase">Citizen Ground Disputes (F3)</span>
                  <p className="text-base font-bold font-mono text-white mt-1">
                    {data.fiscal_ledger.citizen_disputes_count} Inquiries
                  </p>
                  <p className="text-[10px] text-white/60 mt-0.5">Crowdsourced verification</p>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/70 uppercase">Unreleased Balance Cap</span>
                  <p className="text-base font-bold font-mono text-white mt-1">
                    {fmtCrore(data.fiscal_ledger.total_unreleased_inr)}
                  </p>
                  <p className="text-[10px] text-white/60 mt-0.5">Protected against front-loading</p>
                </div>
              </div>
            </section>

            {/* 3. State Comparative Matrix Table */}
            <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                  <span>🗺️</span>
                  <span>All-India State Performance &amp; Compliance Matrix</span>
                </h3>
                <span className="text-[11px] text-[#64748B]">Ranked by Overall Composite Performance Score</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#D5DCE5] text-[11px]">
                      <th className="p-2.5">State / UT</th>
                      <th className="p-2.5">Works</th>
                      <th className="p-2.5">Sanctioned</th>
                      <th className="p-2.5">Disbursed</th>
                      <th className="p-2.5">Utilization</th>
                      <th className="p-2.5">Avg Risk</th>
                      <th className="p-2.5">SLA %</th>
                      <th className="p-2.5">SC/ST MPs</th>
                      <th className="p-2.5 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {data.state_matrix.map((s, idx) => (
                      <tr key={s.state} className="hover:bg-[#F8FAFC]">
                        <td className="p-2.5 font-bold text-[#0F172A]">
                          <span className="text-[#64748B] font-mono mr-1.5">#{idx + 1}</span>
                          {s.state}
                        </td>
                        <td className="p-2.5 font-mono">{s.total_projects}</td>
                        <td className="p-2.5 font-mono text-[#0369A1] font-bold">{fmtLakh(s.sanctioned_inr)}</td>
                        <td className="p-2.5 font-mono text-[#166534] font-bold">{fmtLakh(s.disbursed_inr)}</td>
                        <td className="p-2.5 font-mono font-bold">{s.utilization_pct}%</td>
                        <td className="p-2.5">
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                            style={{
                              backgroundColor: s.avg_risk_score >= 40 ? "#FEF3C7" : "#DCFCE7",
                              color: s.avg_risk_score >= 40 ? "#92400E" : "#166534",
                            }}
                          >
                            {s.avg_risk_score}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono">{s.sla_compliance_pct}%</td>
                        <td className="p-2.5 text-[10px]">
                          <span className="text-[#166534] font-bold">{s.sc_compliant_mps}/{s.mps_count} SC</span> •{" "}
                          <span className="text-[#166534] font-bold">{s.st_compliant_mps}/{s.mps_count} ST</span>
                        </td>
                        <td className="p-2.5 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#1D4ED8] font-mono">
                            {s.performance_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Tier-3 Ministry Escalation Queue */}
            <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏛️</span>
                    <span>Tier-3 Central Ministry Escalation Queue ({data.ministry_escalation_queue.length})</span>
                  </h3>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Statutory cases escalated to MoSPI headquarters due to non-response at DA and SNA tiers.
                  </p>
                </div>
                <span className="text-[10px] text-[#991B1B] font-bold bg-[#FEF2F2] px-2 py-1 rounded border border-[#FECACA]">
                  Highest Enforcement Level
                </span>
              </div>

              {data.ministry_escalation_queue.length === 0 ? (
                <p className="text-xs text-[#166534] bg-[#F0FDF4] p-6 rounded text-center font-medium">
                  ✅ No cases currently escalated to Ministry level. All state tiers actively resolving inquiries.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.ministry_escalation_queue.map((c) => (
                    <div key={c.case_id} className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Link href={`/projects/${c.project_id}`} className="font-bold text-[#0F172A] hover:underline">
                          {c.project_title || c.project_id}
                        </Link>
                        <p className="text-[10px] text-[#64748B] font-mono">
                          {c.case_id} • State: {c.project_state} • Constituency: {c.project_constituency}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          {c.reason_codes.map((r) => (
                            <span key={r} className="px-1.5 py-0.2 rounded text-[9px] bg-white text-[#991B1B] font-bold border border-[#FECACA]">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-[#B91C1C] text-white">
                          TIER 3 (MINISTRY)
                        </span>
                        <div>
                          <Link
                            href={`/projects/${c.project_id}`}
                            className="text-[10px] font-bold text-[#1D4ED8] hover:underline"
                          >
                            Open Central Inquiry →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            {/* 5. All-India MP SC/ST Statutory Compliance Overview */}
            <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider flex items-center gap-1.5">
                    <span>📊</span>
                    <span>All-India SC/ST Statutory Compliance — {data.mp_compliance.total_mps} Monitored MPs</span>
                  </h3>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    MPLADS mandates ≥15% SC and ≥7.5% ST sector allocation per MP entitlement.
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <div className="px-3 py-1.5 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-center">
                    <p className="text-base font-bold font-mono text-[#166534]">{data.mp_compliance.sc_compliant_count}/{data.mp_compliance.total_mps}</p>
                    <p className="text-[10px] text-[#166534] font-semibold">SC ≥15% Compliant</p>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-center">
                    <p className="text-base font-bold font-mono text-[#1D4ED8]">{data.mp_compliance.st_compliant_count}/{data.mp_compliance.total_mps}</p>
                    <p className="text-[10px] text-[#1D4ED8] font-semibold">ST ≥7.5% Compliant</p>
                  </div>
                  {data.mp_compliance.non_compliant_mps.length > 0 && (
                    <div className="px-3 py-1.5 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] text-center">
                      <p className="text-base font-bold font-mono text-[#92400E]">{data.mp_compliance.non_compliant_mps.length}</p>
                      <p className="text-[10px] text-[#92400E] font-semibold">Non-Compliant MPs</p>
                    </div>
                  )}
                </div>
              </div>

              {data.mp_compliance.non_compliant_mps.length === 0 ? (
                <p className="text-xs text-[#166534] bg-[#F0FDF4] p-6 rounded text-center font-medium">
                  ✅ All monitored MPs are compliant with SC/ST statutory spending obligations.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FEF3C7] text-[#92400E] font-bold border-b border-[#FCD34D] text-[11px]">
                        <th className="p-2">MP Name</th>
                        <th className="p-2">State</th>
                        <th className="p-2">Constituency</th>
                        <th className="p-2">SC Spend</th>
                        <th className="p-2">ST Spend</th>
                        <th className="p-2">Deficit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FEF3C7]">
                      {data.mp_compliance.non_compliant_mps.slice(0, 8).map((mp) => (
                        <tr key={mp.mp_id} className="hover:bg-[#FFFBEB]">
                          <td className="p-2 font-bold text-[#0F172A]">
                            <span className="text-[10px] font-mono text-[#64748B] mr-1">{mp.mp_id}</span>
                            {mp.name}
                          </td>
                          <td className="p-2 text-[#475569]">{mp.state}</td>
                          <td className="p-2 text-[#475569]">{mp.constituency}</td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${mp.sc_compliant ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                              {mp.sc_spend_pct.toFixed(1)}%{mp.sc_compliant ? " ✓" : " ✗"}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${mp.st_compliant ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                              {mp.st_spend_pct.toFixed(1)}%{mp.st_compliant ? " ✓" : " ✗"}
                            </span>
                          </td>
                          <td className="p-2 text-[10px] text-[#991B1B] font-bold">
                            {!mp.sc_compliant && <span>SC: {(15 - mp.sc_spend_pct).toFixed(1)}% short </span>}
                            {!mp.st_compliant && <span>ST: {(7.5 - mp.st_spend_pct).toFixed(1)}% short</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.mp_compliance.non_compliant_mps.length > 8 && (
                    <p className="text-[11px] text-[#64748B] mt-2 text-right">
                      + {data.mp_compliance.non_compliant_mps.length - 8} more non-compliant MPs
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <GovernmentFooter />
    </div>
  );
}
