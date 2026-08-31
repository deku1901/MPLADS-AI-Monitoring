"use client";

import { useEffect, useState, useCallback } from "react";
import { getCitizenProjects, resetDemoSeed } from "@/lib/api";
import type { CitizenProjectSummary, CitizenReportResponse } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import CitizenFeedbackBadge from "@/components/CitizenFeedbackBadge";
import CitizenReportForm from "@/components/CitizenReportForm";
import GovernmentFooter from "@/components/GovernmentFooter";

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CitizenPortalPage() {
  const [projects, setProjects] = useState<CitizenProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<CitizenProjectSummary | null>(null);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<CitizenReportResponse | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  // Filters
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [sectorFilter, setSectorFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchProjects = useCallback(async () => {
    try {
      const data = await getCitizenProjects();
      setProjects(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const data = await getCitizenProjects();
        if (!ignore) {
          setProjects(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load projects");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleReportSubmitted(res: CitizenReportResponse) {
    setLastSubmissionResult(res);
    setSelectedProject(null);
    await fetchProjects();
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      setLastSubmissionResult(null);
      setSelectedProject(null);
      await fetchProjects();
    } catch (err) {
      alert("Failed to reset demo: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setResettingSeed(false);
    }
  }

  // Filtered projects
  const states = Array.from(new Set(projects.map((p) => p.state).filter(Boolean))) as string[];
  const sectors = Array.from(new Set(projects.map((p) => p.category).filter(Boolean))) as string[];

  const filteredProjects = projects.filter((p) => {
    if (stateFilter !== "ALL" && p.state !== stateFilter) return false;
    if (sectorFilter !== "ALL" && p.category !== sectorFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchLoc = (p.location_text || "").toLowerCase().includes(q);
      const matchConst = (p.constituency || "").toLowerCase().includes(q);
      if (!matchTitle && !matchLoc && !matchConst) return false;
    }
    return true;
  });

  // Impact counters
  const totalVerified = projects.filter((p) => p.status === "VERIFIED" || p.status === "COMPLETED").length;
  const totalInquiries = projects.filter((p) => p.status === "INSPECTION_REQUIRED").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <HeaderNav
        projectId="MPL-2026-1042"
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={resettingSeed}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full space-y-6 fade-in flex-1">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs pb-3 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Government of India</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">MoSPI Transparency Initiative</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Public Citizen Ground-Truth Portal</span>
          </div>
          <span className="px-2.5 py-0.5 rounded bg-[#DCFCE7] text-[#166534] font-bold text-[11px]">
            🇮🇳 Open Public Access
          </span>
        </div>

        {/* Hero Section: "Ye Thik Karke Dikhao" */}
        <section className="rounded-lg bg-gradient-to-r from-[#0A2240] to-[#123B6D] text-white border-0 p-6 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <h1 className="text-lg md:text-xl font-bold uppercase tracking-wide">
                  Citizen Asset Verification — &ldquo;Ye Thik Karke Dikhao&rdquo;
                </h1>
              </div>
              <p className="text-xs text-white/80 leading-relaxed">
                Empowering Indian citizens to inspect completed MPLADS developmental assets on the ground.
                Upload live geo-tagged photographs and rate functionality to trigger autonomous audit investigations.
              </p>
            </div>

            {/* Impact Counters */}
            <div className="flex items-center gap-2">
              <div className="bg-white/10 px-3.5 py-2 rounded-lg border border-white/10 text-center">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Total Assets</span>
                <p className="text-xl font-bold font-mono text-white">{projects.length}</p>
              </div>
              <div className="bg-white/10 px-3.5 py-2 rounded-lg border border-white/10 text-center">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Verified</span>
                <p className="text-xl font-bold font-mono text-[#4ADE80]">{totalVerified}</p>
              </div>
              <div className="bg-white/10 px-3.5 py-2 rounded-lg border border-white/10 text-center">
                <span className="text-[10px] text-white/70 uppercase font-semibold">Inquiries</span>
                <p className="text-xl font-bold font-mono text-[#F87171]">{totalInquiries}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Error Banner */}
        {error && (
          <div className="card bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] text-xs font-semibold p-4">
            ⚠️ {error}
          </div>
        )}

        {/* Last Submission Banner */}
        {lastSubmissionResult && (
          <div className="card bg-[#F0FDF4] border-[#86EFAC] p-4 text-xs space-y-1 text-[#166534]">
            <p className="font-bold">
              ✅ Citizen Verification Submitted Successfully! (Report ID: {lastSubmissionResult.report_id})
            </p>
            <p className="text-[11px] text-[#475569]">
              Credibility Score: <strong className="text-[#0F172A]">{lastSubmissionResult.credibility_score}/100</strong> • 
              Status: <strong className="text-[#0F172A]">{lastSubmissionResult.inspection_triggered ? "Inspection Triggered (CASE created)" : "Verified & Recorded"}</strong>
            </p>
          </div>
        )}

        {/* Filter Toolbar */}
        <section className="card bg-white border-[#D5DCE5] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <input
              type="text"
              placeholder="Search by project name, location or constituency…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs rounded bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-[#123B6D]"
            />

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded bg-white border border-[#CBD5E1] text-[#0F172A] font-medium cursor-pointer"
            >
              <option value="ALL">All States ({states.length})</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded bg-white border border-[#CBD5E1] text-[#0F172A] font-medium cursor-pointer"
            >
              <option value="ALL">All Sectors ({sectors.length})</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>{sec.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-[#64748B] font-medium text-right">
            Showing <strong>{filteredProjects.length}</strong> of {projects.length} public works
          </span>
        </section>

        {/* Citizen Report Modal / Form */}
        {selectedProject && (
          <section className="card bg-white border-[#123B6D] p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
              <h2 className="text-xs font-bold text-[#0A2240] uppercase tracking-wider">
                Submit Ground-Truth Audit: {selectedProject.title}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="text-xs text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <CitizenReportForm
              project={selectedProject}
              onReportSubmitted={handleReportSubmitted}
              onCancel={() => setSelectedProject(null)}
            />
          </section>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="card bg-white p-12 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-2">
            <span className="text-2xl animate-spin">🔄</span>
            <span>Loading public citizen works dataset…</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card bg-white p-8 text-center text-xs text-[#64748B]">
            No projects matched your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <div key={p.project_id} className="card bg-white border-[#D5DCE5] p-4 flex flex-col justify-between space-y-3 hover:shadow-md transition-shadow">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[#64748B]">{p.project_id}</span>
                    <CitizenFeedbackBadge
                      status={p.status}
                      positiveCount={p.positive_reports_count || 0}
                      negativeCount={p.negative_reports_count || 0}
                    />
                  </div>

                  <h3 className="font-bold text-xs text-[#0A2240] leading-snug line-clamp-2">
                    {p.title}
                  </h3>

                  <p className="text-[11px] text-[#475569]">
                    📍 {p.location_text || `${p.constituency}, ${p.state}`}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                    <span>Sector: <strong className="text-[#0F172A]">{p.category?.replace(/_/g, " ")}</strong></span>
                    <span>Sanction: <strong className="text-[#0369A1]">{fmt(p.sanctioned_amount_inr)}</strong></span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F1F5F9] text-[#475569]">
                    {p.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => setSelectedProject(p)}
                    className="px-2.5 py-1 text-xs rounded bg-[#123B6D] hover:bg-[#0A2240] text-white font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Verify Asset 📸
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <GovernmentFooter />
    </div>
  );
}
