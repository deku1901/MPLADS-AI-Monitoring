"use client";

import { useEffect, useState, useCallback } from "react";
import { getCitizenProjects, resetDemoSeed } from "@/lib/api";
import type { CitizenProjectSummary, CitizenReportResponse } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import CitizenFeedbackBadge from "@/components/CitizenFeedbackBadge";
import CitizenReportForm from "@/components/CitizenReportForm";

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
    <>
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

      <main className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto space-y-8 fade-in">
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2 uppercase tracking-widest">
            <span className="text-[var(--accent)] font-bold">Public Transparency</span>
            <span className="text-[var(--border-strong)]">›</span>
            <span className="text-[var(--text-primary)]">Citizen Ground-Truth Verification Portal</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 text-[11px] font-mono">
            Vertical Slice 3: Ground Truth
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-[var(--bg-elevated)] border-[var(--border-strong)]">
          <div className="flex items-start gap-4">
            <span className="text-3xl">👥</span>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Community Verification &amp; Public Asset Audit
              </h1>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                Citizens can verify completed and executing MPLADS assets in their locality.
                Verified ground-truth reports with GPS and photos build community consensus. If
                credible negative reports accumulate ($\ge 3.0$), the system autonomously triggers
                an official on-site inspection case for the District Authority.
              </p>
            </div>
          </div>
        </section>

        {/* Inspection Trigger Banner (Shown when a dispute threshold is crossed) */}
        {lastSubmissionResult?.inspection_triggered && (
          <section className="slide-down p-5 rounded-xl border border-red-600/80 bg-red-950/50 shadow-2xl shadow-red-950/50 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-bounce">🚨</span>
              <div>
                <h2 className="text-sm font-bold text-red-200 uppercase tracking-wide">
                  Autonomous Inspection Case Generated — DA Notified
                </h2>
                <p className="text-xs text-red-300 mt-0.5">
                  Citizen negative credibility threshold ($\ge 3.0$) reached for project{" "}
                  <span className="font-mono font-bold text-white">
                    {lastSubmissionResult.project_id}
                  </span>
                  . Case{" "}
                  <span className="font-mono font-bold text-amber-300">
                    {lastSubmissionResult.case_id}
                  </span>{" "}
                  auto-created and assigned to District Authority for mandatory on-site inspection.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Positive Verification Success Banner */}
        {lastSubmissionResult && !lastSubmissionResult.inspection_triggered && (
          <section className="slide-down p-4 rounded-xl border border-green-600/70 bg-green-950/40 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-green-300">
              <span>✅</span>
              <span>Ground-Truth Verification Recorded (Credibility Score: {lastSubmissionResult.credibility_score}/3.5)</span>
            </div>
            <p className="text-xs text-slate-300">
              Thank you for contributing to public asset accountability in your constituency.
            </p>
          </section>
        )}

        {/* Selected Project Form Modal / Inline Section */}
        {selectedProject && (
          <section>
            <CitizenReportForm
              project={selectedProject}
              onReportSubmitted={handleReportSubmitted}
              onCancel={() => setSelectedProject(null)}
            />
          </section>
        )}

        {/* Project Directory */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Public MPLADS Assets Directory ({projects.length} Works)
            </h2>
            <button
              onClick={fetchProjects}
              className="text-xs px-3 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              ↻ Refresh
            </button>
          </div>

          {loading && projects.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-muted)]">
              Loading public assets directory…
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-300">
              Error: {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const isSelected = selectedProject?.project_id === proj.project_id;

                return (
                  <div
                    key={proj.project_id}
                    className={`card bg-[var(--bg-elevated)] border transition-all space-y-4 ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/40"
                        : proj.status === "INSPECTION_REQUIRED"
                        ? "border-red-700/60 bg-red-950/20"
                        : "border-[var(--border-strong)] hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {proj.project_id}
                        </span>
                        <h3 className="text-sm font-bold text-slate-200 leading-tight">
                          {proj.title}
                        </h3>
                      </div>
                      <span className="pill pill-accent text-[10px] shrink-0">
                        {proj.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {proj.description}
                      </p>
                    )}

                    <div className="text-xs text-[var(--text-muted)] space-y-1 pt-2 border-t border-[var(--border)]">
                      <p>📍 {proj.location_text || "Varanasi, Uttar Pradesh"}</p>
                      <p>💰 Sanctioned Amount: <span className="font-semibold text-slate-300">{fmt(proj.sanctioned_amount_inr)}</span></p>
                    </div>

                    {/* Consensus Badge */}
                    <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
                      <CitizenFeedbackBadge
                        status={proj.citizen_verification_status}
                        positiveCount={proj.positive_reports_count}
                        negativeCount={proj.negative_reports_count}
                      />

                      <button
                        onClick={() => setSelectedProject(proj)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-[var(--bg-base)] border border-[var(--border-strong)] text-slate-200 hover:border-blue-500 hover:text-white"
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
    </>
  );
}
