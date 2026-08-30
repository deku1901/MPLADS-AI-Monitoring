"use client";

interface ProjectTimelineProps {
  sanctionDate: string;
  expectedCompletionDate: string;
  elapsedDays: number;
  elapsedPct: number;
  daysSinceLastProgress: number;
  delayStatus: string;
}

export default function ProjectTimeline({
  sanctionDate,
  expectedCompletionDate,
  elapsedDays,
  elapsedPct,
  daysSinceLastProgress,
  delayStatus,
}: ProjectTimelineProps) {
  const isStalled = delayStatus === "PROJECT_STALLED";
  const isSevere = delayStatus === "SEVERE_DELAY";

  const totalDays = Math.max(
    Math.round(
      (new Date(expectedCompletionDate).getTime() - new Date(sanctionDate).getTime()) / (1000 * 60 * 60 * 24)
    ),
    1
  );
  const remainingDays = Math.max(totalDays - elapsedDays, 0);

  return (
    <section className="card bg-white border-[#D5DCE5] space-y-4">
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2.5">
        <span className="text-lg">📅</span>
        <div>
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
            Project Lifecycle Timeline
          </span>
          <h3 className="text-sm font-bold text-[#0A2240]">Sanction-to-Completion Duration Analysis</h3>
        </div>
      </div>

      {/* Timeline Visual Bar */}
      <div className="space-y-2">
        <div className="relative w-full h-6 bg-[#E2E8F0] rounded-full overflow-hidden">
          {/* Elapsed portion */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
            style={{
              width: `${Math.min(elapsedPct, 100)}%`,
              backgroundColor: isStalled ? "#B3261E" : isSevere ? "#C2410C" : "#0369A1",
              minWidth: "40px",
            }}
          >
            <span className="text-white text-[9px] font-bold">{elapsedPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-[#64748B] font-medium px-0.5">
          <span>Sanction: {sanctionDate}</span>
          <span>Expected Completion: {expectedCompletionDate}</span>
        </div>
      </div>

      {/* Key Duration Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Total Duration</span>
          <p className="font-mono font-bold text-[#0F172A] text-sm mt-0.5">{totalDays} days</p>
        </div>
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Elapsed</span>
          <p className="font-mono font-bold text-[#0369A1] text-sm mt-0.5">{elapsedDays} days</p>
        </div>
        <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Remaining</span>
          <p className="font-mono font-bold text-sm mt-0.5" style={{ color: remainingDays <= 30 ? "#B3261E" : "#0F172A" }}>
            {remainingDays} days
          </p>
        </div>
        <div
          className="p-2.5 rounded border"
          style={{
            backgroundColor: isStalled ? "#FEF2F2" : isSevere ? "#FFF7ED" : "#F8FAFC",
            borderColor: isStalled ? "#FECACA" : isSevere ? "#FDBA74" : "#E2E8F0",
          }}
        >
          <span className="text-[10px] font-bold text-[#64748B] uppercase">Days Since Progress</span>
          <p
            className="font-mono font-bold text-sm mt-0.5"
            style={{ color: daysSinceLastProgress > 90 ? "#B3261E" : daysSinceLastProgress > 60 ? "#C2410C" : "#0F172A" }}
          >
            {daysSinceLastProgress} days
          </p>
          {daysSinceLastProgress > 90 && (
            <span className="text-[9px] text-[#B3261E] font-bold">⚠ Exceeds 90-day stall threshold</span>
          )}
        </div>
      </div>
    </section>
  );
}
