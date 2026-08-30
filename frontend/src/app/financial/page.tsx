"use client";

import { useEffect, useState } from "react";
import {
  getFinancialAnalysis,
  scanProjectFinancials,
  resetDemoSeed,
} from "@/lib/api";
import type {
  FinancialAnalysisResponse,
  FinancialScanResponse,
} from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import FinancialMetricsCard from "@/components/FinancialMetricsCard";
import PaymentHistoryTable from "@/components/PaymentHistoryTable";
import FinancialRiskBanner from "@/components/FinancialRiskBanner";
import GovernmentFooter from "@/components/GovernmentFooter";

export default function FinancialAnalyticsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState("MPL-2026-1042");
  const [analysis, setAnalysis] = useState<FinancialAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<FinancialScanResponse | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFinancialAnalysis(selectedProjectId);
        if (!ignore) {
          setAnalysis(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load financial analysis.");
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
      const result = await scanProjectFinancials(selectedProjectId);
      setScanResult(result);
      const freshAnalysis = await getFinancialAnalysis(selectedProjectId);
      setAnalysis(freshAnalysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Financial scan failed.");
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
      const freshAnalysis = await getFinancialAnalysis(selectedProjectId);
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
            <span className="text-[#123B6D] font-bold">Financial Oversight</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Expenditure Analytics &amp; Fund Utilization</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[11px] font-mono font-bold">
            Slice 6: Fiscal Anomaly &amp; Utilization Engine
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl">📈</span>
              <div className="space-y-1">
                <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                  EXPENDITURE &amp; FINANCIAL UTILIZATION ANALYTICS ENGINE
                </h1>
                <p className="text-xs text-[#475569] leading-relaxed max-w-3xl">
                  Performs real-time fiscal auditing across MPLADS sanction allocations, milestone payment disbursements,
                  and expenditure-to-progress trajectories. Identifies abnormal cost escalations exceeding the statutory 25%
                  variance threshold, front-loading risks, and unspent balances to ensure complete financial integrity.
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
                Demo: MPL-2026-1042 (+62.5% Variance)
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
                Demo: MPL-2026-1035 (On Budget)
              </button>
            </div>
          </div>
        </section>

        {/* Scan Result Banner (Post-Scan) */}
        {scanResult && (
          <FinancialRiskBanner
            healthRating={scanResult.financial_health_rating}
            financialFlags={scanResult.financial_risk_flags}
            caseId={scanResult.case_id}
            previousRiskScore={scanResult.previous_risk_score}
            updatedRiskScore={scanResult.updated_risk_score}
            newProjectStatus={scanResult.new_project_status}
            costVariancePct={scanResult.cost_variance_pct}
            fundUtilizationPct={scanResult.fund_utilization_pct}
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
            {/* 1. Financial Overview Metrics Card */}
            <FinancialMetricsCard
              recommendedInr={analysis.recommended_amount_inr}
              sanctionedInr={analysis.sanctioned_amount_inr}
              costVarianceInr={analysis.cost_variance_inr}
              costVariancePct={analysis.cost_variance_pct}
              totalReleasedInr={analysis.total_released_inr}
              totalPendingInr={analysis.total_pending_inr}
              unreleasedBalanceInr={analysis.unreleased_balance_inr}
              fundUtilizationPct={analysis.fund_utilization_pct}
              expenditureToProgressRatio={analysis.expenditure_to_progress_ratio}
              healthRating={analysis.financial_health_rating}
            />

            {/* 2. AI Statutory Fiscal Finding */}
            <div className="card border-[#D5DCE5] bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                  AI Financial &amp; Expenditure Statutory Finding
                </span>
                <span className="text-[11px] font-mono text-[#0369A1]">
                  ML Anomaly Score: {(analysis.anomaly_score * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-[#1E293B] leading-relaxed">
                {analysis.analysis_summary}
              </p>
              <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex flex-wrap gap-2 text-xs">
                <span className="font-semibold text-[#475569]">Recommended Fiscal Directive:</span>
                <span className="text-[#0F172A] font-medium">{analysis.recommended_action}</span>
              </div>
            </div>

            {/* 3. Action Trigger Button */}
            <div className="card border-[#D5DCE5] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-[#0A2240] uppercase tracking-wide">
                  Execute Statutory Financial &amp; Expenditure Audit Scan
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Re-evaluates fiscal allocations, calculates risk signals, and enforces milestone payment freezes if variance exceeds statutory guidelines.
                </p>
              </div>

              <button
                type="button"
                onClick={handleScan}
                disabled={scanning}
                id="btn-scan-financial"
                className="px-6 py-2.5 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs shrink-0"
              >
                {scanning ? "Auditing Expenditure…" : "📈 Run Financial Audit Scan"}
              </button>
            </div>

            {/* 4. Payment History Table */}
            <PaymentHistoryTable
              payments={analysis.payments}
              sanctionedAmountInr={analysis.sanctioned_amount_inr}
            />
          </div>
        )}
      </main>

      <GovernmentFooter />
    </div>
  );
}
