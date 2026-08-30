"use client";

import { useState } from "react";
import { submitPayment } from "@/lib/api";
import type { PaymentSubmitResponse } from "@/lib/types";

interface PaymentPanelProps {
  projectId: string;
  onSuccess: (result: PaymentSubmitResponse, prevRisk: number) => void;
  onAnalyzing: (analyzing: boolean) => void;
  currentRisk: number;
}

const DEMO_AMOUNT = 420000; // ₹4,20,000

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

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
    <div className="card border-[#D5DCE5] bg-white shadow-xs">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">💳</span>
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#0A2240]">
            SUBMIT CONTRACTOR BILL &amp; TRANCHE RELEASE REQUEST
          </h3>
        </div>
        <span className="text-[11px] text-[#64748B] font-mono">
          Implementing Agency: {submittedBy}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Amount */}
          <div className="space-y-1">
            <label
              htmlFor="payment-amount"
              className="text-xs font-bold text-[#334155] uppercase tracking-wide"
            >
              Claimed Amount (INR) <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-sm font-bold">
                ₹
              </span>
              <input
                id="payment-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={1}
                required
                className="w-full pl-7 pr-3 py-2 rounded border border-[#CBD5E1] bg-white text-[#0F172A] text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-[#123B6D] focus:border-[#123B6D]"
              />
            </div>
            <p className="text-[11px] text-[#64748B]">
              Standard milestone demo claim: {fmt(DEMO_AMOUNT)}
            </p>
          </div>

          {/* Submitter ID */}
          <div className="space-y-1">
            <label
              htmlFor="submitted-by"
              className="text-xs font-bold text-[#334155] uppercase tracking-wide"
            >
              Submitting Agency ID <span className="text-red-600">*</span>
            </label>
            <input
              id="submitted-by"
              type="text"
              value={submittedBy}
              onChange={(e) => setSubmittedBy(e.target.value)}
              required
              className="w-full px-3 py-2 rounded border border-[#CBD5E1] bg-white text-[#0F172A] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#123B6D] focus:border-[#123B6D]"
            />
            <p className="text-[11px] text-[#64748B]">
              District Rural Development Agency / IA Code
            </p>
          </div>
        </div>

        {/* Evidence Photo upload */}
        <div className="space-y-1">
          <label
            htmlFor="evidence-photo"
            className="text-xs font-bold text-[#334155] uppercase tracking-wide"
          >
            Mandatory Milestone Geo-tagged Evidence Photo <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center gap-3">
            <label
              htmlFor="evidence-photo"
              className={`flex-1 flex items-center justify-between px-3 py-2 rounded border cursor-pointer text-xs ${
                imageFile
                  ? "border-[#86EFAC] bg-[#F0FDF4] text-[#166534] font-medium"
                  : "border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              <span>{imageFile ? `📎 ${imageFile.name}` : "Attach site progress photograph (JPEG/PNG)..."}</span>
              <span className="px-2 py-0.5 rounded bg-[#E2E8F0] text-[#1E293B] font-bold text-[10px]">
                Browse File
              </span>
            </label>
            {imageFile && (
              <button
                type="button"
                onClick={() => setImageFile(null)}
                className="text-xs text-red-600 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <input
            id="evidence-photo"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            className="sr-only"
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
          <p className="text-[11px] text-[#64748B]">
            Automated pHash computer vision compares image against national database for duplicate detection.
          </p>
        </div>

        {/* Demo trigger toggle */}
        <div className="p-3 rounded bg-[#F8FAFC] border border-[#CBD5E1]">
          <label htmlFor="trigger-demo" className="flex items-start gap-2.5 cursor-pointer">
            <input
              id="trigger-demo"
              type="checkbox"
              checked={triggerDemo}
              onChange={(e) => setTriggerDemo(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#123B6D]"
            />
            <div>
              <p className="text-xs font-bold text-[#0F172A]">
                Deterministic Anomaly Escalation Mode
              </p>
              <p className="text-[11px] text-[#64748B]">
                Executes complete statutory firebreak path (Evaluates Risk 32 → 79, holds payment as HELD_FOR_REVIEW, creates CASE-1042 for DA).
              </p>
            </div>
          </label>
        </div>

        {error && (
          <div className="rounded p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            <strong>Submission Error:</strong> {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          id="submit-payment-btn"
          className="w-full py-2.5 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
        >
          {submitting ? "Processing Automated Compliance Checks…" : "Submit Bill & Execute AI Statutory Scan"}
        </button>
      </form>
    </div>
  );
}
