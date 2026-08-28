"""
Rule / Compliance Engine — deterministic, no ML.

Checks:
    D1  Sanction delay (>45 days statutory)
    D3  Document completeness
    D9  SC/ST spend mandate compliance
    D10 Geographic constraint (simplified text match for MVP)
"""
from __future__ import annotations
from datetime import datetime, timezone

from config import settings


def check_sanction_delay(recommendation_date: datetime | None, sanction_date: datetime | None) -> dict:
    """
    D1: Check if project remained unsanctioned beyond statutory window.
    Returns {flagged: bool, delay_days: int}
    """
    if recommendation_date is None:
        return {"flagged": False, "delay_days": 0}

    reference = sanction_date or datetime.utcnow()
    delta = (reference - recommendation_date).days

    return {
        "flagged": delta > settings.SLA_SANCTION_DEADLINE_DAYS,
        "delay_days": max(delta, 0),
    }


def check_document_completeness(missing_documents: list[str]) -> dict:
    """
    D3: Check required documents are present.
    Returns {flagged: bool, missing_count: int, missing: list[str]}
    """
    return {
        "flagged": len(missing_documents) > 0,
        "missing_count": len(missing_documents),
        "missing": missing_documents,
    }


def check_sc_st_compliance(sc_spend_pct: float, st_spend_pct: float) -> dict:
    """
    D9: Check statutory SC/ST allocation mandates.
    Returns {flagged: bool, sc_deficit_pct: float, st_deficit_pct: float}
    """
    sc_required = 15.0
    st_required = 7.5
    sc_deficit = max(sc_required - sc_spend_pct, 0.0)
    st_deficit = max(st_required - st_spend_pct, 0.0)
    return {
        "flagged": sc_deficit > 0 or st_deficit > 0,
        "sc_deficit_pct": round(sc_deficit, 2),
        "st_deficit_pct": round(st_deficit, 2),
    }


def check_progress_mismatch(reported_pct: int, ai_evidence_pct: int | None) -> dict:
    """
    D6: Check if self-reported progress significantly exceeds AI-derived evidence.
    Returns {flagged: bool, mismatch_pct: float}
    """
    if ai_evidence_pct is None:
        return {"flagged": False, "mismatch_pct": 0.0}
    delta = abs(reported_pct - ai_evidence_pct)
    return {
        "flagged": delta > settings.PROGRESS_MISMATCH_THRESHOLD_PCT,
        "mismatch_pct": float(delta),
    }


def run_compliance_checks(project_data: dict) -> dict:
    """
    Aggregate all rule-based compliance checks.
    Returns a structured dict of all check results.
    """
    sanction = check_sanction_delay(
        project_data.get("recommendation_date"),
        project_data.get("sanction_date"),
    )
    docs = check_document_completeness(project_data.get("missing_documents") or [])
    sc_st = check_sc_st_compliance(
        project_data.get("sc_spend_pct") or 0.0,
        project_data.get("st_spend_pct") or 0.0,
    )
    progress = check_progress_mismatch(
        project_data.get("reported_progress_pct") or 0,
        project_data.get("ai_evidence_pct"),
    )

    return {
        "sanction_delay": sanction,
        "document_gap": docs,
        "sc_st_compliance": sc_st,
        "progress_mismatch": progress,
    }
