"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getMospiDashboard, getPersonas } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { MoSPIDashboardResponse, UserPersona } from "@/lib/types";
import GovernmentFooter from "@/components/GovernmentFooter";

function fmtCrore(n: number | null | undefined): string {
  if (n == null) return "₹0 Cr";
  return `₹${(n / 10000000).toFixed(2)} Cr`;
}

export default function HomePage() {
  const router = useRouter();
  const { switchPersona } = useAuth();
  const [data, setData] = useState<MoSPIDashboardResponse | null>(null);
  const [personas, setPersonas] = useState<UserPersona[]>([]);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    getMospiDashboard()
      .then(setData)
      .catch(() => {});
    getPersonas()
      .then(setPersonas)
      .catch(() => {});
  }, []);

  async function handleSelectPersona(p: UserPersona) {
    setSwitching(p.user_id);
    try {
      await switchPersona(p.user_id);
      const route = p.default_route || (
        p.role === "MP" ? "/mp-dashboard" :
        p.role === "DA" ? "/da-dashboard" :
        p.role === "SNA" ? "/sna-dashboard" :
        p.role === "CITIZEN" ? "/citizen" :
        "/national-dashboard"
      );
      router.push(route);
    } catch {
      router.push("/national-dashboard");
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      {/* Level 1: National Tricolor Flag & GoI Top Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
      <header className="bg-white border-b border-[#D5DCE5] px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shadow-xs border border-[#D5DCE5] overflow-hidden">
              <Image
                src="/ashoka-stambh.jpg"
                alt="Government of India Emblem"
                width={32}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                GOVERNMENT OF INDIA • सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय
              </p>
              <h2 className="text-sm md:text-base font-extrabold text-[#0A2240] tracking-tight">
                Ministry of Statistics and Programme Implementation (MoSPI)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded text-xs font-bold bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] transition-colors"
            >
              Official Login →
            </Link>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded text-xs font-bold bg-[#123B6D] hover:bg-[#0A2240] text-white shadow-xs transition-colors"
            >
              Unified Command Center ⚡
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-10 pb-12">
        {/* 1. Hero Section */}
        <section className="bg-gradient-to-br from-[#0A2240] via-[#123B6D] to-[#0A2240] text-white py-16 px-4 md:px-8 shadow-inner">
          <div className="max-w-5xl mx-auto text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-bold tracking-wide uppercase">
              <span>●</span>
              <span>Next-Gen Autonomous Closed-Loop Scheme Oversight</span>
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Autonomous AI Oversight &amp; Active-Intervention Platform for MPLADS
            </h1>

            <p className="text-sm md:text-base text-white/80 max-w-3xl mx-auto leading-relaxed">
              Replacing passive dashboards with active AI-driven governance: automated financial firebreaks,
              perceptual photo audits, satellite change detection, split-work procurement enforcement, and multi-tier statutory accountability.
            </p>

            {/* Live Tickers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6 text-center">
              <div className="p-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-xs">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Works Monitored</span>
                <p className="text-xl font-bold font-mono text-white mt-0.5">
                  {data?.national_kpis.total_projects ?? 45}
                </p>
                <span className="text-[9px] text-[#4ADE80]">Across 6 States/UTs</span>
              </div>

              <div className="p-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-xs">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Outlay Tracked</span>
                <p className="text-xl font-bold font-mono text-[#FACC15] mt-0.5">
                  {data ? fmtCrore(data.national_kpis.total_sanctioned_inr) : "₹14.28 Cr"}
                </p>
                <span className="text-[9px] text-white/70">Central Budget</span>
              </div>

              <div className="p-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-xs">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Funds Disbursed</span>
                <p className="text-xl font-bold font-mono text-[#4ADE80] mt-0.5">
                  {data ? fmtCrore(data.national_kpis.total_disbursed_inr) : "₹7.45 Cr"}
                </p>
                <span className="text-[9px] text-white/70">PFMS Verified</span>
              </div>

              <div className="p-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-xs">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Active AI Cases</span>
                <p className="text-xl font-bold font-mono text-[#F87171] mt-0.5">
                  {data?.national_kpis.open_cases_count ?? 8}
                </p>
                <span className="text-[9px] text-[#F87171]">Interventions Active</span>
              </div>

              <div className="p-3 rounded-lg bg-white/10 border border-white/15 backdrop-blur-xs">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Funds in Escrow</span>
                <p className="text-xl font-bold font-mono text-[#38BDF8] mt-0.5">
                  {data ? fmtCrore(data.fiscal_ledger.total_unreleased_inr) : "₹6.83 Cr"}
                </p>
                <span className="text-[9px] text-[#38BDF8]">Protected Cap</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Interactive Persona Switcher */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-base md:text-xl font-bold text-[#0A2240] uppercase tracking-wide">
              1-Click Stakeholder Persona Switcher
            </h2>
            <p className="text-xs text-[#64748B]">
              Experience the closed-loop governance platform from each official role perspective:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
            {/* MP Card */}
            <button
              type="button"
              onClick={() => handleSelectPersona(personas.find((p) => p.role === "MP") || { user_id: "MP-UP-042", name: "Shri R. K. Singh", role: "MP", designation: "Lok Sabha MP", jurisdiction: "Varanasi", default_route: "/mp-dashboard" })}
              disabled={switching !== null}
              className="card bg-white border-[#D5DCE5] hover:border-[#123B6D] p-5 text-left flex flex-col justify-between space-y-3 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="space-y-1.5">
                <span className="text-3xl group-hover:scale-110 transition-transform inline-block">🇮🇳</span>
                <h3 className="font-bold text-xs text-[#0A2240] uppercase">
                  Member of Parliament (MP)
                </h3>
                <p className="text-[11px] text-[#475569] leading-snug">
                  ₹5 Cr budget tracker, SC/ST statutory spend compliance, and recommendation workflow.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#123B6D] group-hover:underline">
                Enter MP Portal →
              </span>
            </button>

            {/* DA Card */}
            <button
              type="button"
              onClick={() => handleSelectPersona(personas.find((p) => p.role === "DA") || { user_id: "AUTH-DA-01", name: "Collector Rajesh Sharma, IAS", role: "DA", designation: "District Authority", jurisdiction: "Varanasi", default_route: "/da-dashboard" })}
              disabled={switching !== null}
              className="card bg-white border-[#D5DCE5] hover:border-[#123B6D] p-5 text-left flex flex-col justify-between space-y-3 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="space-y-1.5">
                <span className="text-3xl group-hover:scale-110 transition-transform inline-block">⚖️</span>
                <h3 className="font-bold text-xs text-[#0A2240] uppercase">
                  District Authority (DA)
                </h3>
                <p className="text-[11px] text-[#475569] leading-snug">
                  45-day statutory SLA sanction queue, escrow payment holds, and case resolution inbox.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#123B6D] group-hover:underline">
                Enter DA Operations →
              </span>
            </button>

            {/* SNA Card */}
            <button
              type="button"
              onClick={() => handleSelectPersona(personas.find((p) => p.role === "SNA") || { user_id: "AUTH-SNA-01", name: "Sunita Verma, IAS", role: "SNA", designation: "State Secretary", jurisdiction: "UP State", default_route: "/sna-dashboard" })}
              disabled={switching !== null}
              className="card bg-white border-[#D5DCE5] hover:border-[#123B6D] p-5 text-left flex flex-col justify-between space-y-3 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="space-y-1.5">
                <span className="text-3xl group-hover:scale-110 transition-transform inline-block">🏢</span>
                <h3 className="font-bold text-xs text-[#0A2240] uppercase">
                  State Nodal Authority (SNA)
                </h3>
                <p className="text-[11px] text-[#475569] leading-snug">
                  Inter-district performance leaderboard, Tier-2 escalations, and regional anomaly radar.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#123B6D] group-hover:underline">
                Enter SNA Portal →
              </span>
            </button>

            {/* MoSPI Card */}
            <button
              type="button"
              onClick={() => handleSelectPersona(personas.find((p) => p.role === "MINISTRY") || { user_id: "AUTH-MOSPI-01", name: "Anil Gupta", role: "MINISTRY", designation: "Joint Secretary", jurisdiction: "New Delhi", default_route: "/national-dashboard" })}
              disabled={switching !== null}
              className="card bg-white border-[#D5DCE5] hover:border-[#123B6D] p-5 text-left flex flex-col justify-between space-y-3 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="space-y-1.5">
                <span className="text-3xl group-hover:scale-110 transition-transform inline-block">🏛️</span>
                <h3 className="font-bold text-xs text-[#0A2240] uppercase">
                  MoSPI National Command
                </h3>
                <p className="text-[11px] text-[#475569] leading-snug">
                  All-India comparative matrix, Tier-3 ministry escalations, and AI Fiscal Protection Ledger.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#123B6D] group-hover:underline">
                Enter Ministry HQ →
              </span>
            </button>

            {/* Citizen Card */}
            <button
              type="button"
              onClick={() => handleSelectPersona({ user_id: "CITIZEN-USER", name: "Citizen Verifier", role: "CITIZEN", designation: "Public Verifier", jurisdiction: "Public", default_route: "/citizen" })}
              disabled={switching !== null}
              className="card bg-white border-[#D5DCE5] hover:border-[#123B6D] p-5 text-left flex flex-col justify-between space-y-3 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="space-y-1.5">
                <span className="text-3xl group-hover:scale-110 transition-transform inline-block">👥</span>
                <h3 className="font-bold text-xs text-[#0A2240] uppercase">
                  Public Citizen Portal
                </h3>
                <p className="text-[11px] text-[#475569] leading-snug">
                  &ldquo;Ye Thik Karke Dikhao&rdquo; — crowdsourced geo-tagged field audits and satisfaction ratings.
                </p>
              </div>
              <span className="text-[11px] font-bold text-[#123B6D] group-hover:underline">
                Enter Citizen View →
              </span>
            </button>
          </div>
        </section>

        {/* 3. Closed-Loop Architecture Visualizer */}
        <section className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="card bg-white border-[#D5DCE5] p-6 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider">
                The Closed-Loop Governance Cycle: SENSE ➔ THINK ➔ ACT ➔ VERIFY ➔ ESCALATE
              </h2>
              <p className="text-[11px] text-[#64748B]">
                Autonomous continuous surveillance across the complete project lifecycle:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="p-3.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#1D4ED8]">1. SENSE</span>
                <p className="font-bold text-[#0F172A]">Multi-Modal Ingestion</p>
                <p className="text-[10px] text-[#475569]">e-SAKSHI proposals, PFMS claims, milestone photos, Sentinel-2 imagery, and citizen pins.</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#6D28D9]">2. THINK</span>
                <p className="font-bold text-[#0F172A]">AI Inference Engine</p>
                <p className="text-[10px] text-[#475569]">pHash photo deduplication, NLP recommendation embeddings, cost variance modeling, unified 0–100 risk score.</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#B45309]">3. ACT</span>
                <p className="font-bold text-[#0F172A]">Active Intervention</p>
                <p className="text-[10px] text-[#475569]">Automatic escrow payment holds, mandatory e-tender cluster enforcement, and official inquiry dispatch.</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#166534]">4. VERIFY</span>
                <p className="font-bold text-[#0F172A]">Multi-Signal Synthesis</p>
                <p className="text-[10px] text-[#475569]">F17 completion audit cross-checking physical progress, satellite change delta, citizen ratings, and payments.</p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#B91C1C]">5. ESCALATE</span>
                <p className="font-bold text-[#0F172A]">Accountability Clock</p>
                <p className="text-[10px] text-[#475569]">Autonomous statutory SLA timers escalating non-responsive cases from DA → SNA → MoSPI Headquarters.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Complete Module Grid (F1 to F17) */}
        <section className="max-w-6xl mx-auto px-4 md:px-8 space-y-4">
          <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider text-center">
            8 Specialized AI Detection Engines &amp; Intervention Modules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Link href="/dashboard" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F1 / SLICE 1</span>
              <p className="font-bold text-[#0F172A] mt-0.5">Payment Firebreak</p>
              <p className="text-[10px] text-[#64748B] mt-1">Autonomous escrow fund lock via pHash image validation.</p>
            </Link>

            <Link href="/recommend" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F2 / SLICE 2</span>
              <p className="font-bold text-[#0F172A] mt-0.5">NLP Proposal Screening</p>
              <p className="text-[10px] text-[#64748B] mt-1">Pre-sanction duplicate detection using Sentence Transformers.</p>
            </Link>

            <Link href="/citizen" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F3 / SLICE 3</span>
              <p className="font-bold text-[#0F172A] mt-0.5">Citizen Ground-Truth</p>
              <p className="text-[10px] text-[#64748B] mt-1">Crowdsourced &ldquo;Ye Thik Karke Dikhao&rdquo; verification.</p>
            </Link>

            <Link href="/split-work" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F4 / SLICE 4</span>
              <p className="font-bold text-[#0F172A] mt-0.5">Split-Work Enforcement</p>
              <p className="text-[10px] text-[#64748B] mt-1">NLP token clustering &amp; mandatory public e-tender merger.</p>
            </Link>

            <Link href="/satellite" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F11 / SLICE 5</span>
              <p className="font-bold text-[#0F172A] mt-0.5">Satellite Remote Sensing</p>
              <p className="text-[10px] text-[#64748B] mt-1">Sentinel-2 optical NDBI/NDVI physical progress auditing.</p>
            </Link>

            <Link href="/delay" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F12 / SLICE 5B</span>
              <p className="font-bold text-[#0F172A] mt-0.5">Delay &amp; Stalled Engine</p>
              <p className="text-[10px] text-[#64748B] mt-1">Statistical trajectory modeling &amp; 45-day SLA compliance.</p>
            </Link>

            <Link href="/financial" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F13 / SLICE 6</span>
              <p className="font-bold text-[#0F172A] mt-0.5">Financial Analytics</p>
              <p className="text-[10px] text-[#64748B] mt-1">Cost variance, front-loading, and expenditure pacing analysis.</p>
            </Link>

            <Link href="/escalation" className="p-3 rounded-lg bg-white border border-[#D5DCE5] hover:border-[#123B6D] shadow-xs">
              <span className="text-[10px] font-bold text-[#1D4ED8]">F16 / SLICE 9</span>
              <p className="font-bold text-[#0F172A] mt-0.5">Escalation Clock</p>
              <p className="text-[10px] text-[#64748B] mt-1">Automated SLA countdown timer and multi-tier escalation.</p>
            </Link>
          </div>
        </section>
      </main>

      <GovernmentFooter />
    </div>
  );
}
