"""
Deterministic Seed Data Generator for MPLADS AI Monitoring & Intervention Platform.

Provides a repeatable, idempotent baseline state with:
- 45 realistic projects across 5 key states (Uttar Pradesh, Maharashtra, Karnataka, Bihar, Assam) + Nominated MP
- Complete authority hierarchy: District Authorities (DAs), State Nodal Authorities (SNAs), MoSPI Ministry officials
- Lok Sabha (LS), Rajya Sabha (RS), and Nominated MP profiles with SC/ST statutory spend metrics
- Full sector coverage: Drinking Water, Roads/Bridges, Health, Education, Sanitation, Renewable Energy, Community Infrastructure
- Varied lifecycle states: RECOMMENDED, SANCTIONED, EXECUTION, COMPLETED, VERIFIED, INSPECTION_REQUIRED
- 100% preservation of deterministic demo baseline projects:
    - MPL-2026-1042: Primary demo project (Varanasi Drinking Water, EXECUTION, initial risk 32)
    - MPL-2026-1035: Reference baseline project (Varanasi RO Plant, COMPLETED, initial risk 15)
    - MPL-2026-1051, MPL-2026-1052, MPL-2026-1053: Split-work CC road reach cluster (SANCTIONED, initial risk 28)
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
    Clears all existing data and seeds the deterministic multi-state MPLADS dataset.
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

        now = datetime.utcnow()

        # ===================================================================
        # 1. AUTHORITIES HIERARCHY (DAs, SNAs, Ministry)
        # ===================================================================
        # District Authorities (DAs)
        da_up = Authority(
            authority_id="AUTH-DA-01",
            name="Collector Rajesh Sharma, IAS",
            role="DA",
            jurisdiction_district="Varanasi",
            jurisdiction_state="Uttar Pradesh",
            email="collector.varanasi@mplads.gov.in",
            hashed_password="pbkdf2:demo_da_password_hash",
        )
        da_mh = Authority(
            authority_id="AUTH-DA-02",
            name="Collector Suhas Diwase, IAS",
            role="DA",
            jurisdiction_district="Pune",
            jurisdiction_state="Maharashtra",
            email="collector.pune@mplads.gov.in",
            hashed_password="pbkdf2:demo_da_password_hash",
        )
        da_ka = Authority(
            authority_id="AUTH-DA-03",
            name="Collector Dayananda K.A., IAS",
            role="DA",
            jurisdiction_district="Bengaluru Urban",
            jurisdiction_state="Karnataka",
            email="collector.bengaluru@mplads.gov.in",
            hashed_password="pbkdf2:demo_da_password_hash",
        )
        da_br = Authority(
            authority_id="AUTH-DA-04",
            name="Collector Dr. Chandrashekhar Singh, IAS",
            role="DA",
            jurisdiction_district="Patna",
            jurisdiction_state="Bihar",
            email="collector.patna@mplads.gov.in",
            hashed_password="pbkdf2:demo_da_password_hash",
        )
        da_as = Authority(
            authority_id="AUTH-DA-05",
            name="Collector Sumit Sattawan, IAS",
            role="DA",
            jurisdiction_district="Kamrup Metro",
            jurisdiction_state="Assam",
            email="collector.kamrup@mplads.gov.in",
            hashed_password="pbkdf2:demo_da_password_hash",
        )

        # State Nodal Authorities (SNAs)
        sna_up = Authority(
            authority_id="AUTH-SNA-01",
            name="Special Secretary Sunita Verma, IAS",
            role="SNA",
            jurisdiction_district="Lucknow",
            jurisdiction_state="Uttar Pradesh",
            email="sna.up@mplads.gov.in",
            hashed_password="pbkdf2:demo_sna_password_hash",
        )
        sna_mh = Authority(
            authority_id="AUTH-SNA-02",
            name="Principal Secretary Nitin Gadre, IAS",
            role="SNA",
            jurisdiction_district="Mumbai",
            jurisdiction_state="Maharashtra",
            email="sna.maharashtra@mplads.gov.in",
            hashed_password="pbkdf2:demo_sna_password_hash",
        )
        sna_ka = Authority(
            authority_id="AUTH-SNA-03",
            name="Secretary Shalini Rajneesh, IAS",
            role="SNA",
            jurisdiction_district="Bengaluru",
            jurisdiction_state="Karnataka",
            email="sna.karnataka@mplads.gov.in",
            hashed_password="pbkdf2:demo_sna_password_hash",
        )
        sna_br = Authority(
            authority_id="AUTH-SNA-04",
            name="Secretary Mihir Kumar Singh, IAS",
            role="SNA",
            jurisdiction_district="Patna",
            jurisdiction_state="Bihar",
            email="sna.bihar@mplads.gov.in",
            hashed_password="pbkdf2:demo_sna_password_hash",
        )
        sna_as = Authority(
            authority_id="AUTH-SNA-05",
            name="Secretary Biswaranjan Samal, IAS",
            role="SNA",
            jurisdiction_district="Dispur",
            jurisdiction_state="Assam",
            email="sna.assam@mplads.gov.in",
            hashed_password="pbkdf2:demo_sna_password_hash",
        )

        # MoSPI Ministry HQ
        mospi_1 = Authority(
            authority_id="AUTH-MOSPI-01",
            name="Joint Secretary Anil Gupta",
            role="MINISTRY",
            jurisdiction_district="New Delhi",
            jurisdiction_state="Delhi",
            email="monitoring.mplads@mospi.gov.in",
            hashed_password="pbkdf2:demo_mospi_password_hash",
        )
        mospi_2 = Authority(
            authority_id="AUTH-MOSPI-02",
            name="Director Dr. Meenakshi Sundaram",
            role="MINISTRY",
            jurisdiction_district="New Delhi",
            jurisdiction_state="Delhi",
            email="analytics.mplads@mospi.gov.in",
            hashed_password="pbkdf2:demo_mospi_password_hash",
        )

        db.add_all([
            da_up, da_mh, da_ka, da_br, da_as,
            sna_up, sna_mh, sna_ka, sna_br, sna_as,
            mospi_1, mospi_2
        ])
        db.flush()

        # ===================================================================
        # 2. MEMBERS OF PARLIAMENT (MPs)
        # ===================================================================
        mps = [
            # Uttar Pradesh
            MP(mp_id="MP-UP-042", name="Shri R. K. Singh (Lok Sabha MP)", mp_type="LS", constituency="Varanasi", state="Uttar Pradesh", annual_budget_inr=5_00_00_000, sc_spend_pct=15.0, st_spend_pct=8.0),
            MP(mp_id="MP-UP-RS01", name="Dr. Sudhanshu Trivedi (Rajya Sabha MP)", mp_type="RS", constituency="Lucknow", state="Uttar Pradesh", annual_budget_inr=5_00_00_000, sc_spend_pct=16.5, st_spend_pct=7.8),
            MP(mp_id="MP-UP-LS02", name="Shri Ravi Kishan Shukla (Lok Sabha MP)", mp_type="LS", constituency="Gorakhpur", state="Uttar Pradesh", annual_budget_inr=5_00_00_000, sc_spend_pct=15.2, st_spend_pct=8.5),
            # Maharashtra
            MP(mp_id="MP-MH-LS01", name="Smt. Supriya Sule (Lok Sabha MP)", mp_type="LS", constituency="Pune", state="Maharashtra", annual_budget_inr=5_00_00_000, sc_spend_pct=14.5, st_spend_pct=7.0),
            MP(mp_id="MP-MH-RS01", name="Dr. Abhishek Manu Singhvi (Rajya Sabha MP)", mp_type="RS", constituency="Maharashtra State", state="Maharashtra", annual_budget_inr=5_00_00_000, sc_spend_pct=15.5, st_spend_pct=8.0),
            MP(mp_id="MP-MH-LS02", name="Shri Nitin Gadkari (Lok Sabha MP)", mp_type="LS", constituency="Nagpur", state="Maharashtra", annual_budget_inr=5_00_00_000, sc_spend_pct=17.0, st_spend_pct=9.0),
            # Karnataka
            MP(mp_id="MP-KA-LS01", name="Shri Tejasvi Surya (Lok Sabha MP)", mp_type="LS", constituency="Bengaluru South", state="Karnataka", annual_budget_inr=5_00_00_000, sc_spend_pct=15.1, st_spend_pct=7.6),
            MP(mp_id="MP-KA-RS01", name="Dr. L. Murugan (Rajya Sabha MP)", mp_type="RS", constituency="Karnataka State", state="Karnataka", annual_budget_inr=5_00_00_000, sc_spend_pct=18.0, st_spend_pct=8.2),
            MP(mp_id="MP-KA-LS02", name="Shri Pralhad Joshi (Lok Sabha MP)", mp_type="LS", constituency="Dharwad", state="Karnataka", annual_budget_inr=5_00_00_000, sc_spend_pct=15.3, st_spend_pct=7.9),
            # Bihar
            MP(mp_id="MP-BR-LS01", name="Shri Ravi Shankar Prasad (Lok Sabha MP)", mp_type="LS", constituency="Patna Sahib", state="Bihar", annual_budget_inr=5_00_00_000, sc_spend_pct=15.0, st_spend_pct=8.1),
            MP(mp_id="MP-BR-RS01", name="Smt. Ranjeet Ranjan (Rajya Sabha MP)", mp_type="RS", constituency="Bihar State", state="Bihar", annual_budget_inr=5_00_00_000, sc_spend_pct=16.2, st_spend_pct=7.5),
            MP(mp_id="MP-BR-LS02", name="Shri Jitan Ram Manjhi (Lok Sabha MP)", mp_type="LS", constituency="Gaya", state="Bihar", annual_budget_inr=5_00_00_000, sc_spend_pct=22.0, st_spend_pct=11.0),
            # Assam
            MP(mp_id="MP-AS-LS01", name="Smt. Queen Oja (Lok Sabha MP)", mp_type="LS", constituency="Guwahati", state="Assam", annual_budget_inr=5_00_00_000, sc_spend_pct=15.4, st_spend_pct=12.5),
            MP(mp_id="MP-AS-RS01", name="Shri Birendra Prasad Baishya (Rajya Sabha MP)", mp_type="RS", constituency="Assam State", state="Assam", annual_budget_inr=5_00_00_000, sc_spend_pct=15.0, st_spend_pct=14.0),
            MP(mp_id="MP-AS-LS02", name="Shri Gaurav Gogoi (Lok Sabha MP)", mp_type="LS", constituency="Jorhat", state="Assam", annual_budget_inr=5_00_00_000, sc_spend_pct=15.2, st_spend_pct=13.8),
            # Nominated
            MP(mp_id="MP-NOM-01", name="Dr. Sonal Mansingh (Nominated MP)", mp_type="NOMINATED", constituency="New Delhi", state="Delhi", annual_budget_inr=5_00_00_000, sc_spend_pct=15.0, st_spend_pct=8.0),
        ]
        db.add_all(mps)
        db.flush()

        # ===================================================================
        # 3. FROZEN CANONICAL BASELINE DEMO PROJECTS (F1–F16)
        # ===================================================================
        rec_date = now - timedelta(days=180)
        sanct_date = rec_date + timedelta(days=35)

        # Baseline Demo 1: MPL-2026-1035 (Reference Completed RO Plant)
        past_project = Project(
            project_id="MPL-2026-1035",
            mp_id="MP-UP-042",
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
            recommendation_date=rec_date - timedelta(days=200),
            sanction_date=rec_date - timedelta(days=170),
            completion_date=rec_date - timedelta(days=30),
            created_at=rec_date - timedelta(days=200),
        )
        db.add(past_project)
        db.flush()

        # Payment & Progress for completed project MPL-2026-1035
        payment_1035 = PaymentRequest(
            payment_id="PAY-1035-01",
            project_id="MPL-2026-1035",
            requested_amount_inr=8_20_000,
            request_date=rec_date - timedelta(days=40),
            status="PAYMENT_RELEASED",
            pre_payment_check_result={"risk_score": 15, "reason_codes": [], "action": "RELEASE"},
            ai_risk_score_at_request=15,
            submitted_by="DRDA-IA",
            approved_by="AUTH-DA-01",
            approved_at=rec_date - timedelta(days=30),
        )
        progress_1035 = ProgressRecord(
            progress_id="PROG-1035-01",
            project_id="MPL-2026-1035",
            reported_pct=100,
            ai_evidence_pct=100,
            ai_evidence_source="SATELLITE_SAMPLE",
            photo_paths=["uploads/reference_ro_plant.jpg"],
            timestamp=rec_date - timedelta(days=30),
        )
        db.add_all([payment_1035, progress_1035])

        # Baseline Demo 2: MPL-2026-1042 (Primary Demo Project: Risk 32)
        initial_sub_scores = {
            "financial": 26.0,
            "timeline": 12.0,
            "duplicate": 0.0,
            "compliance": 0.0,
            "cv": 0.0,
        }
        project_1042 = Project(
            project_id="MPL-2026-1042",
            mp_id="MP-UP-042",
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
            recommended_amount_inr=12_00_000,
            sanctioned_amount_inr=19_50_000,
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
        db.add(project_1042)
        db.flush()

        # Prior Payment for MPL-2026-1042
        prior_payment = PaymentRequest(
            payment_id="PAY-1042-01",
            project_id="MPL-2026-1042",
            requested_amount_inr=5_00_000,
            request_date=sanct_date + timedelta(days=30),
            status="PAYMENT_RELEASED",
            pre_payment_check_result={"risk_score": 28, "reason_codes": [], "action": "MONITOR"},
            ai_risk_score_at_request=28,
            submitted_by="DRDA-IA",
            approved_by="AUTH-DA-01",
            approved_at=sanct_date + timedelta(days=35),
        )
        db.add(prior_payment)

        # Baseline Progress Record for MPL-2026-1042
        progress_1042 = ProgressRecord(
            progress_id="PROG-1042-01",
            project_id="MPL-2026-1042",
            reported_pct=30,
            ai_evidence_pct=31,
            ai_evidence_source="SATELLITE_SAMPLE",
            photo_paths=["uploads/sample_foundation.jpg"],
            timestamp=sanct_date + timedelta(days=60),
        )
        db.add(progress_1042)

        # Reference Hashes for Duplicate Detection
        ref_image_hash_1 = ImageHash(
            hash_id="HASH-REF-001",
            project_id="MPL-2026-1035",
            payment_id=None,
            image_path="uploads/reference_ro_plant.jpg",
            phash="8f8f9e9e8f8f9e9e",
            upload_timestamp=rec_date,
            is_duplicate=False,
        )
        ref_image_hash_2 = ImageHash(
            hash_id="HASH-REF-002",
            project_id="MPL-2026-1035",
            payment_id=None,
            image_path="uploads/reference_sample_site.jpg",
            phash="8000000000000000",
            upload_timestamp=rec_date,
            is_duplicate=False,
        )
        db.add_all([ref_image_hash_1, ref_image_hash_2])

        # Initial Risk & Audit for MPL-2026-1042
        initial_risk_event = RiskScoreEvent(
            event_id="RSE-1042-01",
            project_id="MPL-2026-1042",
            risk_score=32,
            previous_score=0,
            sub_scores=initial_sub_scores,
            trigger_event="INITIAL_SANCTION_SCAN",
            detector_signals={"D1_sanction_delay": False, "D2_cost_variance": True},
            timestamp=sanct_date,
        )
        initial_audit = AuditEvent(
            event_id="AUDIT-1042-01",
            project_id="MPL-2026-1042",
            case_id=None,
            event_type="STATUS_CHANGE",
            actor_id="AUTH-DA-01",
            actor_role="DA",
            description="Work sanctioned by District Authority. Entered EXECUTION phase.",
            old_value="SANCTIONED",
            new_value="EXECUTION",
            event_metadata={"sanctioned_amount": 19_50_000},
            timestamp=sanct_date,
        )
        db.add_all([initial_risk_event, initial_audit])

        # Split-Work Cluster: MPL-2026-1051, 1052, 1053 (Varanasi CC Road)
        sw1 = Project(
            project_id="MPL-2026-1051",
            mp_id="MP-UP-042",
            title="Construction of CC Road Reach 1: Shivpur Chowk to Temple",
            description="Construction of cement concrete road from Shivpur Chowk crossing to the ancient temple, approximately 250 metres, Harhua Block, Varanasi.",
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
            mp_id="MP-UP-042",
            title="Construction of CC Road Reach 2: Temple to Primary School",
            description="Construction of cement concrete road from the ancient temple to Government Primary School, approximately 250 metres, Harhua Block, Varanasi.",
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
            mp_id="MP-UP-042",
            title="Construction of CC Road Reach 3: Primary School to Canal Bridge",
            description="Construction of cement concrete road from Government Primary School to the canal bridge approach, approximately 250 metres, Harhua Block, Varanasi.",
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
        db.flush()

        # ===================================================================
        # 4. EXPANDED MULTI-STATE DATASET (40 ADDITIONAL PROJECTS)
        # ===================================================================
        raw_projects = [
            # ---------------------------------------------------------------
            # A. Uttar Pradesh (8 additional projects)
            # ---------------------------------------------------------------
            {
                "id": "MPL-UP-101", "mp_id": "MP-UP-042",
                "title": "Construction of Community Health Sub-Centre Building",
                "desc": "2-bedded primary healthcare centre with labor room and immunization clinic at Harhua Block, Varanasi.",
                "cat": "HEALTH_FAMILY_WELFARE", "loc": "Harhua Block, Varanasi, UP",
                "lat": 25.3850, "lon": 82.9120, "constituency": "Varanasi", "state": "Uttar Pradesh",
                "rec_inr": 25_00_000, "sanct_inr": 25_00_000, "disbursed": 15_00_000,
                "status": "EXECUTION", "risk": 18, "prog": 60, "agency": "UP Jal Nigam / PWD",
                "days_ago": 120, "sanct_days": 28
            },
            {
                "id": "MPL-UP-102", "mp_id": "MP-UP-042",
                "title": "Installation of High-Mast Solar Lighting in Rural Markets",
                "desc": "12 high-mast LED solar lighting poles in 6 weekly rural haat bazars across Kashi, Varanasi.",
                "cat": "ELECTRICITY_RENEWABLE", "loc": "Rural Haat Markets, Varanasi, UP",
                "lat": 25.3120, "lon": 82.9840, "constituency": "Varanasi", "state": "Uttar Pradesh",
                "rec_inr": 15_00_000, "sanct_inr": 15_00_000, "disbursed": 15_00_000,
                "status": "COMPLETED", "risk": 12, "prog": 100, "agency": "UP NEDA",
                "days_ago": 240, "sanct_days": 25
            },
            {
                "id": "MPL-UP-103", "mp_id": "MP-UP-RS01",
                "title": "Construction of Government Girls Intermediate College Science Block",
                "desc": "Physics, Chemistry, and Biology laboratories with digital interactive smart boards at GIC Mohanlalganj, Lucknow.",
                "cat": "EDUCATION", "loc": "Mohanlalganj, Lucknow, UP",
                "lat": 26.6710, "lon": 80.9820, "constituency": "Lucknow", "state": "Uttar Pradesh",
                "rec_inr": 40_00_000, "sanct_inr": 40_00_000, "disbursed": 20_00_000,
                "status": "EXECUTION", "risk": 22, "prog": 55, "agency": "PWD Lucknow Division",
                "days_ago": 150, "sanct_days": 32
            },
            {
                "id": "MPL-UP-104", "mp_id": "MP-UP-RS01",
                "title": "Deep Tube-well Piped Drinking Water Supply Network",
                "desc": "Installation of 2 deep tube-wells and 3 km HDPE drinking water distribution network for 4 habitations.",
                "cat": "DRINKING_WATER", "loc": "Gosainganj, Lucknow, UP",
                "lat": 26.7720, "lon": 81.1210, "constituency": "Lucknow", "state": "Uttar Pradesh",
                "rec_inr": 32_00_000, "sanct_inr": 32_00_000, "disbursed": 0,
                "status": "RECOMMENDED", "risk": 10, "prog": 0, "agency": "DRDA Lucknow",
                "days_ago": 15, "sanct_days": 0
            },
            {
                "id": "MPL-UP-105", "mp_id": "MP-UP-LS02",
                "title": "Development of Multipurpose Rural Community Hall & Flood Shelter",
                "desc": "Two-storey reinforced concrete flood shelter and community center at Sahjanwa, Gorakhpur.",
                "cat": "COMMUNITY_INFRASTRUCTURE", "loc": "Sahjanwa, Gorakhpur, UP",
                "lat": 26.7580, "lon": 83.2140, "constituency": "Gorakhpur", "state": "Uttar Pradesh",
                "rec_inr": 50_00_000, "sanct_inr": 50_00_000, "disbursed": 25_00_000,
                "status": "EXECUTION", "risk": 24, "prog": 50, "agency": "Rural Engineering Department (RED)",
                "days_ago": 160, "sanct_days": 30
            },
            {
                "id": "MPL-UP-106", "mp_id": "MP-UP-LS02",
                "title": "Installation of Solar-Powered Mini Cold Storage Facility",
                "desc": "10 MT solar-powered vegetable cold room for marginal farmers near Mandi Parishad, Gorakhpur.",
                "cat": "ELECTRICITY_RENEWABLE", "loc": "Mandi Parishad, Gorakhpur, UP",
                "lat": 26.7410, "lon": 83.3520, "constituency": "Gorakhpur", "state": "Uttar Pradesh",
                "rec_inr": 28_00_000, "sanct_inr": 28_00_000, "disbursed": 0,
                "status": "SANCTIONED", "risk": 16, "prog": 0, "agency": "Horticulture Department Gorakhpur",
                "days_ago": 40, "sanct_days": 26
            },
            {
                "id": "MPL-UP-107", "mp_id": "MP-UP-042",
                "title": "Construction of Concrete Link Road & Cross-Drainage Culvert",
                "desc": "Construction of 600m concrete approach road connecting SC/ST settlement to Main District Road, Prayagraj.",
                "cat": "ROADS_BRIDGES", "loc": "Phaphamau, Prayagraj, UP",
                "lat": 25.5210, "lon": 81.8620, "constituency": "Prayagraj", "state": "Uttar Pradesh",
                "rec_inr": 35_00_000, "sanct_inr": 35_00_000, "disbursed": 20_00_000,
                "status": "EXECUTION", "risk": 20, "prog": 60, "agency": "PWD Prayagraj",
                "days_ago": 110, "sanct_days": 29
            },
            {
                "id": "MPL-UP-108", "mp_id": "MP-UP-RS01",
                "title": "Public Library and Digital Skill Center",
                "desc": "Refurbishment and equipping of district central e-library with 30 computer terminals and braille section.",
                "cat": "EDUCATION", "loc": "Civil Lines, Ayodhya, UP",
                "lat": 26.7920, "lon": 82.1940, "constituency": "Ayodhya", "state": "Uttar Pradesh",
                "rec_inr": 22_00_000, "sanct_inr": 22_00_000, "disbursed": 22_00_000,
                "status": "VERIFIED", "risk": 8, "prog": 100, "agency": "DRDA Ayodhya",
                "days_ago": 280, "sanct_days": 20
            },

            # ---------------------------------------------------------------
            # B. Maharashtra (8 projects across Pune, Nagpur, Nashik)
            # ---------------------------------------------------------------
            {
                "id": "MPL-MH-201", "mp_id": "MP-MH-LS01",
                "title": "Solar Microgrid & LED Streetlighting in Tribal Villages",
                "desc": "Installation of 50 standalone solar streetlights and 5kW solar mini-grids across 3 tribal padas in Ambegaon.",
                "cat": "ELECTRICITY_RENEWABLE", "loc": "Ambegaon, Pune, Maharashtra",
                "lat": 19.0320, "lon": 73.8420, "constituency": "Pune", "state": "Maharashtra",
                "rec_inr": 30_00_000, "sanct_inr": 30_00_000, "disbursed": 18_00_000,
                "status": "EXECUTION", "risk": 14, "prog": 65, "agency": "MEDA / ZP Pune",
                "days_ago": 130, "sanct_days": 27
            },
            {
                "id": "MPL-MH-202", "mp_id": "MP-MH-LS01",
                "title": "Primary Health Centre Maternal Care Ward & Diagnostic Unit",
                "desc": "Upgradation of Rural PHC with neonatal care unit, sonography room, and modern pathology equipment.",
                "cat": "HEALTH_FAMILY_WELFARE", "loc": "Baramati, Pune, Maharashtra",
                "lat": 18.1520, "lon": 74.5780, "constituency": "Pune", "state": "Maharashtra",
                "rec_inr": 45_00_000, "sanct_inr": 45_00_000, "disbursed": 30_00_000,
                "status": "EXECUTION", "risk": 19, "prog": 70, "agency": "PWD Pune Circle",
                "days_ago": 170, "sanct_days": 31
            },
            {
                "id": "MPL-MH-203", "mp_id": "MP-MH-LS01",
                "title": "Sub-Surface Check Dam for Drinking Water Security",
                "desc": "Construction of concrete check dam across Kukadi river tributary to recharge local community drinking wells.",
                "cat": "DRINKING_WATER", "loc": "Junnar, Pune, Maharashtra",
                "lat": 19.2080, "lon": 73.8740, "constituency": "Pune", "state": "Maharashtra",
                "rec_inr": 20_00_000, "sanct_inr": 20_00_000, "disbursed": 20_00_000,
                "status": "COMPLETED", "risk": 11, "prog": 100, "agency": "Water Conservation Dept Pune",
                "days_ago": 210, "sanct_days": 24
            },
            {
                "id": "MPL-MH-204", "mp_id": "MP-MH-LS02",
                "title": "Smart Classroom & Computer Lab Infrastructure in ZP Schools",
                "desc": "Digital e-learning labs equipped with tablets, solar power backup, and internet connectivity across 8 schools.",
                "cat": "EDUCATION", "loc": "Nagpur Rural, Maharashtra",
                "lat": 21.1450, "lon": 79.0880, "constituency": "Nagpur", "state": "Maharashtra",
                "rec_inr": 25_00_000, "sanct_inr": 25_00_000, "disbursed": 25_00_000,
                "status": "VERIFIED", "risk": 9, "prog": 100, "agency": "ZP Education Dept Nagpur",
                "days_ago": 260, "sanct_days": 22
            },
            {
                "id": "MPL-MH-205", "mp_id": "MP-MH-LS02",
                "title": "Construction of Solid Waste Processing Plant",
                "desc": "Decentralized compost and plastic recycling center with 5 TPD capacity for Katol Municipal Council.",
                "cat": "SANITATION", "loc": "Katol, Nagpur, Maharashtra",
                "lat": 21.2670, "lon": 78.5850, "constituency": "Nagpur", "state": "Maharashtra",
                "rec_inr": 35_00_000, "sanct_inr": 35_00_000, "disbursed": 0,
                "status": "SANCTIONED", "risk": 18, "prog": 0, "agency": "Katol Municipal Council",
                "days_ago": 45, "sanct_days": 28
            },
            {
                "id": "MPL-MH-206", "mp_id": "MP-MH-RS01",
                "title": "Veterinary Dispensary & Mobile Cattle Clinic Equipment",
                "desc": "Construction of taluka veterinary hospital and provision of diagnostic ultrasound equipment for dairy farmers.",
                "cat": "HEALTH_FAMILY_WELFARE", "loc": "Dindori, Nashik, Maharashtra",
                "lat": 20.2010, "lon": 73.8340, "constituency": "Maharashtra State", "state": "Maharashtra",
                "rec_inr": 18_00_000, "sanct_inr": 18_00_000, "disbursed": 0,
                "status": "RECOMMENDED", "risk": 10, "prog": 0, "agency": "Animal Husbandry Dept Nashik",
                "days_ago": 20, "sanct_days": 0
            },
            {
                "id": "MPL-MH-207", "mp_id": "MP-MH-LS01",
                "title": "Construction of Concrete Drain & Road in Slum Rehabilitation Colony",
                "desc": "Storm water drainage and cement concrete internal lanes in Sanjay Gandhi Nagar slum colony, Pune.",
                "cat": "SANITATION", "loc": "Hadapsar, Pune, Maharashtra",
                "lat": 18.5020, "lon": 73.9280, "constituency": "Pune", "state": "Maharashtra",
                "rec_inr": 28_00_000, "sanct_inr": 42_00_000, "disbursed": 15_00_000,
                "status": "INSPECTION_REQUIRED", "risk": 76, "prog": 35, "agency": "PMC Slum Dept",
                "days_ago": 190, "sanct_days": 35
            },
            {
                "id": "MPL-MH-208", "mp_id": "MP-MH-RS01",
                "title": "Tribal Area Community Drinking Water RO Kiosks",
                "desc": "Installation of 4 solar RO water automated dispensing units in water-scarce hilly tribal villages of Igatpuri.",
                "cat": "DRINKING_WATER", "loc": "Igatpuri, Nashik, Maharashtra",
                "lat": 19.6980, "lon": 73.5580, "constituency": "Maharashtra State", "state": "Maharashtra",
                "rec_inr": 16_00_000, "sanct_inr": 16_00_000, "disbursed": 10_00_000,
                "status": "EXECUTION", "risk": 15, "prog": 60, "agency": "MJP Nashik Division",
                "days_ago": 100, "sanct_days": 25
            },

            # ---------------------------------------------------------------
            # C. Karnataka (8 projects across Bengaluru South, Mysuru, Dharwad)
            # ---------------------------------------------------------------
            {
                "id": "MPL-KA-301", "mp_id": "MP-KA-LS01",
                "title": "Digital Smart Classrooms in 10 Government High Schools",
                "desc": "Interactive smart panels, STEM learning kits, and teacher digital training in BBMP government schools.",
                "cat": "EDUCATION", "loc": "Jayanagar, Bengaluru South, Karnataka",
                "lat": 12.9250, "lon": 77.5930, "constituency": "Bengaluru South", "state": "Karnataka",
                "rec_inr": 50_00_000, "sanct_inr": 50_00_000, "disbursed": 50_00_000,
                "status": "COMPLETED", "risk": 12, "prog": 100, "agency": "BBMP Education Wing",
                "days_ago": 230, "sanct_days": 21
            },
            {
                "id": "MPL-KA-302", "mp_id": "MP-KA-LS01",
                "title": "Automated Dialysis Center Infrastructure at Taluk Hospital",
                "desc": "Setting up 5-bed hemodialysis unit with advanced reverse osmosis water filtration at Anekal Taluk General Hospital.",
                "cat": "HEALTH_FAMILY_WELFARE", "loc": "Anekal, Bengaluru Rural, Karnataka",
                "lat": 12.7110, "lon": 77.6970, "constituency": "Bengaluru South", "state": "Karnataka",
                "rec_inr": 60_00_000, "sanct_inr": 60_00_000, "disbursed": 40_00_000,
                "status": "EXECUTION", "risk": 20, "prog": 70, "agency": "Karnataka Health System Dev Project",
                "days_ago": 140, "sanct_days": 29
            },
            {
                "id": "MPL-KA-303", "mp_id": "MP-KA-RS01",
                "title": "Lake Rejuvenation & Rainwater Harvesting System",
                "desc": "Desilting, inlet bund construction, bio-fencing, and pedestrian walking track around Bogadi Lake, Mysuru.",
                "cat": "DRINKING_WATER", "loc": "Bogadi, Mysuru, Karnataka",
                "lat": 12.3020, "lon": 76.6010, "constituency": "Karnataka State", "state": "Karnataka",
                "rec_inr": 38_00_000, "sanct_inr": 38_00_000, "disbursed": 38_00_000,
                "status": "VERIFIED", "risk": 14, "prog": 100, "agency": "Minor Irrigation Dept Mysuru",
                "days_ago": 300, "sanct_days": 24
            },
            {
                "id": "MPL-KA-304", "mp_id": "MP-KA-RS01",
                "title": "Rural Solar Streetlighting & Energy Monitoring",
                "desc": "Installation of 80 smart solar streetlights with centralized IoT telemetry across 4 gram panchayats.",
                "cat": "ELECTRICITY_RENEWABLE", "loc": "Hunsur, Mysuru, Karnataka",
                "lat": 12.3110, "lon": 76.2940, "constituency": "Karnataka State", "state": "Karnataka",
                "rec_inr": 22_00_000, "sanct_inr": 22_00_000, "disbursed": 12_00_000,
                "status": "EXECUTION", "risk": 15, "prog": 55, "agency": "KREDL Karnataka",
                "days_ago": 90, "sanct_days": 26
            },
            {
                "id": "MPL-KA-305", "mp_id": "MP-KA-LS02",
                "title": "Skill Development Center & Handicraft Training Workshop",
                "desc": "Construction of vocational training center building for women self-help groups (SHGs) and youth in Dharwad.",
                "cat": "COMMUNITY_INFRASTRUCTURE", "loc": "Navalgund, Dharwad, Karnataka",
                "lat": 15.5620, "lon": 75.3620, "constituency": "Dharwad", "state": "Karnataka",
                "rec_inr": 30_00_000, "sanct_inr": 30_00_000, "disbursed": 0,
                "status": "SANCTIONED", "risk": 16, "prog": 0, "agency": "KRIDL Dharwad",
                "days_ago": 35, "sanct_days": 25
            },
            {
                "id": "MPL-KA-306", "mp_id": "MP-KA-LS02",
                "title": "Primary Health Sub-Centre Building & Ambulance Unit",
                "desc": "Construction of 24x7 maternal health post and provision of basic life support patient transport van in Hubballi.",
                "cat": "HEALTH_FAMILY_WELFARE", "loc": "Gokul Road, Hubballi, Karnataka",
                "lat": 15.3640, "lon": 75.1240, "constituency": "Dharwad", "state": "Karnataka",
                "rec_inr": 25_00_000, "sanct_inr": 25_00_000, "disbursed": 0,
                "status": "RECOMMENDED", "risk": 8, "prog": 0, "agency": "HDMC Health Dept",
                "days_ago": 18, "sanct_days": 0
            },
            {
                "id": "MPL-KA-307", "mp_id": "MP-KA-RS01",
                "title": "Drinking Water Purification Units & Pipeline Extension",
                "desc": "Installation of multi-village drinking water treatment plant and 6 km distribution main in Belagavi Rural.",
                "cat": "DRINKING_WATER", "loc": "Khanapur, Belagavi, Karnataka",
                "lat": 15.6350, "lon": 74.5120, "constituency": "Karnataka State", "state": "Karnataka",
                "rec_inr": 40_00_000, "sanct_inr": 40_00_000, "disbursed": 15_00_000,
                "status": "INSPECTION_REQUIRED", "risk": 74, "prog": 30, "agency": "RDPR Belagavi",
                "days_ago": 210, "sanct_days": 38
            },
            {
                "id": "MPL-KA-308", "mp_id": "MP-KA-LS01",
                "title": "Modern Science & Robotics Laboratory in Pre-University College",
                "desc": "High-tech composite science lab with IoT, 3D printing equipment, and automated physics testing rigs in Mangaluru.",
                "cat": "EDUCATION", "loc": "Hampankatta, Mangaluru, Karnataka",
                "lat": 12.8690, "lon": 74.8430, "constituency": "Bengaluru South", "state": "Karnataka",
                "rec_inr": 28_00_000, "sanct_inr": 28_00_000, "disbursed": 18_00_000,
                "status": "EXECUTION", "risk": 18, "prog": 65, "agency": "PWD Coastal Zone",
                "days_ago": 115, "sanct_days": 27
            },

            # ---------------------------------------------------------------
            # D. Bihar (8 projects across Patna Sahib, Gaya, Muzaffarpur)
            # ---------------------------------------------------------------
            {
                "id": "MPL-BR-401", "mp_id": "MP-BR-LS01",
                "title": "Construction of Community Drinking Water Filtration Tower",
                "desc": "Overhead steel reservoir tank (50,000L) with arsenic and iron removal filtration unit at Fatuha, Patna.",
                "cat": "DRINKING_WATER", "loc": "Fatuha, Patna Sahib, Bihar",
                "lat": 25.5080, "lon": 85.3120, "constituency": "Patna Sahib", "state": "Bihar",
                "rec_inr": 24_00_000, "sanct_inr": 24_00_000, "disbursed": 14_00_000,
                "status": "EXECUTION", "risk": 17, "prog": 60, "agency": "PHED Bihar",
                "days_ago": 125, "sanct_days": 30
            },
            {
                "id": "MPL-BR-402", "mp_id": "MP-BR-LS01",
                "title": "Solar Street Lighting Scheme for 15 Gram Panchayats",
                "desc": "Installation of 150 standalone solar LED streetlights along dark village junctions and public ponds in Bakhtiyarpur.",
                "cat": "ELECTRICITY_RENEWABLE", "loc": "Bakhtiyarpur, Patna, Bihar",
                "lat": 25.4560, "lon": 85.5290, "constituency": "Patna Sahib", "state": "Bihar",
                "rec_inr": 30_00_000, "sanct_inr": 30_00_000, "disbursed": 30_00_000,
                "status": "COMPLETED", "risk": 13, "prog": 100, "agency": "BREDA Bihar",
                "days_ago": 220, "sanct_days": 24
            },
            {
                "id": "MPL-BR-403", "mp_id": "MP-BR-LS02",
                "title": "High School Science Block & Digital Library Setup",
                "desc": "Construction of modern two-floor science academic block with 20 internet-connected PC stations in Bodh Gaya.",
                "cat": "EDUCATION", "loc": "Bodh Gaya, Gaya, Bihar",
                "lat": 24.6960, "lon": 84.9870, "constituency": "Gaya", "state": "Bihar",
                "rec_inr": 35_00_000, "sanct_inr": 35_00_000, "disbursed": 35_00_000,
                "status": "VERIFIED", "risk": 10, "prog": 100, "agency": "Bihar Rajya Shiksha Parishad",
                "days_ago": 290, "sanct_days": 22
            },
            {
                "id": "MPL-BR-404", "mp_id": "MP-BR-LS02",
                "title": "Paved Rural Link Road with Concrete Drains",
                "desc": "Construction of 1.2 km all-weather concrete pavement connecting Mahadalit tola to State Highway 69 in Gaya.",
                "cat": "ROADS_BRIDGES", "loc": "Manpur, Gaya, Bihar",
                "lat": 24.7950, "lon": 85.0340, "constituency": "Gaya", "state": "Bihar",
                "rec_inr": 42_00_000, "sanct_inr": 42_00_000, "disbursed": 25_00_000,
                "status": "EXECUTION", "risk": 22, "prog": 55, "agency": "Rural Works Dept (RWD) Bihar",
                "days_ago": 145, "sanct_days": 31
            },
            {
                "id": "MPL-BR-405", "mp_id": "MP-BR-RS01",
                "title": "Community Toilet Complex & Solid Waste Management",
                "desc": "10-seater pour-flush community sanitation complex with solar water pump and incinerator at Muzaffarpur bus stand.",
                "cat": "SANITATION", "loc": "Brahampura, Muzaffarpur, Bihar",
                "lat": 26.1210, "lon": 85.3900, "constituency": "Bihar State", "state": "Bihar",
                "rec_inr": 20_00_000, "sanct_inr": 20_00_000, "disbursed": 0,
                "status": "SANCTIONED", "risk": 15, "prog": 0, "agency": "Muzaffarpur Municipal Corporation",
                "days_ago": 40, "sanct_days": 27
            },
            {
                "id": "MPL-BR-406", "mp_id": "MP-BR-RS01",
                "title": "Primary Health Centre Outpatient Ward Construction",
                "desc": "New outpatient clinic room, pharmacy store, and patient waiting shed at Additional PHC Kanti, Muzaffarpur.",
                "cat": "HEALTH_FAMILY_WELFARE", "loc": "Kanti, Muzaffarpur, Bihar",
                "lat": 26.2080, "lon": 85.2920, "constituency": "Bihar State", "state": "Bihar",
                "rec_inr": 30_00_000, "sanct_inr": 30_00_000, "disbursed": 0,
                "status": "RECOMMENDED", "risk": 9, "prog": 0, "agency": "Bihar Medical Infrastructure Dev Corp",
                "days_ago": 14, "sanct_days": 0
            },
            {
                "id": "MPL-BR-407", "mp_id": "MP-BR-LS01",
                "title": "Construction of Concrete Bridge Approach & Protection Embankment",
                "desc": "Approach road connecting Ganga river embankment to agricultural mandi in Bhagalpur.",
                "cat": "ROADS_BRIDGES", "loc": "Naugachia, Bhagalpur, Bihar",
                "lat": 25.3850, "lon": 87.0980, "constituency": "Patna Sahib", "state": "Bihar",
                "rec_inr": 48_00_000, "sanct_inr": 72_00_000, "disbursed": 30_00_000,
                "status": "INSPECTION_REQUIRED", "risk": 79, "prog": 40, "agency": "RWD Bhagalpur",
                "days_ago": 200, "sanct_days": 42
            },
            {
                "id": "MPL-BR-408", "mp_id": "MP-BR-RS01",
                "title": "Deep Tube-well Irrigation & Drinking Water Installation",
                "desc": "Installation of 3 high-capacity submersible pump tube-wells for flood-prone habitations in Darbhanga.",
                "cat": "DRINKING_WATER", "loc": "Benipur, Darbhanga, Bihar",
                "lat": 26.0420, "lon": 86.1150, "constituency": "Bihar State", "state": "Bihar",
                "rec_inr": 18_00_000, "sanct_inr": 18_00_000, "disbursed": 10_00_000,
                "status": "EXECUTION", "risk": 16, "prog": 60, "agency": "Minor Water Resources Dept Bihar",
                "days_ago": 95, "sanct_days": 25
            },

            # ---------------------------------------------------------------
            # E. Assam (6 projects across Guwahati, Jorhat, Dibrugarh, Silchar)
            # ---------------------------------------------------------------
            {
                "id": "MPL-AS-501", "mp_id": "MP-AS-LS01",
                "title": "Elevated Flood Shelter Community Facility",
                "desc": "Plinth-raised multi-purpose concrete flood shelter and community center for Sonapur riverine villages.",
                "cat": "COMMUNITY_INFRASTRUCTURE", "loc": "Sonapur, Guwahati, Assam",
                "lat": 26.1180, "lon": 91.9780, "constituency": "Guwahati", "state": "Assam",
                "rec_inr": 55_00_000, "sanct_inr": 55_00_000, "disbursed": 35_00_000,
                "status": "EXECUTION", "risk": 21, "prog": 65, "agency": "PWD Assam Roads Wing",
                "days_ago": 150, "sanct_days": 32
            },
            {
                "id": "MPL-AS-502", "mp_id": "MP-AS-LS01",
                "title": "Solar-Powered Piped Drinking Water Scheme",
                "desc": "Deep ring well with solar pumping system and iron-filtration plant supplying 120 households in Kamrup Rural.",
                "cat": "DRINKING_WATER", "loc": "Hajo, Kamrup Rural, Assam",
                "lat": 26.2480, "lon": 91.5280, "constituency": "Guwahati", "state": "Assam",
                "rec_inr": 28_00_000, "sanct_inr": 28_00_000, "disbursed": 28_00_000,
                "status": "COMPLETED", "risk": 12, "prog": 100, "agency": "PHED Assam",
                "days_ago": 240, "sanct_days": 26
            },
            {
                "id": "MPL-AS-503", "mp_id": "MP-AS-LS02",
                "title": "Digital Classroom & Language Lab for Tea Garden Schools",
                "desc": "Smart audiovisual learning equipment, digital tablets, and localized Assamese/English phonetics software across 6 tea garden schools.",
                "cat": "EDUCATION", "loc": "Mariani, Jorhat, Assam",
                "lat": 26.6620, "lon": 94.3210, "constituency": "Jorhat", "state": "Assam",
                "rec_inr": 32_00_000, "sanct_inr": 32_00_000, "disbursed": 32_00_000,
                "status": "VERIFIED", "risk": 11, "prog": 100, "agency": "Samagra Shiksha Assam",
                "days_ago": 270, "sanct_days": 23
            },
            {
                "id": "MPL-AS-504", "mp_id": "MP-AS-LS02",
                "title": "Primary Health Clinic & Mobile Medical Unit",
                "desc": "Upgradation of rural sub-centre with emergency stabilization room and all-terrain 4x4 mobile health vehicle.",
                "cat": "HEALTH_FAMILY_WELFARE", "loc": "Titabor, Jorhat, Assam",
                "lat": 26.6020, "lon": 94.1950, "constituency": "Jorhat", "state": "Assam",
                "rec_inr": 40_00_000, "sanct_inr": 40_00_000, "disbursed": 20_00_000,
                "status": "EXECUTION", "risk": 18, "prog": 50, "agency": "National Health Mission Assam",
                "days_ago": 105, "sanct_days": 28
            },
            {
                "id": "MPL-AS-505", "mp_id": "MP-AS-RS01",
                "title": "Erosion Protection Embankment & Bamboo Plantation Buffer",
                "desc": "Geo-textile bag embankment and reinforced boulder pitching along Brahmaputra riverbank in Dibrugarh.",
                "cat": "COMMUNITY_INFRASTRUCTURE", "loc": "Maijan, Dibrugarh, Assam",
                "lat": 27.4890, "lon": 94.9280, "constituency": "Assam State", "state": "Assam",
                "rec_inr": 36_00_000, "sanct_inr": 36_00_000, "disbursed": 0,
                "status": "SANCTIONED", "risk": 20, "prog": 0, "agency": "Water Resources Dept Assam",
                "days_ago": 30, "sanct_days": 27
            },
            {
                "id": "MPL-AS-506", "mp_id": "MP-AS-RS01",
                "title": "Community Hall & Weaving Training Center for SHGs",
                "desc": "Handloom weaving common facility centre with solar power loom training units for indigenous women artisans in Silchar.",
                "cat": "COMMUNITY_INFRASTRUCTURE", "loc": "Udarbond, Silchar, Assam",
                "lat": 24.8920, "lon": 92.8980, "constituency": "Assam State", "state": "Assam",
                "rec_inr": 22_00_000, "sanct_inr": 22_00_000, "disbursed": 0,
                "status": "RECOMMENDED", "risk": 9, "prog": 0, "agency": "Sericulture & Weaving Dept Assam",
                "days_ago": 12, "sanct_days": 0
            },

            # ---------------------------------------------------------------
            # F. Nominated MP (2 projects in National Capital / Pan-India)
            # ---------------------------------------------------------------
            {
                "id": "MPL-NOM-601", "mp_id": "MP-NOM-01",
                "title": "National Heritage Documentation Center & Audio-Visual Archive",
                "desc": "Digitization equipment, acoustic recording studio, and interactive classical art exhibition facility in New Delhi.",
                "cat": "COMMUNITY_INFRASTRUCTURE", "loc": "Janpath, New Delhi, Delhi",
                "lat": 28.6180, "lon": 77.2180, "constituency": "New Delhi", "state": "Delhi",
                "rec_inr": 45_00_000, "sanct_inr": 45_00_000, "disbursed": 45_00_000,
                "status": "COMPLETED", "risk": 10, "prog": 100, "agency": "CPWD Delhi Central",
                "days_ago": 260, "sanct_days": 25
            },
            {
                "id": "MPL-NOM-602", "mp_id": "MP-NOM-01",
                "title": "Braille & Audio Library Infrastructure in Public Schools",
                "desc": "Special educational learning materials, braille embossers, screen reader workstations, and accessible ramps across 5 schools.",
                "cat": "EDUCATION", "loc": "Lodhi Road, New Delhi, Delhi",
                "lat": 28.5890, "lon": 77.2280, "constituency": "New Delhi", "state": "Delhi",
                "rec_inr": 30_00_000, "sanct_inr": 30_00_000, "disbursed": 15_00_000,
                "status": "EXECUTION", "risk": 14, "prog": 50, "agency": "Directorate of Education Delhi",
                "days_ago": 100, "sanct_days": 28
            },
        ]

        for p_data in raw_projects:
            rec_dt = now - timedelta(days=p_data["days_ago"])
            sanct_dt = (rec_dt + timedelta(days=p_data["sanct_days"])) if p_data["sanct_days"] > 0 else None
            comp_dt = (rec_dt + timedelta(days=p_data["days_ago"] - 20)) if p_data["status"] in ("COMPLETED", "VERIFIED") else None

            # Generate risk breakdown matching the overall score
            fin_sub = min(30.0, p_data["risk"] * 0.35)
            time_sub = min(20.0, p_data["risk"] * 0.25)
            dup_sub = 0.0
            comp_sub = min(15.0, p_data["risk"] * 0.20)
            cv_sub = min(20.0, p_data["risk"] * 0.20)

            p_obj = Project(
                project_id=p_data["id"],
                mp_id=p_data["mp_id"],
                title=p_data["title"],
                description=p_data["desc"],
                category=p_data["cat"],
                location_text=p_data["loc"],
                lat=p_data["lat"],
                lon=p_data["lon"],
                constituency=p_data["constituency"],
                state=p_data["state"],
                recommended_amount_inr=p_data["rec_inr"],
                sanctioned_amount_inr=p_data["sanct_inr"],
                implementing_agency=p_data["agency"],
                status=p_data["status"],
                risk_score=p_data["risk"],
                risk_breakdown={
                    "financial": round(fin_sub, 1),
                    "timeline": round(time_sub, 1),
                    "duplicate": round(dup_sub, 1),
                    "compliance": round(comp_sub, 1),
                    "cv": round(cv_sub, 1),
                },
                mandatory_tender=False,
                missing_documents=[],
                recommendation_date=rec_dt,
                sanction_date=sanct_dt,
                completion_date=comp_dt,
                created_at=rec_dt,
                updated_at=sanct_dt or rec_dt,
            )
            db.add(p_obj)
            db.flush()

            # Seed payment if disbursed > 0
            if p_data["disbursed"] > 0:
                pm = PaymentRequest(
                    payment_id=f"PAY-{p_data['id'].replace('MPL-', '')}-01",
                    project_id=p_data["id"],
                    requested_amount_inr=p_data["disbursed"],
                    request_date=sanct_dt + timedelta(days=20) if sanct_dt else rec_dt + timedelta(days=20),
                    status="PAYMENT_RELEASED",
                    pre_payment_check_result={"risk_score": p_data["risk"], "reason_codes": [], "action": "MONITOR"},
                    ai_risk_score_at_request=p_data["risk"],
                    submitted_by="DRDA-IA",
                    approved_by="AUTH-DA-01",
                    approved_at=sanct_dt + timedelta(days=25) if sanct_dt else rec_dt + timedelta(days=25),
                )
                db.add(pm)

            # Seed progress record if progress > 0
            if p_data["prog"] > 0:
                prog = ProgressRecord(
                    progress_id=f"PROG-{p_data['id'].replace('MPL-', '')}-01",
                    project_id=p_data["id"],
                    reported_pct=p_data["prog"],
                    ai_evidence_pct=p_data["prog"] if p_data["risk"] < 70 else max(p_data["prog"] - 25, 10),
                    ai_evidence_source="SATELLITE_SAMPLE",
                    photo_paths=["uploads/sample.jpg"],
                    timestamp=sanct_dt + timedelta(days=40) if sanct_dt else rec_dt + timedelta(days=40),
                )
                db.add(prog)

            # Initial Audit event
            ae = AuditEvent(
                event_id=f"AUDIT-{p_data['id'].replace('MPL-', '')}-01",
                project_id=p_data["id"],
                case_id=None,
                event_type="STATUS_CHANGE",
                actor_id="SYSTEM",
                actor_role="SYSTEM",
                description=f"Project initialized with status {p_data['status']}.",
                old_value=None,
                new_value=p_data["status"],
                event_metadata={"sanctioned_amount": p_data["sanct_inr"]},
                timestamp=sanct_dt or rec_dt,
            )
            db.add(ae)

        db.commit()

        total_seeded = db.query(Project).count()
        logger.info(f"Database seeded successfully with {total_seeded} projects across 5 states.")

        return {
            "status": "SUCCESS",
            "project_id": "MPL-2026-1042",
            "project_status": "EXECUTION",
            "initial_risk_score": 32,
            "da_id": "AUTH-DA-01",
            "sna_id": "AUTH-SNA-01",
            "ministry_id": "AUTH-MOSPI-01",
            "mp_id": "MP-UP-042",
            "total_projects": total_seeded,
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

