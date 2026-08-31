"use client";

import { use, useEffect, useState } from "react";
import { getProject, getCase, getProjectAudit, resetDemoSeed, verifyCompletion } from "@/lib/api";
import type {
  ProjectDetail,
  PaymentSubmitResponse,
  CaseDetail,
  EvidenceSubmitResponse,
  AuditEventSummary,
  CompletionVerifyResponse,
} from "@/lib/types";
import RiskBadge from "@/components/RiskBadge";
import RiskBreakdownBar from "@/components/RiskBreakdownBar";
import PaymentPanel from "@/components/PaymentPanel";
import InterventionBanner from "@/components/InterventionBanner";
import AiAnalyzingOverlay from "@/components/AiAnalyzingOverlay";
import CaseReviewCard from "@/components/CaseReviewCard";
import CaseResolvedBanner from "@/components/CaseResolvedBanner";
import AuditTrailTimeline from "@/components/AuditTrailTimeline";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import GovernmentFooter from "@/components/GovernmentFooter";

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
    INSPECTION_REQUIRED: "pill pill-held",
  };
  return (
    <span className={cls[status] ?? "pill pill-accent"}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[#E2E8F0] last:border-0 text-xs">
      <span className="text-[#64748B] font-semibold uppercase tracking-wider text-[10px]">
        {label}
      </span>
      <span className="text-[#0F172A] font-bold text-right max-w-[65%]">
        {value}
      </span>
    </div>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [paymentResult, setPaymentResult] = useState<PaymentSubmitResponse | null>(null);
  const [prevRisk, setPrevRisk] = useState<number>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [displayRisk, setDisplayRisk] = useState<number | null>(null);
  const [displayBreakdown, setDisplayBreakdown] = useState<Record<string, number> | null>(null);

  const [activeCase, setActiveCase] = useState<CaseDetail | null>(null);
  const [resolvedEvidenceResult, setResolvedEvidenceResult] = useState<EvidenceSubmitResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEventSummary[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [completionResult, setCompletionResult] = useState<CompletionVerifyResponse | null>(null);
  const [verifyingCompletion, setVerifyingCompletion] = useState(false);

  async function handleRunCompletionVerification() {
    setVerifyingCompletion(true);
    try {
      const res = await verifyCompletion(id);
      setCompletionResult(res);
      await load();
    } catch (err) {
      alert("Completion verification failed: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setVerifyingCompletion(false);
    }
  }

  async function loadAudit() {
    setLoadingAudit(true);
    try {
      const events = await getProjectAudit(id);
      setAuditEvents(events);
    } catch {
      // non-critical
    } finally {
      setLoadingAudit(false);
    }
  }

  async function loadCase(caseId: string) {
    try {
      const c = await getCase(caseId);
      setActiveCase(c);
    } catch {
      // non-critical
    }
  }

  async function load() {
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
  }

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

    if (result.case_id) {
      loadCase(result.case_id);
    }
    load();
  }

  async function handleEvidenceSubmitted(res: EvidenceSubmitResponse) {
    setAnalyzing(false);
    if (res.case_status === "RESOLVED") {
      setResolvedEvidenceResult(res);
    }

    setDisplayRisk(res.risk_after);

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

  if (loading && !project) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
        <HeaderNav
          projectId={id}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onResetDemo={handleResetDemo}
          isResetting={resettingSeed}
        />
        <main className="max-w-7xl mx-auto p-8 w-full space-y-6">
          <div className="skeleton h-8 w-1/3 rounded" />
          <div className="skeleton h-40 w-full rounded" />
        </main>
        <GovernmentFooter />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
        <HeaderNav
          projectId={id}
          onOpenNotifications={() => setIsNotificationOpen(true)}
          onResetDemo={handleResetDemo}
          isResetting={resettingSeed}
        />
        <main className="max-w-xl mx-auto p-8 my-auto w-full">
          <div className="card text-center space-y-3 border-[#FCA5A5] bg-[#FEF2F2]">
            <span className="text-3xl">⚠️</span>
            <h2 className="text-sm font-bold text-[#991B1B]">Failed to Retrieve Work Details</h2>
            <p className="text-xs text-[#64748B]">{loadError ?? "Work record not found in central registry."}</p>
            <button
              onClick={load}
              className="px-4 py-1.5 rounded bg-[#123B6D] text-white text-xs font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        </main>
        <GovernmentFooter />
      </div>
    );
  }

  const shownRisk      = displayRisk ?? project.risk_score;
  const shownBreakdown = displayBreakdown ?? project.risk_breakdown ?? {};
  const isHighRisk     = shownRisk >= 70;
  const hasHeldPayment = project.payments.some((p) => p.status === "HELD_FOR_REVIEW");
  const isHeld         = (paymentResult?.status === "HELD_FOR_REVIEW") || hasHeldPayment;

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <HeaderNav
        projectId={project.project_id}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onResetDemo={handleResetDemo}
        isResetting={resettingSeed}
      />

      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNotificationsChanged={loadAudit}
      />

      {analyzing && <AiAnalyzingOverlay />}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full space-y-6 fade-in flex-1">
        {/* Breadcrumb & Sub-Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs pb-2 border-b border-[#D5DCE5]">
          <div className="flex items-center gap-1.5 font-medium text-[#475569]">
            <span className="text-[#123B6D] font-bold">Dashboard</span>
            <span>&gt;</span>
            <span className="text-[#123B6D] font-bold">Works MIS</span>
            <span>&gt;</span>
            <span className="font-mono text-[#0F172A] font-bold">{project.project_id}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B]">State: Uttar Pradesh | District: Varanasi</span>
            <button
              onClick={load}
              className="text-[11px] font-bold px-2.5 py-1 rounded bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
            >
              ↻ Refresh MIS View
            </button>
          </div>
        </div>

        {/* Resolved Banner */}
        {resolvedEvidenceResult && (
          <CaseResolvedBanner
            result={resolvedEvidenceResult}
            onDismiss={() => setResolvedEvidenceResult(null)}
          />
        )}

        {/* Intervention Banner */}
        {paymentResult && isHeld && !resolvedEvidenceResult && (
          <InterventionBanner
            result={paymentResult}
            previousRisk={prevRisk}
            onDismiss={() => setPaymentResult(null)}
          />
        )}

        {/* Project Administrative Header Card */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-sm font-extrabold text-[#123B6D] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                  {project.project_id}
                </span>
                <StatusPill status={project.status} />
                {isHeld && !resolvedEvidenceResult && <StatusPill status="HELD_FOR_REVIEW" />}
                {resolvedEvidenceResult && <StatusPill status="APPROVED_FOR_REVIEW" />}
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-[#0A2240] tracking-tight">
                {project.title}
              </h1>
            </div>

            {/* Quick KPI pills */}
            <div className="flex items-center gap-4 bg-[#F8FAFC] p-3 rounded border border-[#E2E8F0] text-xs">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Sanctioned Cost</span>
                <p className="text-sm font-bold text-[#0F172A] font-mono">{fmt(project.sanctioned_amount_inr)}</p>
              </div>
              <div className="w-px h-8 bg-[#CBD5E1]" />
              <div>
                <span className="text-[10px] text-[#64748B] uppercase font-bold">Physical Milestone</span>
                <p className="text-sm font-bold text-[#0F172A] font-mono">
                  {project.latest_progress?.reported_pct ?? 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 text-xs text-[#334155] grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <strong className="text-[#64748B]">Location:</strong> {project.location_text || "Varanasi, UP"}
            </div>
            <div>
              <strong className="text-[#64748B]">Category:</strong> {project.category || "DRINKING_WATER"}
            </div>
            <div>
              <strong className="text-[#64748B]">Implementing Agency:</strong> {project.implementing_agency || "DRDA"}
            </div>
          </div>
        </section>

        {/* 3-Column MIS Info Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* AI Decision Support & Risk Card */}
          <div className="card bg-white border-[#D5DCE5] flex flex-col justify-between">
            <div className="card-header">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
                AI STATUTORY RISK ASSESSMENT
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center my-2">
              <RiskBadge score={shownRisk} size="md" pulse={isHighRisk} />
            </div>
            {shownBreakdown && Object.keys(shownBreakdown).length > 0 && (
              <RiskBreakdownBar breakdown={shownBreakdown} />
            )}
          </div>

          {/* Financial & Compliance MIS */}
          <div className="card bg-white border-[#D5DCE5]">
            <div className="card-header">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
                FINANCIAL ALLOCATION &amp; SANCTION
              </h3>
            </div>
            <div className="space-y-1">
              <InfoRow label="Recommended Amount" value={fmt(project.recommended_amount_inr)} />
              <InfoRow label="Sanctioned Amount"  value={fmt(project.sanctioned_amount_inr)} />
              <InfoRow
                label="Cost Variance"
                value={
                  project.recommended_amount_inr && project.sanctioned_amount_inr
                    ? `+${(((project.sanctioned_amount_inr - project.recommended_amount_inr) / project.recommended_amount_inr) * 100).toFixed(1)}%`
                    : "0%"
                }
              />
              <InfoRow label="Mandatory Public E-Tender" value={project.mandatory_tender ? "Mandatory (Enforced)" : "Exempt (< ₹10L)"} />
              {project.missing_documents && project.missing_documents.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                  <span className="text-[10px] font-bold text-[#B45309] uppercase">Missing Mandatory Documents:</span>
                  <ul className="mt-1 space-y-0.5 text-xs text-[#991B1B]">
                    {project.missing_documents.map((d) => (
                      <li key={d}>• {d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Statutory Milestone Dates */}
          <div className="card bg-white border-[#D5DCE5]">
            <div className="card-header">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
                STATUTORY TIMELINE &amp; SLA
              </h3>
            </div>
            <div className="space-y-1">
              <InfoRow label="Recommendation Date" value={fmtDate(project.recommendation_date)} />
              <InfoRow label="Sanction Order Date" value={fmtDate(project.sanction_date)} />
              <InfoRow label="Target Completion" value={fmtDate(project.completion_date)} />
              <InfoRow label="Last MIS Synchronization" value={fmtDate(project.updated_at)} />
              <InfoRow label="Assigned Parliamentary MP" value="Shri R. K. Singh (Lok Sabha, Varanasi)" />
            </div>
          </div>
        </section>

        {/* Tranche Disbursement History Table */}
        {project.payments.length > 0 && (
          <section className="card bg-white border-[#D5DCE5]">
            <div className="card-header flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
                DISBURSEMENT &amp; TRANCHE RELEASE AUDIT LOG
              </h3>
              <span className="text-[11px] text-[#64748B]">Total Tranches: {project.payments.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Claimed Amount</th>
                    <th>Submission Date</th>
                    <th>Statutory Status</th>
                    <th className="text-right">Risk at Request</th>
                  </tr>
                </thead>
                <tbody>
                  {project.payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td className="font-mono font-bold text-[11px] text-[#123B6D]">{p.payment_id}</td>
                      <td className="font-bold text-xs">{fmt(p.requested_amount_inr)}</td>
                      <td className="text-xs text-[#475569]">{fmtDate(p.request_date)}</td>
                      <td><StatusPill status={p.status} /></td>
                      <td className="text-right font-mono font-bold">
                        {p.ai_risk_score_at_request != null ? (
                          <span
                            className={
                              p.ai_risk_score_at_request >= 70
                                ? "text-[#B3261E]"
                                : p.ai_risk_score_at_request >= 40
                                ? "text-[#B45309]"
                                : "text-[#15803D]"
                            }
                          >
                            {p.ai_risk_score_at_request} / 100
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

        {/* Payment Submission Panel (Only if no held payment active) */}
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

        {/* Case Review Card (When case active) */}
        {activeCase && (
          <section>
            <CaseReviewCard
              caseData={activeCase}
              onReevaluateStart={() => setAnalyzing(true)}
              onEvidenceSubmitted={handleEvidenceSubmitted}
            />
          </section>
        )}

        {/* F17 AI Completion Verification Section */}
        <section className="card bg-white border-[#D5DCE5] p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
                  F17 — AI MULTI-SIGNAL COMPLETION VERIFICATION
                </h3>
              </div>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Synthesizes physical progress records, Sentinel-2 optical satellite delta, perceptual photo hashes (pHash), citizen ground disputes, and payment consistency.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunCompletionVerification}
              disabled={verifyingCompletion}
              className="px-3.5 py-1.5 rounded bg-[#166534] hover:bg-[#14532D] text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {verifyingCompletion ? (
                <>
                  <span className="animate-spin">🔄</span>
                  <span>Synthesizing Signals…</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Run AI Completion Verification</span>
                </>
              )}
            </button>
          </div>

          {completionResult && (
            <div className={`p-4 rounded-lg border text-xs space-y-3 ${completionResult.is_verified ? "bg-[#F0FDF4] border-[#86EFAC]" : "bg-[#FEF2F2] border-[#FECACA]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{completionResult.is_verified ? "🏆" : "🚨"}</span>
                  <div>
                    <h4 className={`font-bold text-sm ${completionResult.is_verified ? "text-[#166534]" : "text-[#991B1B]"}`}>
                      {completionResult.is_verified ? "PROJECT COMPLETION VERIFIED" : "COMPLETION DISPUTED — INSPECTION REQUIRED"}
                    </h4>
                    <p className="text-[10px] text-[#64748B]">{completionResult.message}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Confidence Score</span>
                  <p className={`text-xl font-bold font-mono ${completionResult.is_verified ? "text-[#166534]" : "text-[#991B1B]"}`}>
                    {completionResult.verification_score}/100
                  </p>
                </div>
              </div>

              {/* 5-Signal Breakdown Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2 border-t border-[#E2E8F0]">
                <div className="p-2 rounded bg-white border border-[#E2E8F0] text-center">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">1. Progress History</span>
                  <p className="text-xs font-bold font-mono text-[#0F172A] mt-0.5">
                    {completionResult.signals.physical_progress_score}%
                  </p>
                </div>
                <div className="p-2 rounded bg-white border border-[#E2E8F0] text-center">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">2. Satellite Delta</span>
                  <p className="text-xs font-bold font-mono text-[#0F172A] mt-0.5">
                    {completionResult.signals.satellite_evidence_score}%
                  </p>
                </div>
                <div className="p-2 rounded bg-white border border-[#E2E8F0] text-center">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">3. Photo Authenticity</span>
                  <p className="text-xs font-bold font-mono text-[#0F172A] mt-0.5">
                    {completionResult.signals.perceptual_image_score}%
                  </p>
                </div>
                <div className="p-2 rounded bg-white border border-[#E2E8F0] text-center">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">4. Citizen Feedback</span>
                  <p className="text-xs font-bold font-mono text-[#0F172A] mt-0.5">
                    {completionResult.signals.citizen_feedback_score}%
                  </p>
                </div>
                <div className="p-2 rounded bg-white border border-[#E2E8F0] text-center">
                  <span className="text-[9px] font-bold text-[#64748B] uppercase">5. Financial Audit</span>
                  <p className="text-xs font-bold font-mono text-[#0F172A] mt-0.5">
                    {completionResult.signals.financial_audit_score}%
                  </p>
                </div>
              </div>

              {completionResult.signals.reason_codes.length > 0 && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-[#991B1B] uppercase">Flagged Discrepancy Codes:</span>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {completionResult.signals.reason_codes.map((rc) => (
                      <span key={rc} className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#991B1B] border border-[#FECACA]">
                        {rc}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Audit Trail Section */}
        <section>
          <AuditTrailTimeline
            events={auditEvents}
            loading={loadingAudit}
            onRefresh={loadAudit}
          />
        </section>
      </main>

      <GovernmentFooter />
    </div>
  );
}

