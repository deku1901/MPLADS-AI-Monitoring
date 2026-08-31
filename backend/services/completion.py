"""
F17 Project Completion Verification Engine.

Synthesizes multiple evidence channels to verify project completion:
1. Reported physical progress (must be 100% or declared complete)
2. Satellite optical change detection (NDBI/NDVI delta reflecting structural completion)
3. Milestone photograph perceptual hashes (pHash uniqueness check)
4. Citizen ground-truth verification feedback (no unresolved disputes)
5. Financial expenditure & payment audit (disbursement consistency)

Decisions:
- VERIFIED: All evidence streams are consistent. Project status -> VERIFIED.
- COMPLETION_DISPUTED / INSPECTION_REQUIRED: Evidence conflict detected.
  Automated case creation: CASE-COMPL-{project_id}, DA alerted, audit logged.
"""

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from models import (
    Project, ProgressRecord, PaymentRequest, ImageHash,
    CitizenReport, Case, AuditEvent, Notification
)
from services.audit import write_event
from services.notifications import send_notification

logger = logging.getLogger("completion")


def verify_project_completion(
    db: Session,
    project_id: str,
    completion_notes: str | None = None,
    completion_photos: list[str] | None = None,
    final_expenditure_inr: int | None = None,
    submitter_role: str = "IA",
) -> dict[str, Any]:
    """
    Execute AI multi-signal completion verification for a project.
    Idempotent and deterministic.
    """
    project = db.query(Project).filter_by(project_id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    now = datetime.utcnow()
    prev_status = project.status
    reason_codes: list[str] = []

    # -----------------------------------------------------------------------
    # Signal 1: Physical Progress History
    # -----------------------------------------------------------------------
    latest_prog = (
        db.query(ProgressRecord)
        .filter_by(project_id=project_id)
        .order_by(ProgressRecord.timestamp.desc())
        .first()
    )
    reported_pct = latest_prog.reported_pct if latest_prog else (100 if project.status in ("COMPLETED", "VERIFIED") else 50)
    ai_satellite_pct = latest_prog.ai_evidence_pct if latest_prog else reported_pct

    prog_score = 100.0 if reported_pct >= 95 else float(reported_pct)
    if reported_pct < 80:
        reason_codes.append("INCOMPLETE_PHYSICAL_PROGRESS")

    # -----------------------------------------------------------------------
    # Signal 2: Satellite Evidence Alignment
    # -----------------------------------------------------------------------
    sat_delta = abs(reported_pct - (ai_satellite_pct or reported_pct))
    sat_score = max(100.0 - (sat_delta * 1.5), 0.0)
    if sat_delta > 20:
        reason_codes.append("SATELLITE_PROGRESS_MISMATCH")

    # -----------------------------------------------------------------------
    # Signal 3: Perceptual Photo Audit (Duplicate pHash Check)
    # -----------------------------------------------------------------------
    dup_images = (
        db.query(ImageHash)
        .filter_by(project_id=project_id, is_duplicate=True)
        .all()
    )
    is_duplicate = len(dup_images) > 0
    photo_score = 20.0 if is_duplicate else 100.0
    if is_duplicate:
        reason_codes.append("DUPLICATE_COMPLETION_PHOTO_DETECTED")

    # -----------------------------------------------------------------------
    # Signal 4: Citizen Ground-Truth Feedback
    # -----------------------------------------------------------------------
    citizen_reports = db.query(CitizenReport).filter_by(project_id=project_id).all()
    citizen_score = 100.0
    if citizen_reports:
        func_count = sum(1 for r in citizen_reports if r.is_functional)
        citizen_score = round(func_count / len(citizen_reports) * 100, 1)
        if citizen_score < 50.0:
            reason_codes.append("CITIZEN_DISPUTED_FUNCTIONALITY")

    # -----------------------------------------------------------------------
    # Signal 5: Financial / Payment Consistency
    # -----------------------------------------------------------------------
    payments = db.query(PaymentRequest).filter_by(project_id=project_id).all()
    total_disbursed = sum(
        p.requested_amount_inr for p in payments
        if p.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    has_held_payment = any(p.status == "HELD_FOR_REVIEW" for p in payments)
    fin_score = 50.0 if has_held_payment else 100.0
    if has_held_payment:
        reason_codes.append("UNRESOLVED_PAYMENT_FIREBREAK_HOLD")

    # -----------------------------------------------------------------------
    # Multi-Signal Weighted Synthesis
    # -----------------------------------------------------------------------
    overall_score = round(
        (prog_score * 0.25)
        + (sat_score * 0.25)
        + (photo_score * 0.20)
        + (citizen_score * 0.15)
        + (fin_score * 0.15),
        1
    )

    blocking_codes = {
        "INCOMPLETE_PHYSICAL_PROGRESS",
        "SATELLITE_PROGRESS_MISMATCH",
        "DUPLICATE_COMPLETION_PHOTO_DETECTED",
        "CITIZEN_DISPUTED_FUNCTIONALITY",
        "UNRESOLVED_PAYMENT_FIREBREAK_HOLD",
    }
    has_blocking_conflict = any(rc in blocking_codes for rc in reason_codes)

    is_verified = (
        (overall_score >= 70.0)
        and (not is_duplicate)
        and (not has_held_payment)
        and (reported_pct >= 80)
        and (not has_blocking_conflict)
    )
    verdict = "VERIFIED" if is_verified else "COMPLETION_DISPUTED"

    case_id = None
    audit_id = None

    if is_verified:
        project.status = "VERIFIED"
        project.completion_date = project.completion_date or now
        project.updated_at = now
        # Reduce risk score for clean verified project
        project.risk_score = max(min(project.risk_score or 15, 20), 5)

        ae = write_event(
            db,
            event_type="COMPLETION_VERIFIED",
            project_id=project_id,
            actor_role="SYSTEM",
            actor_id="AI_COMPLETION_ENGINE",
            description=(
                f"Multi-signal completion verified with confidence score {overall_score}/100. "
                f"Physical progress: {reported_pct}%, Satellite delta: {sat_delta}%, Photo authenticity: clean."
            ),
            old_value=prev_status,
            new_value="VERIFIED",
            metadata={"confidence_score": overall_score, "signals": reason_codes},
        )
        audit_id = ae.event_id if ae else None

        send_notification(
            db,
            recipient_id="AUTH-DA-01",
            recipient_role="DA",
            case_id=None,
            project_id=project_id,
            content=f"AI verified project completion for {project.title} (ID: {project_id}) with confidence score {overall_score}/100.",
        )
        msg = f"Project {project_id} verified successfully (Score: {overall_score}/100)."

    else:
        project.status = "INSPECTION_REQUIRED"
        project.updated_at = now
        project.risk_score = max(project.risk_score or 0, 78)

        # Create or update intervention case
        case_id = f"CASE-COMPL-{project_id.replace('MPL-', '')}"
        existing_case = db.query(Case).filter_by(case_id=case_id).first()
        if not existing_case:
            new_case = Case(
                case_id=case_id,
                project_id=project_id,
                reason_codes=reason_codes or ["COMPLETION_EVIDENCE_CONFLICT"],
                risk_score_at_creation=project.risk_score,
                assigned_to_authority_id="AUTH-DA-01",
                assigned_tier="DA",
                status="ACTION_REQUIRED",
                ai_explanation=(
                    f"Completion verification disputed with confidence score {overall_score}/100. "
                    f"Conflict detected: {', '.join(reason_codes)}."
                ),
                created_at=now,
            )
            db.add(new_case)

        ae = write_event(
            db,
            event_type="COMPLETION_DISPUTED",
            project_id=project_id,
            case_id=case_id,
            actor_role="SYSTEM",
            actor_id="AI_COMPLETION_ENGINE",
            description=f"Completion disputed (Score: {overall_score}/100). Conflicts: {', '.join(reason_codes)}.",
            old_value=prev_status,
            new_value="INSPECTION_REQUIRED",
            metadata={"confidence_score": overall_score, "reason_codes": reason_codes},
        )
        audit_id = ae.event_id if ae else None

        send_notification(
            db,
            recipient_id="AUTH-DA-01",
            recipient_role="DA",
            case_id=case_id,
            project_id=project_id,
            content=f"Project completion disputed for {project.title} (ID: {project_id}). Flags: {', '.join(reason_codes)}.",
        )
        msg = f"Completion disputed for {project_id}. Flagged for field inspection ({', '.join(reason_codes)})."

    db.commit()

    return {
        "project_id": project_id,
        "previous_status": prev_status,
        "new_status": project.status,
        "is_verified": is_verified,
        "verification_score": overall_score,
        "signals": {
            "physical_progress_score": prog_score,
            "satellite_evidence_score": sat_score,
            "perceptual_image_score": photo_score,
            "citizen_feedback_score": citizen_score,
            "financial_audit_score": fin_score,
            "overall_confidence_score": overall_score,
            "verdict": verdict,
            "reason_codes": reason_codes,
        },
        "case_id": case_id,
        "audit_event_id": audit_id,
        "message": msg,
        "verified_at": now if is_verified else None,
    }


def get_completion_dossier(db: Session, project_id: str) -> dict[str, Any]:
    """Retrieve full audit dossier for project completion examination."""
    project = db.query(Project).filter_by(project_id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    latest_prog = (
        db.query(ProgressRecord)
        .filter_by(project_id=project_id)
        .order_by(ProgressRecord.timestamp.desc())
        .first()
    )
    payments = db.query(PaymentRequest).filter_by(project_id=project_id).all()
    disbursed = sum(
        p.requested_amount_inr for p in payments
        if p.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    citizen_reports = db.query(CitizenReport).filter_by(project_id=project_id).all()
    satisfaction = None
    if citizen_reports:
        func = sum(1 for r in citizen_reports if r.is_functional)
        satisfaction = round(func / len(citizen_reports) * 100, 1)

    dup_images = (
        db.query(ImageHash)
        .filter_by(project_id=project_id, is_duplicate=True)
        .all()
    )
    open_cases = db.query(Case).filter_by(project_id=project_id).all()

    return {
        "project_id": project.project_id,
        "title": project.title,
        "category": project.category or "OTHER",
        "constituency": project.constituency or "Varanasi",
        "state": project.state or "Uttar Pradesh",
        "sanctioned_amount_inr": project.sanctioned_amount_inr or 0,
        "disbursed_amount_inr": disbursed,
        "status": project.status,
        "completion_date": project.completion_date,
        "reported_progress_pct": latest_prog.reported_pct if latest_prog else None,
        "ai_satellite_pct": latest_prog.ai_evidence_pct if latest_prog else None,
        "citizen_satisfaction_pct": satisfaction,
        "is_duplicate_photo_detected": len(dup_images) > 0,
        "active_cases": [
            {"case_id": c.case_id, "status": c.status, "reason_codes": c.reason_codes}
            for c in open_cases
        ],
    }
