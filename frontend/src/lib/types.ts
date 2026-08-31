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
  state?: string | null;
  constituency?: string | null;
  status: string;
  sanctioned_amount_inr: number | null;
  citizen_verification_status: "VERIFIED_FUNCTIONAL" | "UNVERIFIED" | "INSPECTION_REQUIRED" | string;
  positive_reports_count: number;
  negative_reports_count: number;
  citizen_satisfaction_pct?: number | null;
  citizen_reports_count?: number | null;
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
  is_mismatch: boolean;
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

// ---------------------------------------------------------------------------
// Cost Overrun Detection (Slice 7 / F14)
// ---------------------------------------------------------------------------

export interface CostOverrunAnalysisResponse {
  project_id: string;
  project_title: string;
  original_estimate_inr: number;
  revised_estimate_inr: number;
  actual_expenditure_inr: number;
  estimate_increase_inr: number;
  estimate_increase_pct: number;
  actual_vs_original_pct: number;
  actual_vs_revised_pct: number;
  remaining_balance_inr: number;
  monitoring_threshold_pct: number;
  overrun_flags: string[];
  overrun_status: string;
  risk_level: string;
  recommended_action: string;
  analysis_summary: string;
  sanction_date?: string | null;
  category?: string | null;
  constituency?: string | null;
}

export interface CostOverrunScanResponse {
  project_id: string;
  original_estimate_inr: number;
  revised_estimate_inr: number;
  actual_expenditure_inr: number;
  estimate_increase_inr: number;
  estimate_increase_pct: number;
  actual_vs_original_pct: number;
  actual_vs_revised_pct: number;
  remaining_balance_inr: number;
  monitoring_threshold_pct: number;
  overrun_flags: string[];
  overrun_status: string;
  risk_level: string;
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
// Unified AI Analytics Dashboard (Slice 8 / F15)
// ---------------------------------------------------------------------------

export interface PortfolioSummary {
  total_projects: number;
  total_recommended_inr: number;
  total_sanctioned_inr: number;
  total_disbursed_inr: number;
  total_pending_payments_inr: number;
  total_unreleased_inr: number;
  overall_fund_utilization_pct: number;
  statutory_deadline_compliance_pct: number;
  active_works_count: number;
  completed_works_count: number;
  inspection_required_count: number;
}

export interface RiskTierItem {
  tier: string;
  range: string;
  count: number;
  percentage: number;
  color: string;
  label: string;
}

export interface RiskDistribution {
  low_risk_count: number;
  medium_risk_count: number;
  high_risk_count: number;
  critical_risk_count: number;
  average_risk_score: number;
  risk_tiers: RiskTierItem[];
}

export interface ActiveInterventionsSummary {
  total_active_interventions: number;
  payment_holds_count: number;
  open_cases_count: number;
  mandatory_tender_clusters_count: number;
  satellite_discrepancies_count: number;
  delayed_stalled_count: number;
  fiscal_anomalies_count: number;
  cost_overruns_count: number;
  citizen_disputes_count: number;
}

export interface AuthorityWorkloadItem {
  authority_id: string;
  name: string;
  role: string;
  jurisdiction: string;
  email?: string | null;
  assigned_open_cases: number;
  sla_breach_count: number;
}

export interface ModuleHealthItem {
  module_id: string;
  name: string;
  status: string;
  signals_analyzed: number;
  active_interventions: number;
  last_active: string;
}

export interface DashboardProjectItem {
  project_id: string;
  title: string;
  category: string;
  constituency: string;
  state: string;
  status: string;
  recommended_amount_inr: number;
  sanctioned_amount_inr: number;
  disbursed_amount_inr: number;
  risk_score: number;
  risk_tier: string;
  mandatory_tender: boolean;
  active_case_id?: string | null;
  anomaly_flags: string[];
  reported_progress_pct?: number | null;
  ai_evidence_pct?: number | null;
}

export interface DashboardCaseItem {
  case_id: string;
  project_id: string;
  project_title: string;
  assigned_tier: string;
  status: string;
  reason_codes: string[];
  risk_score_at_creation: number;
  created_at?: string | null;
  sla_deadline?: string | null;
}

export interface DashboardActivityItem {
  event_id: string;
  event_type: string;
  project_id?: string | null;
  actor_role?: string | null;
  description: string;
  timestamp?: string | null;
}

export interface PortfolioDashboardResponse {
  portfolio_summary: PortfolioSummary;
  risk_distribution: RiskDistribution;
  active_interventions: ActiveInterventionsSummary;
  authority_workload: AuthorityWorkloadItem[];
  module_health_status: ModuleHealthItem[];
  projects: DashboardProjectItem[];
  open_cases: DashboardCaseItem[];
  recent_activity: DashboardActivityItem[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Accountability Clock & Escalation (Slice 9 / F16)
// ---------------------------------------------------------------------------

export interface OpenCaseItem {
  case_id: string;
  project_id: string;
  project_title?: string | null;
  assigned_tier: string;
  status: string;
  reason_codes: string[];
  risk_score_at_creation: number;
  response_deadline?: string | null;
  time_remaining_seconds?: number | null;
  is_overdue: boolean;
  escalation_count: number;
  created_at?: string | null;
  ai_explanation?: string | null;
}

export interface OpenCasesResponse {
  open_cases: OpenCaseItem[];
  total_open: number;
  overdue_count: number;
  by_tier: Record<string, number>;
}

export interface SimulateNoResponseResponse {
  case_id: string;
  project_id: string;
  previous_status: string;
  new_status: string;
  previous_tier: string;
  new_tier: string;
  escalation_level: number;
  new_response_deadline?: string | null;
  time_remaining_seconds?: number | null;
  notification_dispatched: boolean;
  escalation_event_id?: string | null;
  at_maximum_tier: boolean;
  message: string;
}

// ---------------------------------------------------------------------------
// Authentication & Personas
// ---------------------------------------------------------------------------

export interface UserPersona {
  user_id: string;
  name: string;
  role: "MP" | "DA" | "SNA" | "MINISTRY" | "CITIZEN";
  designation: string;
  jurisdiction: string;
  email?: string | null;
  avatar_emoji?: string;
  default_route?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserPersona;
}

// ---------------------------------------------------------------------------
// F17 Completion Verification
// ---------------------------------------------------------------------------

export interface CompletionSignalBreakdown {
  physical_progress_score: number;
  satellite_evidence_score: number;
  perceptual_image_score: number;
  citizen_feedback_score: number;
  financial_audit_score: number;
  overall_confidence_score: number;
  verdict: "VERIFIED" | "COMPLETION_DISPUTED";
  reason_codes: string[];
}

export interface CompletionVerifyResponse {
  project_id: string;
  previous_status: string;
  new_status: string;
  is_verified: boolean;
  verification_score: number;
  signals: CompletionSignalBreakdown;
  case_id?: string | null;
  audit_event_id?: string | null;
  message: string;
  verified_at?: string | null;
}

export interface CompletionDossierResponse {
  project_id: string;
  title: string;
  category: string;
  constituency: string;
  state: string;
  sanctioned_amount_inr: number;
  disbursed_amount_inr: number;
  status: string;
  completion_date?: string | null;
  reported_progress_pct?: number | null;
  ai_satellite_pct?: number | null;
  citizen_satisfaction_pct?: number | null;
  is_duplicate_photo_detected: boolean;
  active_cases: Array<{ case_id: string; status: string; reason_codes?: string[] }>;
  signals?: CompletionSignalBreakdown | null;
}

// ---------------------------------------------------------------------------
// MP Constituency Dashboard
// ---------------------------------------------------------------------------

export interface MPInfo {
  mp_id: string;
  name: string;
  mp_type: string;
  constituency: string;
  state: string;
  annual_budget_inr: number;
}

export interface MPBudgetSummary {
  annual_budget_inr: number;
  total_sanctioned_inr: number;
  total_disbursed_inr: number;
  unspent_balance_inr: number;
  sanctioned_utilization_pct: number;
  disbursed_utilization_pct: number;
}

export interface MPPipeline {
  recommended: number;
  sanctioned: number;
  execution: number;
  completed: number;
  verified: number;
  inspection_required: number;
}

export interface MPStatutoryCompliance {
  sc_spend_pct: number;
  st_spend_pct: number;
  sc_compliant: boolean;
  st_compliant: boolean;
  sc_threshold_pct: number;
  st_threshold_pct: number;
}

export interface MPRiskSummary {
  average_risk_score: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
  open_cases_count: number;
}

export interface MPCitizenSummary {
  total_reports: number;
  positive_reports: number;
  negative_reports: number;
  satisfaction_pct?: number | null;
}

export interface MPDashboardResponse {
  mp: MPInfo;
  budget_summary: MPBudgetSummary;
  pipeline: MPPipeline;
  statutory_compliance: MPStatutoryCompliance;
  risk_summary: MPRiskSummary;
  sector_breakdown: Array<{ category: string; count: number; sanctioned_inr: number; disbursed_inr: number }>;
  citizen_summary: MPCitizenSummary;
  open_cases: Array<{
    case_id: string;
    project_id: string;
    assigned_tier: string;
    status: string;
    reason_codes: string[];
    risk_score_at_creation: number;
    sla_deadline?: string | null;
  }>;
  sla_pending_sanctions: Array<{
    project_id: string;
    title: string;
    elapsed_days: number;
    remaining_days: number;
    overdue: boolean;
  }>;
  projects: Array<{
    project_id: string;
    title: string;
    category: string;
    location_text?: string | null;
    status: string;
    risk_score: number;
    risk_tier: string;
    recommended_amount_inr: number;
    sanctioned_amount_inr: number;
    disbursed_amount_inr: number;
    reported_progress_pct?: number | null;
    ai_evidence_pct?: number | null;
    active_case_id?: string | null;
    anomaly_flags: string[];
    recommendation_date?: string | null;
    sanction_date?: string | null;
    completion_date?: string | null;
  }>;
  timestamp: string;
}

export interface MPListItem {
  mp_id: string;
  name: string;
  mp_type: string;
  constituency: string;
  state: string;
  total_projects: number;
  avg_risk: number;
}

// ---------------------------------------------------------------------------
// DA Operations Dashboard
// ---------------------------------------------------------------------------

export interface DAInfo {
  authority_id: string;
  name: string;
  district: string;
  state: string;
  email?: string | null;
}

export interface DAPortfolioSummary {
  total_projects: number;
  total_sanctioned_inr: number;
  total_disbursed_inr: number;
  utilization_pct: number;
  active_works: number;
  completed_works: number;
  inspection_required: number;
}

export interface DASLAItem {
  project_id: string;
  title: string;
  category?: string | null;
  recommended_amount_inr: number;
  recommendation_date: string;
  elapsed_days: number;
  remaining_days: number;
  overdue: boolean;
  urgency: "CRITICAL" | "HIGH" | "NORMAL";
}

export interface DAPaymentHoldItem {
  payment_id: string;
  project_id: string;
  project_title: string;
  requested_amount_inr: number;
  ai_risk_score: number;
  check_result: Record<string, unknown>;
  submitted_by: string;
  request_date?: string | null;
}

export interface DACaseItem {
  case_id: string;
  project_id: string;
  project_title: string;
  status: string;
  reason_codes: string[];
  risk_score_at_creation: number;
  response_deadline?: string | null;
  time_remaining_seconds?: number | null;
  is_overdue: boolean;
  escalation_count: number;
}

export interface DADashboardResponse {
  da: DAInfo;
  portfolio_summary: DAPortfolioSummary;
  sla_queue: {
    pending_sanctions_count: number;
    sla_breaches_count: number;
    items: DASLAItem[];
  };
  payment_holds: {
    total_holds: number;
    items: DAPaymentHoldItem[];
  };
  cases: {
    total_open: number;
    overdue_count: number;
    items: DACaseItem[];
  };
  risk_summary: {
    average_risk_score: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  critical_alerts: Array<{
    project_id: string;
    title: string;
    risk_score: number;
    risk_tier: string;
    status: string;
    sanctioned_amount_inr: number;
  }>;
  projects: Array<{
    project_id: string;
    title: string;
    category: string;
    constituency?: string | null;
    status: string;
    risk_score: number;
    risk_tier: string;
    sanctioned_amount_inr: number;
    active_case_id?: string | null;
    anomaly_flags: string[];
  }>;
  recent_activity: Array<{
    event_id: string;
    event_type: string;
    project_id?: string | null;
    description: string;
    timestamp?: string | null;
  }>;
  timestamp: string;
}

export interface DAListItem {
  authority_id: string;
  name: string;
  district: string;
  state: string;
}

// ---------------------------------------------------------------------------
// SNA Dashboard
// ---------------------------------------------------------------------------

export interface SNAInfo {
  authority_id: string;
  name: string;
  state: string;
  email?: string | null;
}

export interface DistrictLeaderboardItem {
  constituency: string;
  total_projects: number;
  sanctioned_inr: number;
  disbursed_inr: number;
  utilization_pct: number;
  avg_risk_score: number;
  inspection_required_count: number;
  open_cases_count: number;
  sla_compliance_pct: number;
  performance_score: number;
}

export interface SNADashboardResponse {
  sna: SNAInfo;
  portfolio_summary: {
    total_projects: number;
    total_sanctioned_inr: number;
    total_disbursed_inr: number;
    utilization_pct: number;
    active_works: number;
    completed_works: number;
    inspection_required: number;
    recommended_pending: number;
  };
  risk_summary: {
    average_risk_score: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
    total_open_cases: number;
    sna_escalations: number;
    sna_escalation_overdue: number;
  };
  escalation_queue: Array<{
    case_id: string;
    project_id: string;
    project_title?: string | null;
    project_constituency?: string | null;
    status: string;
    reason_codes: string[];
    risk_score_at_creation: number;
    response_deadline?: string | null;
    time_remaining_seconds?: number | null;
    is_overdue: boolean;
  }>;
  district_leaderboard: DistrictLeaderboardItem[];
  mp_compliance: Array<{
    mp_id: string;
    name: string;
    mp_type: string;
    constituency: string;
    sc_spend_pct: number;
    st_spend_pct: number;
    sc_compliant: boolean;
    st_compliant: boolean;
    total_projects: number;
    total_sanctioned_inr: number;
  }>;
  anomaly_hotspots: Array<{
    project_id: string;
    title: string;
    constituency?: string | null;
    risk_score: number;
    risk_tier: string;
    status: string;
    sanctioned_amount_inr: number;
  }>;
  recent_activity: Array<{
    event_id: string;
    event_type: string;
    project_id?: string | null;
    description: string;
    timestamp?: string | null;
  }>;
  timestamp: string;
}

export interface SNAListItem {
  authority_id: string;
  name: string;
  state: string;
}

// ---------------------------------------------------------------------------
// MoSPI National Dashboard
// ---------------------------------------------------------------------------

export interface StateMatrixItem {
  state: string;
  total_projects: number;
  sanctioned_inr: number;
  disbursed_inr: number;
  utilization_pct: number;
  avg_risk_score: number;
  inspection_required_count: number;
  open_cases_count: number;
  sla_compliance_pct: number;
  mps_count: number;
  sc_compliant_mps: number;
  st_compliant_mps: number;
  performance_score: number;
}

export interface FiscalLedger {
  total_portfolio_inr: number;
  total_disbursed_inr: number;
  total_held_inr: number;
  total_unreleased_inr: number;
  funds_at_risk_inr: number;
  funds_at_risk_pct: number;
  payment_holds_count: number;
  mandatory_tender_enforcements: number;
  citizen_disputes_count: number;
}

export interface MoSPIDashboardResponse {
  national_kpis: {
    total_projects: number;
    total_states: number;
    total_mps: number;
    total_recommended_inr: number;
    total_sanctioned_inr: number;
    total_disbursed_inr: number;
    overall_utilization_pct: number;
    active_works: number;
    completed_works: number;
    inspection_required: number;
    open_cases_count: number;
  };
  risk_summary: {
    average_risk_score: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
    ministry_escalations: number;
    ministry_overdue: number;
  };
  fiscal_ledger: FiscalLedger;
  state_matrix: StateMatrixItem[];
  mp_compliance: {
    total_mps: number;
    sc_compliant_count: number;
    st_compliant_count: number;
    non_compliant_mps: Array<{
      mp_id: string;
      name: string;
      mp_type: string;
      state: string;
      constituency: string;
      sc_spend_pct: number;
      st_spend_pct: number;
      sc_compliant: boolean;
      st_compliant: boolean;
    }>;
  };
  ministry_escalation_queue: Array<{
    case_id: string;
    project_id: string;
    project_title?: string | null;
    project_state?: string | null;
    project_constituency?: string | null;
    status: string;
    reason_codes: string[];
    risk_score_at_creation: number;
    response_deadline?: string | null;
    time_remaining_seconds?: number | null;
    is_overdue: boolean;
  }>;
  national_hotspots: Array<{
    project_id: string;
    title: string;
    state?: string | null;
    constituency?: string | null;
    risk_score: number;
    risk_tier: string;
    status: string;
    sanctioned_amount_inr: number;
    mandatory_tender: boolean;
  }>;
  recent_activity: Array<{
    event_id: string;
    event_type: string;
    project_id?: string | null;
    actor_role?: string | null;
    description: string;
    timestamp?: string | null;
  }>;
  timestamp: string;
}



