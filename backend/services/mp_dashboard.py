"""
MP Constituency Dashboard Service.

Aggregates live portfolio data scoped to a single Member of Parliament:
- ₹5 Cr annual budget utilization + unspent balance
- Recommendation → Sanction → Execution → Completion pipeline counts
- SC/ST statutory spend compliance (≥15% SC, ≥7.5% ST)
- Per-sector breakdown and risk distribution
- Constituency project list with anomaly flags
- Active cases + citizen dispute summary
"""

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from config import settings
from models import (
    MP, Project, PaymentRequest, Case,
    ProgressRecord, CitizenReport, AuditEvent
)

logger = logging.getLogger("mp_dashboard")

ANNUAL_BUDGET_INR = 5_00_00_000  # ₹5 Crore per MP per year


def _risk_tier(score: int) -> str:
    if score >= 85:
        return "CRITICAL"
    if score >= 70:
        return "HIGH"
    if score >= 40:
        return "MEDIUM"
    return "LOW"


def get_mp_dashboard(db: Session, mp_id: str) -> dict[str, Any]:
    """
    Generate MP constituency dashboard. Scoped to a single mp_id.
    Read-only — no state mutations.
    """
    mp = db.query(MP).filter_by(mp_id=mp_id).first()
    if not mp:
        raise ValueError(f"MP {mp_id} not found")

    projects = db.query(Project).filter_by(mp_id=mp_id).all()
    payments = (
        db.query(PaymentRequest)
        .filter(PaymentRequest.project_id.in_([p.project_id for p in projects]))
        .all()
    )

    # -----------------------------------------------------------------------
    # 1. Budget utilization
    # -----------------------------------------------------------------------
    total_sanctioned = sum(p.sanctioned_amount_inr or 0 for p in projects)
    total_disbursed = sum(
        pm.requested_amount_inr for pm in payments
        if pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    budget = mp.annual_budget_inr or ANNUAL_BUDGET_INR
    unspent = max(budget - total_sanctioned, 0)
    utilization_pct = round(total_sanctioned / budget * 100, 1) if budget > 0 else 0.0
    disbursed_pct = round(total_disbursed / budget * 100, 1) if budget > 0 else 0.0

    # -----------------------------------------------------------------------
    # 2. Pipeline counts (lifecycle stages)
    # -----------------------------------------------------------------------
    status_map: dict[str, int] = {}
    for p in projects:
        status_map[p.status] = status_map.get(p.status, 0) + 1

    pipeline = {
        "recommended": status_map.get("RECOMMENDED", 0),
        "sanctioned": status_map.get("SANCTIONED", 0),
        "execution": status_map.get("EXECUTION", 0),
        "completed": status_map.get("COMPLETED", 0),
        "verified": status_map.get("VERIFIED", 0),
        "inspection_required": status_map.get("INSPECTION_REQUIRED", 0),
    }

    # -----------------------------------------------------------------------
    # 3. SC/ST statutory compliance
    # -----------------------------------------------------------------------
    sc_pct = mp.sc_spend_pct or 0.0
    st_pct = mp.st_spend_pct or 0.0
    sc_compliant = sc_pct >= 15.0
    st_compliant = st_pct >= 7.5

    # -----------------------------------------------------------------------
    # 4. Sector breakdown
    # -----------------------------------------------------------------------
    sector_totals: dict[str, dict] = {}
    for p in projects:
        cat = p.category or "OTHER"
        if cat not in sector_totals:
            sector_totals[cat] = {"count": 0, "sanctioned_inr": 0, "disbursed_inr": 0}
        sector_totals[cat]["count"] += 1
        sector_totals[cat]["sanctioned_inr"] += p.sanctioned_amount_inr or 0

    p_disbursed_map: dict[str, int] = {}
    for pm in payments:
        if pm.status in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW"):
            p_disbursed_map[pm.project_id] = p_disbursed_map.get(pm.project_id, 0) + pm.requested_amount_inr

    for p in projects:
        cat = p.category or "OTHER"
        sector_totals[cat]["disbursed_inr"] += p_disbursed_map.get(p.project_id, 0)

    sector_breakdown = [
        {"category": cat, **vals}
        for cat, vals in sorted(sector_totals.items(), key=lambda x: -x[1]["sanctioned_inr"])
    ]

    # -----------------------------------------------------------------------
    # 5. Risk distribution
    # -----------------------------------------------------------------------
    low = med = high = crit = 0
    for p in projects:
        s = p.risk_score or 0
        if s >= 85:
            crit += 1
        elif s >= 70:
            high += 1
        elif s >= 40:
            med += 1
        else:
            low += 1

    avg_risk = round(sum(p.risk_score or 0 for p in projects) / len(projects), 1) if projects else 0.0

    # -----------------------------------------------------------------------
    # 6. Open cases for this MP's projects
    # -----------------------------------------------------------------------
    project_ids = {p.project_id for p in projects}
    open_cases = (
        db.query(Case)
        .filter(Case.project_id.in_(project_ids), Case.status != "RESOLVED")
        .all()
    )
    cases_list = [
        {
            "case_id": c.case_id,
            "project_id": c.project_id,
            "assigned_tier": c.assigned_tier,
            "status": c.status,
            "reason_codes": c.reason_codes or [],
            "risk_score_at_creation": c.risk_score_at_creation or 0,
            "sla_deadline": c.response_deadline.isoformat() if c.response_deadline else None,
        }
        for c in open_cases
    ]

    # -----------------------------------------------------------------------
    # 7. Citizen reports summary
    # -----------------------------------------------------------------------
    citizen_reports = (
        db.query(CitizenReport)
        .filter(CitizenReport.project_id.in_(project_ids))
        .all()
    )
    positive_reports = sum(1 for r in citizen_reports if r.is_functional)
    negative_reports = sum(1 for r in citizen_reports if not r.is_functional)
    satisfaction_pct = round(positive_reports / len(citizen_reports) * 100, 1) if citizen_reports else None

    # -----------------------------------------------------------------------
    # 8. Enriched project list
    # -----------------------------------------------------------------------
    enriched = []
    now = datetime.utcnow()
    for p in projects:
        latest_prog = (
            db.query(ProgressRecord)
            .filter_by(project_id=p.project_id)
            .order_by(ProgressRecord.timestamp.desc())
            .first()
        )
        p_active_case = next((c for c in open_cases if c.project_id == p.project_id), None)
        disbursed = p_disbursed_map.get(p.project_id, 0)
        flags: list[str] = []
        if p.sanctioned_amount_inr and p.recommended_amount_inr:
            cv = (p.sanctioned_amount_inr - p.recommended_amount_inr) / p.recommended_amount_inr * 100
            if cv > 25:
                flags.append("COST_VARIANCE")
        if p.mandatory_tender:
            flags.append("MANDATORY_TENDER")
        if p.status == "INSPECTION_REQUIRED":
            flags.append("INSPECTION_REQUIRED")

        # SLA check for DA sanction
        sla_breach = False
        if p.recommendation_date and p.sanction_date:
            days = (p.sanction_date - p.recommendation_date).days
            if days > getattr(settings, "SLA_SANCTION_DEADLINE_DAYS", 45):
                sla_breach = True
                flags.append("SLA_BREACH")

        enriched.append({
            "project_id": p.project_id,
            "title": p.title,
            "category": p.category or "OTHER",
            "location_text": p.location_text,
            "status": p.status,
            "risk_score": p.risk_score or 0,
            "risk_tier": _risk_tier(p.risk_score or 0),
            "recommended_amount_inr": p.recommended_amount_inr or 0,
            "sanctioned_amount_inr": p.sanctioned_amount_inr or 0,
            "disbursed_amount_inr": disbursed,
            "reported_progress_pct": latest_prog.reported_pct if latest_prog else None,
            "ai_evidence_pct": latest_prog.ai_evidence_pct if latest_prog else None,
            "active_case_id": p_active_case.case_id if p_active_case else None,
            "anomaly_flags": flags,
            "recommendation_date": p.recommendation_date.isoformat() if p.recommendation_date else None,
            "sanction_date": p.sanction_date.isoformat() if p.sanction_date else None,
            "completion_date": p.completion_date.isoformat() if p.completion_date else None,
        })

    enriched.sort(key=lambda x: -x["risk_score"])

    # -----------------------------------------------------------------------
    # 9. 45-day SLA summary for pending sanctions
    # -----------------------------------------------------------------------
    pending_sanction = [p for p in projects if p.status == "RECOMMENDED"]
    sla_pending = []
    for p in pending_sanction:
        if p.recommendation_date:
            elapsed = (now - p.recommendation_date).days
            remaining = max(45 - elapsed, 0)
            overdue = elapsed > 45
            sla_pending.append({
                "project_id": p.project_id,
                "title": p.title,
                "elapsed_days": elapsed,
                "remaining_days": remaining,
                "overdue": overdue,
            })

    return {
        "mp": {
            "mp_id": mp.mp_id,
            "name": mp.name,
            "mp_type": mp.mp_type,
            "constituency": mp.constituency,
            "state": mp.state,
            "annual_budget_inr": budget,
        },
        "budget_summary": {
            "annual_budget_inr": budget,
            "total_sanctioned_inr": total_sanctioned,
            "total_disbursed_inr": total_disbursed,
            "unspent_balance_inr": unspent,
            "sanctioned_utilization_pct": utilization_pct,
            "disbursed_utilization_pct": disbursed_pct,
        },
        "pipeline": pipeline,
        "statutory_compliance": {
            "sc_spend_pct": sc_pct,
            "st_spend_pct": st_pct,
            "sc_compliant": sc_compliant,
            "st_compliant": st_compliant,
            "sc_threshold_pct": 15.0,
            "st_threshold_pct": 7.5,
        },
        "risk_summary": {
            "average_risk_score": avg_risk,
            "low": low,
            "medium": med,
            "high": high,
            "critical": crit,
            "open_cases_count": len(cases_list),
        },
        "sector_breakdown": sector_breakdown,
        "citizen_summary": {
            "total_reports": len(citizen_reports),
            "positive_reports": positive_reports,
            "negative_reports": negative_reports,
            "satisfaction_pct": satisfaction_pct,
        },
        "open_cases": cases_list,
        "sla_pending_sanctions": sla_pending,
        "projects": enriched,
        "timestamp": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def list_mps(db: Session) -> list[dict[str, Any]]:
    """Return all MPs with basic summary for the selector dropdown."""
    mps = db.query(MP).all()
    result = []
    for mp in mps:
        projects = db.query(Project).filter_by(mp_id=mp.mp_id).all()
        result.append({
            "mp_id": mp.mp_id,
            "name": mp.name,
            "mp_type": mp.mp_type,
            "constituency": mp.constituency,
            "state": mp.state,
            "total_projects": len(projects),
            "avg_risk": round(sum(p.risk_score or 0 for p in projects) / len(projects), 1) if projects else 0.0,
        })
    result.sort(key=lambda x: x["state"])
    return result
