"use client";

interface DelayProgressCardProps {
  expectedPct: number;
  actualPct: number;
  progressGapPct: number;
  delayStatus: string;
  riskLevel: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  PROJECT_STALLED: { color: "#B3261E", bg: "#FEF2F2", border: "#FECACA", label: "PROJECT STALLED" },
  SEVERE_DELAY: { color: "#C2410C", bg: "#FFF7ED", border: "#FDBA74", label: "SEVERE DELAY" },
  DELAY_RISK: { color: "#B45309", bg: "#FFFBEB", border: "#FDE68A", label: "DELAY RISK" },
  MINOR_DELAY: { color: "#CA8A04", bg: "#FEFCE8", border: "#FEF08A", label: "MINOR DELAY" },
  ON_TRACK: { color: "#166534", bg: "#F0FDF4", border: "#86EFAC", label: "ON TRACK" },
};

export default function DelayProgressCard({
  expectedPct,
  actualPct,
  progressGapPct,
  delayStatus,
  riskLevel,
}: DelayProgressCardProps) {
  const cfg = STATUS_CONFIG[delayStatus] ?? STATUS_CONFIG.ON_TRACK;

  return (
    <section className="card bg-white border-[#D5DCE5] space-y-4">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Project Lifecycle Progress Assessment
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">Expected vs Actual Progress Comparison</h3>
          </div>
        </div>
        <span
          className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border"
          style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
        >
          ● {cfg.label}
        </span>
      </div>

      {/* Dual Progress Bars */}
      <div className="space-y-3">
        {/* Expected Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#334155]">Expected Progress (Timeline-Based)</span>
            <span className="font-mono font-bold text-[#0369A1]">{expectedPct.toFixed(1)}%</span>
          </div>
          <div className="w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(expectedPct, 100)}%`,
                backgroundColor: "#0369A1",
              }}
            />
          </div>
        </div>

        {/* Actual Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#334155]">Actual Progress (Reported / AI-Verified)</span>
            <span className="font-mono font-bold" style={{ color: cfg.color }}>{actualPct}%</span>
          </div>
          <div className="w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(actualPct, 100)}%`,
                backgroundColor: cfg.color,
              }}
            />
          </div>
        </div>
      </div>

      {/* Delta Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Expected Progress</span>
          <p className="font-mono font-bold text-[#0369A1] text-lg mt-0.5">{expectedPct.toFixed(1)}%</p>
        </div>
        <div className="p-3 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Actual Progress</span>
          <p className="font-mono font-bold text-lg mt-0.5" style={{ color: cfg.color }}>{actualPct}%</p>
        </div>
        <div className="p-3 rounded border" style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}>
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Progress Gap (Δ)</span>
          <p className="font-mono font-bold text-lg mt-0.5" style={{ color: cfg.color }}>{progressGapPct.toFixed(1)}%</p>
          <span className="text-[10px]" style={{ color: cfg.color }}>Risk Level: {riskLevel}</span>
        </div>
      </div>
    </section>
  );
}
