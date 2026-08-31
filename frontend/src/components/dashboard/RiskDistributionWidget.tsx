"use client";

import type { RiskDistribution } from "@/lib/types";

interface RiskDistributionWidgetProps {
  distribution: RiskDistribution;
}

export default function RiskDistributionWidget({ distribution }: RiskDistributionWidgetProps) {
  return (
    <div className="card bg-white border-[#D5DCE5] space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Autonomous Risk Indexing
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">
              Portfolio Multi-Factor Risk Distribution
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B]">Average Portfolio Risk:</span>
          <span
            className="px-2 py-0.5 rounded font-mono font-bold text-xs text-white"
            style={{
              backgroundColor:
                distribution.average_risk_score >= 70
                  ? "#B3261E"
                  : distribution.average_risk_score >= 40
                  ? "#D97706"
                  : "#166534",
            }}
          >
            {distribution.average_risk_score} / 100
          </span>
        </div>
      </div>

      {/* Stacked Risk Tier Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-4 bg-[#E2E8F0] rounded-full overflow-hidden flex shadow-inner">
          {distribution.risk_tiers.map((tier) => (
            <div
              key={tier.tier}
              className="h-full transition-all duration-500 relative group"
              style={{
                width: `${tier.percentage}%`,
                backgroundColor: tier.color,
              }}
              title={`${tier.label}: ${tier.count} works (${tier.percentage}%)`}
            />
          ))}
        </div>
      </div>

      {/* 4 Risk Tier Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {distribution.risk_tiers.map((tier) => (
          <div
            key={tier.tier}
            className="p-2.5 rounded-md border text-xs space-y-1"
            style={{
              borderColor: `${tier.color}40`,
              backgroundColor: `${tier.color}0A`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[10px] uppercase" style={{ color: tier.color }}>
                ● {tier.tier}
              </span>
              <span className="font-mono text-[10px] text-[#64748B]">[{tier.range}]</span>
            </div>
            <p className="text-lg font-bold font-mono" style={{ color: tier.color }}>
              {tier.count} <span className="text-xs font-normal text-[#64748B]">({tier.percentage}%)</span>
            </p>
            <p className="text-[10px] text-[#475569]">{tier.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
