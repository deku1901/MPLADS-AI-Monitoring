"use client";

import Link from "next/link";
import type { ActiveInterventionsSummary, ModuleHealthItem } from "@/lib/types";

interface InterventionsCommandCenterProps {
  interventions: ActiveInterventionsSummary;
  modules: ModuleHealthItem[];
  defaultProjectId: string;
}

interface ModuleCardConfig {
  id: string;
  code: string;
  name: string;
  icon: string;
  link: string;
  description: string;
  count: number;
  unit: string;
  statusText: string;
}

export default function InterventionsCommandCenter({
  interventions,
  modules,
  defaultProjectId,
}: InterventionsCommandCenterProps) {
  const moduleCards: ModuleCardConfig[] = [
    {
      id: "F1_PAYMENT_FIREBREAK",
      code: "F1 / Slice 1",
      name: "Payment Firebreak & Autonomous Escrow Lock",
      icon: "💳",
      link: `/projects/${defaultProjectId}`,
      description: "pHash perceptual duplicate image checks & automated PFMS escrow payment lock",
      count: interventions.payment_holds_count,
      unit: "Holds",
      statusText: interventions.payment_holds_count > 0 ? "Payment Held" : "Clean Flow",
    },
    {
      id: "F2_NLP_SCREENING",
      code: "F2 / Slice 2",
      name: "Pre-Sanction NLP Proposal Screening",
      icon: "🔎",
      link: "/recommend",
      description: "Sentence Transformers duplicate recommendation & scope similarity screening",
      count: 0,
      unit: "Duplicates",
      statusText: "Surveillance Active",
    },
    {
      id: "F3_CITIZEN_VERIFY",
      code: "F3 / Slice 3",
      name: "Citizen Ground-Truth Verification",
      icon: "👥",
      link: "/citizen",
      description: "Geo-pinned public feedback ('Ye Thik Karke Dikhao') & dispute triggers",
      count: interventions.citizen_disputes_count,
      unit: "Disputes",
      statusText: interventions.citizen_disputes_count > 0 ? "Dispute Logged" : "Verified",
    },
    {
      id: "F4_SPLIT_WORK",
      code: "F4 / Slice 4",
      name: "Split-Work NLP & Mandatory E-Tender Enforcement",
      icon: "🧩",
      link: "/split-work",
      description: "Detects sliced contracts evading ₹10L threshold & enforces unified e-tenders",
      count: interventions.mandatory_tender_clusters_count,
      unit: "Enforcements",
      statusText: interventions.mandatory_tender_clusters_count > 0 ? "Cluster Enforced" : "Compliant",
    },
    {
      id: "F11_SATELLITE_CV",
      code: "F11 / Slice 5",
      name: "Satellite Remote Sensing Verification",
      icon: "🛰️",
      link: "/satellite",
      description: "Optical change detection tracking physical progress vs self-reported metrics",
      count: interventions.satellite_discrepancies_count,
      unit: "Mismatches",
      statusText: interventions.satellite_discrepancies_count > 0 ? "Progress Gap" : "Consistent",
    },
    {
      id: "F12_DELAY_MONITOR",
      code: "F12 / Slice 5B",
      name: "Delay & Stalled Work Detection Engine",
      icon: "⏳",
      link: "/delay",
      description: "Linear progress velocity analysis & statutory >90 day stalled work escalations",
      count: interventions.delayed_stalled_count,
      unit: "Stalls",
      statusText: interventions.delayed_stalled_count > 0 ? "Stall Detected" : "On Track",
    },
    {
      id: "F13_FINANCIAL_ANALYTICS",
      code: "F13 / Slice 6",
      name: "Financial & Expenditure Analytics Engine",
      icon: "📈",
      link: "/financial",
      description: "Audits >25% cost variance, front-loading risks, and fund utilization velocity",
      count: interventions.fiscal_anomalies_count,
      unit: "Anomalies",
      statusText: interventions.fiscal_anomalies_count > 0 ? "Fiscal Anomaly" : "Healthy",
    },
    {
      id: "F14_COST_OVERRUN",
      code: "F14 / Slice 7",
      name: "Cost Overrun & Budget Trajectory Engine",
      icon: "💰",
      link: "/cost-overrun",
      description: "3-tier comparison (Original vs Revised vs Incurred) against threshold parameters",
      count: interventions.cost_overruns_count,
      unit: "Overruns",
      statusText: interventions.cost_overruns_count > 0 ? "Cost Escalated" : "Within Cap",
    },
  ];

  return (
    <div className="card bg-white border-[#D5DCE5] space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Autonomous Enforcement Matrix
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">
              Unified F1–F14 AI Detection &amp; Intervention Command Grid
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#64748B]">Active Interventions:</span>
          <span className="px-2 py-0.5 rounded font-mono font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
            {interventions.total_active_interventions} Triggers
          </span>
        </div>
      </div>

      {/* 8 Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {moduleCards.map((mod) => {
          const isAlert = mod.count > 0;
          return (
            <Link
              key={mod.id}
              href={mod.link}
              className="p-3 rounded-lg border transition-all duration-200 hover:shadow-xs flex flex-col justify-between group cursor-pointer"
              style={{
                borderColor: isAlert ? "#FCA5A5" : "#E2E8F0",
                backgroundColor: isAlert ? "#FEF2F2" : "#F8FAFC",
              }}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#64748B] group-hover:text-[#0369A1]">
                    {mod.code}
                  </span>
                  <span className="text-base">{mod.icon}</span>
                </div>

                <h4 className="text-xs font-bold text-[#0A2240] group-hover:text-[#123B6D] line-clamp-1">
                  {mod.name}
                </h4>

                <p className="text-[11px] text-[#64748B] leading-snug line-clamp-2">
                  {mod.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-xs">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: isAlert ? "#FECACA" : "#E2E8F0",
                    color: isAlert ? "#991B1B" : "#475569",
                  }}
                >
                  ● {mod.statusText}
                </span>

                <span className="text-[11px] font-bold font-mono text-[#0369A1] group-hover:underline">
                  Inspect ➔
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Real-Time Engine Telemetry Health Strip */}
      {modules.length > 0 && (
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2 text-[10px] text-[#64748B]">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-[#166534] font-bold">● System Status:</span>
            <span>{modules.length} AI Detection Engines Synchronized &amp; Operational</span>
          </div>
          <span className="font-mono">
            {modules.reduce((acc, m) => acc + m.signals_analyzed, 0)} Total Data Points Evaluated
          </span>
        </div>
      )}
    </div>
  );
}
