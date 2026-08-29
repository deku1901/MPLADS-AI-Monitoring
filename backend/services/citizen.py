"""
Citizen Ground-Truth Verification Service (Vertical Slice 3).

Allows citizens to submit ground-truth operational reports (YES/NO) with optional
photos and GPS location. Implements statutory credibility scoring and automated
inspection case triggers on negative consensus.
"""
from __future__ import annotations
import math
import logging
from datetime import datetime
from typing import Sequence

from sqlalchemy.orm import Session

from models import Project, CitizenReport, Authority
from services.audit import write_event
from services.cases import create_case
from services.notifications import send_notification
from ai_engine import cv as cv_module

logger = logging.getLogger("citizen")


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth in kilometers."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def calculate_credibility(
    has_photo: bool,
    description: str | None,
    citizen_lat: float | None,
    citizen_lon: float | None,
    project_lat: float | None,
    project_lon: float | None,
) -> float:
    """
    Compute credibility score (0.0 to 3.5) per specification:
    - Photo uploaded: +1.5
    - GPS location within 5 km: +1.5
    - GPS location beyond 5 km: +0.5
    - Text description provided (>= 10 chars): +0.5
    """
    score = 0.0

    if has_photo:
        score += 1.5

    if citizen_lat is not None and citizen_lon is not None:
        if project_lat is not None and project_lon is not None:
            dist = _haversine_distance_km(citizen_lat, citizen_lon, project_lat, project_lon)
            if dist <= 5.0:
                score += 1.5
            else:
                score += 0.5
        else:
            score += 0.5

    if description and len(description.strip()) >= 10:
        score += 0.5

    return round(min(score, 3.5), 2)


def submit_citizen_report(
    db: Session,
    *,
    project_id: str,
    is_functional: bool,
    description: str = "",
    citizen_lat: float | None = None,
    citizen_lon: float | None = None,
    photo_bytes: bytes | None = None,
    photo_filename: str = "",
) -> dict:
    """
    Submit a citizen ground-truth report, calculate credibility, update consensus,
    and trigger an automated INSPECTION_REQUIRED case when negative consensus >= 3.0.
    """
    project: Project | None = db.query(Project).filter_by(project_id=project_id).first()
    if not project:
        raise ValueError(f"Project {project_id} not found")

    photo_path = None
    if photo_bytes and photo_filename:
        photo_path = cv_module.save_upload(photo_bytes, photo_filename)

    credibility = calculate_credibility(
        has_photo=bool(photo_bytes),
        description=description,
        citizen_lat=citizen_lat,
        citizen_lon=citizen_lon,
        project_lat=project.lat,
        project_lon=project.lon,
    )

    report = CitizenReport(
        project_id=project_id,
        is_functional=is_functional,
        description=description or None,
        photo_path=photo_path,
        citizen_lat=citizen_lat,
        citizen_lon=citizen_lon,
        credibility_score=credibility,
    )
    db.add(report)
    db.flush()

    # Audit event for report
    write_event(
        db,
        event_type="CITIZEN_REPORT_FILED",
        project_id=project_id,
        actor_id="CITIZEN_ANON",
        actor_role="CITIZEN",
        description=f"Citizen verification filed: Functional={is_functional}. Credibility={credibility}. {description[:60]}",
        metadata={
            "report_id": report.report_id,
            "is_functional": is_functional,
            "credibility_score": credibility,
            "has_photo": bool(photo_bytes),
        },
    )

    inspection_triggered = False
    generated_case_id = None

    # Evaluate consensus
    all_reports = db.query(CitizenReport).filter_by(project_id=project_id).all()
    negative_reports = [r for r in all_reports if not r.is_functional]
    positive_reports = [r for r in all_reports if r.is_functional]

    cum_neg_credibility = sum(r.credibility_score for r in negative_reports)

    # Trigger inspection case on cumulative negative credibility >= 3.0
    if not is_functional and cum_neg_credibility >= 3.0:
        if project.status != "INSPECTION_REQUIRED":
            old_status = project.status
            project.status = "INSPECTION_REQUIRED"
            project.risk_score = max(project.risk_score, 75)
            db.flush()

            # Create intervention case
            case = create_case(
                db,
                project_id=project_id,
                reason_codes=["CITIZEN_DISPUTE", "INSPECTION_REQUIRED"],
                risk_score=project.risk_score,
            )
            generated_case_id = case.case_id
            inspection_triggered = True

            write_event(
                db,
                event_type="INSPECTION_CASE_CREATED",
                project_id=project_id,
                case_id=case.case_id,
                description=f"Ground-truth negative consensus (Credibility: {cum_neg_credibility:.1f}) triggered inspection case",
                old_value=old_status,
                new_value="INSPECTION_REQUIRED",
                metadata={"cum_negative_credibility": cum_neg_credibility, "case_id": case.case_id},
            )

            # Notify District Authority
            da = db.query(Authority).filter_by(role="DA").first()
            if da:
                notif_text = (
                    f"ACTION REQUIRED: Citizen inspection case {case.case_id} created for {project_id}.\n"
                    f"Citizens reported non-functional asset with high corroborating credibility ({cum_neg_credibility:.1f}/3.0).\n"
                    f"Please conduct an on-site physical inspection immediately."
                )
                send_notification(
                    db,
                    recipient_id=da.authority_id,
                    recipient_role="DA",
                    case_id=case.case_id,
                    project_id=project_id,
                    content=notif_text,
                )
    elif is_functional and len(positive_reports) >= 2 and len(negative_reports) == 0:
        if project.status == "COMPLETED":
            old_status = project.status
            project.status = "VERIFIED"
    if project.status == "INSPECTION_REQUIRED":
        inspection_triggered = True
        if not generated_case_id:
            suffix = project_id.split("-")[-1]
            generated_case_id = f"CASE-{suffix}"

    db.commit()

    return {
        "report_id": report.report_id,
        "project_id": project_id,
        "is_functional": is_functional,
        "credibility_score": credibility,
        "inspection_triggered": inspection_triggered,
        "case_id": generated_case_id,
        "new_project_status": project.status,
    }


def get_citizen_project_summaries(db: Session) -> list[dict]:
    """Retrieve public project directory with citizen verification summary."""
    projects = db.query(Project).all()
    summaries = []

    for p in projects:
        reports = p.citizen_reports or []
        pos_count = sum(1 for r in reports if r.is_functional)
        neg_count = sum(1 for r in reports if not r.is_functional)
        neg_cred = sum(r.credibility_score for r in reports if not r.is_functional)

        if p.status == "INSPECTION_REQUIRED" or neg_cred >= 3.0:
            consensus_status = "INSPECTION_REQUIRED"
        elif p.status == "VERIFIED" or (pos_count >= 2 and neg_count == 0):
            consensus_status = "VERIFIED_FUNCTIONAL"
        else:
            consensus_status = "UNVERIFIED"

        summaries.append({
            "project_id": p.project_id,
            "title": p.title,
            "description": p.description,
            "category": p.category,
            "location_text": p.location_text,
            "lat": p.lat,
            "lon": p.lon,
            "status": p.status,
            "sanctioned_amount_inr": p.sanctioned_amount_inr,
            "citizen_verification_status": consensus_status,
            "positive_reports_count": pos_count,
            "negative_reports_count": neg_count,
        })

    return summaries
