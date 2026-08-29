"use client";

import { useState } from "react";
import { submitPayment } from "@/lib/api";
import type { PaymentSubmitResponse } from "@/lib/types";

interface PaymentPanelProps {
  projectId: string;
  /** Called with the real API result when submission succeeds */
  onSuccess: (result: PaymentSubmitResponse, prevRisk: number) => void;
  /** Called when submission starts (so parent can show AI overlay) */
  onAnalyzing: (analyzing: boolean) => void;
  /** Current project risk score — captured as "before" value */
  currentRisk: number;
}

const DEMO_AMOUNT = 420000; // ₹4,20,000 — seeded demo payment amount

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Payment submission panel.
 * Connects directly to POST /api/payments.
 * All state transitions are driven by the real backend response.
 */
export default function PaymentPanel({
  projectId,
  onSuccess,
  onAnalyzing,
  currentRisk,
}: PaymentPanelProps) {
  const [amount, setAmount] = useState<number>(DEMO_AMOUNT);
  const [submittedBy, setSubmittedBy] = useState("DRDA-IA");
  const [triggerDemo, setTriggerDemo] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    onAnalyzing(true);

    try {
      const result = await submitPayment({
        project_id: projectId,
        requested_amount_inr: amount,
        submitted_by: submittedBy,
        trigger_demo_scenario: triggerDemo,
        image: imageFile ?? undefined,
      });
      onSuccess(result, currentRisk);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
    } finally {
      setSubmitting(false);
      onAnalyzing(false);
    }
  }

  return (
    <div className="card border-[var(--accent-muted)] bg-[var(--bg-elevated)]">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-base">
          💳
        </div>
        <div>
          <p className="font-semibold text-sm text-[var(--text-primary)]">
            Submit Payment Request
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Triggers live AI risk analysis on the backend
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Amount */}
        <div className="space-y-1.5">
          <label
            htmlFor="payment-amount"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
          >
            Amount (INR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">
              ₹
            </span>
            <input
              id="payment-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              required
              className="w-full pl-7 pr-4 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Demo amount: {fmt(DEMO_AMOUNT)}
          </p>
        </div>

        {/* Submitted by */}
        <div className="space-y-1.5">
          <label
            htmlFor="submitted-by"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
          >
            Submitted By
          </label>
          <input
            id="submitted-by"
            type="text"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            required
            placeholder="e.g. DRDA-IA"
            className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-strong)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        {/* Demo scenario toggle */}
        <label
          htmlFor="trigger-demo"
          className="flex items-start gap-3 cursor-pointer rounded-lg border border-[var(--border-strong)] bg-[var(--bg-base)] p-3 hover:border-[var(--accent)] transition-colors"
        >
          <input
            id="trigger-demo"
            type="checkbox"
            checked={triggerDemo}
            onChange={(e) => setTriggerDemo(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-blue-500"
          />
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              Trigger Demo Scenario
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Enables the deterministic high-risk path on the backend
              (Risk 32 → 79, Payment HELD, Case auto-created)
            </p>
          </div>
        </label>

        {/* Evidence photo upload — required for photo_duplicate detection (pushes risk >= 70) */}
        <div className="space-y-1.5">
          <label
            htmlFor="evidence-photo"
            className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide"
          >
            Evidence Photo
            <span className="ml-1 text-red-400">*</span>
          </label>
          <label
            htmlFor="evidence-photo"
            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
              imageFile
                ? "border-green-600/60 bg-green-950/20"
                : "border-[var(--border-strong)] bg-[var(--bg-base)] hover:border-[var(--accent)]"
            }`}
          >
            <span className="text-lg">{imageFile ? "🖼️" : "📎"}</span>
            <span className="text-sm text-[var(--text-secondary)] truncate">
              {imageFile ? imageFile.name : "Attach site photo (JPEG/PNG)"}
            </span>
            {imageFile && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setImageFile(null); }}
                className="ml-auto text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors shrink-0"
                aria-label="Remove image"
              >
                ✕
              </button>
            )}
          </label>
          <input
            id="evidence-photo"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            className="sr-only"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-[var(--text-muted)]">
            Required for duplicate-photo detection — triggers{" "}
            <span className="text-amber-400 font-semibold">HELD_FOR_REVIEW</span> path.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-800/60 px-4 py-3">
            <p className="text-xs font-semibold text-red-400 mb-0.5">Submission Failed</p>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          id="submit-payment-btn"
          className="w-full py-3 rounded-xl font-semibold text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed text-white transition-all duration-200 hover:shadow-lg hover:shadow-blue-900/30 active:scale-[0.98]"
        >
          {submitting ? "Submitting…" : "Submit Payment & Run AI Analysis"}
        </button>
      </form>
    </div>
  );
}
