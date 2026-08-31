"use client";

import type { AuthorityWorkloadItem, DashboardCaseItem } from "@/lib/types";

interface AuthorityWorkloadCardProps {
  authorities: AuthorityWorkloadItem[];
  openCases: DashboardCaseItem[];
}

export default function AuthorityWorkloadCard({ authorities, openCases }: AuthorityWorkloadCardProps) {
  return (
    <div className="card bg-white border-[#D5DCE5] space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Governance &amp; Accountability Clock
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">
              Authority Hierarchy Workload &amp; Escalation Tracker
            </h3>
          </div>
        </div>

        <span className="text-xs font-mono font-bold text-[#0369A1] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
          {openCases.length} Active Cases
        </span>
      </div>

      {/* 3 Authority Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {authorities.map((auth) => {
          const isDa = auth.role === "DA";
          const isSna = auth.role === "SNA";
          const tierLabel = isDa ? "District Level (DA)" : isSna ? "State Nodal (SNA)" : "Central Ministry (MoSPI)";
          const badgeColor = isDa ? "#0369A1" : isSna ? "#7C3AED" : "#0A2240";

          return (
            <div
              key={auth.authority_id}
              className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                  style={{ backgroundColor: badgeColor }}
                >
                  {auth.role} Tier
                </span>
                <span className="text-[11px] font-mono text-[#64748B]">{auth.jurisdiction}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#0F172A]">{auth.name}</h4>
                <p className="text-[10px] text-[#64748B]">{tierLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-xs">
                <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase block">Assigned Cases</span>
                  <p
                    className="font-mono font-bold text-sm mt-0.5"
                    style={{ color: auth.assigned_open_cases > 0 ? "#B3261E" : "#166534" }}
                  >
                    {auth.assigned_open_cases}
                  </p>
                </div>

                <div className="p-2 rounded bg-white border border-[#E2E8F0]">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase block">SLA Breaches</span>
                  <p
                    className="font-mono font-bold text-sm mt-0.5"
                    style={{ color: auth.sla_breach_count > 0 ? "#B3261E" : "#166534" }}
                  >
                    {auth.sla_breach_count}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Cases Quick List */}
      {openCases.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold text-[#334155] uppercase tracking-wider block">
            Active Statutory Review Inquiries
          </span>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {openCases.map((c) => (
              <div
                key={c.case_id}
                className="p-2.5 rounded bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between gap-3 text-xs flex-wrap"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-[#991B1B] bg-white px-2 py-0.5 rounded border border-[#FCA5A5]">
                    {c.case_id}
                  </span>
                  <div>
                    <span className="font-semibold text-[#0F172A]">{c.project_id}: {c.project_title}</span>
                    <div className="flex items-center gap-2 text-[10px] text-[#64748B] mt-0.5">
                      <span>Tier: <strong className="text-[#0F172A]">{c.assigned_tier}</strong></span>
                      <span>•</span>
                      <span>Reasons: <strong className="text-[#991B1B]">{c.reason_codes.join(", ") || "REVIEW_REQUIRED"}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FEE2E2] text-[#991B1B]">
                    ● {c.status}
                  </span>
                  {c.sla_deadline && (
                    <p className="text-[10px] text-[#64748B] mt-0.5">SLA: {c.sla_deadline}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
