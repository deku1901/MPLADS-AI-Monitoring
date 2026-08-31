"use client";

import type { DashboardActivityItem } from "@/lib/types";

interface RecentInterventionsFeedProps {
  activity: DashboardActivityItem[];
}

export default function RecentInterventionsFeed({ activity }: RecentInterventionsFeedProps) {
  const getEventBadge = (type: string) => {
    if (type.includes("HELD") || type.includes("DISPUTE") || type.includes("ANOMALY") || type.includes("DELAY") || type.includes("OVERRUN")) {
      return { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA", icon: "🚨" };
    }
    if (type.includes("RESOLVED") || type.includes("RELEASED") || type.includes("VERIFIED")) {
      return { bg: "#F0FDF4", text: "#166534", border: "#86EFAC", icon: "✅" };
    }
    if (type.includes("CASE") || type.includes("ESCALATION") || type.includes("TENDER")) {
      return { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", icon: "⚖️" };
    }
    return { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", icon: "📝" };
  };

  return (
    <div className="card bg-white border-[#D5DCE5] space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">📜</span>
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              Immutable Governance Audit Log
            </span>
            <h3 className="text-sm font-bold text-[#0A2240]">
              Recent Automated Interventions &amp; Case Transactions
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-bold text-[#166534] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#86EFAC]">
          ● Real-Time Stream
        </span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {activity.length === 0 ? (
          <p className="text-xs text-[#64748B] py-4 text-center">No activity recorded yet.</p>
        ) : (
          activity.map((item) => {
            const badge = getEventBadge(item.event_type);
            return (
              <div
                key={item.event_id}
                className="p-2.5 rounded-md border text-xs flex items-start gap-2.5 transition-colors hover:bg-black/2"
                style={{
                  backgroundColor: badge.bg,
                  borderColor: badge.border,
                }}
              >
                <span className="text-sm shrink-0">{badge.icon}</span>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[10px]" style={{ color: badge.text }}>
                      {item.event_type}
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono shrink-0">
                      {item.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-[#1E293B] leading-snug">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-[#64748B] pt-0.5">
                    {item.project_id && <span>Project: <strong className="text-[#0369A1]">{item.project_id}</strong></span>}
                    {item.actor_role && <span>• Actor: <strong className="text-[#0F172A]">{item.actor_role}</strong></span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
