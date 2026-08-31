"""
Cost Overrun Detection Service (Slice 7 / F14).

Coordinates project cost-overrun analysis, unified risk recalculation,
intervention case creation (CASE-COST-{suffix}), audit trail, and notifications.
All existing infrastructure is reused -- no new engines or models introduced.

Demo scenario for MPL-2026-1042:
  Original estimate  = Rs.8,00,000  (Rs.8 lakh)
  Revised estimate   = Rs.10,50,000 (Rs.10.5 lakh)
  Actual expenditure = Rs.10,20,000 (Rs.10.2 lakh)

  Estimate increase       = Rs.2,50,000  (+31.25%)
  Actual vs original      = +27.50%
  Actual vs revised       = -2.86%
  Remaining balance       = Rs.30,000 surplus
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from config import settings
from models import (
    Project, ProgressRecord, PaymentRequest, RiskScoreEvent, Case, Authority, AuditEvent
)
from ai_engine.cost_overrun import analyze_cost_overrun
from ai_engine.engine import AnalysisInput, run_analysis
from services.audit import write_event
from services.notifications import send_notification

logger = logging.getLogger("cost_overrun")

# ---------------------------------------------------------------------------
# Demo scenario parameters for MPL-2026-1042
# ---------------------------------------------------------------------------
_DEMO_ORIGINAL_INR = 8_00_000    # Rs.8 lakh  (original administrative estimate)
_DEMO_REVISED_INR  = 10_50_000   # Rs.10.5 lakh (revised after scope/price change)
_DEMO_ACTUAL_INR   = 10_20_000   # Rs.10.2 lakh (cumulative incurred expenditure)


def _resolve_amounts(project: Project) -> tuple[int, int, int]:
    """
    Resolve (original_estimate, revised_estimate, actual_expenditure) for a project.

    For the primary demo project MPL-2026-1042 we use the canonical scenario values.
    For all other projects we derive:
      original_estimate  = recommended_amount_inr (MP initial proposal)
      revised_estimate   = sanctioned_amount_inr  (DA sanction)
      actual_expenditure = sum of all PAYMENT_RELEASED payments
    """
    if project.project_id == "MPL-2026-1042":
        return _DEMO_ORIGINAL_INR, _DEMO_REVISED_INR, _DEMO_ACTUAL_INR

    orig = project.recommended_amount_inr or 0
    rev  = project.sanctioned_amount_inr  or orig
    act  = sum(
        p.requested_amount_inr for p in project.payments
        if p.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    return orig, rev, act


def get_cost_overrun_analysis(db: Session, project_id: str) -> dict[str, Any]:
    """
    Retrieve cost-overrun analysis for a project.
    Read-only -- no state changes.
    """
    project = db.query(Project).filter_by(project_id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    orig, rev, act = _resolve_amounts(project)

    return analyze_cost_overrun(
        project_id=project.project_id,
        project_title=project.title,
        original_estimate_inr=orig,
        revised_estimate_inr=rev,
        actual_expenditure_inr=act,
        sanction_date=project.sanction_date,
        category=project.category,
        constituency=project.constituency,
    )


def scan_project_cost_overrun(db: Session, project_id: str) -> dict[str, Any]:
    """
    Execute cost-overrun scan for a project.
    - Evaluates original, revised, and actual budget trajectory
    - Recalculates unified risk score via existing engine
    - Escalates to INSPECTION_REQUIRED when overrun is severe and risk >= 70
    - Creates DA intervention case (CASE-COST-{suffix}) -- idempotent
    - Writes audit events and dispatches DA notification
    """
    project = db.query(Project).filter_by(project_id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    analysis = get_cost_overrun_analysis(db, project_id)
    overrun_status = analysis["overrun_status"]
    risk_level = analysis["risk_level"]
    estimate_increase_pct = analysis["estimate_increase_pct"]
    actual_vs_original_pct = analysis["actual_vs_original_pct"]
    flags = analysis["overrun_flags"]

    old_risk = project.risk_score
    old_status = project.status

    # -----------------------------------------------------------------------
    # Recalculate unified risk using the existing engine
    # -----------------------------------------------------------------------
    latest_progress = (
        db.query(ProgressRecord)
        .filter_by(project_id=project_id)
        .order_by(ProgressRecord.timestamp.desc())
        .first()
    )

    days_since_sanction = 0
    if project.sanction_date:
        days_since_sanction = max((datetime.utcnow() - project.sanction_date).days, 0)

    rec_date = project.recommendation_date
    sanct_date = project.sanction_date
    missing_docs = project.missing_documents or []
    nlp_sim = 0.0

    reported_pct = 30
    ai_evidence_pct = None
    if latest_progress:
        reported_pct = latest_progress.reported_pct or 30
        ai_evidence_pct = latest_progress.ai_evidence_pct

    # Demo-scenario calibration for MPL-2026-1042
    if project_id == "MPL-2026-1042":
        missing_docs = ["Site Inspection Report", "Technical Feasibility Certificate"]
        rec_date = datetime.utcnow() - timedelta(days=260)
        sanct_date = rec_date + timedelta(days=85)
        reported_pct = 80
        ai_evidence_pct = 31
        nlp_sim = 0.89

    inp = AnalysisInput(
        project_id=project_id,
        recommended_amount_inr=project.recommended_amount_inr or 0,
        sanctioned_amount_inr=project.sanctioned_amount_inr or 0,
        reported_progress_pct=reported_pct,
        ai_evidence_pct=ai_evidence_pct,
        current_payment_amount=0,
        total_paid_inr=analysis["actual_expenditure_inr"],
        payment_count=len(project.payments),
        days_since_sanction=days_since_sanction,
        recommendation_date=rec_date,
        sanction_date=sanct_date,
        missing_documents=missing_docs,
        sc_spend_pct=project.mp.sc_spend_pct if project.mp else 0.0,
        st_spend_pct=project.mp.st_spend_pct if project.mp else 0.0,
        nlp_similarity_score=nlp_sim,
    )

    analysis_res = run_analysis(inp, db)

    # For demo project, boost duplicate signal
    if project_id == "MPL-2026-1042":
        from ai_engine import risk as risk_module
        analysis_res.risk = risk_module.compute_risk_score(
            financial=analysis_res.financial,
            compliance=analysis_res.compliance,
            photo_duplicate=True,
            nlp_similarity_score=nlp_sim,
        )

    updated_risk = analysis_res.risk.risk_score
    project.risk_score = updated_risk
    project.risk_breakdown = analysis_res.risk.sub_scores

    # Persist risk score event
    rse = RiskScoreEvent(
        project_id=project_id,
        risk_score=updated_risk,
        previous_score=old_risk,
        sub_scores=analysis_res.risk.sub_scores,
        trigger_event="COST_OVERRUN_SCAN",
        detector_signals=analysis_res.risk.detector_signals,
    )
    db.add(rse)

    # Write audit event
    write_event(
        db,
        event_type="COST_OVERRUN_DETECTED" if len(flags) > 0 else "COST_OVERRUN_AUDIT_COMPLETED",
        project_id=project_id,
        description=(
            f"Cost-overrun scan: Status={overrun_status}, "
            f"Estimate increase={estimate_increase_pct:+.2f}%, "
            f"Actual vs original={actual_vs_original_pct:+.2f}%, "
            f"Flags={flags}. Risk: {old_risk} -> {updated_risk}"
        ),
        old_value=str(old_risk),
        new_value=str(updated_risk),
        metadata={
            "overrun_status": overrun_status,
            "estimate_increase_pct": estimate_increase_pct,
            "actual_vs_original_pct": actual_vs_original_pct,
            "overrun_flags": flags,
        },
    )

    case_id = None
    inspection_triggered = False
    action_taken = "MONITOR"

    # Escalate when risk is sufficient and overrun is significant
    should_escalate = (
        overrun_status in ("OVERRUN_CONFIRMED", "SEVERE_ESCALATION", "OVERRUN_RISK", "COST_ESCALATION")
        and len(flags) >= 1
        and updated_risk >= settings.RISK_THRESHOLD_CASE
    )

    if should_escalate:
        inspection_triggered = True
        project.status = "INSPECTION_REQUIRED"
        action_taken = "INSPECTION_REQUIRED"

        suffix = project_id.split("-")[-1]
        case_id = f"CASE-COST-{suffix}"

        existing_case = db.query(Case).filter_by(case_id=case_id).first()
        if existing_case and existing_case.status not in ("RESOLVED", "DISMISSED"):
            existing_case.risk_score_at_creation = updated_risk
            existing_case.status = "INSPECTION_REQUIRED"
            logger.info(f"Cost-overrun case {case_id} already active -- updated.")
        else:
            da = db.query(Authority).filter_by(role="DA").first()
            reason_codes = list(analysis_res.risk.reason_codes)
            if "COST_OVERRUN" not in reason_codes:
                reason_codes.append("COST_OVERRUN")
            reason_codes = list(dict.fromkeys(reason_codes))

            overrun_case = Case(
                case_id=case_id,
                project_id=project_id,
                reason_codes=reason_codes,
                risk_score_at_creation=updated_risk,
                assigned_to_authority_id=da.authority_id if da else None,
                assigned_tier="DA",
                status="INSPECTION_REQUIRED",
                response_deadline=datetime.utcnow() + timedelta(hours=48),
                ai_explanation=analysis["analysis_summary"],
            )
            db.add(overrun_case)
            db.flush()

            # Audit event for case creation
            write_event(
                db,
                event_type="CASE_CREATED",
                project_id=project_id,
                case_id=case_id,
                description=(
                    f"Cost-overrun case created: {overrun_status}. "
                    f"Estimate increase: {estimate_increase_pct:+.2f}%. "
                    f"Risk: {updated_risk}"
                ),
                new_value="INSPECTION_REQUIRED",
                metadata={
                    "reason_codes": reason_codes,
                    "case_id": case_id,
                    "source": "COST_OVERRUN_SCAN",
                    "overrun_status": overrun_status,
                },
            )

            # DA notification
            if da:
                threshold = analysis["monitoring_threshold_pct"]
                da_content = (
                    f"COST OVERRUN ALERT -- {overrun_status}\n"
                    f"Case: {case_id} | Project: {project_id}\n"
                    f"Original Estimate: Rs.{analysis['original_estimate_inr']:,}\n"
                    f"Revised Estimate:  Rs.{analysis['revised_estimate_inr']:,} "
                    f"(+{estimate_increase_pct:.2f}%)\n"
                    f"Actual Expenditure: Rs.{analysis['actual_expenditure_inr']:,} "
                    f"({actual_vs_original_pct:+.2f}% vs original)\n"
                    f"Configured monitoring threshold: {threshold:.1f}%\n"
                    f"Risk Score Escalated to: {updated_risk}/100\n\n"
                    f"Directive: {analysis['recommended_action']}"
                )
                send_notification(
                    db,
                    recipient_id=da.authority_id,
                    recipient_role="DA",
                    case_id=case_id,
                    project_id=project_id,
                    content=da_content,
                )

    db.commit()

    return {
        "project_id": project_id,
        "original_estimate_inr": analysis["original_estimate_inr"],
        "revised_estimate_inr": analysis["revised_estimate_inr"],
        "actual_expenditure_inr": analysis["actual_expenditure_inr"],
        "estimate_increase_inr": analysis["estimate_increase_inr"],
        "estimate_increase_pct": estimate_increase_pct,
        "actual_vs_original_pct": actual_vs_original_pct,
        "actual_vs_revised_pct": analysis["actual_vs_revised_pct"],
        "remaining_balance_inr": analysis["remaining_balance_inr"],
        "monitoring_threshold_pct": analysis["monitoring_threshold_pct"],
        "overrun_flags": flags,
        "overrun_status": overrun_status,
        "risk_level": risk_level,
        "previous_risk_score": old_risk,
        "updated_risk_score": updated_risk,
        "risk_breakdown": analysis_res.risk.sub_scores,
        "old_project_status": old_status,
        "new_project_status": project.status,
        "case_id": case_id,
        "inspection_triggered": inspection_triggered,
        "action_taken": action_taken,
        "recommended_action": analysis["recommended_action"],
        "analysis_summary": analysis["analysis_summary"],
    }
