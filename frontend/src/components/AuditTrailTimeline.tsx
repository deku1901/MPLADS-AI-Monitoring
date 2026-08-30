"use client";

import { useState } from "react";
import type { AuditEventSummary } from "@/lib/types";

interface AuditTrailTimelineProps {
  events: AuditEventSummary[];
  onRefresh?: () => void;
  loading?: boolean;
}

const EVENT_BADGES: Record<string, { label: string; cls: string }> = {
  CASE_CREATED:        { label: "CASE CREATED", cls: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]" },
  PAYMENT_HELD:        { label: "PAYMENT HELD", cls: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]" },
  EVIDENCE_SUBMITTED:  { label: "EVIDENCE SUBMITTED", cls: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
  RISK_SCORE_COMPUTED: { label: "RISK COMPUTED", cls: "bg-[#F3E8FF] text-[#7E22CE] border-[#D8B4FE]" },
  CASE_RESOLVED:       { label: "CASE RESOLVED", cls: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" },
  PAYMENT_RELEASED:    { label: "PAYMENT RELEASED", cls: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" },
  REMINDER_SENT:       { label: "SLA REMINDER", cls: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]" },
  CASE_ESCALATED:      { label: "CASE ESCALATED", cls: "bg-[#FFEDD5] text-[#C2410C] border-[#FDBA74]" },
  STATUS_CHANGE:       { label: "STATUS CHANGE", cls: "bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]" },
  SPLIT_WORK_DETECTED: { label: "SPLIT-WORK DETECTED", cls: "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]" },
  MANDATORY_TENDER_ENFORCED: { label: "MANDATORY TENDER ENFORCED", cls: "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]" },
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditTrailTimeline({
  events,
  onRefresh,
  loading = false,
}: AuditTrailTimelineProps) {
  const [reverseOrder, setReverseOrder] = useState(true);

  const sortedEvents = [...events].sort((a, b) => {
    const tA = new Date(a.timestamp || 0).getTime();
    const tB = new Date(b.timestamp || 0).getTime();
    return reverseOrder ? tB - tA : tA - tB;
  });

  return (
    <div className="card border-[#D5DCE5] bg-white shadow-xs space-y-4">
      {/* Header */}
      <div className="card-header flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📜</span>
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
            STATUTORY IMMUTABLE AUDIT TRAIL
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReverseOrder(!reverseOrder)}
            className="text-[11px] font-bold px-2 py-1 rounded bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
          >
            {reverseOrder ? "▼ Newest First" : "▲ Oldest First"}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-[11px] font-bold px-2 py-1 rounded bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "↻ Refresh Log"}
            </button>
          )}
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <p className="text-xs text-[#64748B] py-6 text-center">
          No audit events recorded yet for this project.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th className="w-36">Timestamp</th>
                <th className="w-44">Event Type</th>
                <th>Description &amp; Action Record</th>
                <th className="w-32">Actor / Role</th>
                <th className="w-28 text-right">Event ID</th>
              </tr>
            </thead>
            <tbody>
              {sortedEvents.map((ev) => {
                const badge = EVENT_BADGES[ev.event_type] ?? {
                  label: ev.event_type,
                  cls: "bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]",
                };

                return (
                  <tr key={ev.event_id}>
                    <td className="font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                      {formatDate(ev.timestamp)}
                    </td>
                    <td>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="text-xs text-[#1E293B]">
                      <div>{ev.description || "System statutory state transition"}</div>
                      {ev.case_id && (
                        <span className="text-[10px] font-mono text-[#0369A1] font-semibold mt-0.5 inline-block">
                          Case Ref: {ev.case_id}
                        </span>
                      )}
                    </td>
                    <td className="text-[11px] text-[#475569] font-medium">
                      {ev.actor_role || "SYSTEM"}
                      {ev.actor_id ? ` (${ev.actor_id})` : ""}
                    </td>
                    <td className="font-mono text-[10px] text-[#64748B] text-right">
                      {ev.event_id}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
