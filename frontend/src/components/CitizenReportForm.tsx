"use client";

import { useState } from "react";
import { submitCitizenReport } from "@/lib/api";
import type { CitizenProjectSummary, CitizenReportResponse } from "@/lib/types";

interface CitizenReportFormProps {
  project: CitizenProjectSummary;
  onReportSubmitted: (res: CitizenReportResponse) => void;
  onCancel?: () => void;
}

export default function CitizenReportForm({
  project,
  onReportSubmitted,
  onCancel,
}: CitizenReportFormProps) {
  const [isFunctional, setIsFunctional] = useState<boolean>(true);
  const [description, setDescription] = useState<string>(
    "Visited the facility. The asset is installed and providing regular public service as expected."
  );
  const [lat, setLat] = useState<number | undefined>(project.lat ?? 25.4500);
  const [lon, setLon] = useState<number | undefined>(project.lon ?? 82.8600);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadPositivePreset() {
    setIsFunctional(true);
    setDescription("Visited the water facility in Babatpur. RO plant is functional and providing clean water to villagers.");
    setLat(project.lat ?? 25.4510);
    setLon(project.lon ?? 82.8610);
  }

  function loadNegativePreset() {
    setIsFunctional(false);
    setDescription("RO plant motor burned out. Facility locked for 3 weeks. No water supply available.");
    setLat(project.lat ?? 25.4520);
    setLon(project.lon ?? 82.8605);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await submitCitizenReport({
        project_id: project.project_id,
        is_functional: isFunctional,
        description: description,
        citizen_lat: lat,
        citizen_lon: lon,
        photo: photoFile ?? undefined,
      });

      onReportSubmitted(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card border-[#123B6D] bg-white shadow-md space-y-4 slide-down">
      {/* Header */}
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📢</span>
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
            SUBMIT CITIZEN GROUND-TRUTH VERIFICATION REPORT
          </h3>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPositivePreset}
            className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7] cursor-pointer"
          >
            👍 Demo: Functional Asset
          </button>
          <button
            type="button"
            onClick={loadNegativePreset}
            className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2] cursor-pointer"
          >
            👎 Demo: Broken / Non-Functional (Triggers Inspection)
          </button>
        </div>
      </div>

      <div className="text-xs text-[#334155] bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0]">
        <strong>Verifying Asset:</strong> <span className="font-mono font-bold text-[#123B6D]">{project.project_id}</span> — {project.title}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Functionality Choice Buttons */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#334155] uppercase tracking-wide">
            1. Physical Operational Status <span className="text-red-600">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsFunctional(true)}
              className={`p-3 rounded border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                isFunctional
                  ? "border-[#15803D] bg-[#F0FDF4] text-[#166534] ring-1 ring-[#15803D]"
                  : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              <span className="text-xl">✅</span>
              <div>
                <p className="text-xs font-bold uppercase">YES — FULLY FUNCTIONAL</p>
                <p className="text-[11px] text-[#475569]">Asset exists, is in working order, and serves the public.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsFunctional(false)}
              className={`p-3 rounded border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                !isFunctional
                  ? "border-[#B3261E] bg-[#FEF2F2] text-[#991B1B] ring-1 ring-[#B3261E]"
                  : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              <span className="text-xl">❌</span>
              <div>
                <p className="text-xs font-bold uppercase">NO — DEFECTIVE / MISSING</p>
                <p className="text-[11px] text-[#475569]">Asset is damaged, missing, locked, or not functioning.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Narrative */}
        <div className="space-y-1">
          <label htmlFor="citizen-desc" className="text-xs font-bold text-[#334155] uppercase tracking-wide">
            2. Detailed Citizen Ground-Truth Observations <span className="text-red-600">*</span>
          </label>
          <textarea
            id="citizen-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-2.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] leading-relaxed focus:ring-1 focus:ring-[#123B6D]"
            placeholder="Describe condition, date of visit, and community usage..."
          />
          <p className="text-[11px] text-[#64748B]">
            Detailed description narrative (+0.5 credibility points).
          </p>
        </div>

        {/* Photo Upload */}
        <div className="space-y-1">
          <label htmlFor="citizen-photo" className="text-xs font-bold text-[#334155] uppercase tracking-wide">
            3. On-Site Photograph (+1.5 Credibility Points)
          </label>
          <div className="flex items-center gap-3">
            <label
              htmlFor="citizen-photo"
              className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded border cursor-pointer text-xs ${
                photoFile
                  ? "border-[#86EFAC] bg-[#F0FDF4] text-[#166534]"
                  : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              <span>{photoFile ? `📸 ${photoFile.name}` : "Attach on-site camera photograph (JPEG/PNG)..."}</span>
              <span className="px-2 py-0.5 rounded bg-[#E2E8F0] text-[#1E293B] font-bold text-[10px]">
                Browse
              </span>
            </label>
            {photoFile && (
              <button
                type="button"
                onClick={() => setPhotoFile(null)}
                className="text-xs text-red-600 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <input
            id="citizen-photo"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            className="sr-only"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* GPS Coordinates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="citizen-lat" className="text-[11px] font-bold text-[#334155] uppercase">
              4. GPS Latitude (Geotag)
            </label>
            <input
              id="citizen-lat"
              type="number"
              step="0.0001"
              value={lat ?? ""}
              onChange={(e) => setLat(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs font-mono text-[#0F172A]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="citizen-lon" className="text-[11px] font-bold text-[#334155] uppercase">
              GPS Longitude (Geotag)
            </label>
            <input
              id="citizen-lon"
              type="number"
              step="0.0001"
              value={lon ?? ""}
              onChange={(e) => setLon(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs font-mono text-[#0F172A]"
            />
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`px-5 py-2 rounded font-bold text-xs uppercase tracking-wider text-white transition-colors cursor-pointer shadow-xs ${
              isFunctional
                ? "bg-[#15803D] hover:bg-[#166534]"
                : "bg-[#B3261E] hover:bg-[#991B1B]"
            } disabled:opacity-60`}
          >
            {submitting ? "Transmitting Report…" : "Submit Ground-Truth Verification"}
          </button>
        </div>
      </form>
    </div>
  );
}
