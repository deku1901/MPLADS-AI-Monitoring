"""
Pydantic Schemas for Vertical Slice 1 API.
Lightweight request/response validation models.
"""

from __future__ import annotations
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Project Schemas
# ---------------------------------------------------------------------------

class ProjectSummary(BaseModel):
    project_id: str
    mp_id: str | None
    title: str
    category: str | None
    location_text: str | None
    constituency: str | None
    state: str | None
    recommended_amount_inr: int | None
    sanctioned_amount_inr: int | None
    implementing_agency: str | None
    status: str
    risk_score: int
    risk_breakdown: dict[str, Any] | None
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True


class ProjectDetail(ProjectSummary):
    description: str | None
    lat: float | None
    lon: float | None
    mandatory_tender: bool
    missing_documents: list[str] | None
    recommendation_date: datetime | None
    sanction_date: datetime | None
    completion_date: datetime | None
    payments: list[PaymentSummary] = []
    latest_progress: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Payment Schemas
# ---------------------------------------------------------------------------

class PaymentSubmitRequest(BaseModel):
    project_id: str = Field(..., description="Project ID e.g. MPL-2026-1042")
    requested_amount_inr: int = Field(..., description="Requested payment amount in INR")
    submitted_by: str = Field(default="DRDA-IA", description="Identifier of submitter")
    trigger_demo_scenario: bool = Field(default=False, description="Set True for deterministic Slice 1 demo check")


class PaymentSummary(BaseModel):
    payment_id: str
    project_id: str
    requested_amount_inr: int
    request_date: datetime | None
    status: str
    ai_risk_score_at_request: int | None
    submitted_by: str | None
    approved_by: str | None
    approved_at: datetime | None

    class Config:
        from_attributes = True


class PaymentSubmitResponse(BaseModel):
    payment_id: str
    status: str
    risk_score: int
    previous_risk_score: int
    risk_breakdown: dict[str, Any]
    reason_codes: list[str]
    detector_signals: dict[str, Any]
    case_id: str | None
    action: str
    pre_payment_check_result: dict[str, Any]


# ---------------------------------------------------------------------------
# Case Schemas
# ---------------------------------------------------------------------------

class EscalationEventSummary(BaseModel):
    escalation_id: str
    from_tier: str | None
    to_tier: str | None
    reason: str | None
    triggered_at: datetime | None

    class Config:
        from_attributes = True


class EvidenceSummary(BaseModel):
    evidence_id: str
    submitted_by: str | None
    content_type: str | None
    content_text: str | None
    content_path: str | None
    llm_summary: str | None
    risk_score_before: int | None
    risk_score_after: int | None
    submitted_at: datetime | None

    class Config:
        from_attributes = True


class CaseSummary(BaseModel):
    case_id: str
    project_id: str
    reason_codes: list[str] | None
    risk_score_at_creation: int | None
    assigned_to_authority_id: str | None
    assigned_tier: str | None
    status: str
    response_deadline: datetime | None
    created_at: datetime | None
    resolved_at: datetime | None

    class Config:
        from_attributes = True


class CaseDetail(CaseSummary):
    ai_explanation: str | None
    resolution_note: str | None
    evidence_submissions: list[EvidenceSummary] = []
    escalation_events: list[EscalationEventSummary] = []


# ---------------------------------------------------------------------------
# Evidence Submission Schemas
# ---------------------------------------------------------------------------

class EvidenceSubmitRequest(BaseModel):
    submitted_by: str = Field(default="AUTH-DA-01", description="Authority ID")
    submitted_role: str = Field(default="DA", description="Authority Role (DA/SNA/MINISTRY)")
    content_type: str = Field(default="TEXT", description="TEXT | DOCUMENT | IMAGE")
    content_text: str = Field(default="", description="Justification or evidence narrative")
    justification_reduces_duplicate: bool = Field(default=True, description="Whether justification addresses risk flags")


class EvidenceSubmitResponse(BaseModel):
    evidence_id: str
    case_id: str
    risk_before: int
    risk_after: int
    case_status: str
    llm_summary: str


# ---------------------------------------------------------------------------
# Audit & Notification Schemas
# ---------------------------------------------------------------------------

class AuditEventSummary(BaseModel):
    event_id: str
    project_id: str | None
    case_id: str | None
    event_type: str
    actor_id: str | None
    actor_role: str | None
    description: str | None
    old_value: str | None
    new_value: str | None
    metadata: dict[str, Any] | None = Field(default=None, alias="event_metadata")
    timestamp: datetime | None

    class Config:
        from_attributes = True
        populate_by_name = True


class NotificationSummary(BaseModel):
    notification_id: str
    case_id: str | None
    project_id: str | None
    recipient_id: str
    recipient_role: str | None
    channel: str
    content: str
    sent_at: datetime | None
    is_read: bool

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Seed & Control Schemas
# ---------------------------------------------------------------------------

class SeedResetResponse(BaseModel):
    status: str
    project_id: str
    project_status: str
    initial_risk_score: int
    da_id: str
    sna_id: str
    ministry_id: str
    mp_id: str


# ---------------------------------------------------------------------------
# Recommendation Screening Schemas (Slice 2)
# ---------------------------------------------------------------------------

class RecommendationScreenRequest(BaseModel):
    title: str = Field(..., description="Proposed project title")
    description: str = Field(..., description="Proposed detailed work description")
    category: str = Field(default="DRINKING_WATER", description="Project category")
    constituency: str = Field(default="Varanasi", description="Parliamentary constituency")
    state: str = Field(default="Uttar Pradesh", description="State")
    estimated_cost_inr: int = Field(..., description="Estimated cost in INR")
    mp_id: str = Field(default="MP-UP-042", description="Recommending MP ID")


class MatchedProjectSummary(BaseModel):
    project_id: str
    title: str
    description: str | None = None
    location_text: str | None = None
    status: str
    sanctioned_amount_inr: int | None = None


class RecommendationScreenResponse(BaseModel):
    is_duplicate: bool
    similarity_score: float
    threshold: float
    matched_project: MatchedProjectSummary | None = None
    overlapping_keywords: list[str] = []
    reason_codes: list[str] = []
    risk_score: int
    recommendation_action: str  # REJECTION_WARNING | PROCEED_TO_SANCTION


# ---------------------------------------------------------------------------
# Citizen Verification Schemas (Slice 3)
# ---------------------------------------------------------------------------

class CitizenProjectSummary(BaseModel):
    project_id: str
    title: str
    description: str | None = None
    category: str | None = None
    location_text: str | None = None
    lat: float | None = None
    lon: float | None = None
    status: str
    sanctioned_amount_inr: int | None = None
    citizen_verification_status: str  # VERIFIED_FUNCTIONAL | UNVERIFIED | INSPECTION_REQUIRED
    positive_reports_count: int
    negative_reports_count: int


class CitizenReportResponse(BaseModel):
    report_id: str
    project_id: str
    is_functional: bool
    credibility_score: float
    inspection_triggered: bool
    case_id: str | None = None
    new_project_status: str


class CitizenReportDetail(BaseModel):
    report_id: str
    project_id: str
    is_functional: bool
    description: str | None = None
    photo_path: str | None = None
    citizen_lat: float | None = None
    citizen_lon: float | None = None
    credibility_score: float
    created_at: datetime | None = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Split-Work Detection Schemas (Slice 4)
# ---------------------------------------------------------------------------

class SplitWorkMemberProject(BaseModel):
    project_id: str
    title: str
    description: str | None = None
    category: str | None = None
    location_text: str | None = None
    lat: float | None = None
    lon: float | None = None
    sanctioned_amount_inr: int | None = None
    mandatory_tender: bool
    status: str


class SplitWorkCluster(BaseModel):
    cluster_id: str
    corridor_name: str
    category: str
    constituency: str
    member_projects: list[SplitWorkMemberProject]
    individual_threshold_inr: int
    total_aggregated_cost_inr: int
    nlp_corridor_similarity: float
    overlapping_corridor_tokens: list[str]
    mandatory_tender_enforced: bool
    unified_tender_title: str
    case_id: str | None = None


class SplitWorkScanRequest(BaseModel):
    constituency: str | None = Field(
        default=None,
        description="Limit scan to a specific constituency. Omit to scan all constituencies."
    )


class SplitWorkScanResponse(BaseModel):
    status: str
    clusters_detected: int
    clusters_enforced: int
    clusters: list[SplitWorkCluster]


# ---------------------------------------------------------------------------
# Satellite Remote Sensing Schemas (Slice 5A)
# ---------------------------------------------------------------------------

class SatellitePassMetadata(BaseModel):
    pass_id: str
    date: str
    cloud_cover_pct: float
    resolution_m: float
    ndbi_score: float
    ndvi_score: float
    spectral_band: str
    sensor: str


class SatelliteAnalysisResponse(BaseModel):
    project_id: str
    project_title: str
    category: str
    constituency: str
    coordinates: dict[str, float]
    baseline_pass: SatellitePassMetadata
    current_pass: SatellitePassMetadata
    structural_change_score: float
    ai_estimated_progress_pct: int
    reported_progress_pct: int
    mismatch_pct: int
    is_mismatch: bool
    confidence_score: float
    resolution_meters: float
    sensor: str
    analysis_summary: str


class SatelliteVerificationResponse(BaseModel):
    project_id: str
    verified: bool
    is_mismatch: bool
    reported_progress_pct: int
    ai_estimated_progress_pct: int
    mismatch_pct: int
    previous_risk_score: int
    updated_risk_score: int
    risk_breakdown: dict[str, Any]
    new_project_status: str
    case_id: str | None
    inspection_triggered: bool
    action_taken: str


# ---------------------------------------------------------------------------
# Delay & Stalled Project Detection Schemas (Slice 5B / F12)
# ---------------------------------------------------------------------------

class DelayAnalysisResponse(BaseModel):
    project_id: str
    project_title: str
    sanction_date: str
    expected_completion_date: str
    elapsed_days: int
    elapsed_pct: float
    expected_progress_pct: float
    actual_progress_pct: int
    progress_gap_pct: float
    days_since_last_progress: int
    delay_status: str
    risk_level: str
    recommended_action: str
    analysis_summary: str


class DelayScanResponse(BaseModel):
    project_id: str
    delay_status: str
    risk_level: str
    progress_gap_pct: float
    expected_progress_pct: float
    actual_progress_pct: int
    days_since_last_progress: int
    elapsed_days: int
    elapsed_pct: float
    previous_risk_score: int
    updated_risk_score: int
    risk_breakdown: dict[str, Any]
    old_project_status: str
    new_project_status: str
    case_id: str | None
    inspection_triggered: bool
    action_taken: str
    recommended_action: str
    analysis_summary: str


# ---------------------------------------------------------------------------
# Financial & Expenditure Analytics Schemas (Slice 6 / F13)
# ---------------------------------------------------------------------------

class PaymentInstallmentItem(BaseModel):
    payment_id: str
    requested_amount_inr: int
    request_date: str | None = None
    status: str
    submitted_by: str | None = None
    approved_by: str | None = None
    approved_at: str | None = None


class FinancialAnalysisResponse(BaseModel):
    project_id: str
    project_title: str
    recommended_amount_inr: int
    sanctioned_amount_inr: int
    cost_variance_inr: int
    cost_variance_pct: float
    total_released_inr: int
    total_pending_inr: int
    unreleased_balance_inr: int
    fund_utilization_pct: float
    expenditure_to_progress_ratio: float
    anomaly_score: float
    financial_risk_flags: list[str]
    financial_health_rating: str
    recommended_action: str
    analysis_summary: str
    payment_count: int
    payments: list[PaymentInstallmentItem] = []


class FinancialScanResponse(BaseModel):
    project_id: str
    cost_variance_inr: int
    cost_variance_pct: float
    recommended_amount_inr: int
    sanctioned_amount_inr: int
    total_released_inr: int
    total_pending_inr: int
    unreleased_balance_inr: int
    fund_utilization_pct: float
    expenditure_to_progress_ratio: float
    financial_health_rating: str
    financial_risk_flags: list[str]
    anomaly_score: float
    previous_risk_score: int
    updated_risk_score: int
    risk_breakdown: dict[str, Any]
    old_project_status: str
    new_project_status: str
    case_id: str | None
    inspection_triggered: bool
    action_taken: str
    recommended_action: str
    analysis_summary: str
    payments: list[PaymentInstallmentItem] = []




