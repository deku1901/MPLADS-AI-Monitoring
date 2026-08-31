"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth";
import GovernmentFooter from "@/components/GovernmentFooter";

export default function LoginPage() {
  const router = useRouter();
  const { login, personas } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(userToLogin?: string) {
    const targetUser = userToLogin || username;
    if (!targetUser.trim()) {
      setError("Please select a persona or enter an ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(targetUser);
      const matched = personas.find(
        (p) => p.user_id.toLowerCase() === targetUser.toLowerCase() || p.role.toLowerCase() === targetUser.toLowerCase()
      );
      const route = matched?.default_route || (
        matched?.role === "MP" ? "/mp-dashboard" :
        matched?.role === "DA" ? "/da-dashboard" :
        matched?.role === "SNA" ? "/sna-dashboard" :
        matched?.role === "CITIZEN" ? "/citizen" :
        "/national-dashboard"
      );
      router.push(route);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <div className="h-1 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />
      
      <header className="bg-white border-b border-[#D5DCE5] px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
              <p className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                GOVERNMENT OF INDIA • सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय
              </p>
              <h2 className="text-xs md:text-sm font-extrabold text-[#0A2240] tracking-tight">
                Ministry of Statistics and Programme Implementation (MoSPI)
              </h2>
            </div>
          </Link>
          <Link href="/" className="text-xs font-bold text-[#123B6D] hover:underline">
            ← Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Column: GoI Secure SSO Branding */}
          <div className="space-y-4 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[11px] font-bold">
              <span>🔐</span>
              <span>Official Scheme Governance Access</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-[#0A2240] tracking-tight leading-tight">
              Single Sign-On (SSO) &amp; Role Authentication
            </h1>

            <p className="text-xs text-[#475569] leading-relaxed">
              Access the Member of Parliament Local Area Development Scheme (MPLADS) AI Monitoring &amp; Intervention Platform.
              Select your official stakeholder role to enter the corresponding governance workspace.
            </p>

            <div className="p-4 rounded-lg bg-white border border-[#D5DCE5] text-xs space-y-2">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">Role Permissions Matrix:</span>
              <ul className="space-y-1 text-[#334155] text-[11px]">
                <li>• <strong className="text-[#0F172A]">MP:</strong> Work recommendations, budget tracking, SC/ST compliance.</li>
                <li>• <strong className="text-[#0F172A]">District Authority:</strong> 45-day sanctions, payment releases, case responses.</li>
                <li>• <strong className="text-[#0F172A]">State Nodal Authority:</strong> State leaderboard, Tier-2 escalation resolution.</li>
                <li>• <strong className="text-[#0F172A]">Ministry (MoSPI):</strong> National oversight, Tier-3 queue, fiscal protection ledger.</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Demo Login Card */}
          <div className="card bg-white border-[#D5DCE5] p-6 shadow-md space-y-5">
            <div>
              <h2 className="text-sm font-bold text-[#0A2240] uppercase tracking-wider">
                Select Demo Stakeholder Persona
              </h2>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Click any role card below for instant 1-click evaluation access:
              </p>
            </div>

            {error && (
              <div className="p-3 rounded bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B] font-semibold">
                ⚠️ {error}
              </div>
            )}

            {/* Persona Quick Select Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleLogin("AUTH-MOSPI-01")}
                disabled={loading}
                className="w-full p-2.5 rounded-lg border border-[#D5DCE5] hover:border-[#123B6D] hover:bg-[#F8FAFC] text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🏛️</span>
                  <div>
                    <p className="font-bold text-xs text-[#0F172A]">MoSPI Ministry Headquarters</p>
                    <p className="text-[10px] text-[#64748B]">Shri Anil Gupta (Joint Secretary &amp; Central Nodal Officer)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#1D4ED8] group-hover:translate-x-1 transition-transform">Enter →</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin("AUTH-SNA-01")}
                disabled={loading}
                className="w-full p-2.5 rounded-lg border border-[#D5DCE5] hover:border-[#123B6D] hover:bg-[#F8FAFC] text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🏢</span>
                  <div>
                    <p className="font-bold text-xs text-[#0F172A]">State Nodal Authority (SNA)</p>
                    <p className="text-[10px] text-[#64748B]">Smt. Sunita Verma, IAS (Special Secretary Planning, UP)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#1D4ED8] group-hover:translate-x-1 transition-transform">Enter →</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin("AUTH-DA-01")}
                disabled={loading}
                className="w-full p-2.5 rounded-lg border border-[#D5DCE5] hover:border-[#123B6D] hover:bg-[#F8FAFC] text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">⚖️</span>
                  <div>
                    <p className="font-bold text-xs text-[#0F172A]">District Authority (DA / Collector)</p>
                    <p className="text-[10px] text-[#64748B]">Collector Rajesh Sharma, IAS (Varanasi District)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#1D4ED8] group-hover:translate-x-1 transition-transform">Enter →</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin("MP-UP-042")}
                disabled={loading}
                className="w-full p-2.5 rounded-lg border border-[#D5DCE5] hover:border-[#123B6D] hover:bg-[#F8FAFC] text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🇮🇳</span>
                  <div>
                    <p className="font-bold text-xs text-[#0F172A]">Member of Parliament (MP)</p>
                    <p className="text-[10px] text-[#64748B]">Shri R. K. Singh (Lok Sabha MP, Varanasi)</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#1D4ED8] group-hover:translate-x-1 transition-transform">Enter →</span>
              </button>

              <button
                type="button"
                onClick={() => handleLogin("CITIZEN-USER")}
                disabled={loading}
                className="w-full p-2.5 rounded-lg border border-[#D5DCE5] hover:border-[#123B6D] hover:bg-[#F8FAFC] text-left flex items-center justify-between transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">👥</span>
                  <div>
                    <p className="font-bold text-xs text-[#0F172A]">Public Citizen Verifier</p>
                    <p className="text-[10px] text-[#64748B]">Open Citizen Ground-Truth Portal</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#1D4ED8] group-hover:translate-x-1 transition-transform">Enter →</span>
              </button>
            </div>

            {/* Custom Credentials Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-2.5 pt-2 border-t border-[#E2E8F0]"
            >
              <div>
                <label className="text-[10px] font-bold text-[#475569] uppercase block mb-1">
                  Or Sign In with Official ID:
                </label>
                <input
                  type="text"
                  placeholder="e.g. AUTH-MOSPI-01, AUTH-DA-01, MP-UP-042"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#123B6D]"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#123B6D]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-1.5 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? "Authenticating…" : "Sign In with Credentials"}
              </button>
            </form>

            <div className="pt-2 border-t border-[#E2E8F0] text-center">
              <span className="text-[10px] text-[#64748B]">
                Demo Mode Active • Pre-configured credentials verified against active SQLite database
              </span>
            </div>
          </div>
        </div>
      </main>

      <GovernmentFooter />
    </div>
  );
}
