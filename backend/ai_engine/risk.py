"""
Risk Engine — aggregates all detector outputs into a composite score.

Sub-score computation and weighting follow the frozen specification exactly.
All weights and thresholds are read from config.settings.

Returns:
    RiskResult dataclass containing:
        - risk_score (0–100, integer)
        - sub_scores dict
        - reason_codes list
        - detector_signals dict
        - action (MONITOR | ALERT | CASE | CRITICAL)
"""
from __future__ import annotations
from dataclasses import dataclass, field

from config import settings


@dataclass
class RiskResult:
    risk_score: int
    sub_scores: dict
    reason_codes: list[str]
    detector_signals: dict
    action: str  # MONITOR | ALERT | CASE | CRITICAL


def _financial_sub_score(financial: dict) -> float:
    """
    financial = output of ml.detect_financial_anomalies()
    Max: 100
    """
    anomaly_component = financial.get("anomaly_score", 0) * 60
    variance_pct = financial.get("variance_pct", 0)
    variance_component = (min(variance_pct, 100) / 100) * 25
    overpayment_flag = "OVERPAYMENT_RISK" in financial.get("financial_risk_flags", [])
    overpayment_component = 15 if overpayment_flag else 0
    return min(anomaly_component + variance_component + overpayment_component, 100)


def _timeline_sub_score(compliance: dict) -> float:
    """
    compliance = output of rules.run_compliance_checks()
    Max: 100
    """
    delay_days = compliance.get("sanction_delay", {}).get("delay_days", 0)
    sanction_component = min(delay_days / 90, 1.0) * 60
    # Stall days not tracked in Slice 1 — deferred
    stall_component = 0.0
    return min(sanction_component + stall_component, 100)


def _duplicate_sub_score(photo_duplicate: bool, nlp_similarity_score: float = 0.0) -> float:
    """
    Max: 100.
    NLP duplicate (Slice 2) is passed as 0.0 for Slice 1.
    """
    photo_component = 50.0 if photo_duplicate else 0.0
    nlp_component = nlp_similarity_score * 70
    return min(photo_component + nlp_component, 100)


def _compliance_sub_score(compliance: dict) -> float:
    """
    Max: 100
    """
    doc_gap = compliance.get("document_gap", {})
    missing_count = doc_gap.get("missing_count", 0)
    total_required = 4  # sanction order, estimate, location, supporting doc
    doc_component = (missing_count / total_required) * 50 if total_required else 0

    sc_st = compliance.get("sc_st_compliance", {})
    sc_deficit = sc_st.get("sc_deficit_pct", 0)
    st_deficit = sc_st.get("st_deficit_pct", 0)
    sc_st_component = (max(sc_deficit, st_deficit) / 15) * 30

    geo_violation = 0  # Slice 2+
    return min(doc_component + sc_st_component + geo_violation, 100)


def _cv_sub_score(photo_duplicate: bool, progress_mismatch: dict) -> float:
    """
    Max: 100
    """
    photo_component = 50.0 if photo_duplicate else 0.0
    mismatch_pct = progress_mismatch.get("mismatch_pct", 0)
    mismatch_component = min(mismatch_pct / 50, 1.0) * 50
    return min(photo_component + mismatch_component, 100)


def compute_risk_score(
    financial: dict,
    compliance: dict,
    photo_duplicate: bool = False,
    nlp_similarity_score: float = 0.0,
) -> RiskResult:
    """
    Master risk computation function.

    Args:
        financial:  Output of ml.detect_financial_anomalies()
        compliance: Output of rules.run_compliance_checks()
        photo_duplicate: True if pHash duplicate found
        nlp_similarity_score: Cosine similarity to nearest project (0–1)

    Returns:
        RiskResult
    """
    progress_mismatch = compliance.get("progress_mismatch", {})

    fin   = _financial_sub_score(financial)
    time  = _timeline_sub_score(compliance)
    dup   = _duplicate_sub_score(photo_duplicate, nlp_similarity_score)
    comp  = _compliance_sub_score(compliance)
    cv    = _cv_sub_score(photo_duplicate, progress_mismatch)

    w = settings
    composite = (
        fin  * w.RISK_WEIGHT_FINANCIAL  +
        dup  * w.RISK_WEIGHT_DUPLICATE  +
        cv   * w.RISK_WEIGHT_CV         +
        time * w.RISK_WEIGHT_TIMELINE   +
        comp * w.RISK_WEIGHT_COMPLIANCE
    )
    risk_score = int(round(min(composite, 100)))

    # Build reason codes
    reason_codes: list[str] = []
    reason_codes.extend(financial.get("financial_risk_flags", []))

    if photo_duplicate:
        reason_codes.append("PHOTO_DUPLICATE")
    if progress_mismatch.get("flagged"):
        reason_codes.append("PROGRESS_MISMATCH")
    if compliance.get("sanction_delay", {}).get("flagged"):
        reason_codes.append("SANCTION_DELAY")
    if compliance.get("document_gap", {}).get("flagged"):
        reason_codes.append("DOCUMENT_GAP")
    if compliance.get("sc_st_compliance", {}).get("flagged"):
        reason_codes.append("SC_ST_NON_COMPLIANCE")
    if nlp_similarity_score >= settings.NLP_DUPLICATE_THRESHOLD:
        reason_codes.append("DUPLICATE_PROJECT")

    # Determine action
    if risk_score >= settings.RISK_THRESHOLD_CRITICAL:
        action = "CRITICAL"
    elif risk_score >= settings.RISK_THRESHOLD_CASE:
        action = "CASE"
    elif risk_score >= 40:
        action = "ALERT"
    else:
        action = "MONITOR"

    return RiskResult(
        risk_score=risk_score,
        sub_scores={
            "financial": round(fin, 1),
            "timeline": round(time, 1),
            "duplicate": round(dup, 1),
            "compliance": round(comp, 1),
            "cv": round(cv, 1),
        },
        reason_codes=list(dict.fromkeys(reason_codes)),  # deduplicate, preserve order
        detector_signals={
            "D1_sanction_delay": compliance.get("sanction_delay", {}).get("flagged", False),
            "D2_cost_variance": "COST_VARIANCE" in financial.get("financial_risk_flags", []),
            "D3_doc_gap": compliance.get("document_gap", {}).get("flagged", False),
            "D6_progress_mismatch": progress_mismatch.get("flagged", False),
            "D7_photo_duplicate": photo_duplicate,
            "D8_overpayment": "OVERPAYMENT_RISK" in financial.get("financial_risk_flags", []),
            "D9_sc_st": compliance.get("sc_st_compliance", {}).get("flagged", False),
        },
        action=action,
    )
