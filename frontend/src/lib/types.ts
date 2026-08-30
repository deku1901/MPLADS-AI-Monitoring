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

// ---------------------------------------------------------------------------
// Citizen Verification (Slice 3)
// ---------------------------------------------------------------------------

export interface CitizenProjectSummary {
  project_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location_text: string | null;
  lat: number | null;
  lon: number | null;
  status: string;
  sanctioned_amount_inr: number | null;
  citizen_verification_status: "VERIFIED_FUNCTIONAL" | "UNVERIFIED" | "INSPECTION_REQUIRED" | string;
  positive_reports_count: number;
  negative_reports_count: number;
}

export interface CitizenReportResponse {
  report_id: string;
  project_id: string;
  is_functional: boolean;
  credibility_score: number;
  inspection_triggered: boolean;
  case_id: string | null;
  new_project_status: string;
}

export interface CitizenReportDetail {
  report_id: string;
  project_id: string;
  is_functional: boolean;
  description: string | null;
  photo_path: string | null;
  citizen_lat: number | null;
  citizen_lon: number | null;
  credibility_score: number;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Split-Work Anomaly Detection (Slice 4)
// ---------------------------------------------------------------------------

export interface SplitWorkMemberProject {
  project_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location_text: string | null;
  lat: number | null;
  lon: number | null;
  sanctioned_amount_inr: number | null;
  mandatory_tender: boolean;
  status: string;
}

export interface SplitWorkCluster {
  cluster_id: string;
  corridor_name: string;
  category: string;
  constituency: string;
  member_projects: SplitWorkMemberProject[];
  individual_threshold_inr: number;
  total_aggregated_cost_inr: number;
  nlp_corridor_similarity: number;
  overlapping_corridor_tokens: string[];
  mandatory_tender_enforced: boolean;
  unified_tender_title: string;
  case_id: string | null;
}

export interface SplitWorkScanResponse {
  status: string;
  clusters_detected: number;
  clusters_enforced: number;
  clusters: SplitWorkCluster[];
}

// ---------------------------------------------------------------------------
// Satellite Remote Sensing (Slice 5A)
// ---------------------------------------------------------------------------

export interface SatellitePassMetadata {
  pass_id: string;
  date: string;
  cloud_cover_pct: number;
  resolution_m: number;
  ndbi_score: number;
  ndvi_score: number;
  spectral_band: string;
  sensor: string;
}

export interface SatelliteAnalysisResponse {
  project_id: string;
  project_title: string;
  category: string;
  constituency: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  baseline_pass: SatellitePassMetadata;
  current_pass: SatellitePassMetadata;
  structural_change_score: number;
  ai_estimated_progress_pct: number;
  reported_progress_pct: number;
  mismatch_pct: number;
  is_mismatch: bool | boolean;
  confidence_score: number;
  resolution_meters: number;
  sensor: string;
  analysis_summary: string;
}

export interface SatelliteVerificationResponse {
  project_id: string;
  verified: boolean;
  is_mismatch: boolean;
  reported_progress_pct: number;
  ai_estimated_progress_pct: number;
  mismatch_pct: number;
  previous_risk_score: number;
  updated_risk_score: number;
  risk_breakdown: RiskBreakdown;
  new_project_status: string;
  case_id: string | null;
  inspection_triggered: boolean;
  action_taken: string;
}

// ---------------------------------------------------------------------------
// Delay & Stalled Project Detection (Slice 5B / F12)
// ---------------------------------------------------------------------------

export interface DelayAnalysisResponse {
  project_id: string;
  project_title: string;
  sanction_date: string;
  expected_completion_date: string;
  elapsed_days: number;
  elapsed_pct: number;
  expected_progress_pct: number;
  actual_progress_pct: number;
  progress_gap_pct: number;
  days_since_last_progress: number;
  delay_status: string;
  risk_level: string;
  recommended_action: string;
  analysis_summary: string;
}

export interface DelayScanResponse {
  project_id: string;
  delay_status: string;
  risk_level: string;
  progress_gap_pct: number;
  expected_progress_pct: number;
  actual_progress_pct: number;
  days_since_last_progress: number;
  elapsed_days: number;
  elapsed_pct: number;
  previous_risk_score: number;
  updated_risk_score: number;
  risk_breakdown: RiskBreakdown;
  old_project_status: string;
  new_project_status: string;
  case_id: string | null;
  inspection_triggered: boolean;
  action_taken: string;
  recommended_action: string;
  analysis_summary: string;
}

// ---------------------------------------------------------------------------
// Financial & Expenditure Analytics (Slice 6 / F13)
// ---------------------------------------------------------------------------

export interface PaymentInstallmentItem {
  payment_id: string;
  requested_amount_inr: number;
  request_date: string | null;
  status: string;
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface FinancialAnalysisResponse {
  project_id: string;
  project_title: string;
  recommended_amount_inr: number;
  sanctioned_amount_inr: number;
  cost_variance_inr: number;
  cost_variance_pct: number;
  total_released_inr: number;
  total_pending_inr: number;
  unreleased_balance_inr: number;
  fund_utilization_pct: number;
  expenditure_to_progress_ratio: number;
  anomaly_score: number;
  financial_risk_flags: string[];
  financial_health_rating: string;
  recommended_action: string;
  analysis_summary: string;
  payment_count: number;
  payments: PaymentInstallmentItem[];
}

export interface FinancialScanResponse {
  project_id: string;
  cost_variance_inr: number;
  cost_variance_pct: number;
  recommended_amount_inr: number;
  sanctioned_amount_inr: number;
  total_released_inr: number;
  total_pending_inr: number;
  unreleased_balance_inr: number;
  fund_utilization_pct: number;
  expenditure_to_progress_ratio: number;
  financial_health_rating: string;
  financial_risk_flags: string[];
  anomaly_score: number;
  previous_risk_score: number;
  updated_risk_score: number;
  risk_breakdown: RiskBreakdown;
  old_project_status: string;
  new_project_status: string;
  case_id: string | null;
  inspection_triggered: boolean;
  action_taken: string;
  recommended_action: string;
  analysis_summary: string;
  payments: PaymentInstallmentItem[];
}



