"""
Split-Work Enforcement Service — Vertical Slice 4.

Orchestrates split-work scanning, cluster enforcement, and statutory intervention:
  1. Queries candidate projects from the DB (same constituency/category, RECOMMENDED/SANCTIONED/EXECUTION).
  2. Calls the AI engine to detect clusters.
  3. For each cluster: sets mandatory_tender=True, raises risk, creates a Case, writes audit events,
     and dispatches a DA/MoSPI notification.
  4. Idempotent: will not create duplicate cases/audit events for clusters already enforced.
"""
from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from models import Project, Case, AuditEvent, Authority
from services.audit import write_event
from services.cases import create_case
from services.notifications import send_notification
from ai_engine.split_work import detect_split_work_clusters

logger = logging.getLogger("split_work_svc")

SPLIT_WORK_CASE_ID_PREFIX = "CASE-SPLIT"
IDEMPOTENCY_AUDIT_TYPE = "SPLIT_WORK_DETECTED"


def _project_to_dict(p: Project) -> dict:
    """Convert a Project ORM row to a plain dict for the detection engine."""
    return {
        "project_id": p.project_id,
        "title": p.title or "",
        "description": p.description or "",
        "category": p.category or "",
        "constituency": p.constituency or "",
        "location_text": p.location_text or "",
        "lat": p.lat,
        "lon": p.lon,
        "sanctioned_amount_inr": p.sanctioned_amount_inr or 0,
        "mandatory_tender": p.mandatory_tender or False,
        "status": p.status,
    }


def _cluster_case_id(cluster: dict) -> str:
    """Derive a deterministic case ID from sorted member project IDs."""
    member_ids = sorted(m["project_id"] for m in cluster["member_projects"])
    # Use the suffix of the first sorted project ID for a stable short ID
    first_suffix = member_ids[0].split("-")[-1]
    return f"CASE-SPLIT-{first_suffix}"


def _cluster_already_enforced(db: Session, case_id: str) -> bool:
    """Return True if a split-work case already exists and is still open."""
    existing = db.query(Case).filter_by(case_id=case_id).first()
    if existing and existing.status not in ("RESOLVED", "DISMISSED"):
        return True
    return False


def get_split_work_clusters(db: Session) -> list[dict]:
    """
    Read-only: detect and return all split-work clusters without enforcing anything.
    Returns clusters with an additional `case_id` key indicating current enforcement state.
    """
    projects = db.query(Project).filter(
        Project.status.in_(["RECOMMENDED", "SANCTIONED", "EXECUTION", "PAYMENT"])
    ).all()

    project_dicts = [_project_to_dict(p) for p in projects]
    clusters = detect_split_work_clusters(project_dicts)

    # Annotate each cluster with the case_id and actual mandatory_tender enforcement status
    for cluster in clusters:
        case_id = _cluster_case_id(cluster)
        cluster["case_id"] = case_id if _cluster_already_enforced(db, case_id) else None

        # Refresh mandatory_tender status from DB
        member_ids = [m["project_id"] for m in cluster["member_projects"]]
        db_projects = db.query(Project).filter(Project.project_id.in_(member_ids)).all()
        cluster["mandatory_tender_enforced"] = all(p.mandatory_tender for p in db_projects)

    return clusters


def enforce_split_work_clusters(db: Session, constituency: str | None = None) -> dict:
    """
    Scan for split-work clusters and enforce mandatory e-tender on detected clusters.

    - Idempotent: clusters already enforced are skipped.
    - Returns a summary dict with clusters_detected, clusters_enforced, and full cluster list.
    """
    query = db.query(Project).filter(
        Project.status.in_(["RECOMMENDED", "SANCTIONED", "EXECUTION", "PAYMENT"])
    )
    if constituency:
        query = query.filter(Project.constituency == constituency)

    projects = query.all()
    project_dicts = [_project_to_dict(p) for p in projects]
    clusters = detect_split_work_clusters(project_dicts)

    enforced_count = 0

    for cluster in clusters:
        case_id = _cluster_case_id(cluster)
        member_ids = [m["project_id"] for m in cluster["member_projects"]]

        # Idempotency check
        if _cluster_already_enforced(db, case_id):
            logger.info(f"Cluster {case_id} already enforced — skipping.")
            # Still annotate the case_id and real status
            cluster["case_id"] = case_id
            cluster["mandatory_tender_enforced"] = True
            continue

        total_cost = cluster["total_aggregated_cost_inr"]
        member_count = len(cluster["member_projects"])
        corridor_name = cluster["corridor_name"]

        logger.info(
            f"Enforcing split-work cluster {case_id}: {member_count} works, "
            f"total ₹{total_cost:,}, corridor={corridor_name!r}"
        )

        # 1. Update mandatory_tender on all member projects and raise risk
        db_members = db.query(Project).filter(Project.project_id.in_(member_ids)).all()
        for proj in db_members:
            proj.mandatory_tender = True
            proj.risk_score = max(proj.risk_score, 70)
            db.flush()

        # 2. Write SPLIT_WORK_DETECTED audit event for each member project
        for proj in db_members:
            write_event(
                db,
                event_type="SPLIT_WORK_DETECTED",
                project_id=proj.project_id,
                actor_id="SYSTEM",
                actor_role="SYSTEM",
                description=(
                    f"Artificial work splitting detected in corridor: '{corridor_name}'. "
                    f"Cluster of {member_count} works totalling ₹{total_cost:,} exceeds "
                    f"₹{cluster['individual_threshold_inr']:,} direct-quotation ceiling per work."
                ),
                metadata={
                    "cluster_id": cluster["cluster_id"],
                    "case_id": case_id,
                    "total_cost": total_cost,
                    "nlp_similarity": cluster["nlp_corridor_similarity"],
                    "member_ids": member_ids,
                },
            )

        # 3. Write MANDATORY_TENDER_ENFORCED audit event on the lead project
        lead_project_id = sorted(member_ids)[0]
        write_event(
            db,
            event_type="MANDATORY_TENDER_ENFORCED",
            project_id=lead_project_id,
            actor_id="SYSTEM",
            actor_role="SYSTEM",
            description=(
                f"Public e-tendering mandate enforced. Unified tender: "
                f"'{cluster['unified_tender_title']}' (₹{total_cost:,})."
            ),
            metadata={
                "case_id": case_id,
                "unified_tender_title": cluster["unified_tender_title"],
                "member_ids": member_ids,
            },
        )

        # 4. Create intervention Case using the existing create_case() service
        #    We use the lead project to anchor the case; create_case derives its ID from project suffix.
        #    We need a custom case_id, so we create the Case directly.
        da = db.query(Authority).filter_by(role="DA").first()
        mospi = db.query(Authority).filter_by(role="MINISTRY").first()

        case = Case(
            case_id=case_id,
            project_id=lead_project_id,
            reason_codes=["SPLIT_WORK_ANOMALY", "MANDATORY_TENDER_ENFORCED"],
            risk_score_at_creation=70,
            assigned_to_authority_id=da.authority_id if da else None,
            assigned_tier="DA",
            status="NOTIFIED",
            response_deadline=None,
            ai_explanation=(
                f"AI DETECTION — Procurement Anomaly: {member_count} work orders across the "
                f"'{corridor_name}' corridor were individually priced at ₹{total_cost // member_count:,} each "
                f"(below the ₹{cluster['individual_threshold_inr']:,} direct-quotation ceiling) to evade mandatory "
                f"public e-tendering. Aggregate value ₹{total_cost:,} exceeds the ₹10,00,000 statutory threshold. "
                f"Unified e-tender enforced per MPLADS procurement guidelines."
            ),
        )
        db.add(case)
        db.flush()

        write_event(
            db,
            event_type="CASE_CREATED",
            project_id=lead_project_id,
            case_id=case_id,
            actor_id="SYSTEM",
            actor_role="SYSTEM",
            description=f"Split-work intervention case {case_id} created.",
            new_value=case_id,
            metadata={"reason_codes": ["SPLIT_WORK_ANOMALY", "MANDATORY_TENDER_ENFORCED"]},
        )

        # 5. Notify DA
        if da:
            content = (
                f"PROCUREMENT INTEGRITY ALERT\n"
                f"Case: {case_id} | Corridor: {corridor_name}\n\n"
                f"AI system has detected artificial splitting of {member_count} work orders "
                f"(Projects: {', '.join(member_ids)}) totalling ₹{total_cost:,}.\n\n"
                f"Each work order was individually priced below ₹{cluster['individual_threshold_inr']:,} "
                f"to circumvent the mandatory public e-tender requirement.\n\n"
                f"ACTION REQUIRED: Mandatory public e-tendering has been enforced. "
                f"Please consolidate into a single unified tender: '{cluster['unified_tender_title']}'."
            )
            send_notification(
                db,
                recipient_id=da.authority_id,
                recipient_role="DA",
                case_id=case_id,
                project_id=lead_project_id,
                content=content,
            )

        # 6. Notify MoSPI (Ministry)
        if mospi:
            ministry_content = (
                f"[MPLADS MONITORING ALERT] Split-Work Anomaly Detected.\n"
                f"Constituency: {cluster['constituency']} | Case: {case_id}\n"
                f"{member_count} fragmented work orders in '{corridor_name}' corridor "
                f"totalling ₹{total_cost:,}. Mandatory e-tender enforced. DA notified."
            )
            send_notification(
                db,
                recipient_id=mospi.authority_id,
                recipient_role="MINISTRY",
                case_id=case_id,
                project_id=lead_project_id,
                content=ministry_content,
            )

        cluster["case_id"] = case_id
        cluster["mandatory_tender_enforced"] = True
        enforced_count += 1

    db.commit()

    return {
        "status": "SUCCESS",
        "clusters_detected": len(clusters),
        "clusters_enforced": enforced_count,
        "clusters": clusters,
    }
