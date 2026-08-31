"""
Cost Overrun Detection Engine (Slice 7 / F14).

Analyzes MPLADS project budget trajectory:
  - Original Estimate  (baseline administrative sanction)
  - Revised Estimate   (revised sanction after scope/price revision)
  - Actual Expenditure (cumulative incurred expenditure)

Computes:
  1. Estimate Increase       = revised_estimate - original_estimate
  2. Estimate Increase %     = (revised - original) / original x 100
  3. Actual vs Original %    = (actual - original)  / original x 100
  4. Actual vs Revised %     = (actual - revised)   / revised  x 100
  5. Remaining Balance       = revised_estimate - actual_expenditure

Classification tiers (configurable -- not statutory):
  WITHIN_BUDGET:     estimate_increase_pct <= threshold
  COST_ESCALATION:   estimate_increase_pct > threshold
  OVERRUN_RISK:      actual_vs_original_pct > threshold (actual still under revised)
  SEVERE_ESCALATION: estimate_increase_pct > 2x threshold
  OVERRUN_CONFIRMED: actual_vs_revised_pct >= 0 (revised budget breached)

All thresholds are read from config.settings (configurable).
"""

from __future__ import annotations
from datetime import datetime
from typing import Any

from config import settings


def _threshold() -> float:
    return float(getattr(settings, "COST_OVERRUN_MONITOR_THRESHOLD_PCT", 25.0))


def analyze_cost_overrun(
    *,
    project_id: str,
    project_title: str,
    original_estimate_inr: int,
    revised_estimate_inr: int,
    actual_expenditure_inr: int,
    sanction_date: datetime | None = None,
    category: str | None = None,
    constituency: str | None = None,
    monitoring_threshold_pct: float | None = None,
) -> dict[str, Any]:
    """
    Perform deterministic cost-overrun analytics on a project.
    Returns a structured cost-overrun analysis dict.
    """
    threshold = monitoring_threshold_pct if monitoring_threshold_pct is not None else _threshold()

    orig = max(original_estimate_inr or 0, 0)
    rev  = max(revised_estimate_inr  or orig, 0)
    act  = max(actual_expenditure_inr or 0, 0)

    # 1. Estimate increase (absolute)
    estimate_increase_inr = rev - orig

    # 2. Estimate increase %
    estimate_increase_pct = round((estimate_increase_inr / orig * 100), 2) if orig > 0 else 0.0

    # 3. Actual vs Original %
    actual_vs_original_pct = round(((act - orig) / orig * 100), 2) if orig > 0 else 0.0

    # 4. Actual vs Revised %
    actual_vs_revised_pct = round(((act - rev) / rev * 100), 2) if rev > 0 else 0.0

    # 5. Remaining balance
    remaining_balance_inr = rev - act

    # Flag generation
    flags: list[str] = []
    if estimate_increase_pct > threshold:
        flags.append("ESTIMATE_ESCALATION")
    if actual_vs_original_pct > threshold:
        flags.append("ACTUAL_EXCEEDS_ORIGINAL_THRESHOLD")
    if actual_vs_revised_pct > 0:
        flags.append("ACTUAL_EXCEEDS_REVISED_ESTIMATE")
    if remaining_balance_inr < 0:
        flags.append("REVISED_BUDGET_EXHAUSTED")
    if estimate_increase_pct > (threshold * 2):
        flags.append("SEVERE_COST_ESCALATION")

    # Classification
    overrun_status, risk_level, recommended_action = _classify_overrun(
        estimate_increase_pct=estimate_increase_pct,
        actual_vs_original_pct=actual_vs_original_pct,
        actual_vs_revised_pct=actual_vs_revised_pct,
        remaining_balance_inr=remaining_balance_inr,
        flags=flags,
        threshold=threshold,
    )

    # Narrative summary
    summary = _build_summary(
        project_id=project_id,
        overrun_status=overrun_status,
        estimate_increase_pct=estimate_increase_pct,
        actual_vs_original_pct=actual_vs_original_pct,
        actual_vs_revised_pct=actual_vs_revised_pct,
        remaining_balance_inr=remaining_balance_inr,
        flags=flags,
        threshold=threshold,
        orig=orig,
        rev=rev,
        act=act,
    )

    return {
        "project_id": project_id,
        "project_title": project_title,
        "original_estimate_inr": orig,
        "revised_estimate_inr": rev,
        "actual_expenditure_inr": act,
        "estimate_increase_inr": estimate_increase_inr,
        "estimate_increase_pct": estimate_increase_pct,
        "actual_vs_original_pct": actual_vs_original_pct,
        "actual_vs_revised_pct": actual_vs_revised_pct,
        "remaining_balance_inr": remaining_balance_inr,
        "monitoring_threshold_pct": threshold,
        "overrun_flags": flags,
        "overrun_status": overrun_status,
        "risk_level": risk_level,
        "recommended_action": recommended_action,
        "analysis_summary": summary,
        "sanction_date": sanction_date.strftime("%Y-%m-%d") if sanction_date else None,
        "category": category,
        "constituency": constituency,
    }


def _classify_overrun(
    *,
    estimate_increase_pct: float,
    actual_vs_original_pct: float,
    actual_vs_revised_pct: float,
    remaining_balance_inr: int,
    flags: list[str],
    threshold: float,
) -> tuple[str, str, str]:
    """
    Classify cost-overrun severity using configurable monitoring thresholds.
    Thresholds are monitoring configuration -- NOT statutory mandates.
    Returns: (overrun_status, risk_level, recommended_action)
    """
    if "REVISED_BUDGET_EXHAUSTED" in flags or actual_vs_revised_pct > 0:
        return (
            "OVERRUN_CONFIRMED",
            "CRITICAL",
            "Immediate freeze on further disbursements pending financial review. "
            "Mandatory revised budget sanction required. Issue show-cause notice to "
            "Implementing Agency and Administering Authority. Escalate to Ministry.",
        )

    if "SEVERE_COST_ESCALATION" in flags:
        return (
            "SEVERE_ESCALATION",
            "HIGH",
            "Configured cost-overrun monitoring threshold exceeded by significant margin. "
            "Mandatory technical rate justification and site inspection required before "
            "approving revised estimate. Escalate to State Nodal Authority.",
        )

    if "ACTUAL_EXCEEDS_ORIGINAL_THRESHOLD" in flags:
        return (
            "OVERRUN_RISK",
            "HIGH",
            "Actual expenditure has exceeded the configured monitoring threshold relative to "
            "the original estimate. Re-validate bills and obtain revised sanction before "
            "releasing further payment installments.",
        )

    if "ESTIMATE_ESCALATION" in flags:
        return (
            "COST_ESCALATION",
            "MEDIUM",
            "Configured cost-overrun monitoring threshold exceeded. "
            "Technical justification for revised estimate increase is required. "
            "Monitor actual expenditure closely against revised approved budget.",
        )

    return (
        "WITHIN_BUDGET",
        "LOW",
        "Cost parameters are within the configured monitoring threshold. "
        "Continue normal monitoring. No intervention required at this stage.",
    )


def _build_summary(
    *,
    project_id: str,
    overrun_status: str,
    estimate_increase_pct: float,
    actual_vs_original_pct: float,
    actual_vs_revised_pct: float,
    remaining_balance_inr: int,
    flags: list[str],
    threshold: float,
    orig: int,
    rev: int,
    act: int,
) -> str:
    """Build a human-readable cost-overrun analysis summary."""
    bal_sign = "surplus" if remaining_balance_inr >= 0 else "deficit"
    bal_abs = abs(remaining_balance_inr)

    base = (
        f"Project {project_id}: Original Rs.{orig:,.0f} -> Revised Rs.{rev:,.0f} "
        f"(+{estimate_increase_pct:.2f}%). Actual expenditure Rs.{act:,.0f} "
        f"({actual_vs_original_pct:+.2f}% vs original, {actual_vs_revised_pct:+.2f}% vs revised). "
        f"Remaining balance: Rs.{bal_abs:,.0f} {bal_sign}."
    )

    if overrun_status == "OVERRUN_CONFIRMED":
        return (
            f"CRITICAL COST OVERRUN -- {base} "
            f"Revised estimate has been breached. "
            f"Signals: {', '.join(flags)}. Immediate authority intervention required."
        )
    elif overrun_status == "SEVERE_ESCALATION":
        return (
            f"SEVERE COST ESCALATION -- {base} "
            f"Estimate increase of {estimate_increase_pct:.2f}% significantly exceeds "
            f"configured monitoring threshold ({threshold:.1f}%). "
            f"Signals: {', '.join(flags)}. Escalation recommended."
        )
    elif overrun_status == "OVERRUN_RISK":
        return (
            f"COST OVERRUN RISK -- {base} "
            f"Actual vs original gap of {actual_vs_original_pct:.2f}% exceeds "
            f"configured monitoring threshold ({threshold:.1f}%). "
            f"Revised sanction may be required."
        )
    elif overrun_status == "COST_ESCALATION":
        return (
            f"COST ESCALATION DETECTED -- {base} "
            f"Estimate increase of {estimate_increase_pct:.2f}% exceeds configured "
            f"monitoring threshold ({threshold:.1f}%). Technical justification pending."
        )
    else:
        return (
            f"WITHIN BUDGET -- {base} "
            f"All parameters within configured monitoring threshold ({threshold:.1f}%). "
            f"No intervention required."
        )
