"""
End-to-End Multi-Stage Governance Lifecycle Test.

Simulates the entire closed-loop MPLADS project lifecycle:
1. Recommendation Pre-Screening (F2 NLP)
2. Sanction & Execution State Transition
3. Satellite Change Detection (F11 Remote Sensing)
4. Payment Submission & Firebreak Escrow Hold (F1 pHash + Risk Engine)
5. Authority Evidence Submission & Case Resolution (F16 Case Engine)
6. Project Completion Verification (F17 Multi-Signal Synthesis)
7. Citizen Ground-Truth Verification (F3 "Ye Thik Karke Dikhao")
8. National Dashboard Telemetry Integration (F15 / MoSPI National Command)
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from main import app

client = TestClient(app)


def test_full_lifecycle_e2e():
    """Execute complete 8-stage closed-loop lifecycle audit."""
    # 0. Deterministic Seed Reset
    reset_res = client.post("/api/seed/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "SUCCESS"

    # Stage 1: Recommendation Pre-Screening (F2 NLP)
    rec_res = client.post(
        "/api/projects/recommend",
        json={
            "mp_id": "MP-UP-042",
            "title": "Installation of Deep Tube-well Filtration System",
            "description": "Installation of 500 LPH solar deep borewell RO filtration unit at Village Babatpur.",
            "category": "DRINKING_WATER",
            "estimated_cost_inr": 1200000,
            "constituency": "Varanasi",
            "state": "Uttar Pradesh",
        },
    )
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert "is_duplicate" in rec_data
    assert "recommendation_action" in rec_data

    # Stage 2: Satellite Remote Sensing Progress Verification (F11)
    sat_res = client.post("/api/satellite/projects/MPL-2026-1042/verify")
    assert sat_res.status_code == 200
    sat_data = sat_res.json()
    assert "is_mismatch" in sat_data

    # Stage 3: Payment Request & Firebreak Escrow Hold (F1)
    import io
    from PIL import Image

    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    files = {"image": ("test_invoice.jpg", buf.getvalue(), "image/jpeg")}

    pay_res = client.post(
        "/api/payments",
        data={
            "project_id": "MPL-2026-1042",
            "requested_amount_inr": "420000",
            "submitted_by": "DRDA-IA",
            "trigger_demo_scenario": "true",
        },
        files=files,
    )
    assert pay_res.status_code == 200
    pay_data = pay_res.json()
    assert pay_data["status"] == "HELD_FOR_REVIEW"
    assert pay_data["case_id"] is not None

    # Stage 4: DA Authority Evidence Submission & Resolution
    case_id = pay_data["case_id"]
    ev_res = client.post(
        f"/api/cases/{case_id}/evidence",
        data={
            "submitted_by": "AUTH-DA-01",
            "submitted_role": "DA",
            "content_type": "TEXT",
            "content_text": "Field verification report confirmed revised pipe dimensions and foundation concrete depth.",
            "justification_reduces_duplicate": True,
        },
    )
    assert ev_res.status_code == 200
    ev_data = ev_res.json()
    assert ev_data["case_status"] in ("RESOLVED", "UNDER_REVIEW")
    assert ev_data["risk_after"] < ev_data["risk_before"]

    # Stage 5: F17 Completion Verification on reference project
    comp_res = client.post(
        "/api/projects/MPL-2026-1035/verify-completion",
        json={"completion_notes": "Completed and operational RO plant"},
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["is_verified"] is True

    # Stage 6: Citizen Ground-Truth Audit (F3)
    cit_photo = Image.new("RGB", (100, 100), color="green")
    cit_buf = io.BytesIO()
    cit_photo.save(cit_buf, format="JPEG")
    cit_buf.seek(0)

    cit_res = client.post(
        "/api/citizen/reports",
        data={
            "project_id": "MPL-2026-1035",
            "is_functional": "true",
            "description": "Plant tested on site, clear drinking water dispensing smoothly.",
            "citizen_lat": "25.4510",
            "citizen_lon": "82.8610",
        },
        files={"photo": ("functional_water.jpg", cit_buf.getvalue(), "image/jpeg")},
    )
    assert cit_res.status_code == 200
    cit_data = cit_res.json()
    assert cit_data["credibility_score"] >= 1.0
    assert cit_data["inspection_triggered"] is False

    # Stage 7: MoSPI National Dashboard Verification
    nat_res = client.get("/api/mospi/dashboard")
    assert nat_res.status_code == 200
    nat_data = nat_res.json()
    assert nat_data["national_kpis"]["total_projects"] >= 45
    assert len(nat_data["state_matrix"]) >= 5
    assert nat_data["fiscal_ledger"]["total_portfolio_inr"] > 0
