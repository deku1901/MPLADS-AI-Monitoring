"use client";

import type { SatellitePassMetadata } from "@/lib/types";

interface SatellitePassTimelineProps {
  baselinePass: SatellitePassMetadata;
  currentPass: SatellitePassMetadata;
}

export default function SatellitePassTimeline({
  baselinePass,
  currentPass,
}: SatellitePassTimelineProps) {
  const passes = [
    {
      ...baselinePass,
      milestone: "Baseline Pre-Sanction Pass (T0)",
      usable: "CLEAR OPTICAL PASS",
    },
    {
      pass_id: "S2A-20260215-INTERMEDIATE",
      date: "2026-02-15",
      cloud_cover_pct: 18.4,
      resolution_m: 10.0,
      ndbi_score: 0.02,
      ndvi_score: 0.44,
      spectral_band: "B8-B4-B3 (Optical)",
      sensor: "Sentinel-2A MSI",
      milestone: "Intermediary Excavation Inspection",
      usable: "PARTIAL CLOUD (FILTERED)",
    },
    {
      ...currentPass,
      milestone: "Statutory Verification Pass (T1)",
      usable: "CLEAR OPTICAL PASS",
    },
  ];

  return (
    <div className="card border-[#D5DCE5] bg-white shadow-xs space-y-3">
      <div className="card-header flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
          MULTI-TEMPORAL SENTINEL-2 ORBITAL PASS ARCHIVE
        </h3>
        <span className="text-[11px] text-[#64748B]">
          European Space Agency (ESA) Copernicus Sentinel-2 MSI Level-2A
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="gov-table">
          <thead>
            <tr>
              <th>Pass Identifier</th>
              <th>Capture Date</th>
              <th>Milestone Stage</th>
              <th>Cloud Cover</th>
              <th>NDBI (Built-up)</th>
              <th>NDVI (Vegetation)</th>
              <th className="text-right">Optical Quality</th>
            </tr>
          </thead>
          <tbody>
            {passes.map((p) => (
              <tr key={p.pass_id}>
                <td className="font-mono text-[11px] font-bold text-[#123B6D]">{p.pass_id}</td>
                <td className="font-mono text-xs text-[#334155]">{p.date}</td>
                <td className="text-xs text-[#0F172A] font-semibold">{p.milestone}</td>
                <td className="text-xs font-mono">{p.cloud_cover_pct}%</td>
                <td className="text-xs font-mono font-bold text-[#B45309]">{p.ndbi_score.toFixed(2)}</td>
                <td className="text-xs font-mono text-[#15803D]">{p.ndvi_score.toFixed(2)}</td>
                <td className="text-right">
                  <span
                    className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border ${
                      p.cloud_cover_pct < 10
                        ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                        : "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
                    }`}
                  >
                    {p.usable}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
