"""
SQLAlchemy ORM models — all core entities for Vertical Slice 1.

Tables:
    mp              — Member of Parliament
    authority       — DA / SNA / Ministry officials
    project         — MPLADS project (full lifecycle entity)
    payment_request — Payment submissions by IA
    progress_record — Self-reported + AI-derived progress
    image_hash      — pHash store for duplicate photo detection
    risk_score_event — Every risk score computation (immutable)
    case            — Intervention case (auto-created when risk >= threshold)
    evidence_submission — Authority evidence uploads against a case
    escalation_event — Records every escalation tier change
    notification    — In-platform + email + simulated WhatsApp
    audit_event     — Immutable append-only event log
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, String, Text, JSON, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# MP
# ---------------------------------------------------------------------------

class MP(Base):
    __tablename__ = "mp"

    mp_id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    mp_type = Column(String, nullable=False)          # LS | RS | NOMINATED
    constituency = Column(String)
    state = Column(String)
    annual_budget_inr = Column(Integer, default=500_00_000)   # ₹5 crore
    sc_spend_pct = Column(Float, default=0.0)
    st_spend_pct = Column(Float, default=0.0)

    projects = relationship("Project", back_populates="mp")


# ---------------------------------------------------------------------------
# Authority (DA / SNA / Ministry)
# ---------------------------------------------------------------------------

class Authority(Base):
    __tablename__ = "authority"

    authority_id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)             # DA | SNA | MINISTRY
    jurisdiction_state = Column(String)
    jurisdiction_district = Column(String)
    email = Column(String)
    # hashed password for demo login
    hashed_password = Column(String, nullable=False)


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

class Project(Base):
    __tablename__ = "project"

    project_id = Column(String, primary_key=True)     # e.g. MPL-2026-1042
    mp_id = Column(String, ForeignKey("mp.mp_id"))
    title = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String)
    location_text = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    constituency = Column(String)
    state = Column(String)

    recommended_amount_inr = Column(Integer)
    sanctioned_amount_inr = Column(Integer)
    implementing_agency = Column(String)

    # Lifecycle status
    status = Column(
        String,
        nullable=False,
        default="RECOMMENDED"
    )
    # RECOMMENDED | SANCTIONED | EXECUTION | PAYMENT | COMPLETED | VERIFIED
    # | COMPLETION_DISPUTED | INSPECTION_REQUIRED

    risk_score = Column(Integer, default=0)
    risk_breakdown = Column(JSON, default=dict)

    # Compliance flags
    mandatory_tender = Column(Boolean, default=False)
    missing_documents = Column(JSON, default=list)

    recommendation_date = Column(DateTime)
    sanction_date = Column(DateTime)
    completion_date = Column(DateTime)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    mp = relationship("MP", back_populates="projects")
    payments = relationship("PaymentRequest", back_populates="project")
    progress_records = relationship("ProgressRecord", back_populates="project")
    image_hashes = relationship("ImageHash", back_populates="project")
    cases = relationship("Case", back_populates="project")
    audit_events = relationship("AuditEvent", back_populates="project")
    citizen_reports = relationship("CitizenReport", back_populates="project")


# ---------------------------------------------------------------------------
# Payment Request
# ---------------------------------------------------------------------------

class PaymentRequest(Base):
    __tablename__ = "payment_request"

    payment_id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("project.project_id"))
    requested_amount_inr = Column(Integer, nullable=False)
    request_date = Column(DateTime, default=_now)

    # SUBMITTED | HELD_FOR_REVIEW | APPROVED_FOR_REVIEW | PAYMENT_RELEASED | REJECTED
    status = Column(String, nullable=False, default="SUBMITTED")

    pre_payment_check_result = Column(JSON)   # Full AI check output
    ai_risk_score_at_request = Column(Integer)

    submitted_by = Column(String)             # authority_id or "IA"
    approved_by = Column(String)
    approved_at = Column(DateTime)

    project = relationship("Project", back_populates="payments")


# ---------------------------------------------------------------------------
# Progress Record
# ---------------------------------------------------------------------------

class ProgressRecord(Base):
    __tablename__ = "progress_record"

    progress_id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("project.project_id"))
    reported_pct = Column(Integer)
    ai_evidence_pct = Column(Integer)         # NULL until AI runs
    ai_evidence_source = Column(String)       # SATELLITE_SAMPLE | UPLOADED_PHOTO_CV
    photo_paths = Column(JSON, default=list)
    timestamp = Column(DateTime, default=_now)

    project = relationship("Project", back_populates="progress_records")


# ---------------------------------------------------------------------------
# Image Hash (pHash store)
# ---------------------------------------------------------------------------

class ImageHash(Base):
    __tablename__ = "image_hash"

    hash_id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("project.project_id"))
    payment_id = Column(String, nullable=True)
    image_path = Column(String)
    phash = Column(String)                    # 16-char hex
    upload_timestamp = Column(DateTime, default=_now)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_hash_id = Column(String, nullable=True)

    project = relationship("Project", back_populates="image_hashes")


# ---------------------------------------------------------------------------
# Risk Score Event (immutable — never updated)
# ---------------------------------------------------------------------------

class RiskScoreEvent(Base):
    __tablename__ = "risk_score_event"

    event_id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("project.project_id"))
    risk_score = Column(Integer, nullable=False)
    previous_score = Column(Integer)
    sub_scores = Column(JSON)                 # {financial, timeline, duplicate, compliance, cv}
    trigger_event = Column(String)            # PAYMENT_REQUESTED | EVIDENCE_SUBMITTED | MANUAL
    detector_signals = Column(JSON)           # {D1: bool, D2: bool, ...}
    timestamp = Column(DateTime, default=_now)


# ---------------------------------------------------------------------------
# Case
# ---------------------------------------------------------------------------

class Case(Base):
    __tablename__ = "case"

    case_id = Column(String, primary_key=True)        # e.g. CASE-1042
    project_id = Column(String, ForeignKey("project.project_id"))
    reason_codes = Column(JSON)
    risk_score_at_creation = Column(Integer)
    assigned_to_authority_id = Column(String, ForeignKey("authority.authority_id"))
    assigned_tier = Column(String)            # DA | SNA | MINISTRY

    # OPEN | ASSIGNED | NOTIFIED | AWAITING_RESPONSE | REMINDER_SENT
    # | ESCALATED_L2 | ESCALATED_L3 | UNDER_REVIEW | RESOLVED | DISMISSED
    # | INSPECTION_REQUIRED
    status = Column(String, nullable=False, default="OPEN")

    response_deadline = Column(DateTime)
    ai_explanation = Column(Text)

    created_at = Column(DateTime, default=_now)
    resolved_at = Column(DateTime)
    resolution_note = Column(Text)

    project = relationship("Project", back_populates="cases")
    assigned_authority = relationship("Authority", foreign_keys=[assigned_to_authority_id])
    evidence_submissions = relationship("EvidenceSubmission", back_populates="case")
    escalation_events = relationship("EscalationEvent", back_populates="case")
    notifications = relationship("Notification", back_populates="case")


# ---------------------------------------------------------------------------
# Evidence Submission
# ---------------------------------------------------------------------------

class EvidenceSubmission(Base):
    __tablename__ = "evidence_submission"

    evidence_id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("case.case_id"))
    submitted_by = Column(String)
    content_type = Column(String)             # TEXT | DOCUMENT | IMAGE
    content_text = Column(Text)              # for TEXT type
    content_path = Column(String)            # for DOCUMENT/IMAGE type
    llm_summary = Column(Text)
    risk_score_before = Column(Integer)
    risk_score_after = Column(Integer)
    submitted_at = Column(DateTime, default=_now)

    case = relationship("Case", back_populates="evidence_submissions")


# ---------------------------------------------------------------------------
# Escalation Event
# ---------------------------------------------------------------------------

class EscalationEvent(Base):
    __tablename__ = "escalation_event"

    escalation_id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("case.case_id"))
    from_tier = Column(String)
    to_tier = Column(String)
    reason = Column(String)                   # TIMER_EXPIRED | MANUAL
    triggered_at = Column(DateTime, default=_now)

    case = relationship("Case", back_populates="escalation_events")


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class Notification(Base):
    __tablename__ = "notification"

    notification_id = Column(String, primary_key=True, default=_uuid)
    case_id = Column(String, ForeignKey("case.case_id"), nullable=True)
    project_id = Column(String, nullable=True)
    recipient_id = Column(String, nullable=False)
    recipient_role = Column(String)
    channel = Column(String, nullable=False)  # INAPP | EMAIL | WHATSAPP_SIM
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=_now)
    is_read = Column(Boolean, default=False)

    case = relationship("Case", back_populates="notifications")


# ---------------------------------------------------------------------------
# Audit Event (append-only, never updated)
# ---------------------------------------------------------------------------

class AuditEvent(Base):
    __tablename__ = "audit_event"

    event_id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("project.project_id"), nullable=True)
    case_id = Column(String, nullable=True)
    event_type = Column(String, nullable=False)
    # STATUS_CHANGE | RISK_SCORE_COMPUTED | CASE_CREATED | PAYMENT_HELD
    # | PAYMENT_RELEASED | PAYMENT_REJECTED | CASE_ESCALATED | CASE_RESOLVED
    # | EVIDENCE_SUBMITTED | NOTIFICATION_SENT | TIMER_EXPIRED | REMINDER_SENT
    actor_id = Column(String)
    actor_role = Column(String)               # SYSTEM | MP | DA | SNA | MINISTRY | IA
    description = Column(Text)
    old_value = Column(String)
    new_value = Column(String)
    event_metadata = Column("metadata", JSON)
    timestamp = Column(DateTime, default=_now)

    project = relationship("Project", back_populates="audit_events")


# ---------------------------------------------------------------------------
# Citizen Report (Slice 3: Ground-Truth Public Verification)
# ---------------------------------------------------------------------------

class CitizenReport(Base):
    __tablename__ = "citizen_report"

    report_id = Column(String, primary_key=True, default=_uuid)
    project_id = Column(String, ForeignKey("project.project_id"), nullable=False)
    is_functional = Column(Boolean, nullable=False)
    description = Column(Text, nullable=True)
    photo_path = Column(String, nullable=True)
    citizen_lat = Column(Float, nullable=True)
    citizen_lon = Column(Float, nullable=True)
    credibility_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=_now)

    project = relationship("Project", back_populates="citizen_reports")

