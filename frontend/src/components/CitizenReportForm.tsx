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
    <div className="card bg-[var(--bg-surface)] border-2 border-blue-500/50 shadow-2xl space-y-5 slide-down">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📢</span>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Submit Citizen Ground-Truth Verification
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              Asset: <span className="font-mono text-slate-200">{project.project_id}</span> — {project.title}
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPositivePreset}
            className="text-[11px] px-2.5 py-1 rounded bg-green-950/40 border border-green-800/60 text-green-300 hover:bg-green-900/50 transition-colors"
          >
            👍 Preset: Functional
          </button>
          <button
            type="button"
            onClick={loadNegativePreset}
            className="text-[11px] px-2.5 py-1 rounded bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/50 transition-colors"
          >
            👎 Preset: Broken / Non-Functional
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Functionality Choice */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
            Is this MPLADS asset operational &amp; accessible?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsFunctional(true)}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                isFunctional
                  ? "border-green-500 bg-green-950/40 text-green-200 shadow-md shadow-green-950/30 ring-1 ring-green-500"
                  : "border-[var(--border-strong)] bg-[var(--bg-base)] text-slate-400 hover:border-slate-600"
              }`}
            >
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">YES — Fully Functional</p>
                <p className="text-[11px] opacity-80 mt-0.5">Asset is operating and accessible to the public.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsFunctional(false)}
              className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                !isFunctional
                  ? "border-red-500 bg-red-950/40 text-red-200 shadow-md shadow-red-950/30 ring-1 ring-red-500"
                  : "border-[var(--border-strong)] bg-[var(--bg-base)] text-slate-400 hover:border-slate-600"
              }`}
            >
              <span className="text-2xl">❌</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">NO — Broken / Not Working</p>
                <p className="text-[11px] opacity-80 mt-0.5">Facility is damaged, non-operational, or locked.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Narrative Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="citizen-desc"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
          >
            Ground-Truth Observations
          </label>
          <textarea
            id="citizen-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
            placeholder="Describe what you observed on site..."
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            Detailed descriptions (+0.5 credibility) help prioritize official inspections.
          </p>
        </div>

        {/* Photo Upload */}
        <div className="space-y-1.5">
          <label
            htmlFor="citizen-photo"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
          >
            Attach Ground-Truth Site Photo (+1.5 Credibility)
          </label>
          <label
            htmlFor="citizen-photo"
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
              photoFile
                ? "border-green-600/60 bg-green-950/20"
                : "border-[var(--border-strong)] bg-[var(--bg-base)] hover:border-blue-500"
            }`}
          >
            <span className="text-lg">{photoFile ? "📸" : "📎"}</span>
            <span className="text-sm text-[var(--text-secondary)] truncate">
              {photoFile ? photoFile.name : "Attach photo of asset (JPEG/PNG)"}
            </span>
            {photoFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPhotoFile(null);
                }}
                className="ml-auto text-xs text-[var(--text-muted)] hover:text-red-400"
              >
                ✕
              </button>
            )}
          </label>
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
            <label
              htmlFor="citizen-lat"
              className="text-[11px] font-semibold text-[var(--text-muted)] uppercase"
            >
              Citizen Latitude
            </label>
            <input
              id="citizen-lat"
              type="number"
              step="0.0001"
              value={lat ?? ""}
              onChange={(e) => setLat(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-[var(--bg-base)] border border-[var(--border-strong)] text-xs font-mono text-slate-200"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="citizen-lon"
              className="text-[11px] font-semibold text-[var(--text-muted)] uppercase"
            >
              Citizen Longitude
            </label>
            <input
              id="citizen-lon"
              type="number"
              step="0.0001"
              value={lon ?? ""}
              onChange={(e) => setLon(Number(e.target.value))}
              className="w-full px-3 py-2 rounded bg-[var(--bg-base)] border border-[var(--border-strong)] text-xs font-mono text-slate-200"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-800 px-4 py-2.5 text-xs text-red-300">
            <span className="font-semibold text-red-400">Error:</span> {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
              isFunctional
                ? "bg-green-600 hover:bg-green-500 text-white shadow-green-950/40"
                : "bg-red-600 hover:bg-red-500 text-white shadow-red-950/40"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {submitting ? "Submitting Verification…" : "Submit Ground-Truth Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
