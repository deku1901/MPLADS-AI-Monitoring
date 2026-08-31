"use client";

import { useEffect, useState } from "react";
import {
  getCostOverrunAnalysis,
  scanProjectCostOverrun,
  resetDemoSeed,
} from "@/lib/api";
import type {
  CostOverrunAnalysisResponse,
  CostOverrunScanResponse,
} from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import CostOverrunMetricsCard from "@/components/CostOverrunMetricsCard";
import CostOverrunBanner from "@/components/CostOverrunBanner";
import GovernmentFooter from "@/components/GovernmentFooter";

export default function CostOverrunPage() {
  const [selectedProjectId, setSelectedProjectId] = useState("MPL-2026-1042");
  const [analysis, setAnalysis] = useState<CostOverrunAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<CostOverrunScanResponse | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCostOverrunAnalysis(selectedProjectId);
        if (!ignore) {
          setAnalysis(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load cost-overrun analysis.");
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
      const result = await scanProjectCostOverrun(selectedProjectId);
      setScanResult(result);
      const freshAnalysis = await getCostOverrunAnalysis(selectedProjectId);
      setAnalysis(freshAnalysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cost-overrun scan failed.");
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
      const freshAnalysis = await getCostOverrunAnalysis(selectedProjectId);
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
            <span className="text-[#123B6D] font-bold">Cost Monitoring</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Cost Overrun Detection Engine</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[11px] font-mono font-bold">
            Slice 7: Cost Overrun &amp; Budget Trajectory Engine
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl">💰</span>
              <div className="space-y-1">
                <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                  COST OVERRUN DETECTION &amp; BUDGET TRAJECTORY ENGINE
                </h1>
                <p className="text-xs text-[#475569] leading-relaxed max-w-3xl">
                  Evaluates project expenditure trajectories across three critical fiscal milestones: Original Estimate
                  (administrative baseline), Revised Estimate (technical sanction revision), and Cumulative Incurred Expenditure.
                  Detects budget escalations exceeding configurable monitoring thresholds (25.0%) and autonomously initiates District
                  Authority review inquiries before fund exhaustion occurs.
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
                    : "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]"
                }`}
              >
                🔴 Demo: MPL-2026-1042 (+31.25% Escalation)
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
                    : "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]"
                }`}
              >
                🟢 Demo: MPL-2026-1035 (On-Budget Baseline)
              </button>
            </div>
          </div>
        </section>

        {/* Dynamic Risk & Escalation Banner */}
        {scanResult ? (
          <CostOverrunBanner
            overrunStatus={scanResult.overrun_status}
            overrunFlags={scanResult.overrun_flags}
            caseId={scanResult.case_id}
            previousRiskScore={scanResult.previous_risk_score}
            updatedRiskScore={scanResult.updated_risk_score}
            newProjectStatus={scanResult.new_project_status}
            estimateIncreasePct={scanResult.estimate_increase_pct}
            actualVsOriginalPct={scanResult.actual_vs_original_pct}
            recommendedAction={scanResult.recommended_action}
            inspectionTriggered={scanResult.inspection_triggered}
          />
        ) : analysis ? (
          <CostOverrunBanner
            overrunStatus={analysis.overrun_status}
            overrunFlags={analysis.overrun_flags}
            caseId={null}
            previousRiskScore={32}
            updatedRiskScore={analysis.overrun_status !== "WITHIN_BUDGET" ? 78 : 32}
            newProjectStatus={analysis.overrun_status !== "WITHIN_BUDGET" ? "INSPECTION_REQUIRED" : "EXECUTION"}
            estimateIncreasePct={analysis.estimate_increase_pct}
            actualVsOriginalPct={analysis.actual_vs_original_pct}
            recommendedAction={analysis.recommended_action}
            inspectionTriggered={false}
          />
        ) : null}

        {error && (
          <div className="card bg-[#FEF2F2] border-[#FECACA] text-[#991B1B] text-xs font-semibold p-4">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="card bg-white p-12 text-center text-xs text-[#64748B] flex flex-col items-center justify-center gap-2">
            <span className="text-2xl animate-spin">🔄</span>
            <span>Loading cost-overrun telemetry and budget records…</span>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* Project Header Info */}
            <div className="card bg-white border-[#D5DCE5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  Target Infrastructure Work Under Cost Surveillance
                </span>
                <h2 className="text-sm font-bold text-[#0A2240] mt-0.5">
                  {analysis.project_id}: {analysis.project_title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-[#475569] mt-1 flex-wrap">
                  <span>Category: <strong className="text-[#0F172A]">{analysis.category ?? "COMMUNITY_INFRASTRUCTURE"}</strong></span>
                  <span>•</span>
                  <span>Constituency: <strong className="text-[#0F172A]">{analysis.constituency ?? "Varanasi"}</strong></span>
                  <span>•</span>
                  <span>Surveillance Threshold: <strong className="text-[#0F172A]">{analysis.monitoring_threshold_pct}%</strong></span>
                </div>
              </div>

              {/* Action Trigger Button */}
              <button
                type="button"
                onClick={handleScan}
                disabled={scanning}
                className="btn-primary flex items-center gap-2 text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
              >
                <span>{scanning ? "🔄" : "⚡"}</span>
                <span>
                  {scanning
                    ? "Evaluating Cost Trajectory…"
                    : "Execute Cost Overrun AI Scan & Intervene"}
                </span>
              </button>
            </div>

            {/* Core 5-Metric Visual Card */}
            <CostOverrunMetricsCard
              originalEstimateInr={analysis.original_estimate_inr}
              revisedEstimateInr={analysis.revised_estimate_inr}
              actualExpenditureInr={analysis.actual_expenditure_inr}
              estimateIncreaseInr={analysis.estimate_increase_inr}
              estimateIncreasePct={analysis.estimate_increase_pct}
              actualVsOriginalPct={analysis.actual_vs_original_pct}
              actualVsRevisedPct={analysis.actual_vs_revised_pct}
              remainingBalanceInr={analysis.remaining_balance_inr}
              monitoringThresholdPct={analysis.monitoring_threshold_pct}
              overrunStatus={analysis.overrun_status}
              riskLevel={analysis.risk_level}
              overrunFlags={analysis.overrun_flags}
            />

            {/* Narrative AI Summary and Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Summary Card */}
              <div className="card bg-white border-[#D5DCE5] space-y-2">
                <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
                  <span>🤖</span>
                  <h3 className="font-bold text-[#0A2240] uppercase text-xs">
                    AI Budget Trajectory Diagnosis
                  </h3>
                </div>
                <p className="text-[#334155] leading-relaxed">
                  {analysis.analysis_summary}
                </p>
              </div>

              {/* Recommended Action Card */}
              <div className="card bg-white border-[#D5DCE5] space-y-2">
                <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
                  <span>⚖️</span>
                  <h3 className="font-bold text-[#0A2240] uppercase text-xs">
                    Statutory Recommended Action
                  </h3>
                </div>
                <p className="text-[#334155] leading-relaxed">
                  {analysis.recommended_action}
                </p>
                {analysis.overrun_flags.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-[11px] text-[#64748B]">
                    Flags triggering review: <span className="font-mono text-[#991B1B] font-semibold">{analysis.overrun_flags.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>

      <GovernmentFooter />
    </div>
  );
}
