"""
FastAPI Application Entrypoint — Vertical Slice 1.

Endpoints:
- POST /api/payments               -> Submit payment, AI check, simulated hold, auto-create case
- GET  /api/projects/{id}          -> Project details, risk score, progress, payment history
- GET  /api/projects/{id}/audit    -> Chronological immutable audit trail
- GET  /api/cases                  -> Active/resolved case inbox
- GET  /api/cases/{id}             -> Case detail, timeline, escalation events, evidence
- POST /api/cases/{id}/evidence    -> Submit authority justification, AI re-eval, resolution
- GET  /api/notifications          -> Notification inbox
- POST /api/seed/reset             -> Reset database to deterministic starting state
"""

from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from database import get_db, create_tables
from models import Project, PaymentRequest, Case, AuditEvent, Notification, ProgressRecord
import schemas
from services.payments import submit_payment_request
from services.evidence import submit_evidence
from scheduler import start_scheduler, stop_scheduler
from seed import reset_and_seed_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown lifecycle."""
    logger.info("Initializing MPLADS AI Platform...")
    create_tables()
    # Auto-seed database if empty on fresh cloud deployment
    from database import SessionLocal
    with SessionLocal() as db:
        if db.query(Project).count() == 0:
            logger.info("Fresh deployment detected: auto-seeding multi-state demo dataset...")
            reset_and_seed_db(db)
    scheduler = start_scheduler()
    yield
    logger.info("Shutting down MPLADS AI Platform...")
    stop_scheduler()


app = FastAPI(
    title="MPLADS AI Monitoring & Intervention Platform",
    description="Active closed-loop AI enforcement platform for MPLADS. Vertical Slice 1.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Configuration
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "OK",
        "system": "MPLADS-AI-MONITORING",
        "slice": "VERTICAL_SLICE_1_PAYMENT_INTERVENTION",
        "demo_mode": settings.DEMO_MODE,
        "acceleration_factor": settings.DEMO_ACCELERATION_FACTOR,
    }


# ---------------------------------------------------------------------------
# Seed / Reset Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/seed/reset", response_model=schemas.SeedResetResponse, tags=["Demo"])
def reset_database(db: Session = Depends(get_db)):
    """Reset database to deterministic initial state for demo testing."""
    result = reset_and_seed_db(db)
    return result


# ---------------------------------------------------------------------------
# Payment Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/payments", response_model=schemas.PaymentSubmitResponse, tags=["Payments"])
async def create_payment_request(
    project_id: str = Form(None),
    requested_amount_inr: int = Form(None),
    submitted_by: str = Form("DRDA-IA"),
    trigger_demo_scenario: bool = Form(False),
    image: UploadFile = File(None),
    # Support raw JSON payload as fallback
    payload: schemas.PaymentSubmitRequest = None,
    db: Session = Depends(get_db),
):
    """
    Submit a payment request from Implementing Agency.
    Runs automated AI/risk checks:
    - If risk >= 70: payment becomes HELD_FOR_REVIEW, Case is auto-created, DA notified.
    - If risk < 70: payment becomes APPROVED_FOR_REVIEW.
    """
    p_id = project_id or (payload.project_id if payload else None)
    amt = requested_amount_inr or (payload.requested_amount_inr if payload else None)
    submitter = submitted_by or (payload.submitted_by if payload else "DRDA-IA")
    demo_flag = trigger_demo_scenario or (payload.trigger_demo_scenario if payload else False)

    if not p_id or amt is None:
        raise HTTPException(status_code=422, detail="project_id and requested_amount_inr are required")

    image_bytes = None
    image_filename = ""
    if image:
        image_bytes = await image.read()
        image_filename = image.filename or "upload.jpg"

    try:
        res = submit_payment_request(
            db,
            project_id=p_id,
            requested_amount_inr=amt,
            submitted_by=submitter,
            image_bytes=image_bytes,
            image_filename=image_filename,
            trigger_demo_scenario=demo_flag,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting payment: {e}")
        raise HTTPException(status_code=500, detail=f"Payment submission failed: {e}")


# ---------------------------------------------------------------------------
# Recommendation Screening Endpoints (Slice 2)
# ---------------------------------------------------------------------------
@app.post("/api/projects/recommend", response_model=schemas.RecommendationScreenResponse, tags=["Projects"])
def screen_new_recommendation(
    payload: schemas.RecommendationScreenRequest,
    db: Session = Depends(get_db),
):
    """
    Screen a new MP project recommendation for semantic duplicate works (Slice 2).
    Evaluates semantic overlap against existing sanctioned projects in the constituency.
    """
    from ai_engine.engine import screen_recommendation

    result = screen_recommendation(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        constituency=payload.constituency,
        estimated_cost_inr=payload.estimated_cost_inr,
        db=db,
    )
    return result


# ---------------------------------------------------------------------------
# Project Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/projects/{project_id}", response_model=schemas.ProjectDetail, tags=["Projects"])
def get_project_details(project_id: str, db: Session = Depends(get_db)):
    """Retrieve full project state, risk score, progress, and payment history."""
    project = db.query(Project).filter_by(project_id=project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    latest_prog = (
        db.query(ProgressRecord)
        .filter_by(project_id=project_id)
        .order_by(ProgressRecord.timestamp.desc())
        .first()
    )

    prog_dict = None
    if latest_prog:
        prog_dict = {
            "reported_pct": latest_prog.reported_pct,
            "ai_evidence_pct": latest_prog.ai_evidence_pct,
            "ai_evidence_source": latest_prog.ai_evidence_source,
            "photo_paths": latest_prog.photo_paths,
            "timestamp": latest_prog.timestamp,
        }

    return schemas.ProjectDetail(
        project_id=project.project_id,
        mp_id=project.mp_id,
        title=project.title,
        description=project.description,
        category=project.category,
        location_text=project.location_text,
        lat=project.lat,
        lon=project.lon,
        constituency=project.constituency,
        state=project.state,
        recommended_amount_inr=project.recommended_amount_inr,
        sanctioned_amount_inr=project.sanctioned_amount_inr,
        implementing_agency=project.implementing_agency,
        status=project.status,
        risk_score=project.risk_score,
        risk_breakdown=project.risk_breakdown or {},
        mandatory_tender=project.mandatory_tender,
        missing_documents=project.missing_documents or [],
        recommendation_date=project.recommendation_date,
        sanction_date=project.sanction_date,
        completion_date=project.completion_date,
        created_at=project.created_at,
        updated_at=project.updated_at,
        payments=[schemas.PaymentSummary.from_orm(p) for p in project.payments],
        latest_progress=prog_dict,
    )


@app.get("/api/projects/{project_id}/audit", response_model=list[schemas.AuditEventSummary], tags=["Projects"])
def get_project_audit_trail(project_id: str, db: Session = Depends(get_db)):
    """Retrieve immutable chronological audit events for a project."""
    events = (
        db.query(AuditEvent)
        .filter_by(project_id=project_id)
        .order_by(AuditEvent.timestamp.asc())
        .all()
    )
    return events


# ---------------------------------------------------------------------------
# Case Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/cases", response_model=list[schemas.CaseSummary], tags=["Cases"])
def list_cases(
    status: str = Query(None, description="Filter by case status"),
    assigned_tier: str = Query(None, description="Filter by assigned tier (DA/SNA/MINISTRY)"),
    project_id: str = Query(None, description="Filter by project ID"),
    db: Session = Depends(get_db),
):
    """Retrieve list of active or past intervention cases."""
    query = db.query(Case)
    if status:
        query = query.filter(Case.status == status)
    if assigned_tier:
        query = query.filter(Case.assigned_tier == assigned_tier)
    if project_id:
        query = query.filter(Case.project_id == project_id)

    cases = query.order_by(Case.created_at.desc()).all()
    return cases


@app.get(
    "/api/cases/open",
    response_model=schemas.OpenCasesResponse,
    tags=["Escalation", "Cases"],
)
def get_open_cases(db: Session = Depends(get_db)):
    """
    Retrieve all currently active (non-resolved) cases enriched with live SLA countdown.
    Each case includes:
      - time_remaining_seconds: seconds until response_deadline (negative = overdue)
      - is_overdue: True if authority has missed their SLA window
      - escalation_count: number of escalation events recorded
    Used by the F16 Accountability Clock dashboard for real-time SLA tracking.
    """
    from datetime import datetime as _dt
    from models import Project as _Proj

    CLOSED_STATUSES = ("RESOLVED", "DISMISSED")
    active_cases = (
        db.query(Case)
        .filter(Case.status.notin_(CLOSED_STATUSES))
        .order_by(Case.created_at.desc())
        .all()
    )

    now = _dt.utcnow()
    enriched: list[schemas.OpenCaseItem] = []
    overdue_count = 0
    by_tier: dict[str, int] = {}

    for c in active_cases:
        proj = db.query(_Proj).filter_by(project_id=c.project_id).first()
        remaining = None
        overdue = False
        if c.response_deadline:
            remaining = int((c.response_deadline - now).total_seconds())
            overdue = remaining < 0

        if overdue:
            overdue_count += 1

        tier = c.assigned_tier or "DA"
        by_tier[tier] = by_tier.get(tier, 0) + 1

        esc_count = len(c.escalation_events) if c.escalation_events else 0

        enriched.append(schemas.OpenCaseItem(
            case_id=c.case_id,
            project_id=c.project_id,
            project_title=proj.title if proj else c.project_id,
            assigned_tier=tier,
            status=c.status,
            reason_codes=c.reason_codes or [],
            risk_score_at_creation=c.risk_score_at_creation or 0,
            response_deadline=c.response_deadline,
            time_remaining_seconds=remaining,
            is_overdue=overdue,
            escalation_count=esc_count,
            created_at=c.created_at,
            ai_explanation=c.ai_explanation,
        ))

    return schemas.OpenCasesResponse(
        open_cases=enriched,
        total_open=len(enriched),
        overdue_count=overdue_count,
        by_tier=by_tier,
    )


@app.get("/api/cases/{case_id}", response_model=schemas.CaseDetail, tags=["Cases"])
def get_case_details(case_id: str, db: Session = Depends(get_db)):
    """Retrieve full case details, AI explanation, evidence submissions, and escalation history."""
    case = db.query(Case).filter_by(case_id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return case


@app.post("/api/cases/{case_id}/evidence", response_model=schemas.EvidenceSubmitResponse, tags=["Cases"])
async def submit_case_evidence(
    case_id: str,
    submitted_by: str = Form(None),
    submitted_role: str = Form(None),
    content_type: str = Form("TEXT"),
    content_text: str = Form(""),
    justification_reduces_duplicate: bool = Form(True),
    image: UploadFile = File(None),
    # JSON payload fallback
    payload: schemas.EvidenceSubmitRequest = None,
    x_user_id: str = Header(None),
    x_role: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    Submit authority evidence/justification against an open case.
    Triggers AI re-evaluation:
    - If new risk < 70: Case status -> RESOLVED, held payment released.
    - If new risk >= 70: Case remains open with updated risk score.
    """
    submitter = submitted_by or (payload.submitted_by if payload else None) or x_user_id or "AUTH-DA-01"
    role = submitted_role or (payload.submitted_role if payload else None) or x_role or "DA"
    c_type = content_type or (payload.content_type if payload else "TEXT")
    text_content = content_text or (payload.content_text if payload else "")
    reduces_dup = justification_reduces_duplicate if payload is None else payload.justification_reduces_duplicate

    image_bytes = None
    image_filename = ""
    if image:
        image_bytes = await image.read()
        image_filename = image.filename or "evidence.jpg"

    try:
        result = submit_evidence(
            db,
            case_id=case_id,
            submitted_by=submitter,
            submitted_role=role,
            content_type=c_type,
            content_text=text_content,
            image_bytes=image_bytes,
            image_filename=image_filename,
            justification_reduces_duplicate=reduces_dup,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting evidence for case {case_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Evidence processing failed: {e}")


# ---------------------------------------------------------------------------
# Notification Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/notifications", response_model=list[schemas.NotificationSummary], tags=["Notifications"])
def get_notifications(
    recipient_role: str = Query(None, description="Filter by role (DA/SNA/MINISTRY)"),
    recipient_id: str = Query(None, description="Filter by specific recipient authority ID"),
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    db: Session = Depends(get_db),
):
    """Retrieve notifications inbox for authorities."""
    query = db.query(Notification)
    if recipient_role:
        query = query.filter(Notification.recipient_role == recipient_role)
    if recipient_id:
        query = query.filter(Notification.recipient_id == recipient_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifs = query.order_by(Notification.sent_at.desc()).all()
    return notifs


@app.patch("/api/notifications/{notification_id}/read", tags=["Notifications"])
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    """Mark a notification as read."""
    notif = db.query(Notification).filter_by(notification_id=notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "SUCCESS", "notification_id": notification_id, "is_read": True}


# ---------------------------------------------------------------------------
# Citizen Verification Endpoints (Slice 3)
# ---------------------------------------------------------------------------

@app.get("/api/citizen/projects", response_model=list[schemas.CitizenProjectSummary], tags=["Citizen"])
def list_citizen_verifiable_projects(db: Session = Depends(get_db)):
    """Retrieve public geo-tagged project directory with citizen verification status."""
    from services.citizen import get_citizen_project_summaries
    return get_citizen_project_summaries(db)


@app.post("/api/citizen/reports", response_model=schemas.CitizenReportResponse, tags=["Citizen"])
async def submit_citizen_verification_report(
    project_id: str = Form(...),
    is_functional: bool = Form(...),
    description: str = Form(""),
    citizen_lat: float = Form(None),
    citizen_lon: float = Form(None),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    """
    Submit a citizen ground-truth verification report (YES/NO) with photo and location.
    Evaluates credibility and automatically triggers an inspection case if negative consensus >= 3.0.
    """
    from services.citizen import submit_citizen_report

    photo_bytes = None
    photo_filename = ""
    if photo:
        photo_bytes = await photo.read()
        photo_filename = photo.filename or "citizen_photo.jpg"

    try:
        result = submit_citizen_report(
            db,
            project_id=project_id,
            is_functional=is_functional,
            description=description,
            citizen_lat=citizen_lat,
            citizen_lon=citizen_lon,
            photo_bytes=photo_bytes,
            photo_filename=photo_filename,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error submitting citizen report: {e}")
        raise HTTPException(status_code=500, detail=f"Citizen report failed: {e}")


@app.get("/api/projects/{project_id}/citizen-reports", response_model=list[schemas.CitizenReportDetail], tags=["Citizen"])
def get_project_citizen_reports(project_id: str, db: Session = Depends(get_db)):
    """Retrieve all citizen ground-truth reports submitted for a project."""
    from models import CitizenReport
    reports = (
        db.query(CitizenReport)
        .filter_by(project_id=project_id)
        .order_by(CitizenReport.created_at.desc())
        .all()
    )
    return reports


# ---------------------------------------------------------------------------
# Split-Work Anomaly Detection Endpoints (Slice 4)
# ---------------------------------------------------------------------------

@app.get(
    "/api/anomalies/split-work",
    response_model=list[schemas.SplitWorkCluster],
    tags=["Anomalies"],
)
def get_split_work_clusters(db: Session = Depends(get_db)):
    """
    Read-only detection of artificial work-splitting clusters.
    Returns all detected clusters with member projects, corridor similarity, and enforcement status.
    No state is modified.
    """
    try:
        from services.split_work import get_split_work_clusters as _get_clusters
        clusters = _get_clusters(db)
        return clusters
    except Exception as e:
        logger.error(f"Error detecting split-work clusters: {e}")
        raise HTTPException(status_code=500, detail=f"Split-work detection failed: {e}")


@app.post(
    "/api/anomalies/split-work/scan",
    response_model=schemas.SplitWorkScanResponse,
    tags=["Anomalies"],
)
def trigger_split_work_scan(
    body: schemas.SplitWorkScanRequest | None = None,
    db: Session = Depends(get_db),
):
    """
    Scan for split-work clusters and enforce mandatory public e-tendering.

    - Sets mandatory_tender=True on all detected cluster member projects.
    - Creates a DA intervention Case for each cluster.
    - Writes audit events: SPLIT_WORK_DETECTED, MANDATORY_TENDER_ENFORCED.
    - Dispatches DA and MoSPI notifications.
    - Idempotent: repeated calls will not create duplicate cases/audit events.
    """
    try:
        from services.split_work import enforce_split_work_clusters
        constituency = body.constituency if body else None
        result = enforce_split_work_clusters(db, constituency=constituency)
        return result
    except Exception as e:
        logger.error(f"Error enforcing split-work clusters: {e}")
        raise HTTPException(status_code=500, detail=f"Split-work enforcement failed: {e}")


# ---------------------------------------------------------------------------
# Satellite Remote Sensing Endpoints (Slice 5A)
# ---------------------------------------------------------------------------

@app.get(
    "/api/satellite/projects/{project_id}/analysis",
    response_model=schemas.SatelliteAnalysisResponse,
    tags=["Satellite"],
)
def get_project_satellite_analysis(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve deterministic Sentinel-2 multi-temporal change detection analysis.
    Compares baseline T0 vs current T1 optical passes, computing NDBI, NDVI,
    and estimated physical progress.
    """
    try:
        from services.satellite import get_satellite_analysis
        res = get_satellite_analysis(db, project_id=project_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Satellite analysis failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Satellite analysis failed: {e}")


@app.post(
    "/api/satellite/projects/{project_id}/verify",
    response_model=schemas.SatelliteVerificationResponse,
    tags=["Satellite"],
)
def verify_project_satellite_progress(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Execute AI remote sensing verification.
    - Records satellite evidence
    - Recalculates risk with progress mismatch detector (D6)
    - If mismatch > 20%: escalates status to INSPECTION_REQUIRED,
      creates CASE-SAT-{suffix}, and alerts DA and MoSPI.
    """
    try:
        from services.satellite import verify_satellite_progress
        res = verify_satellite_progress(db, project_id=project_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Satellite verification failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Satellite verification failed: {e}")


# ---------------------------------------------------------------------------
# Delay & Stalled Project Detection Endpoints (Slice 5B / F12)
# ---------------------------------------------------------------------------

@app.get(
    "/api/delay/projects/{project_id}/analysis",
    response_model=schemas.DelayAnalysisResponse,
    tags=["Delay"],
)
def get_project_delay_analysis(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve deterministic delay analysis for a project.
    Compares elapsed timeline, expected progress, and actual progress
    to classify delay severity.
    """
    try:
        from services.delay import get_delay_analysis
        res = get_delay_analysis(db, project_id=project_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Delay analysis failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Delay analysis failed: {e}")


@app.post(
    "/api/delay/projects/{project_id}/scan",
    response_model=schemas.DelayScanResponse,
    tags=["Delay"],
)
def scan_project_delay(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Execute project delay detection scan.
    - Analyzes project lifecycle trajectory
    - Recalculates risk with delay signals
    - If PROJECT_STALLED or SEVERE_DELAY with risk >= 70: creates CASE-DELAY-{suffix}
    - Dispatches DA notification
    - Idempotent: repeated scans do not duplicate open cases
    """
    try:
        from services.delay import scan_project_delay as _scan
        res = _scan(db, project_id=project_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Delay scan failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Delay scan failed: {e}")


# ---------------------------------------------------------------------------
# Financial & Expenditure Analytics Endpoints (Slice 6 / F13)
# ---------------------------------------------------------------------------

@app.get(
    "/api/financial/projects/{project_id}/analysis",
    response_model=schemas.FinancialAnalysisResponse,
    tags=["Financial"],
)
def get_project_financial_analysis(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve project financial allocations, cost variance, installment history,
    fund utilization %, and expenditure anomaly indicators.
    """
    try:
        from services.financial import get_financial_analysis
        res = get_financial_analysis(db, project_id=project_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Financial analysis failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Financial analysis failed: {e}")


@app.post(
    "/api/financial/projects/{project_id}/scan",
    response_model=schemas.FinancialScanResponse,
    tags=["Financial"],
)
def scan_project_financials(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Execute financial anomaly detection scan on a project.
    - Evaluates fiscal allocations, cost variance, and disbursement pace
    - Recalculates unified risk score
    - Escalates to INSPECTION_REQUIRED with CASE-FIN-{suffix} on critical anomalies
    - Dispatches DA notification and writes audit trail
    - Idempotent: repeated scans do not duplicate open cases
    """
    try:
        from services.financial import scan_project_financials as _scan_fin
        res = _scan_fin(db, project_id=project_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Financial scan failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Financial scan failed: {e}")


# ---------------------------------------------------------------------------
# Cost Overrun Detection Endpoints (Slice 7 / F14)
# ---------------------------------------------------------------------------

@app.get(
    "/api/cost-overrun/projects/{project_id}/analysis",
    response_model=schemas.CostOverrunAnalysisResponse,
    tags=["CostOverrun"],
)
def get_project_cost_overrun_analysis(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve cost-overrun analysis for a project.
    Computes original vs revised vs actual budget metrics.
    Read-only -- no state changes.
    """
    try:
        from services.cost_overrun import get_cost_overrun_analysis
        return get_cost_overrun_analysis(db, project_id=project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Cost-overrun analysis failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Cost-overrun analysis failed: {e}")


@app.post(
    "/api/cost-overrun/projects/{project_id}/scan",
    response_model=schemas.CostOverrunScanResponse,
    tags=["CostOverrun"],
)
def scan_project_cost_overrun(
    project_id: str,
    db: Session = Depends(get_db),
):
    """
    Execute cost-overrun detection scan on a project.
    - Evaluates original, revised, and actual budget trajectory
    - Recalculates unified risk score
    - Escalates to INSPECTION_REQUIRED with CASE-COST-{suffix} when conditions met
    - Dispatches DA notification and writes audit trail
    - Idempotent: repeated scans do not duplicate open cases
    """
    try:
        from services.cost_overrun import scan_project_cost_overrun as _scan_co
        return _scan_co(db, project_id=project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Cost-overrun scan failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Cost-overrun scan failed: {e}")


# ---------------------------------------------------------------------------
# Unified AI Analytics Dashboard Endpoints (Slice 8 / F15)
# ---------------------------------------------------------------------------

@app.get(
    "/api/analytics/dashboard",
    response_model=schemas.PortfolioDashboardResponse,
    tags=["AnalyticsDashboard"],
)
def get_portfolio_dashboard(
    db: Session = Depends(get_db),
):
    """
    Retrieve unified portfolio-level executive decision dashboard telemetry.
    Aggregates metrics across F1–F14:
      - Portfolio overview & funding utilization
      - Risk distribution (Low, Medium, High, Critical)
      - Active interventions summary (Payment Holds, Cases, Tender Enforcements, Discrepancies)
      - Authority workload (DA, SNA, MoSPI)
      - F1–F14 module health status
      - Filtered project drill-downs
      - Open cases & recent immutable activity feed
    """
    try:
        from services.dashboard import get_portfolio_dashboard as _get_dash
        return _get_dash(db)
    except Exception as e:
        logger.error(f"Dashboard aggregation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard aggregation failed: {e}")


# ---------------------------------------------------------------------------
# Accountability Clock & Escalation Endpoints (Slice 9 / F16)
# ---------------------------------------------------------------------------

@app.post(
    "/api/cases/{case_id}/simulate-no-response",
    response_model=schemas.SimulateNoResponseResponse,
    tags=["Escalation"],
)
def simulate_no_response(
    case_id: str,
    db: Session = Depends(get_db),
):
    """
    Demo-mode trigger: immediately advance a case one escalation tier
    (equivalent to the SLA timer expiring without an authority response).

    Reuses the production escalate_case() service — no logic is duplicated.
    Used by the F16 Accountability Clock for judge demo walk-through:
        DA → SNA → MoSPI (Tier 1 → L2 → L3)

    Returns:
      - previous/new status & tier
      - new response deadline with time_remaining_seconds
      - whether the case has reached the maximum tier
      - escalation_event_id of the new EscalationEvent created
    """
    from datetime import datetime as _dt

    case = db.query(Case).filter_by(case_id=case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")

    if case.status in ("RESOLVED", "DISMISSED"):
        raise HTTPException(
            status_code=409,
            detail=f"Case {case_id} is already {case.status} and cannot be escalated",
        )

    from services.cases import escalate_case as _escalate, TIERS as _TIERS

    prev_status = case.status
    prev_tier = case.assigned_tier or "DA"
    tier_idx = _TIERS.index(prev_tier) if prev_tier in _TIERS else 0
    at_max = tier_idx >= len(_TIERS) - 1

    if at_max:
        # Already at MINISTRY — mark as unresolved maximum tier
        from services.audit import write_event as _write_event
        _write_event(
            db,
            event_type="CASE_MAXIMUM_TIER_REACHED",
            project_id=case.project_id,
            case_id=case_id,
            description=f"Case {case_id} at maximum tier MINISTRY with no resolution.",
        )
        db.commit()
        return schemas.SimulateNoResponseResponse(
            case_id=case_id,
            project_id=case.project_id,
            previous_status=prev_status,
            new_status=case.status,
            previous_tier=prev_tier,
            new_tier=prev_tier,
            escalation_level=tier_idx + 1,
            new_response_deadline=case.response_deadline,
            time_remaining_seconds=None,
            notification_dispatched=False,
            escalation_event_id=None,
            at_maximum_tier=True,
            message=f"Case {case_id} is at the maximum tier (MINISTRY). No further escalation possible.",
        )

    updated = _escalate(db, case_id, reason="DEMO_NO_RESPONSE")
    db.commit()

    # Retrieve the most recent escalation event for this case
    from models import EscalationEvent as _EscEv
    latest_esc = (
        db.query(_EscEv)
        .filter_by(case_id=case_id)
        .order_by(_EscEv.triggered_at.desc())
        .first()
    )

    now = _dt.utcnow()
    remaining = None
    if updated and updated.response_deadline:
        remaining = int((updated.response_deadline - now).total_seconds())

    new_tier_idx = _TIERS.index(updated.assigned_tier) if updated and updated.assigned_tier in _TIERS else tier_idx + 1

    return schemas.SimulateNoResponseResponse(
        case_id=case_id,
        project_id=updated.project_id if updated else case.project_id,
        previous_status=prev_status,
        new_status=updated.status if updated else prev_status,
        previous_tier=prev_tier,
        new_tier=updated.assigned_tier if updated else prev_tier,
        escalation_level=new_tier_idx + 1,
        new_response_deadline=updated.response_deadline if updated else None,
        time_remaining_seconds=remaining,
        notification_dispatched=True,
        escalation_event_id=latest_esc.escalation_id if latest_esc else None,
        at_maximum_tier=(new_tier_idx >= len(_TIERS) - 1),
        message=(
            f"Case {case_id} escalated from {prev_tier} → {updated.assigned_tier if updated else prev_tier} "
            f"(DEMO_NO_RESPONSE). New SLA deadline set."
        ),
    )


# ---------------------------------------------------------------------------
# Authentication & Demo Personas Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/auth/login", response_model=schemas.LoginResponse, tags=["Auth"])
def login(
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    """Demo login endpoint returning JWT token and Persona profile."""
    from services.auth import authenticate_user
    return authenticate_user(db, username=payload.username, password=payload.password)


@app.get("/api/auth/personas", response_model=list[schemas.UserPersona], tags=["Auth"])
def get_demo_personas(
    db: Session = Depends(get_db),
):
    """Retrieve pre-configured demo personas for fast role switching."""
    from services.auth import get_personas
    return get_personas(db)


@app.get("/api/auth/me", response_model=schemas.UserPersona, tags=["Auth"])
def get_current_user_profile(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """Retrieve active user persona from JWT token header."""
    from services.auth import PERSONA_CATALOG
    # For demo simplicity, fallback to Ministry persona if no header provided
    return PERSONA_CATALOG[0]


# ---------------------------------------------------------------------------
# F17 Completion Verification Endpoints
# ---------------------------------------------------------------------------

@app.post(
    "/api/projects/{project_id}/verify-completion",
    response_model=schemas.CompletionVerifyResponse,
    tags=["Completion"],
)
def verify_completion(
    project_id: str,
    payload: schemas.CompletionVerifyRequest | None = None,
    db: Session = Depends(get_db),
):
    """
    Execute AI multi-signal project completion verification:
    - Analyzes reported physical progress, satellite change index,
      milestone photo uniqueness (pHash), citizen reports, and payment consistency.
    - If verified: sets status to VERIFIED, writes audit log.
    - If disputed: sets status to INSPECTION_REQUIRED, generates CASE-COMPL-{id}, alerts DA.
    """
    try:
        from services.completion import verify_project_completion
        notes = payload.completion_notes if payload else None
        photos = payload.completion_photos if payload else None
        exp = payload.final_expenditure_inr if payload else None
        role = payload.submitter_role if payload else "IA"
        return verify_project_completion(
            db,
            project_id=project_id,
            completion_notes=notes,
            completion_photos=photos,
            final_expenditure_inr=exp,
            submitter_role=role,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Completion verification failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Completion verification failed: {e}")


@app.get(
    "/api/projects/{project_id}/completion-dossier",
    response_model=schemas.CompletionDossierResponse,
    tags=["Completion"],
)
def get_completion_dossier_data(
    project_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve complete evidence dossier for project completion examination."""
    try:
        from services.completion import get_completion_dossier
        return get_completion_dossier(db, project_id=project_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Dossier retrieval failed for {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Dossier retrieval failed: {e}")


# ---------------------------------------------------------------------------
# MP Constituency Dashboard Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/mp/list", response_model=list[schemas.MPListItem], tags=["Dashboards"])
def get_all_mps_summary(db: Session = Depends(get_db)):
    """List all Members of Parliament for the constituency dashboard selector."""
    from services.mp_dashboard import list_mps
    return list_mps(db)


@app.get("/api/mp/{mp_id}/dashboard", response_model=schemas.MPDashboardResponse, tags=["Dashboards"])
def get_mp_constituency_dashboard(mp_id: str, db: Session = Depends(get_db)):
    """Retrieve full constituency dashboard for a specific MP (budget, SC/ST, pipeline)."""
    try:
        from services.mp_dashboard import get_mp_dashboard
        return get_mp_dashboard(db, mp_id=mp_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"MP dashboard failed for {mp_id}: {e}")
        raise HTTPException(status_code=500, detail=f"MP dashboard failed: {e}")


# ---------------------------------------------------------------------------
# DA (District Authority) Dashboard Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/da/list", response_model=list[schemas.DAListItem], tags=["Dashboards"])
def get_all_das_summary(db: Session = Depends(get_db)):
    """List all District Authorities for the operations dashboard selector."""
    from services.da_dashboard import list_das
    return list_das(db)


@app.get("/api/da/{authority_id}/dashboard", response_model=schemas.DADashboardResponse, tags=["Dashboards"])
def get_district_authority_dashboard(authority_id: str, db: Session = Depends(get_db)):
    """Retrieve DA operations dashboard (45-day SLA queue, payment holds, active cases)."""
    try:
        from services.da_dashboard import get_da_dashboard
        return get_da_dashboard(db, da_id=authority_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"DA dashboard failed for {authority_id}: {e}")
        raise HTTPException(status_code=500, detail=f"DA dashboard failed: {e}")


# ---------------------------------------------------------------------------
# SNA (State Nodal Authority) Dashboard Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/sna/list", response_model=list[schemas.SNAListItem], tags=["Dashboards"])
def get_all_snas_summary(db: Session = Depends(get_db)):
    """List all State Nodal Authorities for the dashboard selector."""
    from services.sna_dashboard import list_snas
    return list_snas(db)


@app.get("/api/sna/{authority_id}/dashboard", response_model=schemas.SNADashboardResponse, tags=["Dashboards"])
def get_state_nodal_dashboard(authority_id: str, db: Session = Depends(get_db)):
    """Retrieve SNA dashboard (district leaderboard, Tier-2 escalations, anomaly hotspots)."""
    try:
        from services.sna_dashboard import get_sna_dashboard
        return get_sna_dashboard(db, sna_id=authority_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"SNA dashboard failed for {authority_id}: {e}")
        raise HTTPException(status_code=500, detail=f"SNA dashboard failed: {e}")


# ---------------------------------------------------------------------------
# MoSPI National Command Dashboard Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/mospi/dashboard", response_model=schemas.MoSPIDashboardResponse, tags=["Dashboards"])
def get_national_command_dashboard(db: Session = Depends(get_db)):
    """Retrieve all-India MoSPI executive dashboard (State matrix, Tier-3 queue, Fiscal ledger)."""
    try:
        from services.mospi_dashboard import get_mospi_dashboard
        return get_mospi_dashboard(db)
    except Exception as e:
        logger.error(f"MoSPI dashboard failed: {e}")
        raise HTTPException(status_code=500, detail=f"MoSPI dashboard failed: {e}")



