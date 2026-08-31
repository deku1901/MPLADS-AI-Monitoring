"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HeaderNav from "@/components/HeaderNav";
import NotificationDrawer from "@/components/NotificationDrawer";
import GovernmentFooter from "@/components/GovernmentFooter";
import EscalationTracker from "@/components/EscalationTracker";
import {
  getOpenCases,
  simulateNoResponse,
  submitEvidence,
  submitPayment,
  resetDemoSeed,
  getCaseDetails,
} from "@/lib/api";
import type {
  OpenCasesResponse,
  CaseDetail,
  SimulateNoResponseResponse,
} from "@/lib/types";

function formatRemaining(seconds: number | null | undefined): {
  text: string;
  isUrgent: boolean;
  isOverdue: boolean;
} {
  if (seconds === null || seconds === undefined) {
    return { text: "No SLA timer", isUrgent: false, isOverdue: false };
  }
  if (seconds < 0) {
    const overdueSecs = Math.abs(seconds);
    const m = Math.floor(overdueSecs / 60);
    const s = overdueSecs % 60;
    return {
      text: `OVERDUE by ${m}m ${s}s (SLA BREACH)`,
      isUrgent: true,
      isOverdue: true,
    };
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const h = Math.floor(m / 60);
  if (h > 0) {
    return {
      text: `${h}h ${m % 60}m ${s}s remaining`,
      isUrgent: h < 2,
      isOverdue: false,
    };
  }
  return {
    text: `${m}m ${s}s remaining`,
    isUrgent: true,
    isOverdue: false,
  };
}

export default function EscalationPage() {
  const [data, setData] = useState<OpenCasesResponse | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [resettingSeed, setResettingSeed] = useState(false);

  // Local live countdown ticks every 1 second
  const [countdownOffsets, setCountdownOffsets] = useState<Record<string, number>>({});

  async function fetchCases(preserveSelected = true) {
    try {
      setLoading(true);
      const res = await getOpenCases();
      setData(res);

      // Initialize countdown offsets
      const initialOffsets: Record<string, number> = {};
      res.open_cases.forEach((c) => {
        if (c.time_remaining_seconds !== null && c.time_remaining_seconds !== undefined) {
          initialOffsets[c.case_id] = c.time_remaining_seconds;
        }
      });
      setCountdownOffsets(initialOffsets);

      if (res.open_cases.length > 0) {
        const nextId = preserveSelected && selectedCaseId
          ? selectedCaseId
          : res.open_cases[0].case_id;
        setSelectedCaseId(nextId);
        try {
          const detail = await getCaseDetails(nextId);
          setSelectedCaseDetail(detail);
        } catch {
          // ignore
        }
      } else {
        setSelectedCaseId(null);
        setSelectedCaseDetail(null);
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load open cases",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function loadInitial() {
      try {
        setLoading(true);
        const res = await getOpenCases();
        if (!ignore) {
          setData(res);
          const initialOffsets: Record<string, number> = {};
          res.open_cases.forEach((c) => {
            if (c.time_remaining_seconds !== null && c.time_remaining_seconds !== undefined) {
              initialOffsets[c.case_id] = c.time_remaining_seconds;
            }
          });
          setCountdownOffsets(initialOffsets);

          if (res.open_cases.length > 0) {
            const firstId = res.open_cases[0].case_id;
            setSelectedCaseId(firstId);
            try {
              const detail = await getCaseDetails(firstId);
              if (!ignore) setSelectedCaseDetail(detail);
            } catch {
              // ignore
            }
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setFeedbackMessage({
            type: "error",
            text: err instanceof Error ? err.message : "Failed to load open cases",
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  // Tick down every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownOffsets((prev) => {
        const updated: Record<string, number> = {};
        Object.entries(prev).forEach(([id, secs]) => {
          updated[id] = secs - 1;
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleSelectCase(caseId: string) {
    setSelectedCaseId(caseId);
    try {
      const detail = await getCaseDetails(caseId);
      setSelectedCaseDetail(detail);
    } catch {
      // ignore
    }
  }

  async function handleSimulateNoResponse() {
    if (!selectedCaseId || actionLoading) return;
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res: SimulateNoResponseResponse = await simulateNoResponse(selectedCaseId);
      setFeedbackMessage({
        type: res.at_maximum_tier ? "warning" : "error",
        text: `⚡ ESCALATION TRIGGERED: ${res.message}`,
      });
      await fetchCases(true);
      if (selectedCaseId) {
        const freshDetail = await getCaseDetails(selectedCaseId);
        setSelectedCaseDetail(freshDetail);
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Escalation trigger failed",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSimulateAuthorityResponse() {
    if (!selectedCaseId || actionLoading) return;
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const caseItem = data?.open_cases.find((c) => c.case_id === selectedCaseId);
      const tier = caseItem?.assigned_tier || "DA";
      const authorityId = tier === "MINISTRY"
        ? "AUTH-MOSPI-01"
        : tier === "SNA"
        ? "AUTH-SNA-01"
        : "AUTH-DA-01";

      const res = await submitEvidence(selectedCaseId, {
        submitted_by: authorityId,
        submitted_role: tier,
        content_type: "TEXT",
        content_text: `Official statutory justification submitted by ${tier} (${authorityId}). Verified site measurements and technical civil documentation. Risk resolved.`,
        justification_reduces_duplicate: true,
      });

      setFeedbackMessage({
        type: "success",
        text: `✓ AUTHORITY RESPONSE RECORDED: Case ${selectedCaseId} resolved (Risk: ${res.risk_before} → ${res.risk_after}). Status: ${res.case_status}.`,
      });

      await fetchCases(false);
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Authority response submission failed",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTriggerDemoPaymentHold() {
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      const res = await submitPayment({
        project_id: "MPL-2026-1042",
        requested_amount_inr: 420000,
        submitted_by: "DRDA-IA",
        trigger_demo_scenario: true,
      });
      setFeedbackMessage({
        type: "warning",
        text: `🚨 Payment Hold Triggered: Case ${res.case_id} auto-created with Risk ${res.risk_score}/100. Accountability clock started.`,
      });
      await fetchCases(false);
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to trigger payment hold",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResetDemo() {
    if (resettingSeed) return;
    setResettingSeed(true);
    try {
      await resetDemoSeed();
      setFeedbackMessage({
        type: "success",
        text: "Database reset to baseline state. Demo scenario ready.",
      });
      await fetchCases(false);
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Reset failed",
      });
    } finally {
      setResettingSeed(false);
    }
  }

  const selectedCase = data?.open_cases.find((c) => c.case_id === selectedCaseId);
  const remainingSecs = selectedCaseId ? countdownOffsets[selectedCaseId] : null;
  const countdown = formatRemaining(remainingSecs);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9]">
      <HeaderNav
        projectId={selectedCase?.project_id || "MPL-2026-1042"}
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
          <div className="flex items-center gap-1.5 text-[#64748B]">
            <Link href="/dashboard" className="hover:underline text-[#1B365D]">
              Command Center
            </Link>
            <span>/</span>
            <span className="font-semibold text-[#0A2240]">
              Accountability Clock & Multi-Tier Escalation
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></span>
              Autonomous SLA Engine Active
            </span>
            <button
              onClick={() => fetchCases(true)}
              className="px-2.5 py-1 text-xs border border-[#CBD5E1] rounded hover:bg-white text-[#334155]"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-[#0A2240] text-white p-5 rounded-lg border border-[#1E3A8A] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">⏱️</span>
              <h1 className="text-lg font-bold tracking-tight">
                Statutory Accountability Clock & Multi-Tier Escalation
              </h1>
            </div>
            <p className="text-xs text-[#CBD5E1] max-w-3xl leading-relaxed">
              Enforces statutory response deadlines across administrative tiers. When responsible authorities fail to act within SLA windows, cases automatically trigger reminders, escalate to higher authorities (District Authority → State Nodal Authority → Ministry/MoSPI), and register immutable audit entries.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleTriggerDemoPaymentHold}
              disabled={actionLoading}
              className="px-3.5 py-2 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>⚡</span> Trigger High-Risk Payment Hold
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-3.5 rounded border text-xs font-medium flex items-center justify-between gap-2 transition-all ${
              feedbackMessage.type === "success"
                ? "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
                : feedbackMessage.type === "warning"
                ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
                : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Telemetry KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white border border-[#CBD5E1] p-3.5 rounded shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
              Active Cases
            </span>
            <span className="text-2xl font-black text-[#0A2240] mt-1 block">
              {data?.total_open ?? 0}
            </span>
            <span className="text-[10px] text-[#64748B]">Pending resolution</span>
          </div>

          <div className="bg-white border border-[#FECACA] p-3.5 rounded shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#991B1B] tracking-wider block">
              SLA Overdue
            </span>
            <span className="text-2xl font-black text-[#B3261E] mt-1 block">
              {data?.overdue_count ?? 0}
            </span>
            <span className="text-[10px] text-[#991B1B]">Breached deadlines</span>
          </div>

          <div className="bg-white border border-[#CBD5E1] p-3.5 rounded shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#1E3A8A] tracking-wider block">
              Tier 1: DA Tier
            </span>
            <span className="text-2xl font-black text-[#1E3A8A] mt-1 block">
              {data?.by_tier?.DA ?? 0}
            </span>
            <span className="text-[10px] text-[#64748B]">District Collector SLA</span>
          </div>

          <div className="bg-white border border-[#CBD5E1] p-3.5 rounded shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#B45309] tracking-wider block">
              Tier 2: SNA Tier
            </span>
            <span className="text-2xl font-black text-[#B45309] mt-1 block">
              {data?.by_tier?.SNA ?? 0}
            </span>
            <span className="text-[10px] text-[#64748B]">State Planning Dept SLA</span>
          </div>

          <div className="bg-white border border-[#CBD5E1] p-3.5 rounded shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-[#7C2D12] tracking-wider block">
              Tier 3: MoSPI Tier
            </span>
            <span className="text-2xl font-black text-[#7C2D12] mt-1 block">
              {data?.by_tier?.MINISTRY ?? 0}
            </span>
            <span className="text-[10px] text-[#64748B]">Central Ministry SLA</span>
          </div>
        </div>

        {/* Main Grid: Cases List & Live Clock Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Active Cases List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A2240]">
                Active Accountability Inquiries ({data?.open_cases.length ?? 0})
              </h2>
            </div>

            {loading && !data && (
              <div className="p-8 text-center bg-white border border-[#CBD5E1] rounded text-xs text-[#64748B]">
                Loading active cases...
              </div>
            )}

            {!loading && (!data?.open_cases || data.open_cases.length === 0) && (
              <div className="bg-white border border-[#CBD5E1] rounded p-6 text-center space-y-3 shadow-2xs">
                <span className="text-3xl block">🛡️</span>
                <p className="text-sm font-bold text-[#0A2240]">All Cases Resolved</p>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  No active intervention inquiries pending authority action. Click below to trigger a high-risk payment hold demo.
                </p>
                <button
                  onClick={handleTriggerDemoPaymentHold}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-[#0A2240] hover:bg-[#1E3A8A] text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                >
                  Trigger High-Risk Payment Demo
                </button>
              </div>
            )}

            {data?.open_cases.map((c) => {
              const isSelected = c.case_id === selectedCaseId;
              const remaining = countdownOffsets[c.case_id];
              const clock = formatRemaining(remaining);
              const isOverdue = remaining !== null && remaining !== undefined && remaining < 0;

              return (
                <div
                  key={c.case_id}
                  onClick={() => handleSelectCase(c.case_id)}
                  className={`p-3.5 rounded border transition-all cursor-pointer shadow-2xs space-y-2 ${
                    isSelected
                      ? "bg-[#EFF6FF] border-[#3B82F6] ring-1 ring-[#3B82F6]"
                      : isOverdue
                      ? "bg-[#FEF2F2] border-[#FECACA] hover:border-[#F87171]"
                      : "bg-white border-[#CBD5E1] hover:border-[#94A3B8]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#0A2240]">{c.case_id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.assigned_tier === "MINISTRY"
                          ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                          : c.assigned_tier === "SNA"
                          ? "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]"
                          : "bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]"
                      }`}
                    >
                      Tier: {c.assigned_tier}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#0F172A] line-clamp-1">
                    {c.project_title || c.project_id}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-black/5">
                    <span className="font-mono font-semibold text-[#B3261E]">
                      Risk: {c.risk_score_at_creation}/100
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        clock.isOverdue ? "text-[#B3261E]" : "text-[#1E40AF]"
                      }`}
                    >
                      {clock.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Interactive Accountability Clock Card (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedCase ? (
              <div className="bg-white border border-[#CBD5E1] rounded-lg shadow-sm p-5 space-y-5">
                {/* Header & Case ID */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#0A2240]">
                        Accountability Enforcement: {selectedCase.case_id}
                      </h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                        {selectedCase.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Project: <span className="font-semibold text-[#0A2240]">{selectedCase.project_id}</span> ({selectedCase.project_title})
                    </p>
                  </div>
                  <Link
                    href={`/projects/${selectedCase.project_id}`}
                    className="text-xs text-[#1E40AF] hover:underline font-semibold"
                  >
                    View Project Dossier ↗
                  </Link>
                </div>

                {/* Live Countdown Display */}
                <div
                  className={`p-4 rounded-lg border text-center space-y-1 ${
                    countdown.isOverdue
                      ? "bg-[#FEF2F2] border-[#F87171]"
                      : countdown.isUrgent
                      ? "bg-[#FFFBEB] border-[#FCD34D]"
                      : "bg-[#F0FDF4] border-[#86EFAC]"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Statutory Authority Response Deadline Countdown
                  </span>
                  <p
                    className={`text-2xl md:text-3xl font-black font-mono tracking-tight ${
                      countdown.isOverdue
                        ? "text-[#B3261E] animate-pulse"
                        : countdown.isUrgent
                        ? "text-[#B45309]"
                        : "text-[#15803D]"
                    }`}
                  >
                    {countdown.text}
                  </p>
                  <span className="text-[10px] text-[#64748B]">
                    Current Enforcement Tier:{" "}
                    <span className="font-bold text-[#0A2240]">
                      {selectedCase.assigned_tier} (Tier {selectedCase.assigned_tier === "MINISTRY" ? 3 : selectedCase.assigned_tier === "SNA" ? 2 : 1})
                    </span>
                  </span>
                </div>

                {/* Multi-Tier Escalation Ladder */}
                {selectedCaseDetail && (
                  <EscalationTracker caseData={selectedCaseDetail} />
                )}

                {/* AI Explanation of Risk Case */}
                {selectedCase.ai_explanation && (
                  <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded p-3 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-[#0A2240] uppercase tracking-wider">
                      AI Anomaly Case Explanation
                    </span>
                    <p className="text-[#334155] leading-relaxed">
                      {selectedCase.ai_explanation}
                    </p>
                  </div>
                )}

                {/* Demo Control Actions */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] block">
                    Autonomous Accountability Simulation Controls
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleSimulateNoResponse}
                      disabled={actionLoading || selectedCase.assigned_tier === "MINISTRY"}
                      className="px-4 py-2.5 bg-[#B3261E] hover:bg-[#991B1B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <span>⚡</span> Simulate: Authority Does Not Respond (Escalate)
                    </button>

                    <button
                      onClick={handleSimulateAuthorityResponse}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <span>✓</span> Simulate: Authority Responds (Resolve Case)
                    </button>
                  </div>
                  <p className="text-[10px] text-[#64748B] text-center">
                    Simulates SLA expiration (DA → SNA → MoSPI) or evidence submission without waiting for real-world hours.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#CBD5E1] rounded-lg p-12 text-center text-[#64748B] text-xs space-y-2">
                <span className="text-3xl block">📋</span>
                <p className="font-semibold text-sm text-[#0A2240]">Select an inquiry case</p>
                <p>Choose an active case from the left list to view live countdown and escalation controls.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <GovernmentFooter />
    </div>
  );
}
