/**
 * TypeScript domain types for MPLADS AI Monitoring Platform.
 * Derived directly from backend/schemas.py — do not invent fields.
 */

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export type RiskBreakdown = {
  financial?: number;
  duplicate?: number;
  cv?: number;
  timeline?: number;
  compliance?: number;
  [key: string]: number | undefined;
};

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export interface PaymentSummary {
  payment_id: string;
  project_id: string;
  requested_amount_inr: number;
  request_date: string | null;
  status: string;
  ai_risk_score_at_request: number | null;
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface LatestProgress {
  reported_pct: number;
  ai_evidence_pct: number | null;
  ai_evidence_source: string | null;
  photo_paths: string[] | null;
  timestamp: string;
}

export interface ProjectDetail {
  project_id: string;
  mp_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  location_text: string | null;
  constituency: string | null;
  state: string | null;
  lat: number | null;
  lon: number | null;
  recommended_amount_inr: number | null;
  sanctioned_amount_inr: number | null;
  implementing_agency: string | null;
  status: string;
  risk_score: number;
  risk_breakdown: RiskBreakdown | null;
  mandatory_tender: boolean;
  missing_documents: string[] | null;
  recommendation_date: string | null;
  sanction_date: string | null;
  completion_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  payments: PaymentSummary[];
  latest_progress: LatestProgress | null;
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export interface PaymentSubmitRequest {
  project_id: string;
  requested_amount_inr: number;
  submitted_by?: string;
  trigger_demo_scenario?: boolean;
}

export interface PaymentSubmitResponse {
  payment_id: string;
  status: string;
  risk_score: number;
  previous_risk_score: number;
  risk_breakdown: RiskBreakdown;
  reason_codes: string[];
  detector_signals: Record<string, unknown>;
  case_id: string | null;
  action: string;
  pre_payment_check_result: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

export interface EscalationEventSummary {
  escalation_id: string;
  from_tier: string | null;
  to_tier: string | null;
  reason: string | null;
  triggered_at: string | null;
}

export interface EvidenceSummary {
  evidence_id: string;
  submitted_by: string | null;
  content_type: string | null;
  content_text: string | null;
  content_path: string | null;
  llm_summary: string | null;
  risk_score_before: number | null;
  risk_score_after: number | null;
  submitted_at: string | null;
}

export interface CaseSummary {
  case_id: string;
  project_id: string;
  reason_codes: string[] | null;
  risk_score_at_creation: number | null;
  assigned_to_authority_id: string | null;
  assigned_tier: string | null;
  status: string;
  response_deadline: string | null;
  created_at: string | null;
  resolved_at: string | null;
}

export interface CaseDetail extends CaseSummary {
  ai_explanation: string | null;
  resolution_note: string | null;
  evidence_submissions: EvidenceSummary[];
  escalation_events: EscalationEventSummary[];
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export interface EvidenceSubmitRequest {
  submitted_by?: string;
  submitted_role?: string;
  content_type?: string;
  content_text?: string;
  justification_reduces_duplicate?: boolean;
}

export interface EvidenceSubmitResponse {
  evidence_id: string;
  case_id: string;
  risk_before: number;
  risk_after: number;
  case_status: string;
  llm_summary: string;
}

// ---------------------------------------------------------------------------
// Audit & Notifications
// ---------------------------------------------------------------------------

export interface AuditEventSummary {
  event_id: string;
  project_id: string | null;
  case_id: string | null;
  event_type: string;
  actor_id: string | null;
  actor_role: string | null;
  description: string | null;
  old_value: string | null;
  new_value: string | null;
  event_metadata: Record<string, unknown> | null;
  timestamp: string | null;
}

export interface NotificationSummary {
  notification_id: string;
  case_id: string | null;
  project_id: string | null;
  recipient_id: string;
  recipient_role: string | null;
  channel: string;
  content: string;
  sent_at: string | null;
  is_read: boolean;
}

// ---------------------------------------------------------------------------
// Seed / Control
// ---------------------------------------------------------------------------

export interface SeedResetResponse {
  status: string;
  project_id: string;
  project_status: string;
  initial_risk_score: number;
  da_id: string;
  sna_id: string;
  ministry_id: string;
  mp_id: string;
}

// ---------------------------------------------------------------------------
// Recommendation Screening (Slice 2)
// ---------------------------------------------------------------------------

export interface RecommendationScreenRequest {
  title: string;
  description: string;
  category?: string;
  constituency?: string;
  state?: string;
  estimated_cost_inr: number;
  mp_id?: string;
}

export interface MatchedProjectSummary {
  project_id: string;
  title: string;
  description: string | null;
  location_text: string | null;
  status: string;
  sanctioned_amount_inr: number | null;
}

export interface RecommendationScreenResponse {
  is_duplicate: boolean;
  similarity_score: number;
  threshold: number;
  matched_project: MatchedProjectSummary | null;
  overlapping_keywords: string[];
  reason_codes: string[];
  risk_score: number;
  recommendation_action: "REJECTION_WARNING" | "PROCEED_TO_SANCTION" | string;
}
