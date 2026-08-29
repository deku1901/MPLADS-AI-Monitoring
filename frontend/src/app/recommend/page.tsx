"use client";

import { useState } from "react";
import { screenRecommendation, resetDemoSeed } from "@/lib/api";
import type { RecommendationScreenRequest, RecommendationScreenResponse } from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import RecommendationForm from "@/components/RecommendationForm";
import DuplicateComparisonCard from "@/components/DuplicateComparisonCard";

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
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2 uppercase tracking-widest">
            <span className="text-[var(--accent)] font-bold">MP Recommendations</span>
            <span className="text-[var(--border-strong)]">›</span>
            <span className="text-[var(--text-primary)]">Pre-Sanction AI Duplicate Screening</span>
          </div>

          <span className="px-2.5 py-1 rounded bg-blue-950/60 text-blue-300 border border-blue-800 text-[11px] font-mono">
            Vertical Slice 2: NLP Similarity
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-[var(--bg-elevated)] border-[var(--border-strong)]">
          <div className="flex items-start gap-4">
            <span className="text-3xl">🤖</span>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                Pre-Sanction Recommendation Screening Engine
              </h1>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                Every newly proposed MP developmental work undergoes NLP semantic scanning against
                all sanctioned, executing, and completed works in the constituency. If semantic
                similarity $\ge$ 85%, the system raises an automated duplicate alert before financial sanction.
              </p>
            </div>
          </div>
        </section>

        {/* Error Callout */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-300">
            <span className="font-semibold text-red-400">Screening Error:</span> {error}
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
    </>
  );
}
