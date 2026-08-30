"use client";

interface FinancialRiskBannerProps {
  healthRating: string;
  financialFlags: string[];
  caseId: string | null;
  previousRiskScore: number;
  updatedRiskScore: number;
  newProjectStatus: string;
  costVariancePct: number;
  fundUtilizationPct: number;
  recommendedAction: string;
  inspectionTriggered: boolean;
}

export default function FinancialRiskBanner({
  healthRating,
  financialFlags,
  caseId,
  previousRiskScore,
  updatedRiskScore,
  newProjectStatus,
  costVariancePct,
  fundUtilizationPct,
  recommendedAction,
  inspectionTriggered,
}: FinancialRiskBannerProps) {
  if (inspectionTriggered) {
    return (
      <div className="card border-[#F87171] bg-[#FEF2F2] space-y-3 shadow-xs slide-down">
        <div className="flex items-center justify-between border-b border-[#FECACA] pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚨</span>
            <div>
              <span className="text-[10px] font-bold text-[#B3261E] uppercase tracking-wider">
                ● STATUTORY FINANCIAL ANOMALY ESCALATION
              </span>
              <h3 className="text-sm font-bold text-[#991B1B]">
                MANDATORY FISCAL INQUIRY DISPATCHED (VARIANCE: {costVariancePct >= 0 ? `+${costVariancePct.toFixed(1)}%` : `${costVariancePct.toFixed(1)}%`})
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
            <span className="text-[10px] text-[#991B1B]">Critical Fiscal Anomaly Tier</span>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Project Status</span>
            <p className="font-bold text-[#B3261E] text-sm mt-0.5">{newProjectStatus}</p>
            <span className="text-[10px] text-[#64748B]">Disbursements frozen pending audit</span>
          </div>

          <div className="p-2.5 rounded bg-white border border-[#FECACA]">
            <span className="text-[10px] font-bold text-[#64748B] uppercase">Detected Flags</span>
            <p className="font-mono font-bold text-[#0F172A] text-xs mt-0.5 truncate">
              {financialFlags.join(", ") || "COST_VARIANCE"}
            </p>
            <span className="text-[10px] text-[#64748B]">Assigned to District Authority</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-white border border-[#FECACA] text-xs text-[#334155]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block mb-1">Recommended Action</span>
          {recommendedAction}
        </div>
      </div>
    );
  }

  if (healthRating !== "HEALTHY") {
    const isHigh = healthRating === "HIGH_RISK";
    return (
      <div
        className="card space-y-2 text-xs slide-down"
        style={{
          borderColor: isHigh ? "#FDBA74" : "#FDE68A",
          backgroundColor: isHigh ? "#FFF7ED" : "#FFFBEB",
        }}
      >
        <div className="flex items-center gap-2 font-bold text-sm" style={{ color: isHigh ? "#C2410C" : "#B45309" }}>
          <span>⚠️</span>
          <span>
            {isHigh ? "HIGH FISCAL EXPENDITURE RISK" : "MODERATE COST VARIANCE DETECTED"}
          </span>
        </div>
        <p className="text-[#334155] pl-6">
          Cost variance of {costVariancePct >= 0 ? `+${costVariancePct.toFixed(1)}%` : `${costVariancePct.toFixed(1)}%`} with {fundUtilizationPct.toFixed(1)}% fund utilization.
          Risk Score: {previousRiskScore} → {updatedRiskScore}.
        </p>
      </div>
    );
  }

  return (
    <div className="card border-[#86EFAC] bg-[#F0FDF4] space-y-2 text-xs slide-down">
      <div className="flex items-center gap-2 font-bold text-[#166534] text-sm">
        <span>✅</span>
        <span>FISCAL ALLOCATION &amp; EXPENDITURE AUDIT VERIFIED</span>
      </div>
      <p className="text-[#334155] pl-6">
        All financial expenditures, cost estimates, and disbursement ratios are within statutory MoSPI limits.
        Risk Score: {updatedRiskScore}/100.
      </p>
    </div>
  );
}
