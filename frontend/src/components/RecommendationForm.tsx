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
    <div className="card border-[#D5DCE5] bg-white shadow-xs space-y-4">
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
            SUBMIT NEW MP WORK RECOMMENDATION FOR PRE-SANCTION SCREENING
          </h3>
        </div>

        {/* Quick Test Presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handlePreset(DUPLICATE_PRESET)}
            className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2] cursor-pointer"
          >
            ⚡ Load Duplicate Demo Work
          </button>
          <button
            type="button"
            onClick={() => handlePreset(UNIQUE_PRESET)}
            className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] hover:bg-[#DCFCE7] cursor-pointer"
          >
            ⚡ Load Unique Demo Work
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="space-y-1">
          <label htmlFor="rec-title" className="text-xs font-bold text-[#334155] uppercase tracking-wide">
            Proposed Developmental Work Title <span className="text-red-600">*</span>
          </label>
          <input
            id="rec-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] font-semibold focus:ring-1 focus:ring-[#123B6D]"
            placeholder="e.g. Construction of Community Drinking Water Facility"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="rec-desc" className="text-xs font-bold text-[#334155] uppercase tracking-wide">
            Detailed Technical Specification &amp; Location Scope <span className="text-red-600">*</span>
          </label>
          <textarea
            id="rec-desc"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            className="w-full p-2.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] leading-relaxed focus:ring-1 focus:ring-[#123B6D]"
            placeholder="Specify village, block, equipment, and structural requirements for NLP comparison..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label htmlFor="rec-category" className="text-xs font-bold text-[#334155] uppercase tracking-wide">
              Scheme Sector Category
            </label>
            <select
              id="rec-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] font-medium focus:ring-1 focus:ring-[#123B6D]"
            >
              <option value="DRINKING_WATER">Drinking Water Facility</option>
              <option value="EDUCATION">Education &amp; Science</option>
              <option value="ROADS_BRIDGES">Roads &amp; Bridges</option>
              <option value="HEALTH_SANITATION">Health &amp; Sanitation</option>
              <option value="COMMUNITY_INFRA">Community Infrastructure</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="rec-constituency" className="text-xs font-bold text-[#334155] uppercase tracking-wide">
              Constituency (Lok Sabha)
            </label>
            <input
              id="rec-constituency"
              type="text"
              value={formData.constituency}
              onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
              required
              className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] font-medium focus:ring-1 focus:ring-[#123B6D]"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="rec-cost" className="text-xs font-bold text-[#334155] uppercase tracking-wide">
              Estimated Work Cost (INR)
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
              className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] font-bold font-mono focus:ring-1 focus:ring-[#123B6D]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
        >
          {loading ? "Running Semantic Duplicate Screen…" : "Execute Pre-Sanction AI Duplicate Screening"}
        </button>
      </form>
    </div>
  );
}
