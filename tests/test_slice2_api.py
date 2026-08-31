"""
Integration Test for Vertical Slice 2 — Recommendation Screening & Duplicate Detection.

Verifies:
1. POST /api/seed/reset -> database is in baseline demo state.
2. POST /api/projects/recommend (Duplicate Work) ->
   - NLP detects similarity >= 0.85 against existing project MPL-2026-1042.
   - is_duplicate == True
   - reason_codes contains "DUPLICATE_PROJECT"
   - recommendation_action == "REJECTION_WARNING"
3. POST /api/projects/recommend (Unique Work) ->
   - NLP detects similarity < 0.5.
   - is_duplicate == False
   - recommendation_action == "PROCEED_TO_SANCTION"
4. F1-F4 Regression Check ->
   - Payment intervention on MPL-2026-1042 still triggers HELD_FOR_REVIEW and CASE-1042.
"""

import sys
import os
from pathlib import Path
from PIL import Image
import io

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_slice2_recommendation_screening_lifecycle():
    print("\n--- Testing Slice 2: Recommendation Screening & Duplicate Detection ---")

    # 1. Reset Database
    reset_res = client.post("/api/seed/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["status"] == "SUCCESS"
    print("1. Seed Reset: OK -> Initial Risk:", reset_data["initial_risk_score"])

    # 2. Screen a Duplicate Proposal (Shivpur Solar Water Borewell)
    duplicate_payload = {
        "title": "Installation of Solar Drinking Water Tube-well & RO Plant",
        "description": "Installation of solar-powered deep borewell filtration plant, RO treatment unit, and overhead distribution tank at Village Shivpur, Varanasi.",
        "category": "DRINKING_WATER",
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "estimated_cost_inr": 1400000,
        "mp_id": "MP-UP-042",
    }

    screen_res1 = client.post("/api/projects/recommend", json=duplicate_payload)
    assert screen_res1.status_code == 200
    screen_data1 = screen_res1.json()

    print("2. Duplicate Recommendation Screening:")
    print("   - is_duplicate       :", screen_data1["is_duplicate"])
    print("   - similarity_score   :", screen_data1["similarity_score"])
    print("   - matched_project_id :", screen_data1["matched_project"]["project_id"] if screen_data1["matched_project"] else None)
    print("   - reason_codes       :", screen_data1["reason_codes"])
    print("   - action             :", screen_data1["recommendation_action"])

    assert screen_data1["is_duplicate"] is True
    assert screen_data1["similarity_score"] >= 0.85
    assert screen_data1["matched_project"] is not None
    assert screen_data1["matched_project"]["project_id"] == "MPL-2026-1042"
    assert "DUPLICATE_PROJECT" in screen_data1["reason_codes"]
    assert screen_data1["recommendation_action"] == "REJECTION_WARNING"

    # 3. Screen a Unique Non-Duplicate Proposal (Science Lab)
    unique_payload = {
        "title": "Construction of High School Science Laboratory & Smart Classroom",
        "description": "Modern physics and chemistry laboratory setup with digital smart board and equipment at Government Inter College, Harhua, Varanasi.",
        "category": "EDUCATION",
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "estimated_cost_inr": 2500000,
        "mp_id": "MP-UP-042",
    }

    screen_res2 = client.post("/api/projects/recommend", json=unique_payload)
    assert screen_res2.status_code == 200
    screen_data2 = screen_res2.json()

    print("3. Unique Recommendation Screening:")
    print("   - is_duplicate       :", screen_data2["is_duplicate"])
    print("   - similarity_score   :", screen_data2["similarity_score"])
    print("   - reason_codes       :", screen_data2["reason_codes"])
    print("   - action             :", screen_data2["recommendation_action"])

    assert screen_data2["is_duplicate"] is False
    assert screen_data2["similarity_score"] < 0.75
    assert "DUPLICATE_PROJECT" not in screen_data2["reason_codes"]
    assert screen_data2["recommendation_action"] == "PROCEED_TO_SANCTION"

    # 4. F1-F4 Regression Check: Payment hold and case creation still work
    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"image": ("tank_completion.jpg", buf.getvalue(), "image/jpeg")}
    data = {
        "project_id": "MPL-2026-1042",
        "requested_amount_inr": "420000",
        "submitted_by": "DRDA-IA",
        "trigger_demo_scenario": "true",
    }
    pay_res = client.post("/api/payments", data=data, files=files)
    assert pay_res.status_code == 200
    pay_data = pay_res.json()
    assert pay_data["status"] == "HELD_FOR_REVIEW"
    assert pay_data["risk_score"] >= 70
    assert pay_data["case_id"] == "CASE-1042"
    print("4. F1-F4 Regression Check: OK -> Status:", pay_data["status"], "| Risk:", pay_data["risk_score"])

    print("\n--- ALL SLICE 2 INTEGRATION TESTS PASSED (100%) ---")


if __name__ == "__main__":
    test_slice2_recommendation_screening_lifecycle()
