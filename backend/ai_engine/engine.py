"""
AI Engine Orchestrator.

This is the single entry point for all AI analysis.
Callers (payment service, project service) call run_analysis() here
and receive a structured AnalysisResult.
"""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from config import settings
from ai_engine import cv as cv_module
from ai_engine import ml as ml_module
from ai_engine import rules as rules_module
from ai_engine import risk as risk_module
from ai_engine.risk import RiskResult
from models import ImageHash, ProgressRecord


@dataclass
class AnalysisInput:
    project_id: str
    recommended_amount_inr: int
    sanctioned_amount_inr: int
    reported_progress_pct: int
    ai_evidence_pct: int | None       # From satellite sample or prior CV
    current_payment_amount: int       # 0 if not a payment event
    total_paid_inr: int
    payment_count: int
    days_since_sanction: int
    recommendation_date: datetime | None
    sanction_date: datetime | None
    missing_documents: list[str]
    sc_spend_pct: float
    st_spend_pct: float
    # For photo duplicate check — provided when a new image is uploaded
    new_image_bytes: bytes | None = None
    new_image_filename: str = ""
    nlp_similarity_score: float = 0.0   # Slice 2+


@dataclass
class AnalysisResult:
    risk: RiskResult
    photo_duplicate: bool
    duplicate_hash_id: str | None
    new_phash: str | None
    financial: dict
    compliance: dict


def run_analysis(inp: AnalysisInput, db: Session) -> AnalysisResult:
    """
    Run full AI analysis pipeline for a project event.

    Steps:
        1. ML financial anomaly detection
        2. Rule/compliance checks
        3. CV photo duplicate check (if new image provided)
        4. Risk score computation
    """
    # 1. Financial anomaly
    financial = ml_module.detect_financial_anomalies({
        "recommended_amount_inr": inp.recommended_amount_inr,
        "sanctioned_amount_inr": inp.sanctioned_amount_inr,
        "current_payment_amount": inp.current_payment_amount,
        "reported_progress_pct": inp.reported_progress_pct,
        "days_since_sanction": inp.days_since_sanction,
        "payment_count": inp.payment_count,
        "total_paid_inr": inp.total_paid_inr,
    })

    # 2. Compliance rules
    compliance = rules_module.run_compliance_checks({
        "recommendation_date": inp.recommendation_date,
        "sanction_date": inp.sanction_date,
        "missing_documents": inp.missing_documents,
        "sc_spend_pct": inp.sc_spend_pct,
        "st_spend_pct": inp.st_spend_pct,
        "reported_progress_pct": inp.reported_progress_pct,
        "ai_evidence_pct": inp.ai_evidence_pct,
    })

    # 3. CV duplicate photo check
    photo_duplicate = False
    duplicate_hash_id: str | None = None
    new_phash: str | None = None

    if inp.new_image_bytes:
        new_phash = cv_module.compute_phash(inp.new_image_bytes)
        existing = db.query(ImageHash).all()
        existing_hashes = [{"hash_id": h.hash_id, "phash": h.phash} for h in existing]
        photo_duplicate, duplicate_hash_id = cv_module.is_duplicate(new_phash, existing_hashes)

    # 4. Risk score
    risk = risk_module.compute_risk_score(
        financial=financial,
        compliance=compliance,
        photo_duplicate=photo_duplicate,
        nlp_similarity_score=inp.nlp_similarity_score,
    )

    return AnalysisResult(
        risk=risk,
        photo_duplicate=photo_duplicate,
        duplicate_hash_id=duplicate_hash_id,
        new_phash=new_phash,
        financial=financial,
        compliance=compliance,
    )


def screen_recommendation(
    title: str,
    description: str,
    category: str,
    constituency: str,
    estimated_cost_inr: int,
    db: Session,
) -> dict:
    """
    Screen a new MP recommendation for duplicates against existing projects.
    """
    from ai_engine import nlp as nlp_module
    from models import Project

    # Query candidate projects (prioritize same constituency)
    candidates = db.query(Project).all()
    candidate_dicts = [
        {
            "project_id": p.project_id,
            "title": p.title,
            "description": p.description or "",
            "location_text": p.location_text or "",
            "status": p.status,
            "sanctioned_amount_inr": p.sanctioned_amount_inr,
        }
        for p in candidates
    ]

    screening = nlp_module.screen_recommendation_against_projects(
        proposed_title=title,
        proposed_description=description,
        candidate_projects=candidate_dicts,
    )

    is_dup = screening["is_duplicate"]
    sim = screening["similarity_score"]

    # Compute pre-sanction screening risk score
    # Duplicate adds significant duplicate sub-score
    risk_score = int(round(sim * 70)) if is_dup else int(round(sim * 25))
    action = "REJECTION_WARNING" if is_dup else "PROCEED_TO_SANCTION"

    return {
        "is_duplicate": is_dup,
        "similarity_score": sim,
        "threshold": settings.NLP_DUPLICATE_THRESHOLD,
        "matched_project": screening["matched_project"],
        "overlapping_keywords": screening["overlapping_keywords"],
        "reason_codes": screening["reason_codes"],
        "risk_score": risk_score,
        "recommendation_action": action,
    }

