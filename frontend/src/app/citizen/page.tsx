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

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCitizenProjects();
      setProjects(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
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
    loadData();
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
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs pb-2 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Dashboard</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">Public Oversight</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Citizen Ground-Truth Verification Portal</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[11px] font-mono font-bold">
            Slice 3: Weighted Credibility Consensus
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex items-start gap-3.5">
            <span className="text-2xl">👥</span>
            <div className="space-y-1">
              <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                CITIZEN PARTICIPATORY AUDIT &amp; ASSET VERIFICATION PORTAL
              </h1>
              <p className="text-xs text-[#475569] leading-relaxed max-w-4xl">
                Citizens can verify developmental works funded under MPLADS in their constituency.
                Geotagged reports and on-site photos build public credibility scores. When cumulative credible negative
                reports reach the statutory threshold (score $\ge 3.0$), the system autonomously triggers an official
                on-site inquiry case (<code className="font-mono font-bold text-[#B3261E]">INSPECTION_REQUIRED</code>) for the District Authority.
              </p>
            </div>
          </div>
        </section>

        {/* Autonomous Inspection Case Generated Banner */}
        {lastSubmissionResult?.inspection_triggered && (
          <section className="p-4 rounded border border-[#F87171] bg-[#FEF2F2] shadow-xs slide-down space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚨</span>
              <h2 className="text-xs font-bold text-[#991B1B] uppercase tracking-wide">
                AUTONOMOUS STATUTORY INSPECTION CASE GENERATED — DISTRICT AUTHORITY NOTIFIED
              </h2>
            </div>
            <p className="text-xs text-[#7F1D1D] pl-7">
              Cumulative citizen negative credibility threshold reached (&ge; 3.0) for work{" "}
              <strong className="font-mono text-[#0F172A]">{lastSubmissionResult.project_id}</strong>.
              Intervention Case <strong className="font-mono text-[#123B6D]">{lastSubmissionResult.case_id}</strong> was auto-created and dispatched to the District Collector for mandatory physical inquiry.
            </p>
          </section>
        )}

        {/* Positive Verification Recorded Banner */}
        {lastSubmissionResult && !lastSubmissionResult.inspection_triggered && (
          <section className="p-3.5 rounded border border-[#86EFAC] bg-[#F0FDF4] text-xs space-y-0.5 slide-down">
            <div className="flex items-center gap-2 font-bold text-[#166534]">
              <span>✅</span>
              <span>Ground-Truth Verification Logged (Credibility Weight: {lastSubmissionResult.credibility_score}/3.5)</span>
            </div>
            <p className="text-[#334155] pl-6 text-[11px]">
              Thank you for contributing to transparent public infrastructure monitoring in your constituency.
            </p>
          </section>
        )}

        {/* Form Modal / Active Form */}
        {selectedProject && (
          <section>
            <CitizenReportForm
              project={selectedProject}
              onReportSubmitted={handleReportSubmitted}
              onCancel={() => setSelectedProject(null)}
            />
          </section>
        )}

        {/* Public Works Directory Grid */}
        <section className="card bg-white border-[#D5DCE5] space-y-4">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
              PUBLIC MPLADS WORKS DIRECTORY ({projects.length} WORKS REGISTERED)
            </h3>
            <button
              onClick={fetchProjects}
              className="text-[11px] font-bold px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
            >
              ↻ Refresh List
            </button>
          </div>

          {loading && projects.length === 0 ? (
            <p className="text-xs text-[#64748B] text-center py-8">
              Retrieving public works directory…
            </p>
          ) : error ? (
            <div className="p-3 rounded bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
              <strong>Directory Error:</strong> {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const isSelected = selectedProject?.project_id === proj.project_id;

                return (
                  <div
                    key={proj.project_id}
                    className={`p-4 rounded border transition-all space-y-3 ${
                      isSelected
                        ? "border-[#123B6D] ring-2 ring-[#123B6D]/20 bg-[#F8FAFC]"
                        : proj.status === "INSPECTION_REQUIRED"
                        ? "border-[#FCA5A5] bg-[#FEF2F2]"
                        : "border-[#CBD5E1] bg-white hover:border-[#94A3B8]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold text-[#123B6D]">
                          {proj.project_id}
                        </span>
                        <h4 className="text-sm font-bold text-[#0F172A] leading-tight">
                          {proj.title}
                        </h4>
                      </div>
                      <span className="pill pill-accent text-[9px] shrink-0">
                        {proj.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-[#475569] leading-relaxed line-clamp-2">
                        {proj.description}
                      </p>
                    )}

                    <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#E2E8F0] space-y-0.5">
                      <p>📍 Location: {proj.location_text || "Varanasi, UP"}</p>
                      <p>💰 Sanctioned Amount: <strong className="text-[#0F172A]">{fmt(proj.sanctioned_amount_inr)}</strong></p>
                    </div>

                    {/* Consensus Status & Action */}
                    <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between flex-wrap gap-2">
                      <CitizenFeedbackBadge
                        status={proj.citizen_verification_status}
                        positiveCount={proj.positive_reports_count}
                        negativeCount={proj.negative_reports_count}
                      />

                      <button
                        onClick={() => setSelectedProject(proj)}
                        className={`text-xs font-bold px-3 py-1.5 rounded transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#123B6D] text-white"
                            : "bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] hover:bg-[#123B6D] hover:text-white"
                        }`}
                      >
                        {isSelected ? "Active Form ↑" : "🔍 Verify Asset"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <GovernmentFooter />
    </div>
  );
}
