"""
Payment Service — handles payment request lifecycle.

State machine:
    SUBMITTED → HELD_FOR_REVIEW | APPROVED_FOR_REVIEW
    APPROVED_FOR_REVIEW → PAYMENT_RELEASED
    HELD_FOR_REVIEW → APPROVED_FOR_REVIEW | REJECTED (after case resolution)
"""
from __future__ import annotations
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from config import settings
from models import (
    PaymentRequest, Project, ProgressRecord,
    ImageHash, RiskScoreEvent
)
from ai_engine.engine import AnalysisInput, run_analysis
from ai_engine import cv as cv_module
from services.audit import write_event
from services.cases import create_case

logger = logging.getLogger("payments")


def submit_payment_request(
    db: Session,
    *,
    project_id: str,
    requested_amount_inr: int,
    submitted_by: str,
    image_bytes: bytes | None = None,
    image_filename: str = "",
    trigger_demo_scenario: bool = False,
) -> dict:
    """
    Submit a payment request and run full AI pre-payment check.

    Returns a dict with:
        payment_id, status, risk_score, risk_breakdown, reason_codes,
        case_id (if created), pre_payment_check_result
    """
    project: Project | None = db.query(Project).filter_by(project_id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    # --- Gather project context ---
    total_paid = sum(
        p.requested_amount_inr for p in project.payments
        if p.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    payment_count = len(project.payments)

    latest_progress = (
        db.query(ProgressRecord)
        .filter_by(project_id=project_id)
        .order_by(ProgressRecord.timestamp.desc())
        .first()
    )
    reported_pct = latest_progress.reported_pct if latest_progress else 0
    ai_evidence_pct = latest_progress.ai_evidence_pct if latest_progress else None

    # Days since sanction
    days_since_sanction = 0
    if project.sanction_date:
        days_since_sanction = (datetime.utcnow() - project.sanction_date).days

    # Demo scenario override — force the spec values for MPL-2026-1042
    nlp_similarity = 0.0
    missing_docs = project.missing_documents or []
    rec_date = project.recommendation_date
    sanct_date = project.sanction_date

    if trigger_demo_scenario and project_id == "MPL-2026-1042":
        reported_pct = 85
        ai_evidence_pct = 31
        days_since_sanction = 180
        nlp_similarity = 0.89
        missing_docs = ["Site Inspection Report", "Technical Feasibility Certificate"]
        rec_date = datetime.utcnow() - timedelta(days=260)
        sanct_date = rec_date + timedelta(days=85)  # 85 days delay > 45d statutory

    # --- Build analysis input ---
    inp = AnalysisInput(
        project_id=project_id,
        recommended_amount_inr=project.recommended_amount_inr or 0,
        sanctioned_amount_inr=project.sanctioned_amount_inr or 0,
        reported_progress_pct=reported_pct,
        ai_evidence_pct=ai_evidence_pct,
        current_payment_amount=requested_amount_inr,
        total_paid_inr=total_paid,
        payment_count=payment_count,
        days_since_sanction=days_since_sanction,
        recommendation_date=rec_date,
        sanction_date=sanct_date,
        missing_documents=missing_docs,
        sc_spend_pct=project.mp.sc_spend_pct if project.mp else 0.0,
        st_spend_pct=project.mp.st_spend_pct if project.mp else 0.0,
        new_image_bytes=image_bytes,
        new_image_filename=image_filename,
        nlp_similarity_score=nlp_similarity,
    )

    result = run_analysis(inp, db)

    # --- Persist image hash if a new image was provided ---
    if result.new_phash and image_filename:
        img_path = ""
        if image_bytes:
            img_path = cv_module.save_upload(image_bytes, image_filename)

        ih = ImageHash(
            project_id=project_id,
            image_path=img_path,
            phash=result.new_phash,
            is_duplicate=result.photo_duplicate,
            duplicate_of_hash_id=result.duplicate_hash_id,
        )
        db.add(ih)
        db.flush()

    # --- Determine payment status ---
    risk_score = result.risk.risk_score
    if risk_score >= settings.RISK_THRESHOLD_CASE:
        payment_status = "HELD_FOR_REVIEW"
    else:
        payment_status = "APPROVED_FOR_REVIEW"

    # --- Create payment record ---
    pre_check = {
        "risk_score": risk_score,
        "sub_scores": result.risk.sub_scores,
        "reason_codes": result.risk.reason_codes,
        "detector_signals": result.risk.detector_signals,
        "financial": result.financial,
        "photo_duplicate": result.photo_duplicate,
        "duplicate_hash_id": result.duplicate_hash_id,
        "reported_progress_pct": reported_pct,
        "ai_evidence_pct": ai_evidence_pct,
    }

    payment = PaymentRequest(
        project_id=project_id,
        requested_amount_inr=requested_amount_inr,
        status=payment_status,
        pre_payment_check_result=pre_check,
        ai_risk_score_at_request=risk_score,
        submitted_by=submitted_by,
    )
    db.add(payment)
    db.flush()

    # --- Update project risk score ---
    old_score = project.risk_score
    project.risk_score = risk_score
    project.risk_breakdown = result.risk.sub_scores

    # --- Persist risk score event ---
    rse = RiskScoreEvent(
        project_id=project_id,
        risk_score=risk_score,
        previous_score=old_score,
        sub_scores=result.risk.sub_scores,
        trigger_event="PAYMENT_REQUESTED",
        detector_signals=result.risk.detector_signals,
    )
    db.add(rse)

    # --- Audit: risk score change ---
    write_event(
        db,
        event_type="RISK_SCORE_COMPUTED",
        project_id=project_id,
        description=f"Payment request triggered AI analysis. Risk: {old_score} → {risk_score}",
        old_value=str(old_score),
        new_value=str(risk_score),
        metadata={"trigger": "PAYMENT_REQUESTED", "sub_scores": result.risk.sub_scores},
    )

    if payment_status == "HELD_FOR_REVIEW":
        write_event(
            db,
            event_type="PAYMENT_HELD",
            project_id=project_id,
            description=f"Payment {payment.payment_id} held. Risk={risk_score}. Reasons={result.risk.reason_codes}",
            new_value="HELD_FOR_REVIEW",
            metadata={"payment_id": payment.payment_id, "amount": requested_amount_inr},
        )

    # --- Auto-create case if risk >= threshold ---
    case_id = None
    if risk_score >= settings.RISK_THRESHOLD_CASE:
        case = create_case(
            db,
            project_id=project_id,
            reason_codes=result.risk.reason_codes,
            risk_score=risk_score,
            payment_id=payment.payment_id,
        )
        case_id = case.case_id

    db.commit()

    return {
        "payment_id": payment.payment_id,
        "status": payment_status,
        "risk_score": risk_score,
        "previous_risk_score": old_score,
        "risk_breakdown": result.risk.sub_scores,
        "reason_codes": result.risk.reason_codes,
        "detector_signals": result.risk.detector_signals,
        "case_id": case_id,
        "pre_payment_check_result": pre_check,
        "action": result.risk.action,
    }


def approve_payment(db: Session, payment_id: str, approved_by: str) -> PaymentRequest | None:
    """DA approves a held payment."""
    payment = db.query(PaymentRequest).filter_by(payment_id=payment_id).first()
    if not payment:
        return None

    old_status = payment.status
    payment.status = "PAYMENT_RELEASED"
    payment.approved_by = approved_by
    payment.approved_at = datetime.utcnow()

    write_event(
        db,
        event_type="PAYMENT_RELEASED",
        project_id=payment.project_id,
        actor_id=approved_by,
        actor_role="DA",
        description=f"Payment {payment_id} approved and released",
        old_value=old_status,
        new_value="PAYMENT_RELEASED",
        metadata={"payment_id": payment_id},
    )
    db.commit()
    return payment


def reject_payment(db: Session, payment_id: str, rejected_by: str, reason: str) -> PaymentRequest | None:
    """DA rejects a payment."""
    payment = db.query(PaymentRequest).filter_by(payment_id=payment_id).first()
    if not payment:
        return None

    old_status = payment.status
    payment.status = "REJECTED"

    write_event(
        db,
        event_type="PAYMENT_REJECTED",
        project_id=payment.project_id,
        actor_id=rejected_by,
        actor_role="DA",
        description=f"Payment {payment_id} rejected. Reason: {reason}",
        old_value=old_status,
        new_value="REJECTED",
        metadata={"payment_id": payment_id, "reason": reason},
    )
    db.commit()
    return payment
