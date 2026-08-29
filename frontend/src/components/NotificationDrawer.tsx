"use client";

import { useEffect, useState, useCallback } from "react";
import { getNotifications, markNotificationRead } from "@/lib/api";
import type { NotificationSummary } from "@/lib/types";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsChanged?: () => void;
}

const CHANNEL_BADGES: Record<string, { label: string; icon: string; cls: string }> = {
  INAPP:    { label: "In-App Alert", icon: "🔔", cls: "bg-blue-950/60 text-blue-300 border-blue-800" },
  EMAIL:    { label: "Gov Email",   icon: "✉️", cls: "bg-purple-950/60 text-purple-300 border-purple-800" },
  WHATSAPP: { label: "WhatsApp",    icon: "💬", cls: "bg-emerald-950/60 text-emerald-300 border-emerald-800" },
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
  onClose,
  onNotificationsChanged,
}: NotificationDrawerProps) {
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
      if (!isOpen) return;
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
    if (isOpen) {
      loadData();
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, roleFilter]);

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

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="relative z-10 w-full max-w-md bg-[var(--bg-surface)] border-l border-[var(--border-strong)] h-full flex flex-col shadow-2xl slide-down">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">📬</span>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Authority Notification Inbox
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Multi-channel intervention alerts & SLA notices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Filter and Action Bar */}
        <div className="p-3 border-b border-[var(--border)] flex items-center justify-between gap-2 text-xs bg-[var(--bg-base)]">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)]">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-slate-200 text-xs focus:outline-none"
            >
              <option value="">All Authorities</option>
              <option value="DA">DA (District)</option>
              <option value="SNA">SNA (State)</option>
              <option value="MINISTRY">MoSPI (Central)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Mark all read ({unreadCount})
              </button>
            )}
            <button
              onClick={fetchNotifs}
              disabled={loading}
              className="text-[11px] px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-slate-300 hover:text-white"
            >
              {loading ? "…" : "↻"}
            </button>
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && notifications.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">
              Loading authority notifications…
            </p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-xs text-[var(--text-muted)]">
                No notifications received yet for this authority filter.
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const channel = CHANNEL_BADGES[n.channel] ?? {
                label: n.channel,
                icon: "📢",
                cls: "bg-slate-800 text-slate-300 border-slate-700",
              };

              return (
                <div
                  key={n.notification_id}
                  className={`p-3.5 rounded-lg border transition-colors space-y-2 ${
                    n.is_read
                      ? "bg-[var(--bg-base)] border-[var(--border)] opacity-85"
                      : "bg-[var(--bg-elevated)] border-blue-600/50 shadow-md shadow-blue-950/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${channel.cls}`}
                      >
                        <span>{channel.icon}</span>
                        <span>{channel.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-300 font-semibold">
                        {n.recipient_role || "AUTHORITY"}
                      </span>
                    </div>

                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      {formatDate(n.sent_at)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                    {n.content}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-[var(--text-muted)] border-t border-[var(--border)]">
                    <span>
                      To: <span className="font-mono text-slate-300">{n.recipient_id}</span>
                      {n.case_id ? ` · Case: ${n.case_id}` : ""}
                    </span>

                    {!n.is_read ? (
                      <button
                        onClick={() => handleMarkRead(n.notification_id)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        ✓ Mark read
                      </button>
                    ) : (
                      <span className="text-slate-500">Read</span>
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
