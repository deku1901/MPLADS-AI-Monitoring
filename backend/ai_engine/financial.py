"""
Financial & Expenditure Analytics Engine (Slice 6 / F13).

Analyzes project fiscal allocations, cost variance, disbursement milestones,
fund utilization ratios, and anomalous expenditure patterns.

Deterministic & explainable logic aligned with MoSPI financial guidelines.
"""

from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any

from config import settings
from ai_engine.ml import detect_financial_anomalies


def analyze_project_financials(
    *,
    project_id: str,
    project_title: str,
    recommended_amount_inr: int,
    sanctioned_amount_inr: int,
    reported_progress_pct: int,
    payments: list[dict[str, Any]],
    sanction_date: datetime | None = None,
    category: str | None = "DRINKING_WATER",
    constituency: str | None = "Varanasi",
) -> dict[str, Any]:
    """
    Perform deterministic financial & expenditure analytics on a project.
    """
    rec_amount = recommended_amount_inr or 0
    sanc_amount = sanctioned_amount_inr or rec_amount or 0

    # 1. Cost Variance Calculation
    cost_variance_inr = sanc_amount - rec_amount
    cost_variance_pct = round(((sanc_amount - rec_amount) / rec_amount * 100), 2) if rec_amount > 0 else 0.0

    # 2. Payment aggregation
    total_released_inr = sum(
        p.get("requested_amount_inr", 0) for p in payments
        if p.get("status") in ("PAYMENT_RELEASED", "APPROVED_FOR_REVIEW")
    )
    total_pending_inr = sum(
        p.get("requested_amount_inr", 0) for p in payments
        if p.get("status") in ("SUBMITTED", "HELD_FOR_REVIEW")
    )
    unreleased_balance_inr = max(sanc_amount - total_released_inr, 0)
    fund_utilization_pct = round((total_released_inr / sanc_amount * 100), 1) if sanc_amount > 0 else 0.0

    # 3. Expenditure to Progress Ratio
    # If fund utilization greatly exceeds physical progress, it indicates overpayment/front-loading risk
    expenditure_to_progress_ratio = round(
        fund_utilization_pct / max(reported_progress_pct, 1), 2
    )

    # 4. ML Anomaly Detection invocation
    days_since_sanction = 0
    if sanction_date:
        days_since_sanction = max((datetime.utcnow() - sanction_date).days, 0)

    ml_result = detect_financial_anomalies({
        "recommended_amount_inr": rec_amount,
        "sanctioned_amount_inr": sanc_amount,
        "current_payment_amount": total_pending_inr,
        "reported_progress_pct": reported_progress_pct,
        "days_since_sanction": days_since_sanction,
        "payment_count": len(payments),
        "total_paid_inr": total_released_inr,
    })

    # 5. Financial Risk Flagging
    flags: list[str] = list(ml_result.get("financial_risk_flags", []))

    if cost_variance_pct > settings.COST_VARIANCE_THRESHOLD_PCT:
        if "COST_VARIANCE" not in flags:
            flags.append("COST_VARIANCE")

    # Excessive disbursement: released > (reported progress + 20%)
    if fund_utilization_pct > (reported_progress_pct + 20) and fund_utilization_pct > 30:
        if "DISBURSEMENT_PROGRESS_MISMATCH" not in flags:
            flags.append("DISBURSEMENT_PROGRESS_MISMATCH")

    # Stalled funds flag
    if days_since_sanction > 90 and total_released_inr == 0:
        if "ZERO_UTILIZATION_DELAY" not in flags:
            flags.append("ZERO_UTILIZATION_DELAY")

    # 6. Financial Health Classification
    if cost_variance_pct > 50 or "OVERPAYMENT_RISK" in flags or len(flags) >= 2:
        health_rating = "CRITICAL_ANOMALY"
        recommended_action = (
            "Freeze further milestone disbursements. Mandatory financial audit and "
            "technical rate validation required by District Authority."
        )
    elif cost_variance_pct > 25 or len(flags) >= 1:
        health_rating = "HIGH_RISK"
        recommended_action = (
            "Issue inquiry to Implementing Agency regarding cost escalation. "
            "Re-validate bills before approving subsequent payment installments."
        )
    elif cost_variance_pct > 10:
        health_rating = "MODERATE_RISK"
        recommended_action = (
            "Monitor ongoing expenditure against physical milestones. Normal fiscal contingency."
        )
    else:
        health_rating = "HEALTHY"
        recommended_action = (
            "Financial utilization is within approved statutory limits and aligned with progress."
        )

    # 7. Summary Narrative
    if health_rating == "CRITICAL_ANOMALY":
        summary = (
            f"Project {project_id} exhibits critical financial anomalies: {cost_variance_pct:+.1f}% "
            f"cost variance over recommendation (₹{cost_variance_inr:,.0f} delta). "
            f"Fund utilization is {fund_utilization_pct:.1f}% with {len(flags)} risk signal(s) detected: "
            f"{', '.join(flags)}. Immediate DA intervention required."
        )
    elif health_rating == "HIGH_RISK":
        summary = (
            f"Project {project_id} has high financial risk with {cost_variance_pct:+.1f}% cost escalation. "
            f"₹{total_released_inr:,.0f} released out of ₹{sanc_amount:,.0f} sanctioned ({fund_utilization_pct:.1f}%). "
            f"Flags: {', '.join(flags)}."
        )
    else:
        summary = (
            f"Project {project_id} financial parameters are normal. Sanctioned at ₹{sanc_amount:,.0f} "
            f"(variance {cost_variance_pct:+.1f}%). Released: ₹{total_released_inr:,.0f} ({fund_utilization_pct:.1f}%). "
            f"Remaining balance: ₹{unreleased_balance_inr:,.0f}."
        )

    return {
        "project_id": project_id,
        "project_title": project_title,
        "recommended_amount_inr": rec_amount,
        "sanctioned_amount_inr": sanc_amount,
        "cost_variance_inr": cost_variance_inr,
        "cost_variance_pct": cost_variance_pct,
        "total_released_inr": total_released_inr,
        "total_pending_inr": total_pending_inr,
        "unreleased_balance_inr": unreleased_balance_inr,
        "fund_utilization_pct": fund_utilization_pct,
        "expenditure_to_progress_ratio": expenditure_to_progress_ratio,
        "anomaly_score": ml_result.get("anomaly_score", 0.0),
        "financial_risk_flags": flags,
        "financial_health_rating": health_rating,
        "recommended_action": recommended_action,
        "analysis_summary": summary,
        "payment_count": len(payments),
    }
