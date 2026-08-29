"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "@/lib/api";

interface HeaderNavProps {
  projectId: string;
  onOpenNotifications: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export default function HeaderNav({
  projectId,
  onOpenNotifications,
  onResetDemo,
  isResetting = false,
}: HeaderNavProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function updateUnread() {
      try {
        const notifs = await getNotifications({ unread_only: true });
        if (!ignore) {
          setUnreadCount(notifs.length);
        }
      } catch {
        // non-critical
      }
    }
    updateUnread();
    const timer = setInterval(updateUnread, 5000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="w-full border-b border-[var(--border-strong)] bg-[var(--bg-surface)]/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-4">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-lg shadow-inner">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--text-primary)] tracking-wide">
                MPLADS AI MONITORING
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800">
                MVP v1.0
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Closed-Loop Statutory Oversight &amp; Intervention Engine
            </p>
          </div>
        </div>

        {/* Project Context & Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--text-muted)]">Active:</span>
            <span className="font-mono font-semibold text-slate-200">{projectId}</span>
          </div>

          {/* Notification Bell with Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-strong)] text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            title="Open Authority Notifications"
          >
            <span>🔔</span>
            <span className="hidden md:inline">Alerts</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono font-bold text-[10px] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Reset Demo Button */}
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            title="Reset Database to Seed State (Risk 32)"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">
              {isResetting ? "Resetting…" : "Reset Demo (Risk 32)"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
