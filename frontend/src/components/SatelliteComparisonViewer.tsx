"use client";

import { useState } from "react";
import type { SatellitePassMetadata } from "@/lib/types";

interface SatelliteComparisonViewerProps {
  projectId: string;
  coordinates: { lat: number; lon: number };
  baselinePass: SatellitePassMetadata;
  currentPass: SatellitePassMetadata;
  structuralChangeScore: number;
}

/** Derive number of months elapsed between two YYYY-MM-DD date strings */
function monthsElapsed(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Visual construction stage derived from structuralChangeScore + months elapsed */
function constructionStage(score: number, months: number): string {
  if (score < 0.1) return "No Activity Detected";
  if (score < 0.2) return "Land Clearance / Marking";
  if (score < 0.35) return "Foundation Work";
  if (score < 0.55) return "Sub-structure Complete";
  if (score < 0.75) return "Super-structure Rising";
  if (score < 0.90) return "Near Completion";
  return "Structure Complete";
}

/** Render simulated satellite "pixels" as an SVG pattern indicating construction progress */
function SatelliteCanvas({
  mode,
  isBaseline,
  score,
  passId,
  date,
  cloudPct,
  ndbi,
  ndvi,
  months,
}: {
  mode: "FALSE_COLOR" | "NDBI_HEATMAP";
  isBaseline: boolean;
  score: number;
  passId: string;
  date: string;
  cloudPct: number;
  ndbi: number;
  ndvi: number;
  months: number;
}) {
  const stage = constructionStage(score, months);

  // Color scheme per view mode
  const bgClass = isBaseline
    ? mode === "FALSE_COLOR"
      ? "bg-gradient-to-br from-[#1E3A1E] via-[#2E5A2E] to-[#1B301B]"
      : "bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617]"
    : mode === "FALSE_COLOR"
    ? "bg-gradient-to-br from-[#2D3748] via-[#4A5568] to-[#1A202C]"
    : "bg-gradient-to-br from-[#7C2D12] via-[#9A3412] to-[#451A03]";

  const borderClass = isBaseline
    ? mode === "FALSE_COLOR" ? "border-[#4A7C4A]" : "border-[#334155]"
    : mode === "FALSE_COLOR" ? "border-[#718096]" : "border-[#C2410C]";

  // Construction progress fills — percent of canvas with "built" area
  const builtPct = isBaseline ? 0 : Math.round(score * 100);
  const cols = 8;
  const rows = 4;
  const totalCells = cols * rows;
  const filledCells = Math.round((builtPct / 100) * totalCells);

  return (
    <div className={`h-52 rounded border relative overflow-hidden flex flex-col justify-between p-3 ${bgClass} ${borderClass}`}>
      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Construction pixel grid — shows actual build progress */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ padding: "28px 12px 32px 12px" }}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${cols * 24} ${rows * 20}`} preserveAspectRatio="xMidYMid meet">
          {Array.from({ length: totalCells }).map((_, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const isFilled = i < filledCells;
            const isEdge = isFilled && (i === filledCells - 1 || (i + 1 < totalCells && (i + 1) >= filledCells));
            return (
              <rect
                key={i}
                x={col * 24 + 2}
                y={row * 20 + 2}
                width={20}
                height={16}
                rx={2}
                fill={
                  isFilled
                    ? mode === "FALSE_COLOR"
                      ? isEdge ? "#F59E0B" : "#94A3B8"
                      : isEdge ? "#FBBF24" : "#DC2626"
                    : "transparent"
                }
                fillOpacity={isFilled ? (isEdge ? 0.85 : 0.45) : 0}
                stroke={isFilled ? (mode === "FALSE_COLOR" ? "#CBD5E1" : "#EF4444") : "none"}
                strokeWidth="0.5"
                strokeOpacity={0.5}
              />
            );
          })}
          {/* Active construction front marker */}
          {!isBaseline && filledCells > 0 && filledCells < totalCells && (() => {
            const lastCol = (filledCells - 1) % cols;
            const lastRow = Math.floor((filledCells - 1) / cols);
            return (
              <rect
                x={lastCol * 24 + 1}
                y={lastRow * 20 + 1}
                width={22}
                height={18}
                rx={2}
                fill="none"
                stroke="#FBBF24"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
            );
          })()}
        </svg>
      </div>

      {/* Target / no-activity circle (baseline only) */}
      {isBaseline && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white/50" />
          </div>
        </div>
      )}

      {/* Construction progress box (T1 only) */}
      {!isBaseline && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-amber-400/80 bg-amber-400/10 px-3 py-1.5 rounded text-center">
            <p className="text-[9px] font-mono font-bold text-amber-200">Δ {score.toFixed(2)} Change Score</p>
            <p className="text-[8px] text-amber-100/80 mt-0.5">{stage}</p>
          </div>
        </div>
      )}

      {/* Top row: pass ID + cloud cover */}
      <div className="relative z-10 flex justify-between items-start text-[10px] font-mono text-white/90">
        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">{passId}</span>
        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">Cloud: {cloudPct}%</span>
      </div>

      {/* Bottom row: NDBI + NDVI */}
      <div className="relative z-10 flex justify-between items-end text-[10px] font-mono text-white/90">
        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
          NDBI: {ndbi.toFixed(2)} ({isBaseline ? "Bare Ground" : "Partial Construction"})
        </span>
        <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
          NDVI: {ndvi.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

export default function SatelliteComparisonViewer({
  projectId,
  coordinates,
  baselinePass,
  currentPass,
  structuralChangeScore,
}: SatelliteComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<"FALSE_COLOR" | "NDBI_HEATMAP">("FALSE_COLOR");

  const months = monthsElapsed(baselinePass.date, currentPass.date);
  const stage = constructionStage(structuralChangeScore, months);
  const builtPct = Math.round(structuralChangeScore * 100);

  return (
    <div className="card border-[#D5DCE5] bg-white shadow-xs space-y-4">
      {/* Header */}
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🛰️</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
                SENTINEL-2 MULTI-TEMPORAL CHANGE DETECTION VIEWER
              </h3>
              <span className="font-mono text-[10px] font-bold text-[#123B6D] bg-[#EFF6FF] px-1.5 py-0.2 rounded border border-[#BFDBFE]">
                {projectId}
              </span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              Coordinates: {coordinates.lat.toFixed(4)}°N, {coordinates.lon.toFixed(4)}°E • 10m GSD •{" "}
              <span className="font-semibold text-[#123B6D]">
                Δt = {months} month{months !== 1 ? "s" : ""} ({baselinePass.date} → {currentPass.date})
              </span>
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded border border-[#CBD5E1]">
          <button
            type="button"
            onClick={() => setViewMode("FALSE_COLOR")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
              viewMode === "FALSE_COLOR"
                ? "bg-[#123B6D] text-white shadow-2xs"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            B8-B4-B3 False Color
          </button>
          <button
            type="button"
            onClick={() => setViewMode("NDBI_HEATMAP")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
              viewMode === "NDBI_HEATMAP"
                ? "bg-[#123B6D] text-white shadow-2xs"
                : "text-[#475569] hover:text-[#0F172A]"
            }`}
          >
            NDBI Built-up Heatmap
          </button>
        </div>
      </div>

      {/* Progress Bar Summary — spans full width between passes */}
      <div className="px-1 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-[#64748B] font-semibold">
          <span>T0 Baseline — Pre-Construction ({baselinePass.date})</span>
          <span>T1 Current Pass — {months}mo Later ({currentPass.date})</span>
        </div>
        <div className="w-full h-3 bg-[#E2E8F0] rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-[#166534] to-[#16A34A] rounded-full transition-all duration-700"
            style={{ width: `${builtPct}%` }}
          />
          <span
            className="absolute top-0 bottom-0 flex items-center text-[9px] font-bold text-white px-2"
            style={{ left: `${Math.min(builtPct, 85)}%` }}
          >
            {builtPct > 5 ? `${builtPct}%` : ""}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-[#64748B]">0% Bare Ground</span>
          <span className={`font-bold ${structuralChangeScore >= 0.7 ? "text-[#166534]" : structuralChangeScore >= 0.35 ? "text-[#B45309]" : "text-[#B91C1C]"}`}>
            Current Stage: {stage}
          </span>
          <span className="text-[#64748B]">100% Complete</span>
        </div>
      </div>

      {/* Side-by-Side Satellite Passes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pass T0: Baseline */}
        <div className="p-3 rounded border border-[#CBD5E1] bg-[#F8FAFC] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 text-xs">
            <span className="font-bold text-[#123B6D] text-[11px] uppercase">
              T0: Pre-Construction Baseline Pass
            </span>
            <span className="font-mono text-[10px] text-[#64748B] bg-white px-1.5 py-0.2 rounded border border-[#CBD5E1]">
              {baselinePass.date}
            </span>
          </div>

          <SatelliteCanvas
            mode={viewMode}
            isBaseline={true}
            score={0}
            passId={baselinePass.pass_id}
            date={baselinePass.date}
            cloudPct={baselinePass.cloud_cover_pct}
            ndbi={baselinePass.ndbi_score}
            ndvi={baselinePass.ndvi_score}
            months={0}
          />

          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569] pt-1">
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Optical Sensor</span>
              <p className="font-semibold text-[#0F172A]">{baselinePass.sensor}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Spectral Band</span>
              <p className="font-semibold text-[#0F172A]">{baselinePass.spectral_band}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Construction Stage</span>
              <p className="font-semibold text-[#64748B]">Undeveloped / Bare Ground</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Built-up Area</span>
              <p className="font-semibold text-[#64748B]">0%</p>
            </div>
          </div>
        </div>

        {/* Pass T1: Current Sentinel-2 Pass */}
        <div className="p-3 rounded border border-[#CBD5E1] bg-[#F8FAFC] space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 text-xs">
            <span className="font-bold text-[#B45309] text-[11px] uppercase">
              T1: Current Sentinel-2 Verification Pass
            </span>
            <span className="font-mono text-[10px] text-[#64748B] bg-white px-1.5 py-0.2 rounded border border-[#CBD5E1]">
              {currentPass.date}
            </span>
          </div>

          <SatelliteCanvas
            mode={viewMode}
            isBaseline={false}
            score={structuralChangeScore}
            passId={currentPass.pass_id}
            date={currentPass.date}
            cloudPct={currentPass.cloud_cover_pct}
            ndbi={currentPass.ndbi_score}
            ndvi={currentPass.ndvi_score}
            months={months}
          />

          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569] pt-1">
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Optical Sensor</span>
              <p className="font-semibold text-[#0F172A]">{currentPass.sensor}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Structural Change Score</span>
              <p className="font-mono font-bold text-[#B45309]">
                {structuralChangeScore.toFixed(2)} / 1.00
              </p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Construction Stage</span>
              <p className={`font-semibold ${structuralChangeScore >= 0.7 ? "text-[#166534]" : structuralChangeScore >= 0.35 ? "text-[#B45309]" : "text-[#B91C1C]"}`}>
                {stage}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Built-up Area</span>
              <p className={`font-bold ${builtPct >= 70 ? "text-[#166534]" : builtPct >= 35 ? "text-[#B45309]" : "text-[#B91C1C]"}`}>
                {builtPct}% ({months}mo elapsed)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delta Summary Bar */}
      <div className="p-3 rounded border border-[#D5DCE5] bg-[#F8FAFC] flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#E2E8F0] border border-[#CBD5E1]" />
          <span className="text-[#64748B]">T0 — No Development</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#94A3B8]/45 border border-[#94A3B8]/50" />
          <span className="text-[#64748B]">Active Construction Pixels</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-dashed border-amber-400" />
          <span className="text-[#64748B]">Active Build Front (T1)</span>
        </div>
        <div className="ml-auto font-mono font-bold text-[#0A2240]">
          Δt = {months} months | Change Score = {structuralChangeScore.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
