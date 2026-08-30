"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNotifications } from "@/lib/api";
import TopGovStrip from "@/components/TopGovStrip";

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
  const pathname = usePathname();
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
    <header className="w-full bg-white border-b border-[#D5DCE5] sticky top-0 z-40 shadow-xs">
      {/* Level 1: Government Identity Top Strip */}
      <TopGovStrip />

      {/* Level 2: Scheme & Authority Identity Banner */}
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Scheme Emblem & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-md bg-[#123B6D] flex items-center justify-center text-white text-2xl font-serif shadow-xs border border-[#0A2540]">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-base md:text-lg text-[#0A2240] tracking-tight">
                  MPLADS MONITORING &amp; DECISION PORTAL
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E8F5E9] text-[#166534] border border-[#86EFAC]">
                  ● System Operational
                </span>
              </div>
              <p className="text-[11px] text-[#475569] font-medium">
                Members of Parliament Local Area Development Scheme • MoSPI Administrative Decision-Support
              </p>
            </div>
          </div>

          {/* Authority Context, Alert Bell & Demo Control */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Active Authority Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-[#F1F5F9] border border-[#CBD5E1] text-xs">
              <span className="text-[10px] text-[#64748B] uppercase font-bold">Authority:</span>
              <span className="font-semibold text-[#0F172A]">DA (Varanasi)</span>
              <span className="text-[#94A3B8]">|</span>
              <span className="text-[11px] font-mono text-[#0369A1] font-bold">{projectId}</span>
            </div>

            {/* Notification Alert Center */}
            <button
              onClick={onOpenNotifications}
              className="relative px-3 py-1.5 rounded bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Open Official Authority Notification Center"
            >
              <span>🔔</span>
              <span className="hidden md:inline">Alert Center</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#B3261E] text-white font-mono font-bold text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Seed Reset Button */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              className="px-3 py-1.5 rounded bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Reset Database to Seed State (Risk 32)"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">
                {isResetting ? "Resetting…" : "Reset State (Risk 32)"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Level 3: Administrative Primary Navigation Strip */}
      <div className="bg-[#123B6D] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <nav className="flex items-center overflow-x-auto text-xs font-medium no-scrollbar">
            <Link
              href={`/projects/${projectId}`}
              className={`px-4 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                pathname?.includes("/projects")
                  ? "bg-[#0A2240] text-white font-bold border-[#E67E22]"
                  : "text-slate-200 hover:bg-[#1E4E8C] hover:text-white border-transparent"
              }`}
            >
              <span>📋</span>
              <span>1. Works &amp; Payment Firebreak</span>
            </Link>

            <Link
              href="/recommend"
              className={`px-4 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                pathname === "/recommend"
                  ? "bg-[#0A2240] text-white font-bold border-[#E67E22]"
                  : "text-slate-200 hover:bg-[#1E4E8C] hover:text-white border-transparent"
              }`}
            >
              <span>🔎</span>
              <span>2. Pre-Sanction Screening</span>
            </Link>

            <Link
              href="/citizen"
              className={`px-4 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                pathname === "/citizen"
                  ? "bg-[#0A2240] text-white font-bold border-[#E67E22]"
                  : "text-slate-200 hover:bg-[#1E4E8C] hover:text-white border-transparent"
              }`}
            >
              <span>👥</span>
              <span>3. Citizen Verification</span>
            </Link>

            <Link
              href="/split-work"
              className={`px-4 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                pathname === "/split-work"
                  ? "bg-[#0A2240] text-white font-bold border-[#E67E22]"
                  : "text-slate-200 hover:bg-[#1E4E8C] hover:text-white border-transparent"
              }`}
            >
              <span>🧩</span>
              <span>4. Split-Work Compliance</span>
            </Link>

            <Link
              href="/satellite"
              className={`px-4 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                pathname === "/satellite"
                  ? "bg-[#0A2240] text-white font-bold border-[#E67E22]"
                  : "text-slate-200 hover:bg-[#1E4E8C] hover:text-white border-transparent"
              }`}
            >
              <span>🛰️</span>
              <span>5. Satellite Verification</span>
            </Link>

            <Link
              href="/delay"
              className={`px-4 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                pathname === "/delay"
                  ? "bg-[#0A2240] text-white font-bold border-[#E67E22]"
                  : "text-slate-200 hover:bg-[#1E4E8C] hover:text-white border-transparent"
              }`}
            >
              <span>⏳</span>
              <span>6. Delay Monitoring</span>
            </Link>

            <Link
              href="/financial"
              className={`px-4 py-2.5 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
                pathname === "/financial"
                  ? "bg-[#0A2240] text-white font-bold border-[#E67E22]"
                  : "text-slate-200 hover:bg-[#1E4E8C] hover:text-white border-transparent"
              }`}
            >
              <span>📈</span>
              <span>7. Financial Analytics</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
