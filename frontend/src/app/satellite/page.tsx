"use client";

import { useEffect, useState } from "react";
import {
  getSatelliteAnalysis,
  verifySatelliteProgress,
  resetDemoSeed,
} from "@/lib/api";
import type {
  SatelliteAnalysisResponse,
  SatelliteVerificationResponse,
} from "@/lib/types";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import SatelliteComparisonViewer from "@/components/SatelliteComparisonViewer";
import PhysicalProgressGauge from "@/components/PhysicalProgressGauge";
import SatellitePassTimeline from "@/components/SatellitePassTimeline";
import GovernmentFooter from "@/components/GovernmentFooter";

export default function SatelliteVerificationPage() {
  const [selectedProjectId, setSelectedProjectId] = useState("MPL-2026-1042");
  const [analysis, setAnalysis] = useState<SatelliteAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<SatelliteVerificationResponse | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const data = await getSatelliteAnalysis(selectedProjectId);
        if (!ignore) {
          setAnalysis(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load satellite analysis.");
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedProjectId]);

  async function handleVerify() {
    if (verifying || !analysis) return;
    setVerifying(true);
    setError(null);
    try {
      const result = await verifySatelliteProgress(selectedProjectId);
      setVerificationResult(result);
      const freshAnalysis = await getSatelliteAnalysis(selectedProjectId);
      setAnalysis(freshAnalysis);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Satellite verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      setVerificationResult(null);
      const freshAnalysis = await getSatelliteAnalysis(selectedProjectId);
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
            <span className="text-[#123B6D] font-bold">Physical Execution Oversight</span>
            <span>&gt;</span>
            <span className="font-bold text-[#0F172A]">Satellite Remote Sensing Verification</span>
          </div>

          <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] text-[11px] font-mono font-bold">
            Slice 5A: Sentinel-2 Multi-Temporal Change Detection
          </span>
        </div>

        {/* Overview Banner */}
        <section className="card bg-white border-[#D5DCE5]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-2xl">🛰️</span>
              <div className="space-y-1">
                <h1 className="text-base md:text-lg font-bold text-[#0A2240] uppercase tracking-wide">
                  SATELLITE REMOTE SENSING PHYSICAL PROGRESS VERIFICATION ENGINE
                </h1>
                <p className="text-xs text-[#475569] leading-relaxed max-w-3xl">
                  Automated physical progress verification compares pre-sanction baseline optical imagery (T0)
                  against current Sentinel-2 MSI satellite passes (T1). By analyzing spectral built-up indices (NDBI)
                  and vegetation clearance (NDVI), the AI engine determines actual physical ground execution. When claimed
                  milestone progress exceeds satellite-observed progress by &gt; 20%, an automated physical inquiry case is dispatched.
                </p>
              </div>
            </div>

            {/* Quick Demo Switcher */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId("MPL-2026-1042");
                  setVerificationResult(null);
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded border cursor-pointer ${
                  selectedProjectId === "MPL-2026-1042"
                    ? "bg-[#123B6D] text-white border-[#0A2240]"
                    : "bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                Demo: MPL-2026-1042 (Discrepant)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId("MPL-2026-1035");
                  setVerificationResult(null);
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded border cursor-pointer ${
                  selectedProjectId === "MPL-2026-1035"
                    ? "bg-[#123B6D] text-white border-[#0A2240]"
                    : "bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                }`}
              >
                Demo: MPL-2026-1035 (Consistent)
              </button>
            </div>
          </div>
        </section>

        {/* Verification Result Banner (Post-Verification) */}
        {verificationResult && (
          <section className="space-y-4 slide-down">
            {verificationResult.is_mismatch ? (
              <div className="card border-[#F87171] bg-[#FEF2F2] space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#FECACA] pb-2.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚨</span>
                    <div>
                      <span className="text-[10px] font-bold text-[#B3261E] uppercase tracking-wider">
                        ● STATUTORY PROGRESS MISMATCH DETECTED
                      </span>
                      <h3 className="text-sm font-bold text-[#991B1B]">
                        PHYSICAL FIELD INQUIRY REQUIRED (DISCREPANCY: {verificationResult.mismatch_pct}%)
                      </h3>
                    </div>
                  </div>

                  {verificationResult.case_id && (
                    <span className="font-mono text-xs font-bold text-[#123B6D] bg-white px-2.5 py-1 rounded border border-[#CBD5E1]">
                      Case Assigned: {verificationResult.case_id}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-white border border-[#FECACA]">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Risk Escalation</span>
                    <p className="font-mono font-bold text-[#B3261E] text-sm mt-0.5">
                      {verificationResult.previous_risk_score} → {verificationResult.updated_risk_score} / 100
                    </p>
                    <span className="text-[10px] text-[#991B1B]">Escalated to Critical/Inspection Range</span>
                  </div>

                  <div className="p-2.5 rounded bg-white border border-[#FECACA]">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Project Status</span>
                    <p className="font-bold text-[#B3261E] text-sm mt-0.5">
                      {verificationResult.new_project_status}
                    </p>
                    <span className="text-[10px] text-[#64748B]">Execution phase halted pending inquiry</span>
                  </div>

                  <div className="p-2.5 rounded bg-white border border-[#FECACA]">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase">Assigned Authority</span>
                    <p className="font-bold text-[#0F172A] text-sm mt-0.5">District Authority (DA)</p>
                    <span className="text-[10px] text-[#64748B]">Multi-channel alerts sent (DA &amp; MoSPI)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card border-[#86EFAC] bg-[#F0FDF4] space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#166534] text-sm">
                  <span>✅</span>
                  <span>PHYSICAL EXECUTION PROGRESS VERIFIED VIA SATELLITE</span>
                </div>
                <p className="text-[#334155] pl-6">
                  Sentinel-2 multi-spectral change detection confirms structural execution aligns with claimed progress.
                  Discrepancy delta ({verificationResult.mismatch_pct}%) is within statutory tolerance (&le; 20%).
                </p>
              </div>
            )}
          </section>
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
            {/* 1. Side-by-Side Satellite Pass Imagery Viewer */}
            <SatelliteComparisonViewer
              projectId={analysis.project_id}
              coordinates={analysis.coordinates}
              baselinePass={analysis.baseline_pass}
              currentPass={analysis.current_pass}
              structuralChangeScore={analysis.structural_change_score}
            />

            {/* 2. Physical Progress Comparative Gauge */}
            <PhysicalProgressGauge
              reportedPct={analysis.reported_progress_pct}
              aiEstimatedPct={analysis.ai_estimated_progress_pct}
              mismatchPct={analysis.mismatch_pct}
              isMismatch={analysis.is_mismatch}
              confidenceScore={analysis.confidence_score}
            />

            {/* 3. AI Analysis Summary */}
            <div className="card border-[#D5DCE5] bg-white p-4 space-y-2">
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                AI Remote Sensing Statutory Finding
              </span>
              <p className="text-xs text-[#1E293B] leading-relaxed">
                {analysis.analysis_summary}
              </p>
            </div>

            {/* 4. Action Trigger Button */}
            <div className="card border-[#D5DCE5] bg-[#F8FAFC] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-[#0A2240] uppercase tracking-wide">
                  Execute Statutory AI Remote Sensing Verification
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Records official progress observation, updates compliance metrics, and triggers physical inquiry if Δ &gt; 20%.
                </p>
              </div>

              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying}
                id="btn-verify-satellite"
                className="px-6 py-2.5 rounded bg-[#123B6D] hover:bg-[#0A2240] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs shrink-0"
              >
                {verifying ? "Executing Verification…" : "🛰️ Run Satellite Verification"}
              </button>
            </div>

            {/* 5. Orbital Pass Archive Timeline */}
            <SatellitePassTimeline
              baselinePass={analysis.baseline_pass}
              currentPass={analysis.current_pass}
            />
          </div>
        )}
      </main>

      <GovernmentFooter />
    </div>
  );
}
