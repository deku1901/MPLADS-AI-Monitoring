"use client";

interface DelayRiskBannerProps {
  delayStatus: string;
  riskLevel: string;
  caseId: string | null;
  previousRiskScore: number;
  updatedRiskScore: number;
  newProjectStatus: string;
  progressGapPct: number;
  daysSinceLastProgress: number;
  recommendedAction: string;
  inspectionTriggered: boolean;
}

export default function DelayRiskBanner({
  delayStatus,
  riskLevel,
  caseId,
  previousRiskScore,
  updatedRiskScore,
  newProjectStatus,
  progressGapPct,
  daysSinceLastProgress,
  recommendedAction,
  inspectionTriggered,
}: DelayRiskBannerProps) {
  // Escalated / Stalled / Severe scenarios
  if (inspectionTriggered) {
    return (
      <div className="card border-[#F87171] bg-[#FEF2F2] space-y-3 shadow-xs slide-down">
        <div className="flex items-center justify-between border-b border-[#FECACA] pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <div>
              <span className="text-[10px] font-bold text-[#B3261E] uppercase tracking-wider">
                ● {delayStatus === "PROJECT_STALLED" ? "PROJECT STALLED — NO PROGRESS IN 90+ DAYS" : "SEVERE PROJECT DELAY DETECTED"}
              </span>
              <h3 className="text-sm font-bold text-[#991B1B]">
                MANDATORY PHYSICAL INQUIRY REQUIRED (GAP: {progressGapPct.toFixed(1)}%)
              </h3>
            </div>
          </div>

          {caseId && (
            <span className="font-mono text-xs font-bold text-[#123B6D] bg-white px-2.5 py-1 rounded border border-[#CBD5E1]">
              Case Assigned: {caseId}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Risk Escalation</span>
            <p className="font-mono font-bold text-[#B3261E] text-sm mt-0.5">
              {previousRiskScore} → {updatedRiskScore} / 100
            </p>
            <span className="text-[10px] text-[#991B1B]">Escalated to {riskLevel} range</span>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Project Status</span>
            <p className="font-bold text-[#B3261E] text-sm mt-0.5">{newProjectStatus}</p>
            <span className="text-[10px] text-[#64748B]">Days stalled: {daysSinceLastProgress}</span>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Assigned Authority</span>
            <p className="font-bold text-[#0F172A] text-sm mt-0.5">District Authority (DA)</p>
            <span className="text-[10px] text-[#64748B]">Alert dispatched for inquiry</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-white border border-[#FECACA] text-xs text-[#334155]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Recommended Action</span>
          {recommendedAction}
        </div>
      </div>
    );
  }

  // Non-escalated but has delay
  if (delayStatus !== "ON_TRACK") {
    const isWarning = delayStatus === "DELAY_RISK";
    return (
      <div
        className="card space-y-2 text-xs slide-down"
        style={{
          borderColor: isWarning ? "#FDE68A" : "#E2E8F0",
          backgroundColor: isWarning ? "#FFFBEB" : "#F8FAFC",
        }}
      >
        <div className="flex items-center gap-2 font-bold text-sm" style={{ color: isWarning ? "#B45309" : "#334155" }}>
          <span>{isWarning ? "⚠️" : "ℹ️"}</span>
          <span>
            {delayStatus === "DELAY_RISK" ? "MODERATE DELAY RISK DETECTED" : "MINOR TIMELINE DEVIATION"}
          </span>
        </div>
        <p className="text-[#334155] pl-6">
          Progress gap of {progressGapPct.toFixed(1)}% is{" "}
          {delayStatus === "MINOR_DELAY" ? "within acceptable tolerance" : "approaching intervention threshold"}.
          Risk Score: {previousRiskScore} → {updatedRiskScore}.
        </p>
      </div>
    );
  }

  // ON_TRACK: green confirmation
  return (
    <div className="card border-[#86EFAC] bg-[#F0FDF4] space-y-2 text-xs slide-down">
      <div className="flex items-center gap-2 font-bold text-[#166534] text-sm">
        <span>✅</span>
        <span>PROJECT TIMELINE ON TRACK</span>
      </div>
      <p className="text-[#334155] pl-6">
        Project progress ({progressGapPct.toFixed(1)}% gap) is within acceptable parameters.
        No delay intervention required. Risk Score: {updatedRiskScore}/100.
      </p>
    </div>
  );
}
