"use client";

import { useState } from "react";
import { screenRecommendation, resetDemoSeed } from "@/lib/api";
import type { RecommendationScreenRequest, RecommendationScreenResponse } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import RecommendationForm from "@/components/RecommendationForm";
import DuplicateComparisonCard from "@/components/DuplicateComparisonCard";
import GovernmentFooter from "@/components/GovernmentFooter";

export default function RecommendPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationScreenResponse | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<RecommendationScreenRequest | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  async function handleScreen(data: RecommendationScreenRequest) {
    setError(null);
    setLoading(true);
    setSubmittedRequest(data);
    try {
      const res = await screenRecommendation(data);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Screening request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      setResult(null);
      setSubmittedRequest(null);
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
            <span className="text-[#123B6D] font-bold">Recommendations</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Pre-Sanction AI Duplicate Screening</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[11px] font-mono font-bold">
            Slice 2: SentenceTransformer NLP (≥85% Threshold)
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex items-start gap-3.5">
            <span className="text-2xl">🔎</span>
            <div className="space-y-1">
              <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                PRE-SANCTION DUPLICATE RECOMMENDATION SCREENING MODULE
              </h1>
              <p className="text-xs text-[#475569] leading-relaxed max-w-4xl">
                Every developmental work proposal submitted by a Member of Parliament is automatically evaluated
                by the NLP semantic screening engine against the complete historical database of sanctioned, executing,
                and completed works in the constituency. When semantic similarity meets or exceeds the 85% statutory threshold,
                the system generates an automated duplication warning to prevent double-funding before administrative sanction.
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="p-3 rounded bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            <strong>Screening Error:</strong> {error}
          </div>
        )}

        {/* Recommendation Input Form */}
        <section>
          <RecommendationForm onSubmit={handleScreen} loading={loading} />
        </section>

        {/* Screening Result & Duplicate Comparison */}
        {result && submittedRequest && (
          <section>
            <DuplicateComparisonCard result={result} proposed={submittedRequest} />
          </section>
        )}
      </main>

      <GovernmentFooter />
    </div>
  );
}
