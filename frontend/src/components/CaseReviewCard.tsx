"use client";

import { useState } from "react";
import { submitEvidence } from "@/lib/api";
import type { CaseDetail, EvidenceSubmitResponse } from "@/lib/types";
import EscalationTracker from "@/components/EscalationTracker";

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
    <div className="card border-[#D5DCE5] bg-white space-y-5 shadow-xs">
      {/* Case Header */}
      <div className="card-header flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold font-mono text-[#0A2240] bg-[#E2E8F0] px-2 py-0.5 rounded border border-[#CBD5E1]">
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

        {/* SLA Countdown pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${
            isResolved
              ? "border-[#86EFAC] bg-[#DCFCE7] text-[#166534]"
              : deadline.isUrgent
              ? "border-[#FCA5A5] bg-[#FEE2E2] text-[#991B1B]"
              : "border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]"
          }`}
        >
          <span>⏱️ SLA Window:</span>
          <span>{isResolved ? "Case Resolved" : deadline.text}</span>
        </div>
      </div>

      {/* Case Meta Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0] space-y-0.5">
          <p className="text-[#64748B] uppercase font-bold text-[10px]">Assigned Authority Tier</p>
          <p className="font-bold text-[#0F172A]">
            {caseData.assigned_tier || "DA"} Tier ({caseData.assigned_to_authority_id || "AUTH-DA-01"})
          </p>
        </div>

        <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0] space-y-0.5">
          <p className="text-[#64748B] uppercase font-bold text-[10px]">Risk Score at Creation</p>
          <p className="font-bold font-mono text-[#B3261E]">
            {caseData.risk_score_at_creation ?? "—"} / 100
          </p>
        </div>

        <div className="bg-[#F8FAFC] p-2.5 rounded border border-[#E2E8F0] space-y-0.5">
          <p className="text-[#64748B] uppercase font-bold text-[10px]">Case Initiation Timestamp</p>
          <p className="font-semibold text-[#0F172A]">{formatDate(caseData.created_at)}</p>
        </div>
      </div>

      {/* Escalation Tracker Ladder */}
      <EscalationTracker caseData={caseData} />

      {/* Flagged reasons */}
      {caseData.reason_codes && caseData.reason_codes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">
            Flagged Violation Codes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {caseData.reason_codes.map((code) => (
              <span
                key={code}
                className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]"
              >
                ⚠️ {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Explanation Narrative */}
      {caseData.ai_explanation && (
        <div className="rounded bg-[#EFF6FF] border border-[#BFDBFE] p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D4ED8] uppercase tracking-wide">
            <span>🤖</span>
            <span>AI Automated Statutory Decision-Support Explanation</span>
          </div>
          <p className="text-xs text-[#1E293B] whitespace-pre-line leading-relaxed">
            {caseData.ai_explanation}
          </p>
        </div>
      )}

      {/* Evidence submission history */}
      {caseData.evidence_submissions && caseData.evidence_submissions.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E2E8F0]">
          <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">
            Prior Evidence &amp; Action Log
          </p>
          <div className="space-y-2">
            {caseData.evidence_submissions.map((ev) => (
              <div
                key={ev.evidence_id}
                className="bg-[#F8FAFC] p-3 rounded border border-[#CBD5E1] text-xs space-y-1"
              >
                <div className="flex justify-between items-center text-[#64748B]">
                  <span className="font-mono font-bold text-[#0F172A]">
                    {ev.evidence_id} ({ev.submitted_by})
                  </span>
                  <span>{formatDate(ev.submitted_at)}</span>
                </div>
                {ev.content_text && (
                  <p className="text-[#334155] italic">&quot;{ev.content_text}&quot;</p>
                )}
                {ev.llm_summary && (
                  <p className="text-[#1D4ED8] font-medium">
                    AI Summary: {ev.llm_summary}
                  </p>
                )}
                <div className="text-[11px] text-[#64748B]">
                  Risk Re-evaluation: {ev.risk_score_before} →{" "}
                  <span className="font-bold text-[#15803D]">
                    {ev.risk_score_after}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Form */}
      {!isResolved && (
        <form
          onSubmit={handleEvidenceSubmit}
          className="border-t border-[#E2E8F0] pt-4 space-y-4"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A2240]">
            <span>📝</span>
            <span>SUBMIT AUTHORITY JUSTIFICATION &amp; REVISED SANCTION</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="authority-id" className="text-xs font-bold text-[#334155] uppercase">
                Officer ID / Authority
              </label>
              <input
                id="authority-id"
                type="text"
                value={submitterId}
                onChange={(e) => setSubmitterId(e.target.value)}
                required
                className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] font-medium focus:ring-1 focus:ring-[#123B6D]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="authority-role" className="text-xs font-bold text-[#334155] uppercase">
                Authority Role
              </label>
              <select
                id="authority-role"
                value={submitterRole}
                onChange={(e) => setSubmitterRole(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] font-medium focus:ring-1 focus:ring-[#123B6D]"
              >
                <option value="DA">District Authority (DA)</option>
                <option value="SNA">State Nodal Authority (SNA)</option>
                <option value="MINISTRY">Ministry (MoSPI)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="justification-text" className="text-xs font-bold text-[#334155] uppercase">
              Technical Justification Narrative <span className="text-red-600">*</span>
            </label>
            <textarea
              id="justification-text"
              rows={3}
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
              required
              className="w-full p-2.5 rounded border border-[#CBD5E1] bg-white text-xs text-[#0F172A] leading-relaxed focus:ring-1 focus:ring-[#123B6D]"
            />
          </div>

          {/* Attachment */}
          <div className="space-y-1">
            <label htmlFor="evidence-attachment" className="text-xs font-bold text-[#334155] uppercase">
              Supporting Field Inspection Order / Photo (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="evidence-attachment"
                className={`flex-1 flex items-center justify-between px-3 py-1.5 rounded border cursor-pointer text-xs ${
                  evidenceFile
                    ? "border-[#86EFAC] bg-[#F0FDF4] text-[#166534]"
                    : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                }`}
              >
                <span>{evidenceFile ? `📄 ${evidenceFile.name}` : "Attach field report (JPEG/PNG/PDF)..."}</span>
                <span className="px-2 py-0.5 rounded bg-[#E2E8F0] text-[#1E293B] font-bold text-[10px]">
                  Browse
                </span>
              </label>
              {evidenceFile && (
                <button
                  type="button"
                  onClick={() => setEvidenceFile(null)}
                  className="text-xs text-red-600 hover:underline cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              id="evidence-attachment"
              type="file"
              accept="image/jpeg,image/png,image/jpg,.pdf"
              className="sr-only"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="p-2.5 rounded bg-[#F8FAFC] border border-[#CBD5E1]">
            <label htmlFor="reduce-duplicate-flag" className="flex items-start gap-2 cursor-pointer">
              <input
                id="reduce-duplicate-flag"
                type="checkbox"
                checked={reducesDuplicate}
                onChange={(e) => setReducesDuplicate(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-[#123B6D]"
              />
              <div>
                <p className="text-xs font-bold text-[#0F172A]">
                  Accept field verification as satisfying duplicate &amp; estimate criteria
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Instructs AI engine to recompute composite risk and clear statutory payment hold.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded p-2.5 bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
              <strong>Error:</strong> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            id="submit-evidence-btn"
            className="w-full py-2.5 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
          >
            {submitting ? "Re-Evaluating Statutory Risk…" : "Submit Authority Review & Recompute Risk"}
          </button>
        </form>
      )}
    </div>
  );
}
