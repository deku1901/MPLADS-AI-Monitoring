"use client";

import type { SplitWorkCluster, SplitWorkMemberProject } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatInr(amount: number | null | undefined): string {
  if (amount == null) return "—";
  if (amount >= 1_00_000) {
    return `₹${(amount / 1_00_000).toFixed(2)}L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

function similarityColor(sim: number): string {
  if (sim >= 0.9) return "text-red-400";
  if (sim >= 0.75) return "text-amber-400";
  return "text-emerald-400";
}

interface MemberRowProps {
  project: SplitWorkMemberProject;
  thresholdInr: number;
  index: number;
}

function MemberRow({ project, thresholdInr, index }: MemberRowProps) {
  const amount = project.sanctioned_amount_inr ?? 0;
  const belowThreshold = amount <= thresholdInr;

  return (
    <div
      className="group relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-base)] px-4 py-3 transition-colors hover:border-amber-500/40 hover:bg-amber-950/10"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Reach indicator */}
      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-900/30 border border-amber-700/50 text-amber-400 text-xs font-bold font-mono">
        R{index + 1}
      </div>

      {/* Project info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-mono text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">
            {project.project_id}
          </span>
          {project.mandatory_tender ? (
            <span className="pill pill-held text-[9px]">⚠ Tender Required</span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
              style={{ background: "rgba(20,83,45,0.5)", color: "#86efac" }}
            >
              ✓ Direct Quotation
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-primary)] font-medium leading-snug truncate" title={project.title}>
          {project.title}
        </p>
        {project.location_text && (
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">📍 {project.location_text}</p>
        )}
      </div>

      {/* Amount with threshold indicator */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={`text-sm font-bold font-mono ${belowThreshold ? "text-amber-400" : "text-red-400"}`}>
          {formatInr(amount)}
        </span>
        {belowThreshold && (
          <span className="text-[9px] text-amber-600 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
            ≤ ₹5L ceiling ↓
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Card
// ---------------------------------------------------------------------------

interface SplitWorkClusterCardProps {
  cluster: SplitWorkCluster;
}

export default function SplitWorkClusterCard({ cluster }: SplitWorkClusterCardProps) {
  const simPct = Math.round(cluster.nlp_corridor_similarity * 100);
  const simColorClass = similarityColor(cluster.nlp_corridor_similarity);
  const totalFormatted = formatInr(cluster.total_aggregated_cost_inr);
  const thresholdFormatted = formatInr(cluster.individual_threshold_inr);
  const exceedsThreshold = cluster.total_aggregated_cost_inr >= 10_00_000;

  return (
    <div className="card fade-in border-amber-700/40 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(217,119,6,0.12) 0%, transparent 70%)",
        }}
      />

      {/* ── Header ── */}
      <div className="relative flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
        {/* Icon + Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-lg shadow-inner">
            🔍
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="pill pill-held text-[10px]">⚠ PROCUREMENT ANOMALY</span>
              {cluster.mandatory_tender_enforced && (
                <span
                  className="pill text-[10px]"
                  style={{ background: "rgba(124,29,29,0.7)", color: "#fca5a5", border: "1px solid rgba(220,38,38,0.4)" }}
                >
                  🔒 TENDER ENFORCED
                </span>
              )}
              {cluster.case_id && (
                <span className="pill pill-accent text-[10px] font-mono">
                  {cluster.case_id}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight" title={cluster.corridor_name}>
              {cluster.corridor_name}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              {cluster.constituency} · {cluster.category.replace(/_/g, " ")}
            </p>
          </div>
        </div>

        {/* NLP Similarity Score */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">NLP Similarity</div>
          <div className={`text-2xl font-bold font-mono ${simColorClass}`}>{simPct}%</div>
          <div className="text-[9px] text-[var(--text-muted)]">Corridor match</div>
          {/* Similarity bar */}
          <div className="w-24 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${simPct}%`,
                background: cluster.nlp_corridor_similarity >= 0.9
                  ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                  : "linear-gradient(90deg, #d97706, #f59e0b)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Financial Threshold Analysis ── */}
      <div className="relative mb-5 p-4 rounded-xl bg-[var(--bg-base)] border border-[var(--border-strong)]">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Procurement Threshold Analysis
        </div>
        <div className="grid grid-cols-3 gap-4">
          {/* Individual */}
          <div className="text-center">
            <div className="text-[10px] text-[var(--text-muted)] mb-1">Per Work Order</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              ~{formatInr(Math.round(cluster.total_aggregated_cost_inr / Math.max(cluster.member_projects.length, 1)))}
            </div>
            <div className="text-[9px] text-amber-600 mt-1 flex items-center justify-center gap-1">
              <span>≤ {thresholdFormatted} ceiling</span>
              <span className="text-amber-400">↓ BELOW</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="text-[10px] text-[var(--text-muted)] text-center">
              {cluster.member_projects.length} works
            </div>
            <div className="text-xl text-amber-500">→</div>
            <div className="text-[9px] text-amber-600 text-center">combined</div>
          </div>

          {/* Aggregate */}
          <div className="text-center">
            <div className="text-[10px] text-[var(--text-muted)] mb-1">Aggregate Total</div>
            <div className={`text-lg font-bold font-mono ${exceedsThreshold ? "text-red-400" : "text-amber-400"}`}>
              {totalFormatted}
            </div>
            <div className={`text-[9px] mt-1 flex items-center justify-center gap-1 ${exceedsThreshold ? "text-red-500" : "text-[var(--text-muted)]"}`}>
              {exceedsThreshold ? (
                <>≥ ₹10L threshold <span className="text-red-400">↑ EXCEEDS</span></>
              ) : (
                <span>Below threshold</span>
              )}
            </div>
          </div>
        </div>

        {/* Threshold exceeded banner */}
        {exceedsThreshold && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-950/40 border border-red-800/40 text-[11px] text-red-300">
            <span className="text-base">⚡</span>
            <span>
              Aggregate {totalFormatted} exceeds ₹10L mandatory e-tender threshold while each individual work order is priced ≤ {thresholdFormatted} — indicating artificial fragmentation to evade public procurement rules.
            </span>
          </div>
        )}
      </div>

      {/* ── Member Work Orders ── */}
      <div className="relative mb-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3">
          Fragmented Work Orders ({cluster.member_projects.length})
        </div>
        <div className="flex flex-col gap-2">
          {cluster.member_projects.map((proj, idx) => (
            <MemberRow
              key={proj.project_id}
              project={proj}
              thresholdInr={cluster.individual_threshold_inr}
              index={idx}
            />
          ))}
        </div>
      </div>

      {/* ── NLP Corridor Tokens ── */}
      {cluster.overlapping_corridor_tokens.length > 0 && (
        <div className="relative">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
            Shared Corridor Keywords
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cluster.overlapping_corridor_tokens.map((token) => (
              <span
                key={token}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold text-amber-300 bg-amber-950/40 border border-amber-800/30"
              >
                {token}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
