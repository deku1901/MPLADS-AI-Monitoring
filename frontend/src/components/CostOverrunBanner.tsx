"use client";

interface CostOverrunBannerProps {
  overrunStatus: string;
  overrunFlags: string[];
  caseId: string | null;
  previousRiskScore: number;
  updatedRiskScore: number;
  newProjectStatus: string;
  estimateIncreasePct: number;
  actualVsOriginalPct: number;
  recommendedAction: string;
  inspectionTriggered: boolean;
}

export default function CostOverrunBanner({
  overrunStatus,
  overrunFlags,
  caseId,
  previousRiskScore,
  updatedRiskScore,
  newProjectStatus,
  estimateIncreasePct,
  actualVsOriginalPct,
  recommendedAction,
  inspectionTriggered,
}: CostOverrunBannerProps) {
  if (inspectionTriggered) {
    return (
      <div className="card border-[#F87171] bg-[#FEF2F2] space-y-3 shadow-xs slide-down">
        <div className="flex items-center justify-between border-b border-[#FECACA] pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <div>
              <span className="text-[10px] font-bold text-[#B3261E] uppercase tracking-wider">
                ● STATUTORY COST OVERRUN ESCALATION
              </span>
              <h3 className="text-sm font-bold text-[#991B1B]">
                INSPECTION REQUIRED &amp; ESCROW GATEWAY INTERVENTION (ESCALATION: +{estimateIncreasePct.toFixed(1)}%)
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
            <span className="text-[10px] text-[#991B1B]">Severe Cost Escalation Tier</span>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Project Status</span>
            <p className="font-bold text-[#B3261E] text-sm mt-0.5">{newProjectStatus}</p>
            <span className="text-[10px] text-[#64748B]">Disbursements frozen pending inquiry</span>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Detected Overrun Flags</span>
            <p className="font-mono font-bold text-[#0F172A] text-xs mt-0.5 truncate">
              {overrunFlags.join(", ") || "ESTIMATE_ESCALATION"}
            </p>
            <span className="text-[10px] text-[#64748B]">Assigned to District Authority (DA)</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-white border border-[#FECACA] text-xs text-[#334155]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Recommended Action</span>
          {recommendedAction}
        </div>
      </div>
    );
  }

  if (overrunStatus !== "WITHIN_BUDGET") {
    const isSevere = overrunStatus === "SEVERE_ESCALATION" || overrunStatus === "OVERRUN_CONFIRMED";
    return (
      <div
        className="card space-y-2 text-xs slide-down"
        style={{
          borderColor: isSevere ? "#FCA5A5" : "#FDBA74",
          backgroundColor: isSevere ? "#FEF2F2" : "#FFF7ED",
        }}
      >
        <div
          className="flex items-center gap-2 font-bold text-sm"
          style={{ color: isSevere ? "#991B1B" : "#C2410C" }}
        >
          <span>⚠️</span>
          <span>
            {isSevere
              ? "SEVERE COST OVERRUN DETECTED (>50% ESCALATION)"
              : "BUDGET ESCALATION DETECTED (>25% THRESHOLD)"}
          </span>
        </div>
        <p className="text-[#334155] pl-6">
          Sanction estimate increased by +{estimateIncreasePct.toFixed(1)}% over original baseline proposal, with actual expenditure tracking at +{actualVsOriginalPct.toFixed(1)}% of original cost.
        </p>
      </div>
    );
  }

  return null;
}
