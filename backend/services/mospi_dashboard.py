"""
MoSPI National Command Dashboard Service.

Aggregates all-India portfolio intelligence for the Ministry of Statistics
and Programme Implementation (MoSPI):
- All-India KPIs: total works, sanctioned funds, disbursed, utilization
- State comparative matrix (state vs state performance)
- National SC/ST statutory compliance across all MPs
- Tier-3 Ministry escalation queue
- AI Fiscal Protection Ledger (funds at risk nationally)
- Risk distribution across all states
- National anomaly heatmap (top high-risk projects)
- All-India recent audit activity
"""

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from config import settings
from models import Authority, MP, Project, PaymentRequest, Case, AuditEvent, CitizenReport

logger = logging.getLogger("mospi_dashboard")


def _risk_tier(score: int) -> str:
    if score >= 85:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def get_mospi_dashboard(db: Session) -> dict[str, Any]:
    """
    Generate MoSPI national command dashboard.
    Scoped to ALL projects in the entire database (all states).
    Read-only — no state mutations.
    """
    now = datetime.utcnow()

    all_projects = db.query(Project).all()
    all_payments = db.query(PaymentRequest).all()
    all_cases = db.query(Case).all()
    all_mps = db.query(MP).all()
    all_citizen_reports = db.query(CitizenReport).all()

    project_ids = {p.project_id for p in all_projects}
    total_projects = len(all_projects)

    # -----------------------------------------------------------------------
    # 1. All-India KPIs
    # -----------------------------------------------------------------------
    total_recommended = sum(p.recommended_amount_inr or 0 for p in all_projects)
    total_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in all_projects)
    total_disbursed = sum(
        pm.requested_amount_inr for pm in all_payments
        if pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    total_held = sum(
        pm.requested_amount_inr for pm in all_payments
        if pm.status == "HELD_FOR_REVIEW"
    )
    unreleased = max(total_sanctioned - total_disbursed, 0)
    utilization_pct = round(total_disbursed / total_sanctioned * 100, 1) if total_sanctioned > 0 else 0.0

    status_counts: dict[str, int] = {}
    for p in all_projects:
        status_counts[p.status] = status_counts.get(p.status, 0) + 1

    open_cases = [c for c in all_cases if c.status != "RESOLVED"]
    payment_holds = [pm for pm in all_payments if pm.status == "HELD_FOR_REVIEW"]
    mandatory_tenders = sum(1 for p in all_projects if p.mandatory_tender)
    citizen_disputes = sum(1 for r in all_citizen_reports if not r.is_functional)

    # -----------------------------------------------------------------------
    # 2. Risk distribution (all-India)
    # -----------------------------------------------------------------------
    low = med = high = crit = 0
    total_risk = 0
    for p in all_projects:
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

    # Funds at risk = funds disbursed to projects with risk >= 70
    high_risk_pids = {p.project_id for p in all_projects if (p.risk_score or 0) >= 70}
    funds_at_risk = sum(
        pm.requested_amount_inr for pm in all_payments
        if pm.project_id in high_risk_pids
        and pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )

    # -----------------------------------------------------------------------
    # 3. Tier-3 Ministry escalation queue
    # -----------------------------------------------------------------------
    ministry_cases = [c for c in all_cases if c.assigned_tier == "MINISTRY" and c.status != "RESOLVED"]
    ministry_overdue = 0
    ministry_queue = []
    for c in ministry_cases:
        proj = next((p for p in all_projects if p.project_id == c.project_id), None)
        time_remaining = None
        is_overdue = False
        if c.response_deadline:
            secs = int((c.response_deadline - now).total_seconds())
            time_remaining = secs
            is_overdue = secs < 0
            if is_overdue:
                ministry_overdue += 1
        ministry_queue.append({
            "case_id": c.case_id,
            "project_id": c.project_id,
            "project_title": proj.title if proj else c.project_id,
            "project_state": proj.state if proj else None,
            "project_constituency": proj.constituency if proj else None,
            "status": c.status,
            "reason_codes": c.reason_codes or [],
            "risk_score_at_creation": c.risk_score_at_creation or 0,
            "response_deadline": c.response_deadline.isoformat() if c.response_deadline else None,
            "time_remaining_seconds": time_remaining,
            "is_overdue": is_overdue,
        })
    ministry_queue.sort(key=lambda x: (x["is_overdue"], -(x["risk_score_at_creation"] or 0)), reverse=True)

    # -----------------------------------------------------------------------
    # 4. State comparative matrix
    # -----------------------------------------------------------------------
    states_seen = list({p.state for p in all_projects if p.state})
    disbursed_by_project: dict[str, int] = {}
    for pm in all_payments:
        if pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW"):
            disbursed_by_project[pm.project_id] = disbursed_by_project.get(pm.project_id, 0) + pm.requested_amount_inr

    open_cases_by_project: dict[str, list] = {}
    for c in open_cases:
        open_cases_by_project.setdefault(c.project_id, []).append(c)

    state_matrix = []
    for state in sorted(states_seen):
        sp = [p for p in all_projects if p.state == state]
        s_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in sp)
        s_disbursed = sum(disbursed_by_project.get(p.project_id, 0) for p in sp)
        s_utilization = round(s_disbursed / s_sanctioned * 100, 1) if s_sanctioned > 0 else 0.0
        s_avg_risk = round(sum(p.risk_score or 0 for p in sp) / len(sp), 1) if sp else 0.0
        s_inspection = sum(1 for p in sp if p.status == "INSPECTION_REQUIRED")
        s_open_cases = sum(len(open_cases_by_project.get(p.project_id, [])) for p in sp)
        # SLA compliance
        compliant = total_sanctions_ = 0
        for p in sp:
            if p.recommendation_date and p.sanction_date:
                total_sanctions_ += 1
                if (p.sanction_date - p.recommendation_date).days <= getattr(settings, "SLA_SANCTION_DEADLINE_DAYS", 45):
                    compliant += 1
        sla_pct = round(compliant / total_sanctions_ * 100, 1) if total_sanctions_ > 0 else 100.0

        # SC/ST compliance: check all MPs from this state
        state_mps = [m for m in all_mps if m.state == state]
        sc_compliant_mps = sum(1 for m in state_mps if (m.sc_spend_pct or 0) >= 15.0)
        st_compliant_mps = sum(1 for m in state_mps if (m.st_spend_pct or 0) >= 7.5)
        mps_total = len(state_mps)

        state_matrix.append({
            "state": state,
            "total_projects": len(sp),
            "sanctioned_inr": s_sanctioned,
            "disbursed_inr": s_disbursed,
            "utilization_pct": s_utilization,
            "avg_risk_score": s_avg_risk,
            "inspection_required_count": s_inspection,
            "open_cases_count": s_open_cases,
            "sla_compliance_pct": sla_pct,
            "mps_count": mps_total,
            "sc_compliant_mps": sc_compliant_mps,
            "st_compliant_mps": st_compliant_mps,
            "performance_score": round(
                (s_utilization * 0.35) + (sla_pct * 0.30) + (max(100 - s_avg_risk, 0) * 0.35), 1
            ),
        })
    state_matrix.sort(key=lambda x: -x["performance_score"])

    # -----------------------------------------------------------------------
    # 5. MP compliance overview (all-India)
    # -----------------------------------------------------------------------
    mp_non_compliant = []
    for mp in all_mps:
        sc_ok = (mp.sc_spend_pct or 0.0) >= 15.0
        st_ok = (mp.st_spend_pct or 0.0) >= 7.5
        if not sc_ok or not st_ok:
            mp_non_compliant.append({
                "mp_id": mp.mp_id,
                "name": mp.name,
                "mp_type": mp.mp_type,
                "state": mp.state,
                "constituency": mp.constituency,
                "sc_spend_pct": mp.sc_spend_pct or 0.0,
                "st_spend_pct": mp.st_spend_pct or 0.0,
                "sc_compliant": sc_ok,
                "st_compliant": st_ok,
            })

    sc_compliant_all = sum(1 for m in all_mps if (m.sc_spend_pct or 0) >= 15.0)
    st_compliant_all = sum(1 for m in all_mps if (m.st_spend_pct or 0) >= 7.5)

    # -----------------------------------------------------------------------
    # 6. AI Fiscal Protection Ledger
    # -----------------------------------------------------------------------
    fiscal_ledger = {
        "total_portfolio_inr": total_sanctioned,
        "total_disbursed_inr": total_disbursed,
        "total_held_inr": total_held,
        "total_unreleased_inr": unreleased,
        "funds_at_risk_inr": funds_at_risk,
        "funds_at_risk_pct": round(funds_at_risk / total_sanctioned * 100, 1) if total_sanctioned > 0 else 0.0,
        "payment_holds_count": len(payment_holds),
        "mandatory_tender_enforcements": mandatory_tenders,
        "citizen_disputes_count": citizen_disputes,
    }

    # -----------------------------------------------------------------------
    # 7. National anomaly hotspots (top 15 riskiest projects)
    # -----------------------------------------------------------------------
    hotspots = sorted(
        [
            {
                "project_id": p.project_id,
                "title": p.title,
                "state": p.state,
                "constituency": p.constituency,
                "risk_score": p.risk_score or 0,
                "risk_tier": _risk_tier(p.risk_score or 0),
                "status": p.status,
                "sanctioned_amount_inr": p.sanctioned_amount_inr or 0,
                "mandatory_tender": bool(p.mandatory_tender),
            }
            for p in all_projects
            if (p.risk_score or 0) >= 40
        ],
        key=lambda x: -x["risk_score"],
    )[:15]

    # -----------------------------------------------------------------------
    # 8. Recent national audit activity
    # -----------------------------------------------------------------------
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
            "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        }
        for a in recent_audits
    ]

    return {
        "national_kpis": {
            "total_projects": total_projects,
            "total_states": len(states_seen),
            "total_mps": len(all_mps),
            "total_recommended_inr": total_recommended,
            "total_sanctioned_inr": total_sanctioned,
            "total_disbursed_inr": total_disbursed,
            "overall_utilization_pct": utilization_pct,
            "active_works": status_counts.get("EXECUTION", 0) + status_counts.get("SANCTIONED", 0),
            "completed_works": status_counts.get("COMPLETED", 0) + status_counts.get("VERIFIED", 0),
            "inspection_required": status_counts.get("INSPECTION_REQUIRED", 0),
            "open_cases_count": len(open_cases),
        },
        "risk_summary": {
            "average_risk_score": avg_risk,
            "low": low,
            "medium": med,
            "high": high,
            "critical": crit,
            "ministry_escalations": len(ministry_cases),
            "ministry_overdue": ministry_overdue,
        },
        "fiscal_ledger": fiscal_ledger,
        "state_matrix": state_matrix,
        "mp_compliance": {
            "total_mps": len(all_mps),
            "sc_compliant_count": sc_compliant_all,
            "st_compliant_count": st_compliant_all,
            "non_compliant_mps": mp_non_compliant,
        },
        "ministry_escalation_queue": ministry_queue,
        "national_hotspots": hotspots,
        "recent_activity": recent_activity,
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
