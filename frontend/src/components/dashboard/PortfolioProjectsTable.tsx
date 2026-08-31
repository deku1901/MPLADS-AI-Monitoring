"use client";

import { useState } from "react";
import Link from "next/link";
import type { DashboardProjectItem } from "@/lib/types";

interface PortfolioProjectsTableProps {
  projects: DashboardProjectItem[];
}

export default function PortfolioProjectsTable({ projects }: PortfolioProjectsTableProps) {
  const [filter, setFilter] = useState<"ALL" | "HIGH_RISK" | "INSPECTION" | "SPLIT_WORK" | "COMPLETED">("ALL");

  const filteredProjects = projects.filter((p) => {
    if (filter === "HIGH_RISK") return p.risk_score >= 70;
    if (filter === "INSPECTION") return p.status === "INSPECTION_REQUIRED" || p.anomaly_flags.includes("INSPECTION_REQUIRED");
    if (filter === "SPLIT_WORK") return p.mandatory_tender || p.anomaly_flags.includes("MANDATORY_TENDER_ENFORCED");
    if (filter === "COMPLETED") return p.status === "COMPLETED" || p.status === "VERIFIED";
    return true;
  });

  return (
    <div className="card bg-white border-[#D5DCE5] space-y-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Project Lifecycle Surveillance
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">
              Constituency Infrastructure Works Directory
            </h3>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              filter === "ALL"
                ? "bg-[#123B6D] text-white"
                : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
            }`}
          >
            All Works ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("HIGH_RISK")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              filter === "HIGH_RISK"
                ? "bg-[#B3261E] text-white"
                : "bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2]"
            }`}
          >
            High Risk ({projects.filter((p) => p.risk_score >= 70).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("INSPECTION")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              filter === "INSPECTION"
                ? "bg-[#C2410C] text-white"
                : "bg-[#FFF7ED] text-[#C2410C] hover:bg-[#FFEDD5]"
            }`}
          >
            Inquiries ({projects.filter((p) => p.status === "INSPECTION_REQUIRED").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("SPLIT_WORK")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              filter === "SPLIT_WORK"
                ? "bg-[#7C3AED] text-white"
                : "bg-[#F5F3FF] text-[#7C3AED] hover:bg-[#EDE9FE]"
            }`}
          >
            Split-Works ({projects.filter((p) => p.mandatory_tender).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("COMPLETED")}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              filter === "COMPLETED"
                ? "bg-[#166534] text-white"
                : "bg-[#F0FDF4] text-[#166534] hover:bg-[#DCFCE7]"
            }`}
          >
            Completed ({projects.filter((p) => p.status === "COMPLETED" || p.status === "VERIFIED").length})
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="overflow-x-auto border border-[#E2E8F0] rounded-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold uppercase tracking-wider text-[#475569]">
              <th className="py-2.5 px-3">Project ID &amp; Title</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Sanction / Disbursed</th>
              <th className="py-2.5 px-3">Lifecycle Status</th>
              <th className="py-2.5 px-3">AI Risk Score</th>
              <th className="py-2.5 px-3">Intervention Flags</th>
              <th className="py-2.5 px-3 text-right">Drill-Down Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-[#64748B]">
                  No works match the selected filter.
                </td>
              </tr>
            ) : (
              filteredProjects.map((p) => {
                const isHigh = p.risk_score >= 70;
                const isCritical = p.risk_score >= 85;
                const riskColor = isCritical ? "#B3261E" : isHigh ? "#C2410C" : p.risk_score >= 40 ? "#B45309" : "#166534";
                const riskBg = isCritical ? "#FEF2F2" : isHigh ? "#FFF7ED" : p.risk_score >= 40 ? "#FFFBEB" : "#F0FDF4";

                return (
                  <tr key={p.project_id} className="hover:bg-[#F8FAFC] transition-colors">
                    {/* ID & Title */}
                    <td className="py-3 px-3">
                      <Link
                        href={`/projects/${p.project_id}`}
                        className="font-mono font-bold text-[#0369A1] hover:underline block text-xs"
                      >
                        {p.project_id}
                      </Link>
                      <span className="font-semibold text-[#0F172A] line-clamp-1 max-w-xs text-xs">
                        {p.title}
                      </span>
                      <span className="text-[10px] text-[#64748B] block mt-0.5">
                        {p.constituency}, {p.state}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#F1F5F9] text-[#334155]">
                        {p.category}
                      </span>
                    </td>

                    {/* Sanction / Disbursed */}
                    <td className="py-3 px-3 font-mono">
                      <span className="font-bold text-[#0F172A]">
                        ₹{p.sanctioned_amount_inr.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-[#64748B] block">
                        Disbursed: ₹{p.disbursed_amount_inr.toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Lifecycle Status */}
                    <td className="py-3 px-3">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor:
                            p.status === "INSPECTION_REQUIRED"
                              ? "#FEF2F2"
                              : p.status === "COMPLETED" || p.status === "VERIFIED"
                              ? "#F0FDF4"
                              : "#EFF6FF",
                          color:
                            p.status === "INSPECTION_REQUIRED"
                              ? "#991B1B"
                              : p.status === "COMPLETED" || p.status === "VERIFIED"
                              ? "#166534"
                              : "#1D4ED8",
                        }}
                      >
                        {p.status}
                      </span>
                      {p.mandatory_tender && (
                        <span className="block text-[10px] font-bold text-[#7C3AED] mt-0.5">
                          ● Mandatory Tender
                        </span>
                      )}
                    </td>

                    {/* AI Risk Score */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded font-mono font-bold text-xs"
                          style={{ color: riskColor, backgroundColor: riskBg }}
                        >
                          {p.risk_score} / 100
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: riskColor }}>
                          {p.risk_tier}
                        </span>
                      </div>
                    </td>

                    {/* Anomaly Flags */}
                    <td className="py-3 px-3">
                      {p.anomaly_flags.length === 0 ? (
                        <span className="text-[10px] text-[#166534] font-medium">✓ Clean Baseline</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.anomaly_flags.map((flag) => (
                            <span
                              key={flag}
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Drill-down Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Link
                          href={`/projects/${p.project_id}`}
                          className="px-2 py-1 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0369A1] font-bold text-[10px] transition-colors"
                          title="View Full Lifecycle & Payment Details"
                        >
                          Works Detail
                        </Link>
                        {p.project_id === "MPL-2026-1042" && (
                          <>
                            <Link
                              href="/financial"
                              className="px-1.5 py-1 rounded bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] font-bold text-[10px]"
                              title="Financial Analytics"
                            >
                              Fiscal
                            </Link>
                            <Link
                              href="/satellite"
                              className="px-1.5 py-1 rounded bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#166534] font-bold text-[10px]"
                              title="Satellite Verification"
                            >
                              Sat
                            </Link>
                            <Link
                              href="/cost-overrun"
                              className="px-1.5 py-1 rounded bg-[#FFF7ED] hover:bg-[#FFEDD5] text-[#C2410C] font-bold text-[10px]"
                              title="Cost Overrun Analytics"
                            >
                              Cost
                            </Link>
                          </>
                        )}
                        {p.mandatory_tender && (
                          <Link
                            href="/split-work"
                            className="px-1.5 py-1 rounded bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] font-bold text-[10px]"
                            title="Split-Work Tender Enforcements"
                          >
                            Tender
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
