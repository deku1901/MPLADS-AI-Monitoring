"use client";

interface PhysicalProgressGaugeProps {
  reportedPct: number;
  aiEstimatedPct: number;
  mismatchPct: number;
  isMismatch: boolean;
  confidenceScore: number;
}

export default function PhysicalProgressGauge({
  reportedPct,
  aiEstimatedPct,
  mismatchPct,
  isMismatch,
  confidenceScore,
}: PhysicalProgressGaugeProps) {
  return (
    <div className="card border-[#D5DCE5] bg-white shadow-xs space-y-4">
      {/* Card Header */}
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
            PHYSICAL PROGRESS DISCREPANCY GAUGE
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded border border-[#CBD5E1]">
          Optical Confidence: {(confidenceScore * 100).toFixed(0)}%
        </span>
      </div>

      {/* 3-Column Comparative Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        {/* Reported Progress */}
        <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1] space-y-1">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
            1. Self-Reported Milestone
          </span>
          <p className="text-2xl font-black font-mono text-[#0A2240]">{reportedPct}%</p>
          <span className="text-[10px] text-[#64748B]">Claimed by Executing Agency</span>
        </div>

        {/* AI Estimated Progress */}
        <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1] space-y-1">
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
            2. AI Satellite Observed
          </span>
          <p className={`text-2xl font-black font-mono ${isMismatch ? "text-[#B3261E]" : "text-[#15803D]"}`}>
            {aiEstimatedPct}%
          </p>
          <span className="text-[10px] text-[#64748B]">Sentinel-2 MSI Optical Change</span>
        </div>

        {/* Discrepancy Delta */}
        <div
          className={`p-3 rounded border space-y-1 ${
            isMismatch
              ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
              : "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider">
            3. Discrepancy Delta (Δ)
          </span>
          <p className="text-2xl font-black font-mono">
            {mismatchPct}%
          </p>
          <span className="text-[10px] font-semibold">
            {isMismatch ? "Exceeds 20% Statutory Limit" : "Within Allowable Tolerance (≤20%)"}
          </span>
        </div>
      </div>

      {/* Visual Comparative Bars */}
      <div className="space-y-2.5 pt-1 text-xs">
        {/* Reported bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-[#475569]">
            <span>Claimed Self-Reported Physical Progress</span>
            <span className="font-mono font-bold text-[#0A2240]">{reportedPct}%</span>
          </div>
          <div className="w-full h-3 rounded bg-[#E2E8F0] overflow-hidden">
            <div
              className="h-full bg-[#123B6D] transition-all duration-500 rounded"
              style={{ width: `${Math.min(reportedPct, 100)}%` }}
            />
          </div>
        </div>

        {/* AI Observed bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-[#475569]">
            <span>AI Verified Remote Sensing Built-up Progress</span>
            <span
              className={`font-mono font-bold ${
                isMismatch ? "text-[#B3261E]" : "text-[#15803D]"
              }`}
            >
              {aiEstimatedPct}%
            </span>
          </div>
          <div className="w-full h-3 rounded bg-[#E2E8F0] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded ${
                isMismatch ? "bg-[#B3261E]" : "bg-[#15803D]"
              }`}
              style={{ width: `${Math.min(aiEstimatedPct, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
