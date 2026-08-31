"""
DA Operations Dashboard Service.

Aggregates data for a District Authority (DA) — Collector / District Magistrate:
- 45-day SLA sanction queue (pending recommendation reviews)
- Active case inbox (HELD payments + open investigation cases)
- Payment holds pending DA approval
- Critical anomaly alerts requiring immediate action
- District-level project portfolio with risk breakdown
- Escalation countdown timers
"""

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from config import settings
from models import Authority, Project, PaymentRequest, Case, AuditEvent, Notification

logger = logging.getLogger("da_dashboard")

SLA_DAYS = 45


def _risk_tier(score: int) -> str:
    if score >= 85:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def get_da_dashboard(db: Session, da_id: str) -> dict[str, Any]:
    """
    Generate DA operations dashboard for a specific District Authority.
    Scoped to projects in the DA's jurisdiction_district + jurisdiction_state.
    """
    da = db.query(Authority).filter_by(authority_id=da_id, role="DA").first()
    if not da:
        raise ValueError(f"DA {da_id} not found")

    district = da.jurisdiction_district
    state = da.jurisdiction_state

    # Fetch all projects in this DA's district
    district_projects = (
        db.query(Project)
        .filter(Project.state == state)
        .all()
    )
    # Further filter by district name appearing in location_text or constituency
    # (some projects span state but different district)
    # For the demo, scope by state since our dataset maps 1 DA : 1 state key district
    # We include all state projects for state-level DAs

    now = datetime.utcnow()

    # -----------------------------------------------------------------------
    # 1. 45-day SLA sanction queue
    # -----------------------------------------------------------------------
    pending_rec = [p for p in district_projects if p.status == "RECOMMENDED"]
    sla_queue = []
    sla_breaches = 0
    for p in pending_rec:
        if p.recommendation_date:
            elapsed = (now - p.recommendation_date).days
            remaining = max(SLA_DAYS - elapsed, 0)
            overdue = elapsed > SLA_DAYS
            if overdue:
                sla_breaches += 1
            sla_queue.append({
                "project_id": p.project_id,
                "title": p.title,
                "category": p.category,
                "recommended_amount_inr": p.recommended_amount_inr or 0,
                "recommendation_date": p.recommendation_date.isoformat(),
                "elapsed_days": elapsed,
                "remaining_days": remaining,
                "overdue": overdue,
                "urgency": "CRITICAL" if overdue else ("HIGH" if remaining <= 7 else "NORMAL"),
            })
    sla_queue.sort(key=lambda x: x["elapsed_days"], reverse=True)

    # -----------------------------------------------------------------------
    # 2. Payment holds requiring DA review
    # -----------------------------------------------------------------------
    project_ids = {p.project_id for p in district_projects}
    held_payments = (
        db.query(PaymentRequest)
        .filter(
            PaymentRequest.project_id.in_(project_ids),
            PaymentRequest.status == "HELD_FOR_REVIEW",
        )
        .all()
    )
    payment_holds = []
    for pm in held_payments:
        proj = next((p for p in district_projects if p.project_id == pm.project_id), None)
        payment_holds.append({
            "payment_id": pm.payment_id,
            "project_id": pm.project_id,
            "project_title": proj.title if proj else pm.project_id,
            "requested_amount_inr": pm.requested_amount_inr,
            "ai_risk_score": pm.ai_risk_score_at_request or 0,
            "check_result": pm.pre_payment_check_result or {},
            "submitted_by": pm.submitted_by,
            "request_date": pm.request_date.isoformat() if pm.request_date else None,
        })

    # -----------------------------------------------------------------------
    # 3. Active cases assigned to DA tier
    # -----------------------------------------------------------------------
    da_cases = (
        db.query(Case)
        .filter(
            Case.project_id.in_(project_ids),
            Case.assigned_tier == "DA",
            Case.status != "RESOLVED",
        )
        .all()
    )
    cases_list = []
    overdue_cases = 0
    for c in da_cases:
        proj = next((p for p in district_projects if p.project_id == c.project_id), None)
        time_remaining = None
        is_overdue = False
        if c.response_deadline:
            secs = int((c.response_deadline - now).total_seconds())
            time_remaining = secs
            is_overdue = secs < 0
            if is_overdue:
                overdue_cases += 1
        cases_list.append({
            "case_id": c.case_id,
            "project_id": c.project_id,
            "project_title": proj.title if proj else c.project_id,
            "status": c.status,
            "reason_codes": c.reason_codes or [],
            "risk_score_at_creation": c.risk_score_at_creation or 0,
            "response_deadline": c.response_deadline.isoformat() if c.response_deadline else None,
            "time_remaining_seconds": time_remaining,
            "is_overdue": is_overdue,
            "escalation_count": len(c.escalation_events) if hasattr(c, "escalation_events") else 0,
        })
    cases_list.sort(key=lambda x: (x["is_overdue"], -(x["risk_score_at_creation"] or 0)), reverse=True)

    # -----------------------------------------------------------------------
    # 4. District portfolio overview
    # -----------------------------------------------------------------------
    status_counts: dict[str, int] = {}
    for p in district_projects:
        status_counts[p.status] = status_counts.get(p.status, 0) + 1

    total_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in district_projects)
    total_disbursed = sum(
        pm.requested_amount_inr
        for pm in db.query(PaymentRequest).filter(
            PaymentRequest.project_id.in_(project_ids),
            PaymentRequest.status.in_(["PAYMENT_RELEASED", "APPROVED_FOR_REVIEW"])
        ).all()
    )
    utilization_pct = round(total_disbursed / total_sanctioned * 100, 1) if total_sanctioned > 0 else 0.0

    low = med = high = crit = 0
    for p in district_projects:
        s = p.risk_score or 0
        if s >= 85:
            crit += 1
        elif s >= 70:
            high += 1
        elif s >= 40:
            med += 1
        else:
            low += 1

    avg_risk = round(sum(p.risk_score or 0 for p in district_projects) / len(district_projects), 1) if district_projects else 0.0

    # -----------------------------------------------------------------------
    # 5. Critical alerts (high-risk + inspection_required)
    # -----------------------------------------------------------------------
    critical_alerts = []
    for p in district_projects:
        if p.risk_score and p.risk_score >= 70:
            critical_alerts.append({
                "project_id": p.project_id,
                "title": p.title,
                "risk_score": p.risk_score,
                "risk_tier": _risk_tier(p.risk_score),
                "status": p.status,
                "sanctioned_amount_inr": p.sanctioned_amount_inr or 0,
            })
    critical_alerts.sort(key=lambda x: -x["risk_score"])

    # -----------------------------------------------------------------------
    # 6. Recent activity
    # -----------------------------------------------------------------------
    recent_audits = (
        db.query(AuditEvent)
        .filter(AuditEvent.project_id.in_(project_ids))
        .order_by(AuditEvent.timestamp.desc())
        .limit(10)
        .all()
    )
    recent_activity = [
        {
            "event_id": a.event_id,
            "event_type": a.event_type,
            "project_id": a.project_id,
            "description": a.description,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in recent_audits
    ]

    # -----------------------------------------------------------------------
    # 7. Enriched project list for drill-down
    # -----------------------------------------------------------------------
    enriched = []
    for p in district_projects:
        flags: list[str] = []
        if p.sanctioned_amount_inr and p.recommended_amount_inr:
            cv = (p.sanctioned_amount_inr - p.recommended_amount_inr) / p.recommended_amount_inr * 100
            if cv > 25:
                flags.append("COST_VARIANCE")
        if p.mandatory_tender:
            flags.append("MANDATORY_TENDER")
        if p.status == "INSPECTION_REQUIRED":
            flags.append("INSPECTION_REQUIRED")

        p_case = next((c for c in da_cases if c.project_id == p.project_id), None)
        enriched.append({
            "project_id": p.project_id,
            "title": p.title,
            "category": p.category or "OTHER",
            "constituency": p.constituency,
            "status": p.status,
            "risk_score": p.risk_score or 0,
            "risk_tier": _risk_tier(p.risk_score or 0),
            "sanctioned_amount_inr": p.sanctioned_amount_inr or 0,
            "active_case_id": p_case.case_id if p_case else None,
            "anomaly_flags": flags,
        })
    enriched.sort(key=lambda x: -x["risk_score"])

    return {
        "da": {
            "authority_id": da.authority_id,
            "name": da.name,
            "district": district,
            "state": state,
            "email": da.email,
        },
        "portfolio_summary": {
            "total_projects": len(district_projects),
            "total_sanctioned_inr": total_sanctioned,
            "total_disbursed_inr": total_disbursed,
            "utilization_pct": utilization_pct,
            "active_works": status_counts.get("EXECUTION", 0) + status_counts.get("SANCTIONED", 0),
            "completed_works": status_counts.get("COMPLETED", 0) + status_counts.get("VERIFIED", 0),
            "inspection_required": status_counts.get("INSPECTION_REQUIRED", 0),
        },
        "sla_queue": {
            "pending_sanctions_count": len(sla_queue),
            "sla_breaches_count": sla_breaches,
            "items": sla_queue,
        },
        "payment_holds": {
            "total_holds": len(payment_holds),
            "items": payment_holds,
        },
        "cases": {
            "total_open": len(cases_list),
            "overdue_count": overdue_cases,
            "items": cases_list,
        },
        "risk_summary": {
            "average_risk_score": avg_risk,
            "low": low,
            "medium": med,
            "high": high,
            "critical": crit,
        },
        "critical_alerts": critical_alerts,
        "projects": enriched,
        "recent_activity": recent_activity,
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def list_das(db: Session) -> list[dict[str, Any]]:
    """Return all DAs for the selector dropdown."""
    das = db.query(Authority).filter_by(role="DA").all()
    return [
        {
            "authority_id": da.authority_id,
            "name": da.name,
            "district": da.jurisdiction_district,
            "state": da.jurisdiction_state,
        }
        for da in das
    ]
