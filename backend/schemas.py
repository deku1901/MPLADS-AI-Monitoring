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

