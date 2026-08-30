"use client";

import { useEffect, useState } from "react";
import {
  getDelayAnalysis,
  scanProjectDelay,
  resetDemoSeed,
} from "@/lib/api";
import type {
  DelayAnalysisResponse,
  DelayScanResponse,
} from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import DelayProgressCard from "@/components/DelayProgressCard";
import ProjectTimeline from "@/components/ProjectTimeline";
import DelayRiskBanner from "@/components/DelayRiskBanner";
import GovernmentFooter from "@/components/GovernmentFooter";

export default function DelayMonitoringPage() {
  const [selectedProjectId, setSelectedProjectId] = useState("MPL-2026-1042");
  const [analysis, setAnalysis] = useState<DelayAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<DelayScanResponse | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDelayAnalysis(selectedProjectId);
        if (!ignore) {
          setAnalysis(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load delay analysis.");
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedProjectId]);

  async function handleScan() {
    if (scanning || !analysis) return;
    setScanning(true);
    setError(null);
    try {
      const result = await scanProjectDelay(selectedProjectId);
      setScanResult(result);
      const freshAnalysis = await getDelayAnalysis(selectedProjectId);
      setAnalysis(freshAnalysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Project delay scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      setScanResult(null);
      const freshAnalysis = await getDelayAnalysis(selectedProjectId);
      setAnalysis(freshAnalysis);
    } catch (err) {
      alert("Failed to reset demo: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setResettingSeed(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <HeaderNav
        projectId={selectedProjectId}
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
            <span className="text-[#123B6D] font-bold">Execution Milestones &amp; Timelines</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Project Delay &amp; Stalled Work Detection</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[11px] font-mono font-bold">
            Slice 5B: Timeline Anomaly &amp; Stall Engine
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl">⏳</span>
              <div className="space-y-1">
                <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                  PROJECT DELAY &amp; STALLED WORK INTELLIGENCE ENGINE
                </h1>
                <p className="text-xs text-[#475569] leading-relaxed max-w-3xl">
                  Evaluates project lifecycle duration against sanctioned milestone delivery targets.
                  Calculates elapsed duration percentage, projected linear milestone progress, and discrepancy against
                  latest reported or remote sensing observed physical progress. Automatically detects stalled projects
                  exceeding the statutory 90-day progress hiatus and triggers District Authority intervention.
                </p>
              </div>
            </div>

            {/* Quick Demo Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId("MPL-2026-1042");
                  setScanResult(null);
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded border cursor-pointer ${
                  selectedProjectId === "MPL-2026-1042"
                    ? "bg-[#123B6D] text-white border-[#0A2240]"
                    : "bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                Demo: MPL-2026-1042 (Stalled &gt;90d)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId("MPL-2026-1035");
                  setScanResult(null);
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded border cursor-pointer ${
                  selectedProjectId === "MPL-2026-1035"
                    ? "bg-[#123B6D] text-white border-[#0A2240]"
                    : "bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                Demo: MPL-2026-1035 (On Track)
              </button>
            </div>
          </div>
        </section>

        {/* Scan Result Banner (Post-Scan) */}
        {scanResult && (
          <DelayRiskBanner
            delayStatus={scanResult.delay_status}
            riskLevel={scanResult.risk_level}
            caseId={scanResult.case_id}
            previousRiskScore={scanResult.previous_risk_score}
            updatedRiskScore={scanResult.updated_risk_score}
            newProjectStatus={scanResult.new_project_status}
            progressGapPct={scanResult.progress_gap_pct}
            daysSinceLastProgress={scanResult.days_since_last_progress}
            recommendedAction={scanResult.recommended_action}
            inspectionTriggered={scanResult.inspection_triggered}
          />
        )}

        {/* Loading / Error States */}
        {loading && (
          <div className="space-y-4">
            <div className="skeleton h-48 w-full rounded" />
            <div className="skeleton h-32 w-full rounded" />
          </div>
        )}

        {error && (
          <div className="p-3 rounded bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content when Analysis Loaded */}
        {!loading && analysis && (
          <div className="space-y-6">
            {/* 1. Progress Comparison Card */}
            <DelayProgressCard
              expectedPct={analysis.expected_progress_pct}
              actualPct={analysis.actual_progress_pct}
              progressGapPct={analysis.progress_gap_pct}
              delayStatus={analysis.delay_status}
              riskLevel={analysis.risk_level}
            />

            {/* 2. Project Timeline & Duration Analysis */}
            <ProjectTimeline
              sanctionDate={analysis.sanction_date}
              expectedCompletionDate={analysis.expected_completion_date}
              elapsedDays={analysis.elapsed_days}
              elapsedPct={analysis.elapsed_pct}
              daysSinceLastProgress={analysis.days_since_last_progress}
              delayStatus={analysis.delay_status}
            />

            {/* 3. AI Analysis Summary */}
            <div className="card border-[#D5DCE5] bg-white p-4 space-y-2">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                AI Timeline &amp; Milestone Statutory Finding
              </span>
              <p className="text-xs text-[#1E293B] leading-relaxed">
                {analysis.analysis_summary}
              </p>
              <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex flex-wrap gap-2 text-xs">
                <span className="font-semibold text-[#475569]">Recommended Statutory Action:</span>
                <span className="text-[#0F172A] font-medium">{analysis.recommended_action}</span>
              </div>
            </div>

            {/* 4. Action Trigger Button */}
            <div className="card border-[#D5DCE5] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-[#0A2240] uppercase tracking-wide">
                  Execute Statutory Delay &amp; Stalled Work Scan
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Evaluates project timeline trajectory, recomputes statutory risk scores, and dispatches inquiry cases for severe delays.
                </p>
              </div>

              <button
                type="button"
                onClick={handleScan}
                disabled={scanning}
                id="btn-scan-delay"
                className="px-6 py-2.5 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs shrink-0"
              >
                {scanning ? "Executing Scan…" : "⏳ Run Delay & Stall Scan"}
              </button>
            </div>
          </div>
        )}
      </main>

      <GovernmentFooter />
    </div>
  );
}
