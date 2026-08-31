"use client";

import type { PortfolioSummary } from "@/lib/types";

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary;
}

export default function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Works */}
      <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-bold uppercase text-[10px] tracking-wider">Total Works</span>
          <span>📁</span>
        </div>
        <p className="text-xl font-bold font-mono text-[#0A2240] mt-1">
          {summary.total_projects}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] text-[#475569] mt-1 font-medium">
          <span className="text-[#166534] font-bold">{summary.active_works_count} Active</span>
          <span>•</span>
          <span>{summary.completed_works_count} Done</span>
        </div>
      </div>

      {/* 2. Sanctioned Allocation */}
      <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-bold uppercase text-[10px] tracking-wider">Sanctioned Funds</span>
          <span>🏛️</span>
        </div>
        <p className="text-base font-bold font-mono text-[#0369A1] mt-1 truncate">
          ₹{(summary.total_sanctioned_inr / 100000).toFixed(2)} L
        </p>
        <p className="text-[10px] text-[#64748B] mt-1">
          ₹{summary.total_sanctioned_inr.toLocaleString("en-IN")} Total
        </p>
      </div>

      {/* 3. Disbursed Expenditure */}
      <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-bold uppercase text-[10px] tracking-wider">Disbursed Funds</span>
          <span>💳</span>
        </div>
        <p className="text-base font-bold font-mono text-[#166534] mt-1 truncate">
          ₹{(summary.total_disbursed_inr / 100000).toFixed(2)} L
        </p>
        <p className="text-[10px] text-[#64748B] mt-1">
          {summary.overall_fund_utilization_pct.toFixed(1)}% Fund Utilization
        </p>
      </div>

      {/* 4. Unreleased Balance */}
      <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-bold uppercase text-[10px] tracking-wider">Unreleased Cap</span>
          <span>⏳</span>
        </div>
        <p className="text-base font-bold font-mono text-[#475569] mt-1 truncate">
          ₹{(summary.total_unreleased_inr / 100000).toFixed(2)} L
        </p>
        <p className="text-[10px] text-[#64748B] mt-1">
          Remaining in Escrow
        </p>
      </div>

      {/* 5. Statutory SLA Compliance */}
      <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-bold uppercase text-[10px] tracking-wider">45-Day SLA Rate</span>
          <span>⏱️</span>
        </div>
        <p className="text-xl font-bold font-mono text-[#166534] mt-1">
          {summary.statutory_deadline_compliance_pct.toFixed(0)}%
        </p>
        <p className="text-[10px] text-[#64748B] mt-1">
          DA Sanction Speed
        </p>
      </div>

      {/* 6. Inspection Required */}
      <div className="p-3.5 rounded-lg bg-white border border-[#D5DCE5] shadow-xs">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span className="font-bold uppercase text-[10px] tracking-wider">Inquiries Active</span>
          <span>🚨</span>
        </div>
        <p
          className="text-xl font-bold font-mono mt-1"
          style={{
            color: summary.inspection_required_count > 0 ? "#B3261E" : "#166534",
          }}
        >
          {summary.inspection_required_count}
        </p>
        <p className="text-[10px] text-[#B3261E] font-medium mt-1">
          {summary.inspection_required_count > 0 ? "Statutory Hold Active" : "All Works Clean"}
        </p>
      </div>
    </div>
  );
}
