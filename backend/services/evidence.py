"""
Evidence Service — handles authority evidence submission and triggers AI re-evaluation.

When an authority submits evidence for a case:
    1. Evidence record is persisted
    2. LLM summarizes the evidence
    3. Risk engine re-evaluates with updated signals
    4. Project risk score is updated
    5. Case status transitions to UNDER_REVIEW → RESOLVED or AWAITING_RESPONSE
    6. Audit events are written
"""
from __future__ import annotations
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from config import settings
from models import (
    Case, EvidenceSubmission, Project, ProgressRecord,
    RiskScoreEvent, PaymentRequest
)
from ai_engine.engine import AnalysisInput, run_analysis
from ai_engine.llm import generate_case_explanation
from ai_engine import cv as cv_module
from services.audit import write_event
from services.cases import resolve_case

logger = logging.getLogger("evidence")


def submit_evidence(
    db: Session,
    case_id: str,
    *,
    submitted_by: str,
    submitted_role: str,
    content_type: str,       # TEXT | DOCUMENT | IMAGE
    content_text: str = "",
    image_bytes: bytes | None = None,
    image_filename: str = "",
    justification_reduces_duplicate: bool = False,
) -> dict:
    """
    Submit evidence for a case and trigger AI re-evaluation.

    The 'justification_reduces_duplicate' flag simulates the case where
    an authority provides a valid technical explanation that the AI accepts
    as reducing the duplicate/compliance risk signal.
    """
    case: Case | None = db.query(Case).filter_by(case_id=case_id).first()
    if not case:
        raise ValueError(f"Case {case_id} not found")

    project: Project | None = db.query(Project).filter_by(project_id=case.project_id).first()
    if not project:
        raise ValueError(f"Project {case.project_id} not found")

    risk_before = project.risk_score

    # --- Save image if provided ---
    img_path = ""
    new_phash = None
    if image_bytes and image_filename:
        img_path = cv_module.save_upload(image_bytes, image_filename)
        new_phash = cv_module.compute_phash(image_bytes)

    # --- LLM summary ---
    llm_summary = _summarize_evidence(content_type, content_text, image_filename)

    # --- Create evidence record ---
    evidence = EvidenceSubmission(
        case_id=case_id,
        submitted_by=submitted_by,
        content_type=content_type,
        content_text=content_text or None,
        content_path=img_path or None,
        llm_summary=llm_summary,
        risk_score_before=risk_before,
    )
    db.add(evidence)
    db.flush()

    write_event(
        db,
        event_type="EVIDENCE_SUBMITTED",
        project_id=case.project_id,
        case_id=case_id,
        actor_id=submitted_by,
        actor_role=submitted_role,
        description=f"Evidence submitted ({content_type}). LLM: {llm_summary[:80]}",
        metadata={"content_type": content_type, "evidence_id": evidence.evidence_id},
    )

    # --- Update case status to UNDER_REVIEW ---
    case.status = "UNDER_REVIEW"
    db.flush()

    # --- Re-run AI analysis ---
    new_risk = _recompute_risk(
        project=project,
        db=db,
        justification_reduces_duplicate=justification_reduces_duplicate,
        new_image_bytes=image_bytes,
        new_image_filename=image_filename,
    )

    # Update evidence record with after score
    evidence.risk_score_after = new_risk
    project.risk_score = new_risk
    db.flush()

    # Persist risk score event
    rse = RiskScoreEvent(
        project_id=project.project_id,
        risk_score=new_risk,
        previous_score=risk_before,
        trigger_event="EVIDENCE_SUBMITTED",
    )
    db.add(rse)

    write_event(
        db,
        event_type="RISK_SCORE_COMPUTED",
        project_id=project.project_id,
        case_id=case_id,
        actor_id=submitted_by,
        actor_role=submitted_role,
        description=f"Risk re-evaluated after evidence. {risk_before} → {new_risk}",
        old_value=str(risk_before),
        new_value=str(new_risk),
        metadata={"trigger": "EVIDENCE_SUBMITTED"},
    )

    # --- Case transition ---
    if new_risk < settings.RISK_THRESHOLD_CASE:
        resolve_case(
            db,
            case_id,
            resolution_note=f"Risk reduced to {new_risk} after evidence review. {llm_summary[:120]}",
            actor_id=submitted_by,
            actor_role=submitted_role,
            new_risk_score=new_risk,
        )
        case_status = "RESOLVED"

        # Release any held payment for this project
        _release_held_payment(db, project.project_id, submitted_by)
    else:
        case.status = "AWAITING_RESPONSE"
        db.flush()
        case_status = "AWAITING_RESPONSE"
        write_event(
            db,
            event_type="STATUS_CHANGE",
            project_id=project.project_id,
            case_id=case_id,
            description=f"Risk still {new_risk} after evidence — case remains open",
            old_value="UNDER_REVIEW",
            new_value="AWAITING_RESPONSE",
        )

    db.commit()

    return {
        "evidence_id": evidence.evidence_id,
        "case_id": case_id,
        "risk_before": risk_before,
        "risk_after": new_risk,
        "case_status": case_status,
        "llm_summary": llm_summary,
    }


def _summarize_evidence(content_type: str, content_text: str, filename: str) -> str:
    """Generate LLM summary of submitted evidence."""
    if content_type == "TEXT" and content_text:
        # Simple mock summary — LLM would elaborate here
        first = content_text[:200]
        return f"Authority justification: \"{first}{'...' if len(content_text) > 200 else ''}\""
    elif content_type in ("DOCUMENT", "IMAGE"):
        return f"Supporting {content_type.lower()} '{filename}' submitted by authority for review."
    return "Evidence submitted for case review."


def _recompute_risk(
    project: Project,
    db: Session,
    justification_reduces_duplicate: bool,
    new_image_bytes: bytes | None,
    new_image_filename: str,
) -> int:
    """
    Re-run the AI analysis pipeline with updated signals.

    If justification_reduces_duplicate is True, the NLP/duplicate score is
    zeroed out (simulating the authority having explained the similarity).
    """
    latest_progress = (
        db.query(ProgressRecord)
        .filter_by(project_id=project.project_id)
        .order_by(ProgressRecord.timestamp.desc())
        .first()
    )
    reported_pct = latest_progress.reported_pct if latest_progress else 0
    ai_evidence_pct = latest_progress.ai_evidence_pct if latest_progress else None

    days_since_sanction = 0
    if project.sanction_date:
        days_since_sanction = (datetime.utcnow() - project.sanction_date).days

    total_paid = sum(
        p.requested_amount_inr for p in project.payments
        if p.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )

    inp = AnalysisInput(
        project_id=project.project_id,
        recommended_amount_inr=project.recommended_amount_inr or 0,
        sanctioned_amount_inr=project.sanctioned_amount_inr or 0,
        reported_progress_pct=reported_pct,
        ai_evidence_pct=ai_evidence_pct,
        current_payment_amount=0,
        total_paid_inr=total_paid,
        payment_count=len(project.payments),
        days_since_sanction=days_since_sanction,
        recommendation_date=project.recommendation_date,
        sanction_date=project.sanction_date,
        missing_documents=project.missing_documents or [],
        sc_spend_pct=project.mp.sc_spend_pct if project.mp else 0.0,
        st_spend_pct=project.mp.st_spend_pct if project.mp else 0.0,
        new_image_bytes=new_image_bytes,
        new_image_filename=new_image_filename,
        nlp_similarity_score=0.0,  # Slice 2+
    )

    result = run_analysis(inp, db)

    # If authority justification explicitly accepted, reduce financial score
    if justification_reduces_duplicate:
        # Cap the financial score to reduce overall risk
        sub = result.risk.sub_scores
        # Reduce duplicate and financial contribution
        adjusted = result.risk.risk_score - int(sub.get("duplicate", 0) * 0.4)
        return max(0, min(adjusted, 100))

    return result.risk.risk_score


def _release_held_payment(db: Session, project_id: str, approved_by: str) -> None:
    """Release any HELD_FOR_REVIEW payment for the project after case resolution."""
    held_payments = (
        db.query(PaymentRequest)
        .filter_by(project_id=project_id, status="HELD_FOR_REVIEW")
        .all()
    )
    for payment in held_payments:
        payment.status = "APPROVED_FOR_REVIEW"
        payment.approved_by = approved_by
        payment.approved_at = datetime.utcnow()
        write_event(
            db,
            event_type="PAYMENT_RELEASED",
            project_id=project_id,
            description=f"Payment {payment.payment_id} released after case resolution",
            old_value="HELD_FOR_REVIEW",
            new_value="APPROVED_FOR_REVIEW",
            metadata={"payment_id": payment.payment_id},
        )
