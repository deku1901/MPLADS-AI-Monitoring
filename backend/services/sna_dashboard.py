"""
SNA (State Nodal Authority) Dashboard Service.

Aggregates state-level portfolio data:
- State-wide portfolio overview (budget, utilization, works count)
- District performance leaderboard (risk, utilization, SLA compliance per district)
- Tier-2 escalation queue (cases escalated from DA to SNA tier)
- Risk and anomaly hotspots across the state
- All state MPs with compliance metrics
- Drill-down into projects requiring SNA intervention
"""

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from config import settings
from models import Authority, MP, Project, PaymentRequest, Case, AuditEvent

logger = logging.getLogger("sna_dashboard")


def _risk_tier(score: int) -> str:
    if score >= 85:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def get_sna_dashboard(db: Session, sna_id: str) -> dict[str, Any]:
    """
    Generate SNA state-level dashboard for a specific State Nodal Authority.
    Scoped to all projects in the SNA's jurisdiction_state.
    """
    sna = db.query(Authority).filter_by(authority_id=sna_id, role="SNA").first()
    if not sna:
        raise ValueError(f"SNA {sna_id} not found")

    state = sna.jurisdiction_state
    now = datetime.utcnow()

    state_projects = db.query(Project).filter(Project.state == state).all()
    project_ids = {p.project_id for p in state_projects}

    all_payments = (
        db.query(PaymentRequest)
        .filter(PaymentRequest.project_id.in_(project_ids))
        .all()
    )

    # -----------------------------------------------------------------------
    # 1. State portfolio overview
    # -----------------------------------------------------------------------
    total_projects = len(state_projects)
    total_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in state_projects)
    total_disbursed = sum(
        pm.requested_amount_inr for pm in all_payments
        if pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    utilization_pct = round(total_disbursed / total_sanctioned * 100, 1) if total_sanctioned > 0 else 0.0

    status_counts: dict[str, int] = {}
    for p in state_projects:
        status_counts[p.status] = status_counts.get(p.status, 0) + 1

    # -----------------------------------------------------------------------
    # 2. Risk summary
    # -----------------------------------------------------------------------
    low = med = high = crit = 0
    total_risk = 0
    for p in state_projects:
        s = p.risk_score or 0
        total_risk += s
        if s >= 85:
            crit += 1
        elif s >= 70:
            high += 1
        elif s >= 40:
            med += 1
        else:
            low += 1

    avg_risk = round(total_risk / total_projects, 1) if total_projects > 0 else 0.0

    # -----------------------------------------------------------------------
    # 3. SNA-tier escalation queue (Tier-2 cases)
    # -----------------------------------------------------------------------
    sna_cases = (
        db.query(Case)
        .filter(
            Case.project_id.in_(project_ids),
            Case.assigned_tier == "SNA",
            Case.status != "RESOLVED",
        )
        .all()
    )
    escalation_queue = []
    overdue_count = 0
    for c in sna_cases:
        proj = next((p for p in state_projects if p.project_id == c.project_id), None)
        time_remaining = None
        is_overdue = False
        if c.response_deadline:
            secs = int((c.response_deadline - now).total_seconds())
            time_remaining = secs
            is_overdue = secs < 0
            if is_overdue:
                overdue_count += 1
        escalation_queue.append({
            "case_id": c.case_id,
            "project_id": c.project_id,
            "project_title": proj.title if proj else c.project_id,
            "project_constituency": proj.constituency if proj else None,
            "status": c.status,
            "reason_codes": c.reason_codes or [],
            "risk_score_at_creation": c.risk_score_at_creation or 0,
            "response_deadline": c.response_deadline.isoformat() if c.response_deadline else None,
            "time_remaining_seconds": time_remaining,
            "is_overdue": is_overdue,
        })
    escalation_queue.sort(key=lambda x: (x["is_overdue"], -(x["risk_score_at_creation"] or 0)), reverse=True)

    # -----------------------------------------------------------------------
    # 4. District performance leaderboard
    # -----------------------------------------------------------------------
    # Group projects by constituency (proxy for district in seed data)
    constituency_groups: dict[str, list] = {}
    for p in state_projects:
        key = p.constituency or "Unknown"
        constituency_groups.setdefault(key, []).append(p)

    disbursed_by_project: dict[str, int] = {}
    for pm in all_payments:
        if pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW"):
            disbursed_by_project[pm.project_id] = disbursed_by_project.get(pm.project_id, 0) + pm.requested_amount_inr

    open_cases_all = db.query(Case).filter(
        Case.project_id.in_(project_ids), Case.status != "RESOLVED"
    ).all()
    open_cases_by_project: dict[str, list] = {}
    for c in open_cases_all:
        open_cases_by_project.setdefault(c.project_id, []).append(c)

    leaderboard = []
    for constituency, proj_list in constituency_groups.items():
        c_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in proj_list)
        c_disbursed = sum(disbursed_by_project.get(p.project_id, 0) for p in proj_list)
        c_avg_risk = round(sum(p.risk_score or 0 for p in proj_list) / len(proj_list), 1)
        c_inspection = sum(1 for p in proj_list if p.status == "INSPECTION_REQUIRED")
        c_open_cases = sum(len(open_cases_by_project.get(p.project_id, [])) for p in proj_list)
        c_utilization = round(c_disbursed / c_sanctioned * 100, 1) if c_sanctioned > 0 else 0.0
        # SLA compliance for this constituency
        compliant = 0
        total_sanctions = 0
        for p in proj_list:
            if p.recommendation_date and p.sanction_date:
                total_sanctions += 1
                days = (p.sanction_date - p.recommendation_date).days
                if days <= getattr(settings, "SLA_SANCTION_DEADLINE_DAYS", 45):
                    compliant += 1
        sla_pct = round(compliant / total_sanctions * 100, 1) if total_sanctions > 0 else 100.0
        leaderboard.append({
            "constituency": constituency,
            "total_projects": len(proj_list),
            "sanctioned_inr": c_sanctioned,
            "disbursed_inr": c_disbursed,
            "utilization_pct": c_utilization,
            "avg_risk_score": c_avg_risk,
            "inspection_required_count": c_inspection,
            "open_cases_count": c_open_cases,
            "sla_compliance_pct": sla_pct,
            "performance_score": round(
                (c_utilization * 0.4) + (sla_pct * 0.3) + (max(100 - c_avg_risk, 0) * 0.3), 1
            ),
        })
    leaderboard.sort(key=lambda x: -x["performance_score"])

    # -----------------------------------------------------------------------
    # 5. State MPs compliance overview
    # -----------------------------------------------------------------------
    state_mps = db.query(MP).filter(MP.state == state).all()
    mp_compliance = []
    for mp in state_mps:
        mp_projects = [p for p in state_projects if p.mp_id == mp.mp_id]
        mp_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in mp_projects)
        mp_compliance.append({
            "mp_id": mp.mp_id,
            "name": mp.name,
            "mp_type": mp.mp_type,
            "constituency": mp.constituency,
            "sc_spend_pct": mp.sc_spend_pct or 0.0,
            "st_spend_pct": mp.st_spend_pct or 0.0,
            "sc_compliant": (mp.sc_spend_pct or 0.0) >= 15.0,
            "st_compliant": (mp.st_spend_pct or 0.0) >= 7.5,
            "total_projects": len(mp_projects),
            "total_sanctioned_inr": mp_sanctioned,
        })

    # -----------------------------------------------------------------------
    # 6. High-risk anomaly hotspots
    # -----------------------------------------------------------------------
    hotspots = [
        {
            "project_id": p.project_id,
            "title": p.title,
            "constituency": p.constituency,
            "risk_score": p.risk_score or 0,
            "risk_tier": _risk_tier(p.risk_score or 0),
            "status": p.status,
            "sanctioned_amount_inr": p.sanctioned_amount_inr or 0,
        }
        for p in state_projects
        if (p.risk_score or 0) >= 70
    ]
    hotspots.sort(key=lambda x: -x["risk_score"])

    # -----------------------------------------------------------------------
    # 7. Recent state-level audit activity
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

    return {
        "sna": {
            "authority_id": sna.authority_id,
            "name": sna.name,
            "state": state,
            "email": sna.email,
        },
        "portfolio_summary": {
            "total_projects": total_projects,
            "total_sanctioned_inr": total_sanctioned,
            "total_disbursed_inr": total_disbursed,
            "utilization_pct": utilization_pct,
            "active_works": status_counts.get("EXECUTION", 0) + status_counts.get("SANCTIONED", 0),
            "completed_works": status_counts.get("COMPLETED", 0) + status_counts.get("VERIFIED", 0),
            "inspection_required": status_counts.get("INSPECTION_REQUIRED", 0),
            "recommended_pending": status_counts.get("RECOMMENDED", 0),
        },
        "risk_summary": {
            "average_risk_score": avg_risk,
            "low": low,
            "medium": med,
            "high": high,
            "critical": crit,
            "total_open_cases": len(open_cases_all),
            "sna_escalations": len(sna_cases),
            "sna_escalation_overdue": overdue_count,
        },
        "escalation_queue": escalation_queue,
        "district_leaderboard": leaderboard,
        "mp_compliance": mp_compliance,
        "anomaly_hotspots": hotspots,
        "recent_activity": recent_activity,
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def list_snas(db: Session) -> list[dict[str, Any]]:
    """Return all SNAs for the selector dropdown."""
    snas = db.query(Authority).filter_by(role="SNA").all()
    return [
        {
            "authority_id": sna.authority_id,
            "name": sna.name,
            "state": sna.jurisdiction_state,
        }
        for sna in snas
    ]
