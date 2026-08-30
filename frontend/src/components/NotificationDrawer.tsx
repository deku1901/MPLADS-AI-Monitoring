"use client";

import { useEffect, useState, useCallback } from "react";
import { getNotifications, markNotificationRead } from "@/lib/api";
import type { NotificationSummary } from "@/lib/types";

interface NotificationDrawerProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  onNotificationsChanged?: () => void;
}

const CHANNEL_BADGES: Record<string, { label: string; icon: string; cls: string }> = {
  INAPP:    { label: "Platform Alert", icon: "🔔", cls: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]" },
  EMAIL:    { label: "Official Email", icon: "✉️", cls: "bg-[#F3E8FF] text-[#7E22CE] border-[#D8B4FE]" },
  WHATSAPP: { label: "WhatsApp Gov Notice", icon: "💬", cls: "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]" },
};

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function NotificationDrawer({
  isOpen,
  open,
  onClose,
  onNotificationsChanged,
}: NotificationDrawerProps) {
  const visible = isOpen ?? open ?? false;
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotifications(roleFilter ? { recipient_role: roleFilter } : undefined);
      setNotifications(data);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      if (!visible) return;
      try {
        const data = await getNotifications(roleFilter ? { recipient_role: roleFilter } : undefined);
        if (!ignore) {
          setNotifications(data);
          setLoading(false);
        }
      } catch {
        if (!ignore) setLoading(false);
      }
    }
    if (visible) {
      loadData();
    }
    return () => {
      ignore = true;
    };
  }, [visible, roleFilter]);

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
      onNotificationsChanged?.();
    } catch {
      // non-critical
    }
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => markNotificationRead(n.notification_id).catch(() => {})));
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    onNotificationsChanged?.();
  }

  if (!visible) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#0A2240]/50 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative z-10 w-full max-w-lg bg-white border-l border-[#CBD5E1] h-full flex flex-col shadow-2xl slide-down">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#CBD5E1] bg-[#123B6D] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🔔</span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide">
                AUTHORITY ALERT &amp; ESCALATION CENTER
              </h2>
              <p className="text-[11px] text-slate-300">
                Multi-channel statutory alerts &amp; SLA compliance notices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-[#0A2240] transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Filter and Action Bar */}
        <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between gap-2 text-xs bg-[#F8FAFC]">
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B] font-semibold text-[11px]">Filter Authority:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2 py-1 rounded bg-white border border-[#CBD5E1] text-[#0F172A] text-xs focus:ring-1 focus:ring-[#123B6D]"
            >
              <option value="">All Authorities</option>
              <option value="DA">DA (District Collector)</option>
              <option value="SNA">SNA (State Planning)</option>
              <option value="MINISTRY">MoSPI (Central Ministry)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-[#123B6D] hover:underline font-semibold cursor-pointer"
              >
                Mark all read ({unreadCount})
              </button>
            )}
            <button
              onClick={fetchNotifs}
              disabled={loading}
              className="text-[11px] font-bold px-2 py-1 rounded bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
            >
              {loading ? "…" : "↻"}
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F6F9]">
          {loading && notifications.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-8">
              Loading authority alert records…
            </p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 space-y-2 bg-white rounded border border-[#CBD5E1] p-6">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-semibold text-[#475569]">
                No pending authority notices for this filter.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const channel = CHANNEL_BADGES[n.channel] ?? {
                label: n.channel,
                icon: "📢",
                cls: "bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]",
              };

              return (
                <div
                  key={n.notification_id}
                  className={`p-3.5 rounded border transition-colors space-y-2 ${
                    n.is_read
                      ? "bg-white border-[#E2E8F0] opacity-80"
                      : "bg-white border-[#93C5FD] shadow-xs ring-1 ring-[#BFDBFE]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${channel.cls}`}
                      >
                        <span>{channel.icon}</span>
                        <span>{channel.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#0A2240] font-bold">
                        {n.recipient_role || "AUTHORITY"}
                      </span>
                    </div>

                    <span className="text-[10px] text-[#64748B] font-mono">
                      {formatDate(n.sent_at)}
                    </span>
                  </div>

                  <p className="text-xs text-[#0F172A] whitespace-pre-line leading-relaxed">
                    {n.content}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 text-[10px] text-[#64748B] border-t border-[#F1F5F9]">
                    <span>
                      Recipient: <span className="font-mono text-[#0F172A] font-semibold">{n.recipient_id}</span>
                      {n.case_id ? ` · Ref: ${n.case_id}` : ""}
                    </span>

                    {!n.is_read ? (
                      <button
                        onClick={() => handleMarkRead(n.notification_id)}
                        className="text-[#123B6D] hover:underline font-bold cursor-pointer"
                      >
                        ✓ Mark read
                      </button>
                    ) : (
                      <span className="text-[#94A3B8]">Acknowledged</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
