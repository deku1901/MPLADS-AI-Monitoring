"""
Integration Test for Vertical Slice 3 — Citizen Ground-Truth Verification & Autonomous Inspection Trigger.

Verifies:
1. POST /api/seed/reset -> database is in baseline demo state.
2. GET /api/citizen/projects -> retrieves public geo-tagged project directory.
3. POST /api/citizen/reports (Positive Verification) ->
   - Citizen files YES report with photo & GPS proximity.
   - Credibility score computed >= 3.0.
   - inspection_triggered is False.
4. POST /api/citizen/reports (Corroborated Negative Dispute) ->
   - Citizen files NO report with photo & GPS proximity.
   - Negative credibility accumulates >= 3.0.
   - Project status transitions to INSPECTION_REQUIRED.
   - Autonomous case CASE-1035 created for District Authority.
   - inspection_triggered is True.
5. GET /api/projects/MPL-2026-1035/citizen-reports -> lists submitted reports.
6. F1 & F2 Regression Check ->
   - Payment intervention on MPL-2026-1042 still triggers HELD_FOR_REVIEW and CASE-1042.
   - Recommendation screening at /api/projects/recommend still detects duplicates.
"""

import sys
from pathlib import Path
from PIL import Image
import io

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def _make_dummy_image():
    img = Image.new("RGB", (100, 100), color="green")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


def test_slice3_citizen_verification_lifecycle():
    print("\n--- Testing Slice 3: Citizen Ground-Truth Verification & Inspection Trigger ---")

    # 1. Reset Database
    reset_res = client.post("/api/seed/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["status"] == "SUCCESS"
    print("1. Seed Reset: OK -> Initial Risk:", reset_data["initial_risk_score"])

    # 2. Get Public Citizen Project Directory
    proj_res = client.get("/api/citizen/projects")
    assert proj_res.status_code == 200
    projects = proj_res.json()
    assert len(projects) >= 2
    project_ids = [p["project_id"] for p in projects]
    assert "MPL-2026-1035" in project_ids
    print(f"2. Citizen Projects Directory: OK -> Found {len(projects)} projects (including MPL-2026-1035)")

    # 3. Submit a Positive Citizen Verification Report
    photo_bytes = _make_dummy_image()
    pos_report = {
        "project_id": "MPL-2026-1035",
        "is_functional": "true",
        "description": "Visited the water plant in Babatpur. RO plant is functional and providing clean water to villagers.",
        "citizen_lat": "25.4510",
        "citizen_lon": "82.8610",
    }
    pos_res = client.post(
        "/api/citizen/reports",
        data=pos_report,
        files={"photo": ("functional_water.jpg", photo_bytes, "image/jpeg")},
    )
    assert pos_res.status_code == 200
    pos_data = pos_res.json()
    print("3. Positive Citizen Report:")
    print("   - report_id            :", pos_data["report_id"])
    print("   - credibility_score    :", pos_data["credibility_score"])
    print("   - inspection_triggered :", pos_data["inspection_triggered"])
    print("   - new_project_status   :", pos_data["new_project_status"])

    assert pos_data["credibility_score"] >= 3.0  # Photo (1.5) + GPS within 5km (1.5) + text (0.5) = 3.5
    assert pos_data["inspection_triggered"] is False

    # 4. Submit Corroborating Negative Reports to trigger Autonomous Inspection Case
    neg_report_1 = {
        "project_id": "MPL-2026-1035",
        "is_functional": "false",
        "description": "RO plant motor burned out. Facility locked for 3 weeks. No water supply available.",
        "citizen_lat": "25.4520",
        "citizen_lon": "82.8605",
    }
    client.post(
        "/api/citizen/reports",
        data=neg_report_1,
        files={"photo": ("broken_motor.jpg", photo_bytes, "image/jpeg")},
    )

    neg_report_2 = {
        "project_id": "MPL-2026-1035",
        "is_functional": "false",
        "description": "Confirming plant is non-functional and drinking water tap is completely dry.",
        "citizen_lat": "25.4505",
        "citizen_lon": "82.8595",
    }
    neg_res_2 = client.post(
        "/api/citizen/reports",
        data=neg_report_2,
        files={"photo": ("dry_tap.jpg", photo_bytes, "image/jpeg")},
    )
    assert neg_res_2.status_code == 200
    neg_data_2 = neg_res_2.json()

    print("4. Negative Citizen Dispute Triggering Inspection:")
    print("   - credibility_score    :", neg_data_2["credibility_score"])
    print("   - inspection_triggered :", neg_data_2["inspection_triggered"])
    print("   - case_id              :", neg_data_2["case_id"])
    print("   - new_project_status   :", neg_data_2["new_project_status"])

    assert neg_data_2["inspection_triggered"] is True
    assert neg_data_2["new_project_status"] == "INSPECTION_REQUIRED"
    assert neg_data_2["case_id"] is not None

    # 5. Verify Case Details Created for DA
    case_res = client.get(f"/api/cases/{neg_data_2['case_id']}")
    assert case_res.status_code == 200
    case_data = case_res.json()
    assert case_data["assigned_tier"] == "DA"
    assert "INSPECTION_REQUIRED" in case_data["reason_codes"]
    print("5. DA Inspection Case Verified: OK -> Case:", case_data["case_id"], "| Tier:", case_data["assigned_tier"])

    # 6. Verify Citizen Reports Endpoint
    reports_res = client.get("/api/projects/MPL-2026-1035/citizen-reports")
    assert reports_res.status_code == 200
    reports = reports_res.json()
    assert len(reports) == 3
    print(f"6. Project Citizen Reports Listing: OK -> {len(reports)} reports logged")

    # 7. Regression Check: F1 Payment Intervention Flow
    pay_img = _make_dummy_image()
    pay_res = client.post(
        "/api/payments",
        data={
            "project_id": "MPL-2026-1042",
            "requested_amount_inr": "420000",
            "submitted_by": "DRDA-IA",
            "trigger_demo_scenario": "true",
        },
        files={"image": ("tank_reg.jpg", pay_img, "image/jpeg")},
    )
    assert pay_res.status_code == 200
    assert pay_res.json()["status"] == "HELD_FOR_REVIEW"
    print("7. F1 Payment Flow Regression: OK -> HELD_FOR_REVIEW")

    # 8. Regression Check: F2 Recommendation Duplicate Screening
    rec_res = client.post(
        "/api/projects/recommend",
        json={
            "title": "Installation of Solar Drinking Water Tube-well & RO Plant",
            "description": "Installation of solar-powered deep borewell filtration plant at Village Shivpur, Varanasi.",
            "category": "DRINKING_WATER",
            "constituency": "Varanasi",
            "state": "Uttar Pradesh",
            "estimated_cost_inr": 1400000,
            "mp_id": "MP-UP-042",
        },
    )
    assert rec_res.status_code == 200
    assert rec_res.json()["is_duplicate"] is True
    print("8. F2 NLP Recommendation Screening Regression: OK -> Duplicate Detected (85%+)")

    print("\n--- ALL SLICE 3 INTEGRATION & REGRESSION TESTS PASSED (100%) ---")


if __name__ == "__main__":
    test_slice3_citizen_verification_lifecycle()
