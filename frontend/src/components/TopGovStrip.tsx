"use client";

import React, { useState } from "react";
import Image from "next/image";

export default function TopGovStrip() {
  const [fontSize, setFontSize] = useState<"normal" | "sm" | "lg">("normal");

  function adjustFont(size: "normal" | "sm" | "lg") {
    setFontSize(size);
    if (typeof document !== "undefined") {
      if (size === "sm") {
        document.documentElement.style.fontSize = "90%";
      } else if (size === "lg") {
        document.documentElement.style.fontSize = "110%";
      } else {
        document.documentElement.style.fontSize = "100%";
      }
    }
  }

  return (
    <div className="w-full bg-[#0A2240] text-slate-200 text-[11px] border-b border-[#1E3A5F]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-9 flex items-center justify-between">
        {/* Left: Government of India & Ministry with Ashoka Stambh */}
        <div className="flex items-center gap-3">
          <Image
            src="/ashoka-stambh.jpg"
            alt="Government of India — Ashoka Stambh"
            width={22}
            height={28}
            className="object-contain brightness-110"
            priority
          />
          <div className="flex items-center gap-1.5 font-semibold tracking-wide">
            <span className="text-white">भारत सरकार</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-100">Government of India</span>
          </div>
          <span className="hidden lg:inline text-slate-400">|</span>
          <span className="hidden lg:inline text-slate-300">
            सांख्यिकी एवं कार्यक्रम कार्यान्वयन मंत्रालय (MoSPI)
          </span>
        </div>

        {/* Right: Accessibility Controls & Utilities */}
        <div className="flex items-center gap-4 text-[11px]">
          {/* Accessibility text resize buttons */}
          <div className="flex items-center gap-1 bg-[#123055] px-1.5 py-0.5 rounded border border-[#1E4575]">
            <span className="text-[10px] text-slate-400 mr-1 hidden sm:inline">Text Size:</span>
            <button
              onClick={() => adjustFont("sm")}
              title="Decrease Font Size"
              className={`px-1.5 py-0.2 rounded font-bold hover:bg-[#1E4E8C] transition-colors ${
                fontSize === "sm" ? "bg-[#1E4E8C] text-white" : "text-slate-300"
              }`}
            >
              A-
            </button>
            <button
              onClick={() => adjustFont("normal")}
              title="Standard Font Size"
              className={`px-1.5 py-0.2 rounded font-bold hover:bg-[#1E4E8C] transition-colors ${
                fontSize === "normal" ? "bg-[#1E4E8C] text-white" : "text-slate-300"
              }`}
            >
              A
            </button>
            <button
              onClick={() => adjustFont("lg")}
              title="Increase Font Size"
              className={`px-1.5 py-0.2 rounded font-bold hover:bg-[#1E4E8C] transition-colors ${
                fontSize === "lg" ? "bg-[#1E4E8C] text-white" : "text-slate-300"
              }`}
            >
              A+
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-slate-300">
            <span className="hover:text-white cursor-pointer" title="Screen Reader Access">
              Screen Reader
            </span>
            <span>|</span>
            <span className="text-amber-400 font-semibold">e-Sakshi MIS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
