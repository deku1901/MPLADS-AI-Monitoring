"use client";

import { useState } from "react";
import type { RecommendationScreenRequest } from "@/lib/types";

interface RecommendationFormProps {
  onSubmit: (data: RecommendationScreenRequest) => Promise<void>;
  loading: boolean;
}

const DUPLICATE_PRESET: RecommendationScreenRequest = {
  title: "Installation of Solar Drinking Water Tube-well & RO Plant",
  description:
    "Installation of solar-powered deep borewell filtration plant, RO treatment unit, and overhead distribution tank at Village Shivpur, Varanasi.",
  category: "DRINKING_WATER",
  constituency: "Varanasi",
  state: "Uttar Pradesh",
  estimated_cost_inr: 1400000,
  mp_id: "MP-UP-042",
};

const UNIQUE_PRESET: RecommendationScreenRequest = {
  title: "Construction of High School Science Laboratory & Smart Classroom",
  description:
    "Modern physics and chemistry laboratory setup with digital smart board and advanced experimental equipment at Government Inter College, Harhua, Varanasi.",
  category: "EDUCATION",
  constituency: "Varanasi",
  state: "Uttar Pradesh",
  estimated_cost_inr: 2500000,
  mp_id: "MP-UP-042",
};

export default function RecommendationForm({
  onSubmit,
  loading,
}: RecommendationFormProps) {
  const [formData, setFormData] = useState<RecommendationScreenRequest>(DUPLICATE_PRESET);

  function handlePreset(preset: RecommendationScreenRequest) {
    setFormData(preset);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    await onSubmit(formData);
  }

  return (
    <div className="card bg-[var(--bg-elevated)] border-[var(--border-strong)] space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              MP Work Recommendation Proposal
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Pre-sanction AI screening for duplicate &amp; overlapping assets
            </p>
          </div>
        </div>

        {/* Demo Quick Presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePreset(DUPLICATE_PRESET)}
            className="text-[11px] px-2.5 py-1 rounded bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-900/50 transition-colors"
          >
            ⚡ Demo: Duplicate Work
          </button>
          <button
            type="button"
            onClick={() => handlePreset(UNIQUE_PRESET)}
            className="text-[11px] px-2.5 py-1 rounded bg-green-950/40 border border-green-800/60 text-green-300 hover:bg-green-900/50 transition-colors"
          >
            ⚡ Demo: Unique Work
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="rec-title"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
          >
            Proposed Work Title
          </label>
          <input
            id="rec-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            placeholder="e.g. Construction of Community Drinking Water Facility"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="rec-desc"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
          >
            Detailed Specification &amp; Location
          </label>
          <textarea
            id="rec-desc"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            className="w-full p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
            placeholder="Provide exact physical scope, location/village, and technical details..."
          />
        </div>

        {/* Meta Row: Category, Constituency, Cost */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="rec-category"
              className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
            >
              Category
            </label>
            <select
              id="rec-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="DRINKING_WATER">Drinking Water Facility</option>
              <option value="EDUCATION">Education &amp; Science</option>
              <option value="ROADS_BRIDGES">Roads &amp; Bridges</option>
              <option value="HEALTH_SANITATION">Health &amp; Sanitation</option>
              <option value="COMMUNITY_INFRA">Community Infrastructure</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="rec-constituency"
              className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
            >
              Constituency
            </label>
            <input
              id="rec-constituency"
              type="text"
              value={formData.constituency}
              onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="rec-cost"
              className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
            >
              Estimated Cost (₹)
            </label>
            <input
              id="rec-cost"
              type="number"
              value={formData.estimated_cost_inr}
              onChange={(e) =>
                setFormData({ ...formData, estimated_cost_inr: Number(e.target.value) })
              }
              min={10000}
              required
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-blue-950/40"
        >
          {loading ? "Running NLP Semantic Screen…" : "🔍 Run Pre-Sanction AI Duplicate Screening"}
        </button>
      </form>
    </div>
  );
}
