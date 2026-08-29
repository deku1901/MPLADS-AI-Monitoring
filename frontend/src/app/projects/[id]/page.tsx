"use client";

import { use, useEffect, useState, useCallback } from "react";
import { getProject, getCase, getProjectAudit, resetDemoSeed } from "@/lib/api";
import type {
  ProjectDetail,
  PaymentSubmitResponse,
  CaseDetail,
  EvidenceSubmitResponse,
  AuditEventSummary,
} from "@/lib/types";
import RiskBadge from "@/components/RiskBadge";
import RiskBreakdownBar from "@/components/RiskBreakdownBar";
import PaymentPanel from "@/components/PaymentPanel";
import InterventionBanner from "@/components/InterventionBanner";
import AiAnalyzingOverlay from "@/components/AiAnalyzingOverlay";
import CaseReviewCard from "@/components/CaseReviewCard";
import CaseResolvedBanner from "@/components/CaseResolvedBanner";
import AuditTrailTimeline from "@/components/AuditTrailTimeline";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    EXECUTION:        "pill pill-execution",
    COMPLETED:        "pill pill-approved",
    HELD_FOR_REVIEW:  "pill pill-held",
    APPROVED_FOR_REVIEW: "pill pill-approved",
    PAYMENT_RELEASED: "pill pill-approved",
    SUBMITTED:        "pill pill-accent",
  };
  return (
    <span className={cls[status] ?? "pill pill-accent"}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProjectSkeleton() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-2/3 rounded" />
      <div className="skeleton h-4 w-1/3 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-6 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-[var(--text-primary)] font-medium text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params);

  // ── Project state ─────────────────────────────────────────────────────────
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── F2: Payment / AI result state ─────────────────────────────────────────
  const [paymentResult, setPaymentResult] = useState<PaymentSubmitResponse | null>(null);
  const [prevRisk, setPrevRisk] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [displayRisk, setDisplayRisk] = useState<number | null>(null);
  const [displayBreakdown, setDisplayBreakdown] = useState<Record<string, number> | null>(null);

  // ── F3: Case & Evidence State ─────────────────────────────────────────────
  const [activeCase, setActiveCase] = useState<CaseDetail | null>(null);
  const [resolvedEvidenceResult, setResolvedEvidenceResult] = useState<EvidenceSubmitResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventSummary[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  // ── Load project & audit ──────────────────────────────────────────────────
  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const events = await getProjectAudit(id);
      setAuditEvents(events);
    } catch {
      // Audit fail non-critical
    } finally {
      setLoadingAudit(false);
    }
  }, [id]);

  const loadCase = useCallback(async (caseId: string) => {
    try {
      const c = await getCase(caseId);
      setActiveCase(c);
    } catch {
      // Case load non-critical
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getProject(id);
      setProject(data);
      setDisplayRisk(data.risk_score);
      if (data.risk_breakdown) {
        const bd: Record<string, number> = {};
        for (const [k, v] of Object.entries(data.risk_breakdown)) {
          if (typeof v === "number") bd[k] = v;
        }
        setDisplayBreakdown(bd);
      }

      // Check if project already has a held payment with an auto-created case
      const suffix = id.split("-").pop();
      if (suffix) {
        loadCase(`CASE-${suffix}`);
      }
      loadAudit();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [id, loadCase, loadAudit]);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      try {
        const data = await getProject(id);
        if (!ignore) {
          setProject(data);
          setDisplayRisk(data.risk_score);
          if (data.risk_breakdown) {
            const bd: Record<string, number> = {};
            for (const [k, v] of Object.entries(data.risk_breakdown)) {
              if (typeof v === "number") bd[k] = v;
            }
            setDisplayBreakdown(bd);
          }
          const suffix = id.split("-").pop();
          if (suffix) {
            loadCase(`CASE-${suffix}`);
          }
          loadAudit();
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!ignore) {
          setLoadError(e instanceof Error ? e.message : "Unknown error");
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => {
      ignore = true;
    };
  }, [id, loadCase, loadAudit]);

  // ── F2: After successful payment: update display state from backend ──────
  function handlePaymentSuccess(result: PaymentSubmitResponse, capturedPrevRisk: number) {
    setPaymentResult(result);
    setPrevRisk(capturedPrevRisk);
    setDisplayRisk(result.risk_score);
    if (result.risk_breakdown) {
      const bd: Record<string, number> = {};
      for (const [k, v] of Object.entries(result.risk_breakdown)) {
        if (typeof v === "number") bd[k] = v;
      }
      setDisplayBreakdown(bd);
    }

    // Load newly created case from backend
    if (result.case_id) {
      loadCase(result.case_id);
    }

    // Refresh project details & audit trail
    load();
  }

  // ── F3: After successful evidence submission ──────────────────────────────
  async function handleEvidenceSubmitted(res: EvidenceSubmitResponse) {
    setAnalyzing(false);
    if (res.case_status === "RESOLVED") {
      setResolvedEvidenceResult(res);
    }

    // Update risk score from backend response
    setDisplayRisk(res.risk_after);

    // Refresh case details, project state, and audit log
    if (activeCase) {
      await loadCase(activeCase.case_id);
    }
    const freshProj = await getProject(id);
    setProject(freshProj);
    if (freshProj.risk_breakdown) {
      const bd: Record<string, number> = {};
      for (const [k, v] of Object.entries(freshProj.risk_breakdown)) {
        if (typeof v === "number") bd[k] = v;
      }
      setDisplayBreakdown(bd);
    }
    await loadAudit();
  }

  // ── Reset demo to clean seed state ────────────────────────────────────────
  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      setPaymentResult(null);
      setActiveCase(null);
      setResolvedEvidenceResult(null);
      await load();
    } catch (err) {
      alert("Failed to reset demo: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setResettingSeed(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading && !project) {
    return (
      <main className="min-h-screen p-8">
        <div className="mb-8 flex items-center gap-3 text-xs text-[var(--text-muted)] uppercase tracking-widest">
          <span className="text-[var(--accent)] font-bold">MPLADS AI Platform</span>
          <span className="text-[var(--border-strong)]">›</span>
          <span>{id}</span>
        </div>
        <ProjectSkeleton />
      </main>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (loadError || !project) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="card max-w-md w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-red-400">Failed to load project</h2>
          <p className="text-sm text-[var(--text-secondary)]">{loadError ?? "Project not found."}</p>
          <p className="text-xs text-[var(--text-muted)]">
            Make sure the backend is running on{" "}
            <code className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[var(--accent-hover)]">
              http://localhost:8000
            </code>
          </p>
          <button
            onClick={load}
            className="mt-2 px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // ── Derived display values ────────────────────────────────────────────────
  const shownRisk      = displayRisk ?? project.risk_score;
  const shownBreakdown = displayBreakdown ?? project.risk_breakdown ?? {};
  const isHighRisk     = shownRisk >= 70;
  const hasHeldPayment = project.payments.some((p) => p.status === "HELD_FOR_REVIEW");
  const isHeld         = (paymentResult?.status === "HELD_FOR_REVIEW") || hasHeldPayment;

  return (
    <>
      {/* AI analyzing fullscreen overlay */}
      {analyzing && <AiAnalyzingOverlay />}

      <main className="min-h-screen p-6 md:p-10 max-w-6xl mx-auto space-y-8 fade-in">

        {/* ── Top Bar with Demo Controls ── */}
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] uppercase tracking-widest">
            <span className="text-[var(--accent)] font-bold">MPLADS AI Platform</span>
            <span className="text-[var(--border-strong)]">›</span>
            <span>Projects</span>
            <span className="text-[var(--border-strong)]">›</span>
            <span className="text-[var(--text-primary)]">{project.project_id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDemo}
              disabled={resettingSeed}
              className="text-xs px-3 py-1.5 rounded-md bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>{resettingSeed ? "Resetting…" : "Reset Demo (Risk 32)"}</span>
            </button>
            <button
              onClick={load}
              className="text-xs px-3 py-1.5 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-secondary)] transition-colors"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {/* ── Case Resolved Banner (Shown after successful evidence submission) ── */}
        {resolvedEvidenceResult && (
          <section>
            <CaseResolvedBanner
              result={resolvedEvidenceResult}
              onDismiss={() => setResolvedEvidenceResult(null)}
            />
          </section>
        )}

        {/* ── Intervention Banner (appears after payment hold, hidden once resolved) ── */}
        {paymentResult && isHeld && !resolvedEvidenceResult && (
          <section>
            <InterventionBanner
              result={paymentResult}
              previousRisk={prevRisk}
              onDismiss={() => setPaymentResult(null)}
            />
          </section>
        )}

        {/* ── Project Header ── */}
        <section>
          <div className="flex flex-wrap items-start gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-tight">
              {project.title}
            </h1>
            <StatusPill status={project.status} />
            {isHeld && !resolvedEvidenceResult && <StatusPill status="HELD_FOR_REVIEW" />}
            {resolvedEvidenceResult && <StatusPill status="APPROVED_FOR_REVIEW" />}
          </div>
          {project.description && (
            <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed">
              {project.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--text-muted)]">
            {project.constituency && (
              <span>📍 {project.constituency}{project.state ? `, ${project.state}` : ""}</span>
            )}
            {project.category    && <span>🏷 {project.category}</span>}
            {project.implementing_agency && <span>🏗 {project.implementing_agency}</span>}
          </div>
        </section>

        {/* ── Risk + Budget + Timeline grid ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Risk Score Card */}
          <div
            className={`card flex flex-col items-center justify-center gap-4 py-8 transition-all duration-700 ${
              isHighRisk ? "border-red-700/60 shadow-lg shadow-red-950/30" : ""
            }`}
          >
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              AI Risk Score
            </p>
            <RiskBadge score={shownRisk} size="lg" pulse={isHighRisk} />

            {paymentResult && (
              <p className="text-xs text-[var(--text-muted)]">
                Initial:{" "}
                <span className="text-green-400 font-semibold">{prevRisk || 32}</span>
                {resolvedEvidenceResult && (
                  <>
                    {" → Peak: "}
                    <span className="text-red-400 font-semibold">{paymentResult.risk_score}</span>
                    {" → Current: "}
                    <span className="text-green-400 font-semibold">{shownRisk}</span>
                  </>
                )}
              </p>
            )}

            {shownBreakdown && Object.keys(shownBreakdown).length > 0 && (
              <div className="w-full">
                <RiskBreakdownBar breakdown={shownBreakdown} />
              </div>
            )}
          </div>

          {/* Budget Card */}
          <div className="card space-y-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">
              Budget
            </p>
            <InfoRow label="Recommended" value={fmt(project.recommended_amount_inr)} />
            <InfoRow label="Sanctioned"  value={fmt(project.sanctioned_amount_inr)} />
            {project.latest_progress && (
              <InfoRow
                label="Reported Progress"
                value={`${project.latest_progress.reported_pct}%`}
              />
            )}
            {project.missing_documents && project.missing_documents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <p className="text-xs text-amber-400 font-semibold mb-1.5 uppercase tracking-wide">
                  ⚠ Missing Documents
                </p>
                <ul className="space-y-1">
                  {project.missing_documents.map((doc) => (
                    <li key={doc} className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Timeline Card */}
          <div className="card space-y-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">
              Timeline
            </p>
            <InfoRow label="Recommended On"    value={fmtDate(project.recommendation_date)} />
            <InfoRow label="Sanctioned On"     value={fmtDate(project.sanction_date)} />
            <InfoRow label="Target Completion" value={fmtDate(project.completion_date)} />
            <InfoRow label="Mandatory Tender"  value={project.mandatory_tender ? "Yes" : "No"} />
            <InfoRow label="Last Updated"      value={fmtDate(project.updated_at)} />
          </div>
        </section>

        {/* ── Payment History ── */}
        {project.payments.length > 0 && (
          <section className="card">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-4">
              Payment History & Release Audit
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border)]">
                    <th className="text-left py-2 pr-4">Payment ID</th>
                    <th className="text-left py-2 pr-4">Amount</th>
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-right py-2">AI Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {project.payments.map((p) => (
                    <tr key={p.payment_id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-xs text-[var(--text-muted)]">
                        {p.payment_id}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold">{fmt(p.requested_amount_inr)}</td>
                      <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{fmtDate(p.request_date)}</td>
                      <td className="py-2.5 pr-4">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="py-2.5 text-right">
                        {p.ai_risk_score_at_request != null ? (
                          <span
                            className={`font-bold tabular-nums ${
                              p.ai_risk_score_at_request >= 70
                                ? "text-red-400"
                                : p.ai_risk_score_at_request >= 40
                                ? "text-amber-400"
                                : "text-green-400"
                            }`}
                          >
                            {p.ai_risk_score_at_request}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── F2: Payment Submission Panel ── */}
        {/* Only show when there is no active held payment */}
        {!isHeld && !activeCase && (
          <section>
            <PaymentPanel
              projectId={project.project_id}
              currentRisk={shownRisk}
              onAnalyzing={setAnalyzing}
              onSuccess={handlePaymentSuccess}
            />
          </section>
        )}

        {/* ── F3: Case Review & Authority Evidence Submission ── */}
        {activeCase && (
          <section>
            <CaseReviewCard
              caseData={activeCase}
              onReevaluateStart={() => setAnalyzing(true)}
              onEvidenceSubmitted={handleEvidenceSubmitted}
            />
          </section>
        )}

        {/* ── F3: Immutable Chronological Audit Trail ── */}
        <section>
          <AuditTrailTimeline
            events={auditEvents}
            loading={loadingAudit}
            onRefresh={loadAudit}
          />
        </section>

      </main>
    </>
  );
}
