"use client";

import type { CaseDetail } from "@/lib/types";

interface EscalationTrackerProps {
  caseData: CaseDetail;
}

const TIERS = [
  {
    key: "DA",
    title: "District Authority (DA)",
    role: "Collector / DM",
    sla: "48h SLA",
    desc: "Primary review & evidence verification",
  },
  {
    key: "SNA",
    title: "State Nodal Authority (SNA)",
    role: "Planning Dept",
    sla: "72h SLA",
    desc: "State-level intervention on DA non-response",
  },
  {
    key: "MINISTRY",
    title: "Ministry (MoSPI)",
    role: "Central Nodal",
    sla: "120h SLA",
    desc: "Statutory sanctions hold & direct enquiry",
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
    <div className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">🪜</span>
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
            Multi-Tier Statutory Escalation Ladder
          </span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          {isResolved
            ? "Resolved at " + currentTier + " Tier"
            : "Currently Assigned: " + currentTier + " Tier"}
        </span>
      </div>

      {/* Ladder Progression */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TIERS.map((tier, idx) => {
          const isActive = !isResolved && idx === currentTierIndex;
          const isPassed = !isResolved && idx < currentTierIndex;
          const isResolvedAtThisTier = isResolved && idx === currentTierIndex;

          let stateBorder = "border-[var(--border)] bg-[var(--bg-card)]/40 text-[var(--text-muted)]";
          if (isActive) {
            stateBorder = "border-amber-500/80 bg-amber-950/30 text-amber-200 shadow-md shadow-amber-950/30";
          } else if (isPassed) {
            stateBorder = "border-red-800/60 bg-red-950/20 text-red-300";
          } else if (isResolvedAtThisTier) {
            stateBorder = "border-green-600/70 bg-green-950/30 text-green-300";
          }

          return (
            <div
              key={tier.key}
              className={`p-3 rounded-lg border relative transition-all ${stateBorder}`}
            >
              {/* Top status indicator */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider">
                  Tier {idx + 1}: {tier.key}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-black/40">
                  {tier.sla}
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-200">{tier.title}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{tier.desc}</p>

              {/* Status pill tag */}
              <div className="mt-2.5 pt-2 border-t border-black/30 flex items-center justify-between text-[10px]">
                <span>Role: {tier.role}</span>
                {isActive && (
                  <span className="font-bold text-amber-400 animate-pulse">● ACTIVE TIER</span>
                )}
                {isPassed && (
                  <span className="font-semibold text-red-400">↑ ESCALATED</span>
                )}
                {isResolvedAtThisTier && (
                  <span className="font-semibold text-green-400">✓ RESOLVED HERE</span>
                )}
                {!isActive && !isPassed && !isResolvedAtThisTier && (
                  <span className="text-slate-500">Standby</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Escalation Event Log if escalated */}
      {caseData.escalation_events && caseData.escalation_events.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[var(--border)]">
          <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wide">
            ⚠️ Automated Escalation Log
          </p>
          <div className="space-y-1.5">
            {caseData.escalation_events.map((esc) => (
              <div
                key={esc.escalation_id}
                className="bg-red-950/30 border border-red-800/40 p-2 rounded text-xs flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="font-semibold text-red-300">
                    Escalated from {esc.from_tier} → {esc.to_tier}
                  </span>
                  <p className="text-[11px] text-slate-300">Reason: {esc.reason}</p>
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {formatDate(esc.triggered_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
