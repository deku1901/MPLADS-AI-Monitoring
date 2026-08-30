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

export default function SatelliteComparisonViewer({
  projectId,
  coordinates,
  baselinePass,
  currentPass,
  structuralChangeScore,
}: SatelliteComparisonViewerProps) {
  const [viewMode, setViewMode] = useState<"FALSE_COLOR" | "NDBI_HEATMAP">("FALSE_COLOR");

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
              Coordinates: {coordinates.lat.toFixed(4)}°N, {coordinates.lon.toFixed(4)}°E • 10m Ground Sample Distance (GSD)
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

          {/* Simulated Satellite Canvas */}
          <div
            className={`h-48 rounded border relative overflow-hidden flex flex-col justify-between p-3 ${
              viewMode === "FALSE_COLOR"
                ? "bg-gradient-to-br from-[#1E3A1E] via-[#2E5A2E] to-[#1B301B] border-[#4A7C4A]"
                : "bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] border-[#334155]"
            }`}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Target Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full border border-white/40 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/70" />
              </div>
            </div>

            <div className="relative z-10 flex justify-between items-start text-[10px] font-mono text-white/90">
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                {baselinePass.pass_id}
              </span>
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                Cloud: {baselinePass.cloud_cover_pct}%
              </span>
            </div>

            <div className="relative z-10 flex justify-between items-end text-[10px] font-mono text-white/90">
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                NDBI: {baselinePass.ndbi_score.toFixed(2)} (Bare Ground)
              </span>
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                NDVI: {baselinePass.ndvi_score.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569] pt-1">
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Optical Sensor</span>
              <p className="font-semibold text-[#0F172A]">{baselinePass.sensor}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Spectral Band</span>
              <p className="font-semibold text-[#0F172A]">{baselinePass.spectral_band}</p>
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

          {/* Simulated Satellite Canvas */}
          <div
            className={`h-48 rounded border relative overflow-hidden flex flex-col justify-between p-3 ${
              viewMode === "FALSE_COLOR"
                ? "bg-gradient-to-br from-[#2D3748] via-[#4A5568] to-[#1A202C] border-[#718096]"
                : "bg-gradient-to-br from-[#7C2D12] via-[#9A3412] to-[#451A03] border-[#C2410C]"
            }`}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(#94A3B8 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Target Crosshair with structural footprint box */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 border-2 border-dashed border-amber-400/80 flex items-center justify-center bg-amber-400/10">
                <span className="text-[9px] font-mono text-amber-200 bg-black/60 px-1 rounded">
                  Δ {structuralChangeScore.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="relative z-10 flex justify-between items-start text-[10px] font-mono text-white/90">
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                {currentPass.pass_id}
              </span>
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                Cloud: {currentPass.cloud_cover_pct}%
              </span>
            </div>

            <div className="relative z-10 flex justify-between items-end text-[10px] font-mono text-white/90">
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                NDBI: {currentPass.ndbi_score.toFixed(2)} (Partial Foundation)
              </span>
              <span className="bg-black/60 px-1.5 py-0.5 rounded border border-white/20">
                NDVI: {currentPass.ndvi_score.toFixed(2)}
              </span>
            </div>
          </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
