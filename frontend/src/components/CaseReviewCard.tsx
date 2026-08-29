"use client";

import { useState } from "react";
import { submitEvidence } from "@/lib/api";
import type { CaseDetail, EvidenceSubmitResponse } from "@/lib/types";

interface CaseReviewCardProps {
  caseData: CaseDetail;
  onEvidenceSubmitted: (result: EvidenceSubmitResponse) => void;
  onReevaluateStart?: () => void;
}

const DEFAULT_JUSTIFICATION =
  "Site inspection conducted by Executive Engineer (DRDA) on 2026-06-05. Verified distinct physical location (Lat 25.352, Lon 82.951) with separate civil foundation from earlier 2024 drinking water project. Cost variance justified due to addition of 10,000L overhead distribution tank and solar RO treatment unit as per revised technical estimate.";

function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDeadlineCountdown(deadlineStr: string | null | undefined): {
  text: string;
  isUrgent: boolean;
} {
  if (!deadlineStr) return { text: "No deadline", isUrgent: false };
  const diffMs = new Date(deadlineStr).getTime() - Date.now();
  if (diffMs <= 0) {
    return { text: "EXPIRED (SLA BREACH)", isUrgent: true };
  }
  const minutes = Math.floor(diffMs / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return { text: `${hours}h ${minutes % 60}m remaining`, isUrgent: hours < 2 };
  }
  return {
    text: `${minutes}m ${seconds}s remaining`,
    isUrgent: true,
  };
}

export default function CaseReviewCard({
  caseData,
  onEvidenceSubmitted,
  onReevaluateStart,
}: CaseReviewCardProps) {
  const [submitterId, setSubmitterId] = useState(
    caseData.assigned_to_authority_id || "AUTH-DA-01"
  );
  const [submitterRole, setSubmitterRole] = useState(
    caseData.assigned_tier || "DA"
  );
  const [justificationText, setJustificationText] = useState(DEFAULT_JUSTIFICATION);
  const [reducesDuplicate, setReducesDuplicate] = useState(true);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadline = formatDeadlineCountdown(caseData.response_deadline);
  const isResolved = caseData.status === "RESOLVED";

  async function handleEvidenceSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || isResolved) return;

    setError(null);
    setSubmitting(true);
    onReevaluateStart?.();

    try {
      const res = await submitEvidence(caseData.case_id, {
        submitted_by: submitterId,
        submitted_role: submitterRole,
        content_type: evidenceFile ? "IMAGE" : "TEXT",
        content_text: justificationText,
        justification_reduces_duplicate: reducesDuplicate,
        image: evidenceFile ?? undefined,
      });

      onEvidenceSubmitted(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Evidence submission failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card border-amber-500/40 bg-[var(--bg-elevated)] space-y-6 slide-down">
      {/* ── Case Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-mono text-amber-400">
              {caseData.case_id}
            </span>
            <span
              className={`pill ${
                isResolved
                  ? "pill-approved"
                  : caseData.status.includes("ESCALATED")
                  ? "pill-held"
                  : "pill-accent"
              }`}
            >
              {caseData.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Project: <span className="font-mono text-slate-300">{caseData.project_id}</span>
          </p>
        </div>

        {/* SLA Countdown pill */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
            isResolved
              ? "border-green-800/40 bg-green-950/30 text-green-400"
              : deadline.isUrgent
              ? "border-red-800/60 bg-red-950/40 text-red-300 animate-pulse"
              : "border-amber-800/50 bg-amber-950/30 text-amber-300"
          }`}
        >
          <span>⏱️ SLA Response Window:</span>
          <span>{isResolved ? "Case Resolved" : deadline.text}</span>
        </div>
      </div>

      {/* ── Case Meta Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-strong)] space-y-1">
          <p className="text-[var(--text-muted)] uppercase tracking-wide font-semibold">
            Assigned Authority Tier
          </p>
          <p className="text-sm font-bold text-slate-200">
            {caseData.assigned_tier || "DA"} Tier ({caseData.assigned_to_authority_id || "AUTH-DA-01"})
          </p>
        </div>

        <div className="bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-strong)] space-y-1">
          <p className="text-[var(--text-muted)] uppercase tracking-wide font-semibold">
            Risk at Creation
          </p>
          <p className="text-sm font-bold text-red-400 tabular-nums">
            {caseData.risk_score_at_creation ?? "—"} / 100
          </p>
        </div>

        <div className="bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-strong)] space-y-1">
          <p className="text-[var(--text-muted)] uppercase tracking-wide font-semibold">
            Created At
          </p>
          <p className="text-sm text-slate-200">
            {formatDate(caseData.created_at)}
          </p>
        </div>
      </div>

      {/* ── Reason Codes ── */}
      {caseData.reason_codes && caseData.reason_codes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Flagged Anomaly Triggers
          </p>
          <div className="flex flex-wrap gap-2">
            {caseData.reason_codes.map((code) => (
              <span
                key={code}
                className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-red-950/60 text-red-300 border border-red-800/50"
              >
                ⚠️ {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Explanation Narrative ── */}
      {caseData.ai_explanation && (
        <div className="rounded-lg bg-blue-950/30 border border-blue-800/40 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300 uppercase tracking-wide">
            <span>🤖</span>
            <span>AI Automated Case Explanation</span>
          </div>
          <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {caseData.ai_explanation}
          </p>
        </div>
      )}

      {/* ── Prior Evidence History ── */}
      {caseData.evidence_submissions && caseData.evidence_submissions.length > 0 && (
        <div className="space-y-3 border-t border-[var(--border)] pt-4">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            Evidence Submission History
          </p>
          <div className="space-y-2">
            {caseData.evidence_submissions.map((ev) => (
              <div
                key={ev.evidence_id}
                className="bg-[var(--bg-base)] p-3 rounded-lg border border-[var(--border-strong)] text-xs space-y-1"
              >
                <div className="flex justify-between items-center text-[var(--text-muted)]">
                  <span className="font-mono font-semibold text-slate-300">
                    {ev.evidence_id} by {ev.submitted_by}
                  </span>
                  <span>{formatDate(ev.submitted_at)}</span>
                </div>
                {ev.content_text && (
                  <p className="text-slate-300 italic">{ev.content_text}</p>
                )}
                {ev.llm_summary && (
                  <p className="text-blue-300 font-medium">
                    AI Summary: {ev.llm_summary}
                  </p>
                )}
                <div className="text-[11px] text-[var(--text-muted)]">
                  Risk Re-evaluation: {ev.risk_score_before} →{" "}
                  <span className="font-bold text-green-400">
                    {ev.risk_score_after}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Evidence Submission Form (Only if not already resolved) ── */}
      {!isResolved && (
        <form
          onSubmit={handleEvidenceSubmit}
          className="border-t border-[var(--border)] pt-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <span>📝</span>
            <span>Submit Authority Justification / Evidence</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            As the assigned authority, submit technical justification and supporting
            documentation to trigger an automated AI re-evaluation and risk reduction.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="authority-id"
                className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
              >
                Authority ID
              </label>
              <input
                id="authority-id"
                type="text"
                value={submitterId}
                onChange={(e) => setSubmitterId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="authority-role"
                className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
              >
                Authority Role
              </label>
              <select
                id="authority-role"
                value={submitterRole}
                onChange={(e) => setSubmitterRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="DA">District Authority (DA)</option>
                <option value="SNA">State Nodal Authority (SNA)</option>
                <option value="MINISTRY">Ministry (MoSPI)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="justification-text"
              className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
            >
              Technical Justification Narrative
            </label>
            <textarea
              id="justification-text"
              rows={4}
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
              placeholder="Enter site verification details, geo-location confirmation, revised sanction justification..."
            />
          </div>

          {/* Optional Attachment */}
          <div className="space-y-1.5">
            <label
              htmlFor="evidence-attachment"
              className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
            >
              Attach Inspection Report / Supporting Image (Optional)
            </label>
            <label
              htmlFor="evidence-attachment"
              className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                evidenceFile
                  ? "border-green-600/60 bg-green-950/20"
                  : "border-[var(--border-strong)] bg-[var(--bg-base)] hover:border-blue-500"
              }`}
            >
              <span className="text-lg">{evidenceFile ? "📄" : "📎"}</span>
              <span className="text-sm text-[var(--text-secondary)] truncate">
                {evidenceFile ? evidenceFile.name : "Attach site inspection document or photo (JPEG/PNG)"}
              </span>
              {evidenceFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setEvidenceFile(null);
                  }}
                  className="ml-auto text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              )}
            </label>
            <input
              id="evidence-attachment"
              type="file"
              accept="image/jpeg,image/png,image/jpg,.pdf"
              className="sr-only"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Reduce Duplicate Signal Flag */}
          <label
            htmlFor="reduce-duplicate-flag"
            className="flex items-start gap-3 cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--bg-base)] p-3 hover:border-blue-500 transition-colors"
          >
            <input
              id="reduce-duplicate-flag"
              type="checkbox"
              checked={reducesDuplicate}
              onChange={(e) => setReducesDuplicate(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-blue-500"
            />
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Accept technical justification as addressing duplicate/cost flags
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Instructs AI re-evaluation engine to recalculate risk taking verified site differences into account.
              </p>
            </div>
          </label>

          {error && (
            <div className="rounded-lg bg-red-950/50 border border-red-800/60 px-4 py-3 text-xs text-red-300">
              <span className="font-semibold text-red-400">Error:</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            id="submit-evidence-btn"
            className="w-full py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-all duration-200 shadow-lg shadow-blue-950/40"
          >
            {submitting ? "Submitting & Re-evaluating AI Risk…" : "Submit Justification & Trigger AI Re-evaluation"}
          </button>
        </form>
      )}
    </div>
  );
}
