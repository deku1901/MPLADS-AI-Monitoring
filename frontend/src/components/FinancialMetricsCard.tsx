"use client";

interface FinancialMetricsCardProps {
  recommendedInr: number;
  sanctionedInr: number;
  costVarianceInr: number;
  costVariancePct: number;
  totalReleasedInr: number;
  totalPendingInr: number;
  unreleasedBalanceInr: number;
  fundUtilizationPct: number;
  expenditureToProgressRatio: number;
  healthRating: string;
}

const HEALTH_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  CRITICAL_ANOMALY: { color: "#B3261E", bg: "#FEF2F2", border: "#FECACA", label: "CRITICAL FISCAL ANOMALY" },
  HIGH_RISK: { color: "#C2410C", bg: "#FFF7ED", border: "#FDBA74", label: "HIGH FISCAL RISK" },
  MODERATE_RISK: { color: "#B45309", bg: "#FFFBEB", border: "#FDE68A", label: "MODERATE RISK" },
  HEALTHY: { color: "#166534", bg: "#F0FDF4", border: "#86EFAC", label: "HEALTHY ALLOCATION" },
};

export default function FinancialMetricsCard({
  recommendedInr,
  sanctionedInr,
  costVariancePct,
  totalReleasedInr,
  totalPendingInr,
  unreleasedBalanceInr,
  fundUtilizationPct,
  expenditureToProgressRatio,
  healthRating,
}: FinancialMetricsCardProps) {
  const cfg = HEALTH_CONFIG[healthRating] ?? HEALTH_CONFIG.HEALTHY;
  const isEscalated = costVariancePct > 25;

  return (
    <section className="card bg-white border-[#D5DCE5] space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Fiscal Allocations &amp; Expenditure Pace
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">Sanctioned vs Released Funds Overview</h3>
          </div>
        </div>
        <span
          className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border"
          style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
        >
          ● {cfg.label}
        </span>
      </div>

      {/* Fund Utilization Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#334155]">Fund Utilization Rate</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B]">
              ₹{totalReleasedInr.toLocaleString("en-IN")} of ₹{sanctionedInr.toLocaleString("en-IN")}
            </span>
            <span className="font-mono font-bold text-[#0369A1]">{fundUtilizationPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="w-full h-3.5 bg-[#E2E8F0] rounded-full overflow-hidden flex">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(fundUtilizationPct, 100)}%`,
              backgroundColor: fundUtilizationPct > 80 ? "#166534" : "#0369A1",
            }}
          />
        </div>
      </div>

      {/* 4-Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Recommended Amount */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Recommended Cost</span>
          <p className="font-mono font-bold text-[#0F172A] text-sm mt-0.5">
            ₹{recommendedInr.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B]">MP Initial Proposal</span>
        </div>

        {/* Sanctioned Amount */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Sanctioned Amount</span>
          <p className="font-mono font-bold text-[#0369A1] text-sm mt-0.5">
            ₹{sanctionedInr.toLocaleString("en-IN")}
          </p>
          <span
            className="text-[10px] font-bold"
            style={{ color: isEscalated ? "#B3261E" : "#166534" }}
          >
            {costVariancePct >= 0 ? `+${costVariancePct.toFixed(1)}%` : `${costVariancePct.toFixed(1)}%`} Variance
          </span>
        </div>

        {/* Total Released */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Total Disbursed</span>
          <p className="font-mono font-bold text-[#166534] text-sm mt-0.5">
            ₹{totalReleasedInr.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B]">
            {totalPendingInr > 0 ? `₹${totalPendingInr.toLocaleString("en-IN")} Held/Pending` : "No pending release"}
          </span>
        </div>

        {/* Remaining Balance */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Unreleased Balance</span>
          <p className="font-mono font-bold text-[#475569] text-sm mt-0.5">
            ₹{unreleasedBalanceInr.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B]">
            Ratio: {expenditureToProgressRatio.toFixed(2)}x progress
          </span>
        </div>
      </div>
    </section>
  );
}
