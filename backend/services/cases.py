"""
Case Service — creates, assigns, escalates and resolves intervention cases.

State machine (from frozen spec):
    OPEN → ASSIGNED → NOTIFIED → AWAITING_RESPONSE
         → REMINDER_SENT → ESCALATED_L2 → ESCALATED_L3
         → UNDER_REVIEW → RESOLVED | DISMISSED | INSPECTION_REQUIRED
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from config import settings
from models import Case, EscalationEvent, Authority
from services.audit import write_event
from services.notifications import send_notification
from ai_engine.llm import generate_case_explanation, generate_notification_body

logger = logging.getLogger("cases")

# Escalation tier order
TIERS = settings.ESCALATION_TIERS  # ["DA", "SNA", "MINISTRY"]


def _response_deadline(tier_index: int) -> datetime:
    """
    Compute response deadline from now, applying demo acceleration.
    tier_index 0=DA (T1), 1=SNA (T3), 2=MINISTRY (T4)
    """
    hours_map = [
        settings.SLA_T1_RESPONSE_HOURS,
        settings.SLA_T3_ESCALATION_L2_HOURS,
        settings.SLA_T4_ESCALATION_L3_HOURS,
    ]
    real_hours = hours_map[min(tier_index, len(hours_map) - 1)]
    if settings.DEMO_MODE:
        real_seconds = real_hours * 3600 / settings.DEMO_ACCELERATION_FACTOR
    else:
        real_seconds = real_hours * 3600
    return datetime.utcnow() + timedelta(seconds=real_seconds)


def _find_authority_for_tier(db: Session, tier: str, project_state: str = "") -> Authority | None:
    """
    Find the first authority matching the given tier.
    In production this would filter by jurisdiction.
    For MVP: returns first match.
    """
    return db.query(Authority).filter_by(role=tier).first()


def create_case(
    db: Session,
    *,
    project_id: str,
    reason_codes: list[str],
    risk_score: int,
    payment_id: str | None = None,
) -> Case:
    """
    Auto-create a case when risk score exceeds threshold.
    Assigns to DA tier by default.
    Sends initial notification.
    """
    # Derive case ID from project ID
    suffix = project_id.split("-")[-1]
    case_id = f"CASE-{suffix}"

    # Check if case already exists for this project (avoid duplicates)
    existing = db.query(Case).filter_by(case_id=case_id).first()
    if existing and existing.status not in ("RESOLVED", "DISMISSED"):
        logger.info(f"Case {case_id} already open — updating risk score")
        existing.risk_score_at_creation = risk_score
        db.flush()
        return existing

    da = _find_authority_for_tier(db, "DA")
    tier_index = 0

    explanation = generate_case_explanation(reason_codes, project_id, risk_score)

    case = Case(
        case_id=case_id,
        project_id=project_id,
        reason_codes=reason_codes,
        risk_score_at_creation=risk_score,
        assigned_to_authority_id=da.authority_id if da else None,
        assigned_tier="DA",
        status="NOTIFIED",
        response_deadline=_response_deadline(tier_index),
        ai_explanation=explanation,
    )
    db.add(case)
    db.flush()

    # Audit
    write_event(
        db,
        event_type="CASE_CREATED",
        project_id=project_id,
        case_id=case_id,
        description=f"Case auto-created. Risk={risk_score}. Reasons={reason_codes}",
        new_value=case_id,
        metadata={"reason_codes": reason_codes, "risk_score": risk_score, "payment_id": payment_id},
    )

    # Notify DA
    if da:
        notif_content = generate_notification_body(
            case_id, project_id, risk_score, reason_codes, "District Authority"
        )
        send_notification(
            db,
            recipient_id=da.authority_id,
            recipient_role="DA",
            case_id=case_id,
            project_id=project_id,
            content=notif_content,
        )

    return case


def escalate_case(db: Session, case_id: str, reason: str = "TIMER_EXPIRED") -> Case | None:
    """
    Escalate a case to the next authority tier.
    Returns updated case, or None if already at top tier.
    """
    case = db.query(Case).filter_by(case_id=case_id).first()
    if not case:
        return None

    current_tier = case.assigned_tier
    tier_idx = TIERS.index(current_tier) if current_tier in TIERS else 0

    if tier_idx >= len(TIERS) - 1:
        logger.info(f"Case {case_id} already at top tier ({current_tier}). No further escalation.")
        return case

    next_tier = TIERS[tier_idx + 1]
    new_authority = _find_authority_for_tier(db, next_tier)

    # Record escalation event
    esc = EscalationEvent(
        case_id=case_id,
        from_tier=current_tier,
        to_tier=next_tier,
        reason=reason,
    )
    db.add(esc)

    old_status = case.status
    case.assigned_tier = next_tier
    case.assigned_to_authority_id = new_authority.authority_id if new_authority else None
    new_status = f"ESCALATED_L{tier_idx + 2}"
    case.status = new_status
    case.response_deadline = _response_deadline(tier_idx + 1)
    db.flush()

    write_event(
        db,
        event_type="CASE_ESCALATED",
        project_id=case.project_id,
        case_id=case_id,
        description=f"Escalated from {current_tier} to {next_tier}. Reason: {reason}",
        old_value=old_status,
        new_value=new_status,
        metadata={"from_tier": current_tier, "to_tier": next_tier, "reason": reason},
    )

    # Notify new authority
    if new_authority:
        content = (
            f"ESCALATED CASE: {case_id}\n"
            f"Project: {case.project_id}\n"
            f"Risk Score: {case.risk_score_at_creation}/100\n"
            f"Reasons: {', '.join(case.reason_codes or [])}\n"
            f"Escalated from {current_tier} due to: {reason}\n\n"
            f"Please review and take action immediately."
        )
        send_notification(
            db,
            recipient_id=new_authority.authority_id,
            recipient_role=next_tier,
            case_id=case_id,
            project_id=case.project_id,
            content=content,
        )

    return case


def send_reminder(db: Session, case_id: str) -> Case | None:
    """
    Send a reminder notification for an overdue case.
    Updates status to REMINDER_SENT and resets deadline.
    """
    case = db.query(Case).filter_by(case_id=case_id).first()
    if not case:
        return None

    old_status = case.status
    case.status = "REMINDER_SENT"

    # Reminder deadline = T2
    if settings.DEMO_MODE:
        reminder_seconds = settings.SLA_T2_REMINDER_HOURS * 3600 / settings.DEMO_ACCELERATION_FACTOR
    else:
        reminder_seconds = settings.SLA_T2_REMINDER_HOURS * 3600

    case.response_deadline = datetime.utcnow() + timedelta(seconds=reminder_seconds)
    db.flush()

    write_event(
        db,
        event_type="REMINDER_SENT",
        project_id=case.project_id,
        case_id=case_id,
        description="Reminder sent — authority has not responded within SLA",
        old_value=old_status,
        new_value="REMINDER_SENT",
    )

    authority = case.assigned_authority
    if authority:
        content = (
            f"REMINDER: Case {case_id} for project {case.project_id} "
            f"requires your response. Risk Score: {case.risk_score_at_creation}/100.\n"
            f"Please respond or the case will be escalated."
        )
        send_notification(
            db,
            recipient_id=authority.authority_id,
            recipient_role=case.assigned_tier,
            case_id=case_id,
            project_id=case.project_id,
            content=content,
        )

    return case


def resolve_case(
    db: Session,
    case_id: str,
    *,
    resolution_note: str,
    actor_id: str,
    actor_role: str,
    new_risk_score: int | None = None,
) -> Case | None:
    """
    Resolve or dismiss a case after authority action.
    """
    case = db.query(Case).filter_by(case_id=case_id).first()
    if not case:
        return None

    old_status = case.status
    case.status = "RESOLVED"
    case.resolved_at = datetime.utcnow()
    case.resolution_note = resolution_note
    db.flush()

    write_event(
        db,
        event_type="CASE_RESOLVED",
        project_id=case.project_id,
        case_id=case_id,
        actor_id=actor_id,
        actor_role=actor_role,
        description=f"Case resolved. Note: {resolution_note}",
        old_value=old_status,
        new_value="RESOLVED",
        metadata={"new_risk_score": new_risk_score},
    )

    return case
