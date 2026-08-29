"""
Deterministic Seed Data Generator for Vertical Slice 1.

Provides a repeatable, idempotent baseline state for the demo:
- Project: MPL-2026-1042
- Status: EXECUTION
- Initial Risk Score: 32
- Actors: MP, District Authority (DA), State Nodal Authority (SNA), Ministry (MoSPI), Implementing Agency
- Baseline prior payment released, progress record, reference image hash, and audit trail.

Running this script resets the database to the exact starting state required
for the deterministic Slice 1 demo walkthrough.
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from database import engine, create_tables, SessionLocal
from models import (
    Base, MP, Authority, Project, PaymentRequest,
    ProgressRecord, ImageHash, RiskScoreEvent,
    Case, EvidenceSubmission, EscalationEvent,
    Notification, AuditEvent, CitizenReport
)

logger = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO)


def reset_and_seed_db(db: Session | None = None) -> dict:
    """
    Clears all existing data and seeds the deterministic Slice 1 baseline.
    Can be called standalone or via API (/api/seed/reset).
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Ensure schema tables exist
        create_tables()

        # Delete all existing data in reverse foreign key order
        db.query(CitizenReport).delete()
        db.query(Notification).delete()
        db.query(EscalationEvent).delete()
        db.query(EvidenceSubmission).delete()
        db.query(Case).delete()
        db.query(RiskScoreEvent).delete()
        db.query(ImageHash).delete()
        db.query(ProgressRecord).delete()
        db.query(PaymentRequest).delete()
        db.query(AuditEvent).delete()
        db.query(Project).delete()
        db.query(Authority).delete()
        db.query(MP).delete()
        db.commit()

        # -------------------------------------------------------------------
        # 1. Authorities
        # -------------------------------------------------------------------
        da = Authority(
            authority_id="AUTH-DA-01",
            name="Collector Rajesh Sharma, IAS",
            role="DA",
            jurisdiction_district="Varanasi",
            jurisdiction_state="Uttar Pradesh",
            email="collector.varanasi@mplads.gov.in",
            hashed_password="pbkdf2:demo_da_password_hash",
        )
        sna = Authority(
            authority_id="AUTH-SNA-01",
            name="Special Secretary Sunita Verma, IAS",
            role="SNA",
            jurisdiction_district="Lucknow",
            jurisdiction_state="Uttar Pradesh",
            email="sna.up@mplads.gov.in",
            hashed_password="pbkdf2:demo_sna_password_hash",
        )
        mospi = Authority(
            authority_id="AUTH-MOSPI-01",
            name="Joint Secretary Anil Gupta",
            role="MINISTRY",
            jurisdiction_district="New Delhi",
            jurisdiction_state="Delhi",
            email="monitoring.mplads@mospi.gov.in",
            hashed_password="pbkdf2:demo_mospi_password_hash",
        )
        db.add_all([da, sna, mospi])
        db.flush()

        # -------------------------------------------------------------------
        # 2. Member of Parliament (MP)
        # -------------------------------------------------------------------
        mp = MP(
            mp_id="MP-UP-042",
            name="Shri R. K. Singh (Lok Sabha MP)",
            mp_type="LS",
            constituency="Varanasi",
            state="Uttar Pradesh",
            annual_budget_inr=5_00_00_000,    # ₹5 Crore
            sc_spend_pct=15.0,                # Meets statutory 15% SC
            st_spend_pct=8.0,                 # Meets statutory 7.5% ST
        )
        db.add(mp)
        db.flush()

        # -------------------------------------------------------------------
        # 2b. Historical Reference Project (MPL-2026-1035) for Duplicate Evidence Detection
        # -------------------------------------------------------------------
        past_project = Project(
            project_id="MPL-2026-1035",
            mp_id=mp.mp_id,
            title="Installation of Community RO Water Plant",
            description="Installation of 500 LPH RO water plant at Village Babatpur, Varanasi.",
            category="DRINKING_WATER",
            location_text="Village Babatpur, Varanasi",
            lat=25.4500,
            lon=82.8600,
            constituency="Varanasi",
            state="Uttar Pradesh",
            recommended_amount_inr=8_00_000,
            sanctioned_amount_inr=8_20_000,
            implementing_agency="DRDA Varanasi",
            status="COMPLETED",
            risk_score=15,
            risk_breakdown={"financial": 10.0, "timeline": 5.0, "duplicate": 0.0, "compliance": 0.0, "cv": 0.0},
            created_at=datetime.utcnow() - timedelta(days=365),
        )
        db.add(past_project)
        db.flush()

        # -------------------------------------------------------------------
        # 3. Primary Demo Project (MPL-2026-1042)
        # -------------------------------------------------------------------
        now = datetime.utcnow()
        rec_date = now - timedelta(days=180)  # ~6 months ago
        sanct_date = rec_date + timedelta(days=35)  # Sanctioned in 35 days (<45d statutory)

        # Baseline risk breakdown that evaluates to risk_score = 32
        initial_sub_scores = {
            "financial": 26.0,
            "timeline": 12.0,
            "duplicate": 0.0,
            "compliance": 0.0,
            "cv": 0.0,
        }

        project = Project(
            project_id="MPL-2026-1042",
            mp_id=mp.mp_id,
            title="Construction of Community Drinking Water Facility",
            description=(
                "Installation of solar-powered deep borewell filtration plant, "
                "RO treatment unit, and 10,000L overhead distribution tank at Village Shivpur, Varanasi."
            ),
            category="DRINKING_WATER",
            location_text="Village Shivpur, Harhua Block, Varanasi, UP",
            lat=25.3520,
            lon=82.9510,
            constituency="Varanasi",
            state="Uttar Pradesh",
            recommended_amount_inr=12_00_000,   # ₹12 Lakh
            sanctioned_amount_inr=19_50_000,    # ₹19.5 Lakh (+62.5% cost variance)
            implementing_agency="District Rural Development Agency (DRDA), Varanasi",
            status="EXECUTION",
            risk_score=32,
            risk_breakdown=initial_sub_scores,
            mandatory_tender=False,
            missing_documents=[],
            recommendation_date=rec_date,
            sanction_date=sanct_date,
            created_at=rec_date,
            updated_at=sanct_date,
        )
        db.add(project)
        db.flush()

        # -------------------------------------------------------------------
        # 4. Baseline Prior Milestone Payment (Released cleanly)
        # -------------------------------------------------------------------
        prior_payment = PaymentRequest(
            payment_id="PAY-1042-01",
            project_id=project.project_id,
            requested_amount_inr=5_00_00_000 // 100,  # ₹5,00,000 (Installment 1)
            request_date=sanct_date + timedelta(days=30),
            status="PAYMENT_RELEASED",
            pre_payment_check_result={
                "risk_score": 28,
                "reason_codes": [],
                "action": "MONITOR",
            },
            ai_risk_score_at_request=28,
            submitted_by="DRDA-IA",
            approved_by=da.authority_id,
            approved_at=sanct_date + timedelta(days=35),
        )
        db.add(prior_payment)

        # -------------------------------------------------------------------
        # 5. Baseline Progress Record (Physical status before new payment)
        # -------------------------------------------------------------------
        progress = ProgressRecord(
            progress_id="PROG-1042-01",
            project_id=project.project_id,
            reported_pct=30,
            ai_evidence_pct=31,
            ai_evidence_source="SATELLITE_SAMPLE",
            photo_paths=["uploads/sample_foundation.jpg"],
            timestamp=sanct_date + timedelta(days=60),
        )
        db.add(progress)

        # -------------------------------------------------------------------
        # 6. Baseline Reference Image Hashes (for duplicate detection)
        # -------------------------------------------------------------------
        ref_image_hash_1 = ImageHash(
            hash_id="HASH-REF-001",
            project_id="MPL-2026-1035",  # Another past project
            payment_id=None,
            image_path="uploads/reference_ro_plant.jpg",
            phash="8f8f9e9e8f8f9e9e",   # Reference pHash 1
            upload_timestamp=rec_date,
            is_duplicate=False,
        )
        ref_image_hash_2 = ImageHash(
            hash_id="HASH-REF-002",
            project_id="MPL-2026-1035",  # Another past project
            payment_id=None,
            image_path="uploads/reference_sample_site.jpg",
            phash="8000000000000000",   # Solid/sample color pHash
            upload_timestamp=rec_date,
            is_duplicate=False,
        )
        db.add_all([ref_image_hash_1, ref_image_hash_2])

        # -------------------------------------------------------------------
        # 7. Initial Risk Score Event & Audit Log
        # -------------------------------------------------------------------
        initial_risk_event = RiskScoreEvent(
            event_id="RSE-1042-01",
            project_id=project.project_id,
            risk_score=32,
            previous_score=0,
            sub_scores=initial_sub_scores,
            trigger_event="INITIAL_SANCTION_SCAN",
            detector_signals={"D1_sanction_delay": False, "D2_cost_variance": True},
            timestamp=sanct_date,
        )
        db.add(initial_risk_event)

        initial_audit = AuditEvent(
            event_id="AUDIT-1042-01",
            project_id=project.project_id,
            case_id=None,
            event_type="STATUS_CHANGE",
            actor_id=da.authority_id,
            actor_role="DA",
            description="Work sanctioned by District Authority. Entered EXECUTION phase.",
            old_value="SANCTIONED",
            new_value="EXECUTION",
            event_metadata={"sanctioned_amount": 19_50_000},
            timestamp=sanct_date,
        )
        db.add(initial_audit)

        # -------------------------------------------------------------------
        # 8. Vertical Slice 4 Demo — Split-Work Corridor Projects
        #    Three CC Road work orders artificially split below ₹5L to evade e-tender.
        #    Total = ₹14,40,000 > ₹10,00,000 mandatory threshold.
        # -------------------------------------------------------------------
        sw1 = Project(
            project_id="MPL-2026-1051",
            mp_id=mp.mp_id,
            title="Construction of CC Road Reach 1: Shivpur Chowk to Temple",
            description=(
                "Construction of cement concrete road from Shivpur Chowk crossing to "
                "the ancient temple, approximately 250 metres in length, "
                "including side drains and kerb stones, Harhua Block, Varanasi."
            ),
            category="ROADS_BRIDGES",
            location_text="Shivpur Chowk, Harhua Block, Varanasi",
            lat=25.3540,
            lon=82.9480,
            constituency="Varanasi",
            state="Uttar Pradesh",
            recommended_amount_inr=4_60_000,
            sanctioned_amount_inr=4_80_000,
            implementing_agency="DRDA Varanasi",
            status="SANCTIONED",
            risk_score=28,
            risk_breakdown={"financial": 12.0, "timeline": 8.0, "duplicate": 0.0, "compliance": 0.0, "cv": 0.0},
            mandatory_tender=False,
            missing_documents=[],
            recommendation_date=rec_date + timedelta(days=5),
            sanction_date=sanct_date + timedelta(days=5),
            created_at=rec_date + timedelta(days=5),
        )
        sw2 = Project(
            project_id="MPL-2026-1052",
            mp_id=mp.mp_id,
            title="Construction of CC Road Reach 2: Temple to Primary School",
            description=(
                "Construction of cement concrete road from the ancient temple to "
                "Government Primary School, approximately 250 metres in length, "
                "including side drains and kerb stones, Harhua Block, Varanasi."
            ),
            category="ROADS_BRIDGES",
            location_text="Near Temple, Harhua Block, Varanasi",
            lat=25.3545,
            lon=82.9490,
            constituency="Varanasi",
            state="Uttar Pradesh",
            recommended_amount_inr=4_60_000,
            sanctioned_amount_inr=4_80_000,
            implementing_agency="DRDA Varanasi",
            status="SANCTIONED",
            risk_score=28,
            risk_breakdown={"financial": 12.0, "timeline": 8.0, "duplicate": 0.0, "compliance": 0.0, "cv": 0.0},
            mandatory_tender=False,
            missing_documents=[],
            recommendation_date=rec_date + timedelta(days=5),
            sanction_date=sanct_date + timedelta(days=5),
            created_at=rec_date + timedelta(days=5),
        )
        sw3 = Project(
            project_id="MPL-2026-1053",
            mp_id=mp.mp_id,
            title="Construction of CC Road Reach 3: Primary School to Canal Bridge",
            description=(
                "Construction of cement concrete road from Government Primary School "
                "to the canal bridge approach, approximately 250 metres in length, "
                "including side drains and kerb stones, Harhua Block, Varanasi."
            ),
            category="ROADS_BRIDGES",
            location_text="Near Primary School, Harhua Block, Varanasi",
            lat=25.3552,
            lon=82.9500,
            constituency="Varanasi",
            state="Uttar Pradesh",
            recommended_amount_inr=4_60_000,
            sanctioned_amount_inr=4_80_000,
            implementing_agency="DRDA Varanasi",
            status="SANCTIONED",
            risk_score=28,
            risk_breakdown={"financial": 12.0, "timeline": 8.0, "duplicate": 0.0, "compliance": 0.0, "cv": 0.0},
            mandatory_tender=False,
            missing_documents=[],
            recommendation_date=rec_date + timedelta(days=5),
            sanction_date=sanct_date + timedelta(days=5),
            created_at=rec_date + timedelta(days=5),
        )
        db.add_all([sw1, sw2, sw3])

        db.commit()
        logger.info(f"Database seeded successfully. Project {project.project_id} initialized with Risk: {project.risk_score}")

        return {
            "status": "SUCCESS",
            "project_id": project.project_id,
            "project_status": project.status,
            "initial_risk_score": project.risk_score,
            "da_id": da.authority_id,
            "sna_id": sna.authority_id,
            "ministry_id": mospi.authority_id,
            "mp_id": mp.mp_id,
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        if should_close:
            db.close()


if __name__ == "__main__":
    result = reset_and_seed_db()
    print("Seed complete:", result)
