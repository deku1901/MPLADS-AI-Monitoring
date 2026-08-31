"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { getNotifications } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  const { user, switchPersona, personas } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Nav scroll state
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  function scrollNav(direction: "left" | "right") {
    const el = navRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  }

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
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Scheme Emblem & Title */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center shadow-xs border border-[#D5DCE5] overflow-hidden">
              <Image
                src="/ashoka-stambh.jpg"
                alt="Government of India Emblem"
                width={32}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm md:text-base text-[#0A2240] tracking-tight">
                  MPLADS AI MONITORING &amp; INTERVENTION PLATFORM
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-[#E8F5E9] text-[#166534] border border-[#86EFAC]">
                  ● Live Oversight
                </span>
              </div>
              <p className="text-[10px] text-[#475569] font-medium">
                Ministry of Statistics and Programme Implementation (MoSPI) • Government of India
              </p>
            </div>
          </Link>

          {/* Persona Switcher & Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Active Persona Badge & Quick Switcher */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#CBD5E1] text-xs">
              <span className="text-sm">{user?.avatar_emoji || "👤"}</span>
              <div className="text-left leading-none">
                <span className="text-[9px] text-[#64748B] font-bold uppercase block">{user?.role || "USER"}</span>
                <span className="font-bold text-[11px] text-[#0F172A]">{user?.name?.split(" (")[0] || "Official"}</span>
              </div>

              {personas.length > 0 && (
                <select
                  value={user?.user_id || ""}
                  onChange={(e) => switchPersona(e.target.value)}
                  aria-label="Switch Stakeholder Persona"
                  className="ml-1 text-[10px] py-0.5 px-1 rounded bg-white border border-[#CBD5E1] font-medium text-[#475569] cursor-pointer"
                >
                  {personas.map((p) => (
                    <option key={p.user_id} value={p.user_id}>
                      {p.role}: {p.name.split(" (")[0]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Notification Alert Center */}
            <button
              onClick={onOpenNotifications}
              className="relative px-2.5 py-1.5 rounded bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Open Official Authority Notification Center"
            >
              <span>🔔</span>
              <span className="hidden lg:inline text-[11px]">Alerts</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#B3261E] text-white font-mono font-bold text-[9px]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Seed Reset Button */}
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              className="px-2.5 py-1.5 rounded bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Reset database to deterministic initial state"
            >
              <span>{isResetting ? "⏳" : "🔄"}</span>
              <span>{isResetting ? "Resetting…" : "Reset Demo"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Level 3: Navigation Bar with Scroll Buttons */}
      <div className="bg-[#123B6D] text-white text-xs font-medium border-b border-[#0A2240] relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            onClick={() => scrollNav("left")}
            className="absolute left-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-r from-[#0A2240] to-transparent text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Scroll navigation left"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            onClick={() => scrollNav("right")}
            className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-center w-8 bg-gradient-to-l from-[#0A2240] to-transparent text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Scroll navigation right"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
        )}

        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <nav
            ref={navRef}
            className="flex items-center gap-1 overflow-x-auto py-1 scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Primary Role Dashboards */}
            <Link
              href="/national-dashboard"
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/national-dashboard" ? "bg-[#0A2240] text-[#FACC15]" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>🏛️</span>
              <span>MoSPI National</span>
            </Link>

            <Link
              href="/sna-dashboard"
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/sna-dashboard" ? "bg-[#0A2240] text-[#FACC15]" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>🏢</span>
              <span>SNA State</span>
            </Link>

            <Link
              href="/da-dashboard"
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/da-dashboard" ? "bg-[#0A2240] text-[#FACC15]" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>⚖️</span>
              <span>DA Operations</span>
            </Link>

            <Link
              href="/mp-dashboard"
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/mp-dashboard" ? "bg-[#0A2240] text-[#FACC15]" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>🇮🇳</span>
              <span>MP Constituency</span>
            </Link>

            <Link
              href="/citizen"
              className={`px-3 py-1.5 rounded text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/citizen" ? "bg-[#0A2240] text-[#FACC15]" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>👥</span>
              <span>Citizen Portal</span>
            </Link>

            <span className="h-4 w-px bg-white/20 mx-1 shrink-0" />

            {/* AI Capability Modules */}
            <Link
              href="/dashboard"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/dashboard" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>⚡</span>
              <span>Command Matrix (F15)</span>
            </Link>

            <Link
              href={`/projects/${projectId}`}
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname?.includes("/projects") ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>💳</span>
              <span>Firebreak &amp; F17</span>
            </Link>

            <Link
              href="/recommend"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/recommend" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>🔎</span>
              <span>NLP Screening (F2)</span>
            </Link>

            <Link
              href="/split-work"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/split-work" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>🧩</span>
              <span>Split-Work (F4)</span>
            </Link>

            <Link
              href="/satellite"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/satellite" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>🛰️</span>
              <span>Satellite (F11)</span>
            </Link>

            <Link
              href="/delay"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/delay" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>⏳</span>
              <span>Time Delay (F12)</span>
            </Link>

            <Link
              href="/financial"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/financial" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>📈</span>
              <span>Financials (F13)</span>
            </Link>

            <Link
              href="/cost-overrun"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/cost-overrun" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>💰</span>
              <span>Cost Overrun (F14)</span>
            </Link>

            <Link
              href="/escalation"
              className={`px-2.5 py-1.5 rounded text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
                pathname === "/escalation" ? "bg-[#0A2240] text-white font-bold" : "hover:bg-[#1E4E8C] text-slate-200"
              }`}
            >
              <span>⏱️</span>
              <span>Escalations (F16)</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
