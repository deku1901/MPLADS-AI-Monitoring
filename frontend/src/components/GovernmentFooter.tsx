"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export default function GovernmentFooter() {
  return (
    <footer className="w-full mt-auto bg-[#0A2240] text-slate-300 text-xs border-t-4 border-[#E67E22]">
      {/* Upper Footer Links */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-700/60">
          {/* Col 1: Portal Overview */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center shadow-xs border border-[#D5DCE5] overflow-hidden">
                <Image
                  src="/ashoka-stambh.jpg"
                  alt="Government of India Emblem"
                  width={24}
                  height={30}
                  className="object-contain"
                />
              </div>
              <div>
                <p className="font-bold text-white tracking-wide text-sm">
                  MPLADS AI MONITORING &amp; COMPLIANCE SYSTEM
                </p>
                <p className="text-[11px] text-slate-400">
                  Members of Parliament Local Area Development Scheme
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed max-w-xl">
              An AI-assisted administrative oversight and statutory compliance monitoring prototype
              developed under the guidelines of the Ministry of Statistics and Programme Implementation (MoSPI),
              Government of India. Implements closed-loop automated anomaly detection, procurement integrity, and physical milestone tracking.
            </p>
          </div>

          {/* Col 2: Official Reference & Slices */}
          <div className="space-y-2">
            <p className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">
              Monitoring Modules
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li>
                <Link href="/projects/MPL-2026-1042" className="hover:text-white transition-colors">
                  • Payment &amp; Anomaly Firebreak (F1–F4)
                </Link>
              </li>
              <li>
                <Link href="/recommend" className="hover:text-white transition-colors">
                  • Pre-Sanction NLP Screening (F5)
                </Link>
              </li>
              <li>
                <Link href="/citizen" className="hover:text-white transition-colors">
                  • Citizen Ground-Truth Portal (F6–F8)
                </Link>
              </li>
              <li>
                <Link href="/split-work" className="hover:text-white transition-colors">
                  • Split-Work &amp; Tender Compliance (F9–F10)
                </Link>
              </li>
              <li className="text-slate-400">
                • Satellite Physical Verification (Slice 5 / Planned)
              </li>
            </ul>
          </div>

          {/* Col 3: Institutional Metadata */}
          <div className="space-y-2">
            <p className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">
              Administrative Context
            </p>
            <div className="space-y-1 text-[11px] text-slate-300">
              <p>
                <strong className="text-white">Scheme:</strong> MPLADS Revamped Guidelines
              </p>
              <p>
                <strong className="text-white">Statutory Limit:</strong> ₹5.00 Cr / FY per MP
              </p>
              <p>
                <strong className="text-white">Mandatory Tender:</strong> &gt; ₹10.00 Lakh
              </p>
              <p>
                <strong className="text-white">Jurisdiction:</strong> Varanasi, Uttar Pradesh
              </p>
              <div className="pt-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-[10px] text-emerald-300 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Decision Engine: Operational
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Footer: Legal / Prototype Notice */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            <p>© Government of India • Ministry of Statistics &amp; Programme Implementation (MoSPI)</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Notice: This is an AI-assisted digital governance prototype for evaluation and administrative decision-support.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-200 cursor-pointer">Terms of Use</span>
            <span>•</span>
            <span className="hover:text-slate-200 cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-slate-200 cursor-pointer">Hyperlink Policy</span>
            <span>•</span>
            <span className="hover:text-slate-200 cursor-pointer">Help</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
