"use client";

import { useState } from "react";
import type { AuditEventSummary } from "@/lib/types";

interface AuditTrailTimelineProps {
  events: AuditEventSummary[];
  onRefresh?: () => void;
  loading?: boolean;
}

const EVENT_ICONS: Record<string, { icon: string; color: string; label: string }> = {
  CASE_CREATED:        { icon: "🚨", color: "text-red-400 border-red-800 bg-red-950/40", label: "Case Created" },
  PAYMENT_HELD:        { icon: "🛑", color: "text-red-400 border-red-800 bg-red-950/40", label: "Payment Held" },
  EVIDENCE_SUBMITTED:  { icon: "📝", color: "text-blue-400 border-blue-800 bg-blue-950/40", label: "Evidence Submitted" },
  RISK_SCORE_COMPUTED: { icon: "🤖", color: "text-purple-400 border-purple-800 bg-purple-950/40", label: "Risk Computed" },
  CASE_RESOLVED:       { icon: "✅", color: "text-green-400 border-green-800 bg-green-950/40", label: "Case Resolved" },
  PAYMENT_RELEASED:    { icon: "💰", color: "text-green-400 border-green-800 bg-green-950/40", label: "Payment Released" },
  REMINDER_SENT:       { icon: "⏱️", color: "text-amber-400 border-amber-800 bg-amber-950/40", label: "SLA Reminder" },
  CASE_ESCALATED:      { icon: "📈", color: "text-orange-400 border-orange-800 bg-orange-950/40", label: "Case Escalated" },
  STATUS_CHANGE:       { icon: "🔄", color: "text-cyan-400 border-cyan-800 bg-cyan-950/40", label: "Status Change" },
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
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📜</span>
          <div>
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Immutable Audit Trail
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Chronological log of all AI detections, interventions, and authority actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReverseOrder(!reverseOrder)}
            className="text-xs px-2.5 py-1 rounded bg-[var(--bg-base)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-slate-200 transition-colors"
          >
            {reverseOrder ? "▼ Newest First" : "▲ Oldest First"}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded bg-[var(--bg-base)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
          )}
        </div>
      </div>

      {/* Event list */}
      {sortedEvents.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] py-4 text-center">
          No audit events recorded yet for this project.
        </p>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-strong)]">
          {sortedEvents.map((ev) => {
            const meta = EVENT_ICONS[ev.event_type] ?? {
              icon: "📌",
              color: "text-slate-400 border-slate-700 bg-slate-900/40",
              label: ev.event_type,
            };

            return (
              <div key={ev.event_id} className="relative group">
                {/* Node marker */}
                <div
                  className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center text-xs shadow-md ${meta.color}`}
                >
                  <span>{meta.icon}</span>
                </div>

                {/* Event card */}
                <div className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-lg p-3.5 space-y-1.5 transition-colors hover:border-slate-600">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{meta.label}</span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        ({ev.event_id})
                      </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {formatDate(ev.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {ev.description || "System state transition"}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border)]">
                    {ev.actor_role && (
                      <span>
                        Actor: <span className="text-slate-300 font-medium">{ev.actor_role}</span>
                        {ev.actor_id ? ` (${ev.actor_id})` : ""}
                      </span>
                    )}
                    {ev.case_id && (
                      <span>
                        Case: <span className="text-amber-300 font-mono font-medium">{ev.case_id}</span>
                      </span>
                    )}
                    {ev.old_value && ev.new_value && (
                      <span>
                        Transition:{" "}
                        <span className="text-red-400 font-mono">{ev.old_value}</span>
                        {" → "}
                        <span className="text-green-400 font-mono">{ev.new_value}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
