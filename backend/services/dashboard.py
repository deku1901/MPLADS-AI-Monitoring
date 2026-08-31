"""
Unified AI Analytics Dashboard Service (Slice 8 / F15).

Aggregates portfolio-wide telemetry and actionable intelligence across all
completed modules (F1–F14):
  - F1: Payment Firebreak & Autonomous Fund Lock
  - F2: Pre-Sanction Recommendation Screening & NLP Duplicate Detection
  - F3: Citizen Ground-Truth Verification ("Ye Thik Karke Dikhao")
  - F4: Split-Work NLP Anomaly Detection & Unified Tender Enforcement
  - F11: Satellite Remote Sensing & Physical Progress Discrepancy Verification
  - F12: Project Delay & Stalled Work Detection Engine
  - F13: Financial & Expenditure Analytics Engine
  - F14: Cost Overrun Detection & Budget Trajectory Engine
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from config import settings
from models import (
    Project, ProgressRecord, PaymentRequest, RiskScoreEvent,
    Case, Authority, AuditEvent, CitizenReport
)

logger = logging.getLogger("dashboard")


def _get_risk_tier(score: int) -> str:
    if score >= 85:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def get_portfolio_dashboard(db: Session) -> dict[str, Any]:
    """
    Generate unified portfolio analytics and decision intelligence.
    Read-only -- aggregates across all existing database tables.
    """
    # 1. Fetch all projects
    projects = db.query(Project).all()
    total_projects = len(projects)

    total_recommended = sum(p.recommended_amount_inr or 0 for p in projects)
    total_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in projects)

    # 2. Fetch all payments
    payments = db.query(PaymentRequest).all()
    total_disbursed = sum(
        p.requested_amount_inr for p in payments
        if p.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    total_pending_payments = sum(
        p.requested_amount_inr for p in payments
        if p.status in ("SUBMITTED", "HELD_FOR_REVIEW")
    )
    payment_holds_count = sum(1 for p in payments if p.status == "HELD_FOR_REVIEW")

    total_unreleased = max(total_sanctioned - total_disbursed, 0)
    overall_fund_utilization_pct = (
        round((total_disbursed / total_sanctioned * 100), 2)
        if total_sanctioned > 0 else 0.0
    )

    # 3. Status breakdown & statutory compliance
    status_counts: dict[str, int] = {}
    compliant_sanctions_count = 0
    total_sanctioned_projects = 0

    for p in projects:
        status_counts[p.status] = status_counts.get(p.status, 0) + 1
        if p.sanction_date and p.recommendation_date:
            total_sanctioned_projects += 1
            days = (p.sanction_date - p.recommendation_date).days
            if days <= getattr(settings, "SLA_SANCTION_DEADLINE_DAYS", 45):
                compliant_sanctions_count += 1

    statutory_deadline_compliance_pct = (
        round((compliant_sanctions_count / total_sanctioned_projects * 100), 1)
        if total_sanctioned_projects > 0 else 100.0
    )

    # 4. Risk distribution
    low_risk = 0
    med_risk = 0
    high_risk = 0
    critical_risk = 0
    total_risk_score = 0

    for p in projects:
        score = p.risk_score or 0
        total_risk_score += score
        if score >= 85:
            critical_risk += 1
        elif score >= 70:
            high_risk += 1
        elif score >= 40:
            med_risk += 1
        else:
            low_risk += 1

    avg_risk_score = round(total_risk_score / total_projects, 1) if total_projects > 0 else 0.0

    risk_tiers = [
        {
            "tier": "LOW",
            "range": "0–39",
            "count": low_risk,
            "percentage": round((low_risk / total_projects * 100), 1) if total_projects > 0 else 0.0,
            "color": "#166534",
            "label": "Low Risk / Compliant",
        },
        {
            "tier": "MEDIUM",
            "range": "40–69",
            "count": med_risk,
            "percentage": round((med_risk / total_projects * 100), 1) if total_projects > 0 else 0.0,
            "color": "#B45309",
            "label": "Moderate Surveillance",
        },
        {
            "tier": "HIGH",
            "range": "70–84",
            "count": high_risk,
            "percentage": round((high_risk / total_projects * 100), 1) if total_projects > 0 else 0.0,
            "color": "#C2410C",
            "label": "High Risk / Escalated",
        },
        {
            "tier": "CRITICAL",
            "range": "85–100",
            "count": critical_risk,
            "percentage": round((critical_risk / total_projects * 100), 1) if total_projects > 0 else 0.0,
            "color": "#B3261E",
            "label": "Critical Intervention",
        },
    ]

    # 5. Fetch open cases
    all_cases = db.query(Case).all()
    open_cases_list = [c for c in all_cases if c.status != "RESOLVED"]
    open_cases_count = len(open_cases_list)

    # 6. Fetch split-work / tender enforcements
    mandatory_tender_count = sum(1 for p in projects if p.mandatory_tender)

    # 7. Citizen verification disputes
    citizen_reports = db.query(CitizenReport).all()
    citizen_disputes_count = sum(1 for r in citizen_reports if not r.is_functional)

    # 8. Authority workload
    authorities = db.query(Authority).all()
    authority_workload = []
    for auth in authorities:
        assigned = [c for c in open_cases_list if c.assigned_tier == auth.role]
        sla_breaches = 0
        now = datetime.utcnow()
        for c in assigned:
            if c.response_deadline and c.response_deadline < now:
                sla_breaches += 1

        authority_workload.append({
            "authority_id": auth.authority_id,
            "name": auth.name,
            "role": auth.role,
            "jurisdiction": f"{auth.jurisdiction_district or ''}, {auth.jurisdiction_state or ''}".strip(", "),
            "email": auth.email,
            "assigned_open_cases": len(assigned),
            "sla_breach_count": sla_breaches,
        })

    # 9. Enriched Projects Table
    enriched_projects = []
    satellite_discrepancies_count = 0
    delayed_stalled_count = 0
    fiscal_anomalies_count = 0
    cost_overruns_count = 0

    for p in projects:
        # Latest progress
        latest_prog = (
            db.query(ProgressRecord)
            .filter_by(project_id=p.project_id)
            .order_by(ProgressRecord.timestamp.desc())
            .first()
        )
        reported_pct = latest_prog.reported_pct if latest_prog else None
        ai_pct = latest_prog.ai_evidence_pct if latest_prog else None

        # Active case for project
        p_active_case = next((c for c in open_cases_list if c.project_id == p.project_id), None)

        # Flags accumulation
        flags: list[str] = []
        if p.sanctioned_amount_inr and p.recommended_amount_inr:
            var_pct = (p.sanctioned_amount_inr - p.recommended_amount_inr) / p.recommended_amount_inr * 100
            if var_pct > 25:
                flags.append("COST_VARIANCE")
                fiscal_anomalies_count += 1
                cost_overruns_count += 1

        if p.mandatory_tender:
            flags.append("MANDATORY_TENDER_ENFORCED")

        if reported_pct is not None and ai_pct is not None and abs(reported_pct - ai_pct) > 20:
            flags.append("PROGRESS_MISMATCH")
            satellite_discrepancies_count += 1

        if p.status == "INSPECTION_REQUIRED":
            flags.append("INSPECTION_REQUIRED")

        # Disbursed for this project
        p_disbursed = sum(
            pm.requested_amount_inr for pm in p.payments
            if pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
        )

        enriched_projects.append({
            "project_id": p.project_id,
            "title": p.title,
            "category": p.category or "INFRASTRUCTURE",
            "constituency": p.constituency or "Varanasi",
            "state": p.state or "Uttar Pradesh",
            "status": p.status,
            "recommended_amount_inr": p.recommended_amount_inr or 0,
            "sanctioned_amount_inr": p.sanctioned_amount_inr or 0,
            "disbursed_amount_inr": p_disbursed,
            "risk_score": p.risk_score or 0,
            "risk_tier": _get_risk_tier(p.risk_score or 0),
            "mandatory_tender": bool(p.mandatory_tender),
            "active_case_id": p_active_case.case_id if p_active_case else None,
            "anomaly_flags": flags,
            "reported_progress_pct": reported_pct,
            "ai_evidence_pct": ai_pct,
        })

    # Sort projects by risk score descending
    enriched_projects.sort(key=lambda x: x["risk_score"], reverse=True)

    # 10. Module Health Telemetry for F1–F14
    now_iso = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    module_health_status = [
        {
            "module_id": "F1_PAYMENT_FIREBREAK",
            "name": "Autonomous Fund Lock & Payment Firebreak",
            "status": "ALERT_TRIGGERED" if payment_holds_count > 0 else "OPERATIONAL",
            "signals_analyzed": len(payments),
            "active_interventions": payment_holds_count,
            "last_active": now_iso,
        },
        {
            "module_id": "F2_NLP_SCREENING",
            "name": "Pre-Sanction NLP Screening & Duplicate Detection",
            "status": "OPERATIONAL",
            "signals_analyzed": total_projects,
            "active_interventions": 0,
            "last_active": now_iso,
        },
        {
            "module_id": "F3_CITIZEN_VERIFY",
            "name": "Citizen Ground-Truth Verification Engine",
            "status": "ALERT_TRIGGERED" if citizen_disputes_count > 0 else "OPERATIONAL",
            "signals_analyzed": len(citizen_reports),
            "active_interventions": citizen_disputes_count,
            "last_active": now_iso,
        },
        {
            "module_id": "F4_SPLIT_WORK",
            "name": "Split-Work NLP & Mandatory E-Tender Enforcement",
            "status": "ALERT_TRIGGERED" if mandatory_tender_count > 0 else "OPERATIONAL",
            "signals_analyzed": total_projects,
            "active_interventions": mandatory_tender_count,
            "last_active": now_iso,
        },
        {
            "module_id": "F11_SATELLITE_CV",
            "name": "Satellite Remote Sensing & Change Detection",
            "status": "ALERT_TRIGGERED" if satellite_discrepancies_count > 0 else "OPERATIONAL",
            "signals_analyzed": total_projects,
            "active_interventions": satellite_discrepancies_count,
            "last_active": now_iso,
        },
        {
            "module_id": "F12_DELAY_MONITOR",
            "name": "Project Delay & Stalled Work Detection Engine",
            "status": "ALERT_TRIGGERED" if status_counts.get("INSPECTION_REQUIRED", 0) > 0 else "OPERATIONAL",
            "signals_analyzed": total_projects,
            "active_interventions": status_counts.get("INSPECTION_REQUIRED", 0),
            "last_active": now_iso,
        },
        {
            "module_id": "F13_FINANCIAL_ANALYTICS",
            "name": "Financial & Expenditure Analytics Engine",
            "status": "ALERT_TRIGGERED" if fiscal_anomalies_count > 0 else "OPERATIONAL",
            "signals_analyzed": total_projects,
            "active_interventions": fiscal_anomalies_count,
            "last_active": now_iso,
        },
        {
            "module_id": "F14_COST_OVERRUN",
            "name": "Cost Overrun Detection & Budget Trajectory Engine",
            "status": "ALERT_TRIGGERED" if cost_overruns_count > 0 else "OPERATIONAL",
            "signals_analyzed": total_projects,
            "active_interventions": cost_overruns_count,
            "last_active": now_iso,
        },
    ]

    # 11. Open cases serialized
    serialized_cases = []
    for c in open_cases_list:
        p_obj = next((p for p in projects if p.project_id == c.project_id), None)
        serialized_cases.append({
            "case_id": c.case_id,
            "project_id": c.project_id,
            "project_title": p_obj.title if p_obj else c.project_id,
            "assigned_tier": c.assigned_tier,
            "status": c.status,
            "reason_codes": c.reason_codes or [],
            "risk_score_at_creation": c.risk_score_at_creation or 0,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else None,
            "sla_deadline": c.response_deadline.strftime("%Y-%m-%d %H:%M") if c.response_deadline else None,
        })

    # 12. Recent Audit Activity
    recent_audits = (
        db.query(AuditEvent)
        .order_by(AuditEvent.timestamp.desc())
        .limit(15)
        .all()
    )
    recent_activity = [
        {
            "event_id": a.event_id,
            "event_type": a.event_type,
            "project_id": a.project_id,
            "actor_role": a.actor_role,
            "description": a.description,
            "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M:%S") if a.timestamp else None,
        }
        for a in recent_audits
    ]

    return {
        "portfolio_summary": {
            "total_projects": total_projects,
            "total_recommended_inr": total_recommended,
            "total_sanctioned_inr": total_sanctioned,
            "total_disbursed_inr": total_disbursed,
            "total_pending_payments_inr": total_pending_payments,
            "total_unreleased_inr": total_unreleased,
            "overall_fund_utilization_pct": overall_fund_utilization_pct,
            "statutory_deadline_compliance_pct": statutory_deadline_compliance_pct,
            "active_works_count": status_counts.get("EXECUTION", 0) + status_counts.get("SANCTIONED", 0),
            "completed_works_count": status_counts.get("COMPLETED", 0) + status_counts.get("VERIFIED", 0),
            "inspection_required_count": status_counts.get("INSPECTION_REQUIRED", 0),
        },
        "risk_distribution": {
            "low_risk_count": low_risk,
            "medium_risk_count": med_risk,
            "high_risk_count": high_risk,
            "critical_risk_count": critical_risk,
            "average_risk_score": avg_risk_score,
            "risk_tiers": risk_tiers,
        },
        "active_interventions": {
            "total_active_interventions": (
                payment_holds_count + open_cases_count + mandatory_tender_count +
                status_counts.get("INSPECTION_REQUIRED", 0)
            ),
            "payment_holds_count": payment_holds_count,
            "open_cases_count": open_cases_count,
            "mandatory_tender_clusters_count": mandatory_tender_count,
            "satellite_discrepancies_count": satellite_discrepancies_count,
            "delayed_stalled_count": status_counts.get("INSPECTION_REQUIRED", 0),
            "fiscal_anomalies_count": fiscal_anomalies_count,
            "cost_overruns_count": cost_overruns_count,
            "citizen_disputes_count": citizen_disputes_count,
        },
        "authority_workload": authority_workload,
        "module_health_status": module_health_status,
        "projects": enriched_projects,
        "open_cases": serialized_cases,
        "recent_activity": recent_activity,
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
