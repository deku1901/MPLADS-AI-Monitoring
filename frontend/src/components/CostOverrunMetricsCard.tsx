"use client";

interface CostOverrunMetricsCardProps {
  originalEstimateInr: number;
  revisedEstimateInr: number;
  actualExpenditureInr: number;
  estimateIncreaseInr: number;
  estimateIncreasePct: number;
  actualVsOriginalPct: number;
  actualVsRevisedPct: number;
  remainingBalanceInr: number;
  monitoringThresholdPct: number;
  overrunStatus: string;
  riskLevel: string;
  overrunFlags: string[];
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  WITHIN_BUDGET: { color: "#166534", bg: "#F0FDF4", border: "#86EFAC", label: "WITHIN BUDGET" },
  COST_ESCALATION: { color: "#B45309", bg: "#FFFBEB", border: "#FDE68A", label: "COST ESCALATION DETECTED" },
  OVERRUN_RISK: { color: "#C2410C", bg: "#FFF7ED", border: "#FDBA74", label: "BUDGET OVERRUN RISK" },
  SEVERE_ESCALATION: { color: "#B3261E", bg: "#FEF2F2", border: "#FECACA", label: "SEVERE COST ESCALATION" },
  OVERRUN_CONFIRMED: { color: "#991B1B", bg: "#FEF2F2", border: "#F87171", label: "CONFIRMED OVERRUN" },
};

export default function CostOverrunMetricsCard({
  originalEstimateInr,
  revisedEstimateInr,
  actualExpenditureInr,
  estimateIncreaseInr,
  estimateIncreasePct,
  actualVsOriginalPct,
  actualVsRevisedPct,
  remainingBalanceInr,
  monitoringThresholdPct,
  overrunStatus,
  riskLevel,
  overrunFlags,
}: CostOverrunMetricsCardProps) {
  const cfg = STATUS_CONFIG[overrunStatus] ?? STATUS_CONFIG.WITHIN_BUDGET;
  const isBreached = estimateIncreasePct > monitoringThresholdPct || actualVsOriginalPct > monitoringThresholdPct;

  // Max value for progress gauge bar
  const maxVal = Math.max(originalEstimateInr, revisedEstimateInr, actualExpenditureInr, 1);
  const origPct = Math.min((originalEstimateInr / maxVal) * 100, 100);
  const revPct = Math.min((revisedEstimateInr / maxVal) * 100, 100);
  const actPct = Math.min((actualExpenditureInr / maxVal) * 100, 100);

  return (
    <section className="card bg-white border-[#D5DCE5] space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Budget Trajectory &amp; Overrun Analytics
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">
              Original vs Revised vs Actual Expenditure Analysis
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
            Threshold: {monitoringThresholdPct}%
          </span>
          <span
            className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border"
            style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
          >
            ● {cfg.label}
          </span>
        </div>
      </div>

      {/* Comparative Budget Bars */}
      <div className="space-y-3 p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0]">
        <span className="text-[11px] font-bold text-[#334155] uppercase tracking-wider">
          Comparative Fiscal Allocation Comparison
        </span>

        {/* 1. Original Administrative Estimate */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[#475569]">1. Original Administrative Estimate</span>
            <span className="font-mono font-bold text-[#0F172A]">
              ₹{originalEstimateInr.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#64748B] rounded-full transition-all duration-500"
              style={{ width: `${origPct}%` }}
            />
          </div>
        </div>

        {/* 2. Revised Estimate (DA Approved) */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[#475569]">
              2. Revised Sanction Estimate (DA Approved)
            </span>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold"
                style={{ color: estimateIncreasePct > monitoringThresholdPct ? "#B3261E" : "#166534" }}
              >
                {estimateIncreasePct >= 0 ? `+${estimateIncreasePct.toFixed(2)}%` : `${estimateIncreasePct.toFixed(2)}%`}
              </span>
              <span className="font-mono font-bold text-[#0369A1]">
                ₹{revisedEstimateInr.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${revPct}%`,
                backgroundColor: estimateIncreasePct > monitoringThresholdPct ? "#D97706" : "#0369A1",
              }}
            />
          </div>
        </div>

        {/* 3. Actual Incurred Expenditure */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-[#475569]">3. Actual Incurred Expenditure</span>
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold"
                style={{ color: actualVsOriginalPct > monitoringThresholdPct ? "#B3261E" : "#166534" }}
              >
                vs Orig: {actualVsOriginalPct >= 0 ? `+${actualVsOriginalPct.toFixed(2)}%` : `${actualVsOriginalPct.toFixed(2)}%`}
              </span>
              <span className="font-mono font-bold text-[#991B1B]">
                ₹{actualExpenditureInr.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${actPct}%`,
                backgroundColor: actualVsRevisedPct >= 0 ? "#B3261E" : "#C2410C",
              }}
            />
          </div>
        </div>
      </div>

      {/* 5-Metric Key Financial Indicators Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Estimate Increase */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Estimate Escalation</span>
          <p className="font-mono font-bold text-[#0F172A] text-sm mt-0.5">
            ₹{estimateIncreaseInr.toLocaleString("en-IN")}
          </p>
          <span
            className="text-[10px] font-bold"
            style={{ color: estimateIncreasePct > monitoringThresholdPct ? "#B3261E" : "#166534" }}
          >
            +{estimateIncreasePct.toFixed(2)}% increase
          </span>
        </div>

        {/* Metric 2: Actual vs Original */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Actual vs Original</span>
          <p
            className="font-mono font-bold text-sm mt-0.5"
            style={{ color: actualVsOriginalPct > monitoringThresholdPct ? "#B3261E" : "#166534" }}
          >
            {actualVsOriginalPct >= 0 ? `+${actualVsOriginalPct.toFixed(2)}%` : `${actualVsOriginalPct.toFixed(2)}%`}
          </p>
          <span className="text-[10px] text-[#64748B]">Baseline Deviation</span>
        </div>

        {/* Metric 3: Actual vs Revised */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Actual vs Revised</span>
          <p
            className="font-mono font-bold text-sm mt-0.5"
            style={{ color: actualVsRevisedPct >= 0 ? "#B3261E" : "#0369A1" }}
          >
            {actualVsRevisedPct >= 0 ? `+${actualVsRevisedPct.toFixed(2)}%` : `${actualVsRevisedPct.toFixed(2)}%`}
          </p>
          <span className="text-[10px] text-[#64748B]">Revised Cap Usage</span>
        </div>

        {/* Metric 4: Remaining Balance */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Remaining Balance</span>
          <p
            className="font-mono font-bold text-sm mt-0.5"
            style={{ color: remainingBalanceInr < 0 ? "#B3261E" : "#166534" }}
          >
            ₹{remainingBalanceInr.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-[#64748B]">
            {remainingBalanceInr < 0 ? "Budget Exhausted" : "Unspent Revised Cap"}
          </span>
        </div>

        {/* Metric 5: Overrun Risk Level */}
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Overall Risk Level</span>
          <p
            className="font-mono font-bold text-sm mt-0.5"
            style={{
              color: riskLevel === "HIGH" ? "#B3261E" : riskLevel === "MEDIUM" ? "#C2410C" : "#166534",
            }}
          >
            {riskLevel}
          </p>
          <span className="text-[10px] text-[#64748B]">
            {isBreached ? "Exceeds 25% Threshold" : "Within Parameters"}
          </span>
        </div>
      </div>

      {/* Flags List */}
      {overrunFlags.length > 0 && (
        <div className="p-2.5 rounded bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-[#B3261E] uppercase text-[10px]">Active Anomaly Flags:</span>
          {overrunFlags.map((flag) => (
            <span
              key={flag}
              className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white text-[#991B1B] border border-[#FCA5A5]"
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
