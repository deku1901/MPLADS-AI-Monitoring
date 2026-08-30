"use client";

import type { CaseDetail } from "@/lib/types";

interface EscalationTrackerProps {
  caseData: CaseDetail;
}

const TIERS = [
  {
    key: "DA",
    title: "District Authority (DA)",
    role: "Collector / District Magistrate",
    sla: "48h SLA",
    desc: "Primary review & evidence verification",
  },
  {
    key: "SNA",
    title: "State Nodal Authority (SNA)",
    role: "State Planning Department",
    sla: "72h SLA",
    desc: "State-level intervention on DA non-response",
  },
  {
    key: "MINISTRY",
    title: "Ministry (MoSPI)",
    role: "Central Nodal Officer",
    sla: "120h SLA",
    desc: "Statutory sanctions freeze & central enquiry",
  },
];

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EscalationTracker({ caseData }: EscalationTrackerProps) {
  const currentTier = caseData.assigned_tier || "DA";
  const currentTierIndex = TIERS.findIndex((t) => t.key === currentTier);
  const isResolved = caseData.status === "RESOLVED";

  return (
    <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded p-3.5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] font-bold text-[#0A2240] uppercase tracking-wider">
          Statutory Multi-Tier Escalation Hierarchy
        </span>
        <span className="text-[11px] text-[#64748B] font-mono">
          {isResolved
            ? "Status: Resolved at " + currentTier + " Tier"
            : "Active Enforcement Tier: " + currentTier}
        </span>
      </div>

      {/* Ladder Progression */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {TIERS.map((tier, idx) => {
          const isActive = !isResolved && idx === currentTierIndex;
          const isPassed = !isResolved && idx < currentTierIndex;
          const isResolvedAtThisTier = isResolved && idx === currentTierIndex;

          let cardStyle = "border-[#E2E8F0] bg-white text-[#64748B]";
          if (isActive) {
            cardStyle = "border-[#F59E0B] bg-[#FEF3C7] text-[#92400E] shadow-2xs";
          } else if (isPassed) {
            cardStyle = "border-[#F87171] bg-[#FEF2F2] text-[#991B1B]";
          } else if (isResolvedAtThisTier) {
            cardStyle = "border-[#86EFAC] bg-[#F0FDF4] text-[#166534]";
          }

          return (
            <div
              key={tier.key}
              className={`p-2.5 rounded border relative text-xs ${cardStyle}`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                <span>Tier {idx + 1}: {tier.key}</span>
                <span className="font-mono bg-black/5 px-1 rounded">{tier.sla}</span>
              </div>
              <p className="font-bold text-[#0F172A] text-xs">{tier.title}</p>
              <p className="text-[10px] text-[#475569] mt-0.5">{tier.desc}</p>
              <div className="mt-2 pt-1.5 border-t border-black/10 flex items-center justify-between text-[10px] font-semibold">
                <span>{tier.role}</span>
                {isActive && <span className="text-[#B45309]">● ACTIVE</span>}
                {isPassed && <span className="text-[#B3261E]">↑ ESCALATED</span>}
                {isResolvedAtThisTier && <span className="text-[#15803D]">✓ RESOLVED</span>}
              </div>
            </div>
          );
        })}
      </div>

      {caseData.escalation_events && caseData.escalation_events.length > 0 && (
        <div className="pt-2 border-t border-[#CBD5E1] space-y-1">
          <p className="text-[10px] font-bold text-[#B3261E] uppercase">
            Escalation Audit Trail
          </p>
          {caseData.escalation_events.map((esc) => (
            <div
              key={esc.escalation_id}
              className="bg-[#FEF2F2] border border-[#FECACA] p-2 rounded text-[11px] flex justify-between items-center text-[#991B1B]"
            >
              <span>Escalated from {esc.from_tier} → {esc.to_tier} ({esc.reason})</span>
              <span className="font-mono text-[10px] text-[#64748B]">{formatDate(esc.triggered_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
