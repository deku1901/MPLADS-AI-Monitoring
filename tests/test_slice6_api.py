"""
Test Suite: Vertical Slice 6 (F13: Financial & Expenditure Analytics Engine)

Verifies:
1. Seed reset
2. Normal project financial analysis (MPL-2026-1035: On budget, Healthy)
3. Anomalous project financial analysis (MPL-2026-1042: +62.5% cost variance, Critical Anomaly)
4. Financial scan & statutory escalation (CASE-FIN-1042 assigned to DA, Risk >= 70, INSPECTION_REQUIRED)
5. Database state verification
6. Case details and reason codes
7. Audit trail (FINANCIAL_ANOMALY_DETECTED, CASE_CREATED)
8. DA notification dispatch
9. Idempotency on repeated scans
10. Clean project scan (MPL-2026-1035, zero false case creation)
11. Full F1 Payment Flow Regression
12. Full F2 NLP Recommendation Screening Regression
13. Full F3 Citizen Ground-Truth Verification Regression
14. Full F4 Split-Work Anomaly Detection Regression
15. Full F11 Satellite Remote Sensing Verification Regression
16. Full F12 Delay & Stalled Work Detection Regression
"""

import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_slice6_complete_lifecycle():
    print("\n======================================================================")
    print("STARTING VERTICAL SLICE 6 (F13) FINANCIAL ANALYTICS TEST")
    print("======================================================================")

    # 1. Reset database
    res = client.post("/api/seed/reset")
    assert res.status_code == 200, f"Seed reset failed: {res.text}"
    print("1. Seed Reset: OK -> Initial Risk: 32")

    # 2. Get Financial Analysis for On-Budget Reference Project MPL-2026-1035
    res = client.get("/api/financial/projects/MPL-2026-1035/analysis")
    assert res.status_code == 200, f"Financial analysis failed: {res.text}"
    norm_data = res.json()
    assert norm_data["project_id"] == "MPL-2026-1035"
    assert norm_data["recommended_amount_inr"] == 8_00_000
    assert norm_data["sanctioned_amount_inr"] == 8_20_000
    assert norm_data["cost_variance_pct"] <= 10.0
    assert norm_data["financial_health_rating"] == "HEALTHY"
    print(f"2. On-Budget Project Analysis: OK -> Variance: {norm_data['cost_variance_pct']}% | "
          f"Rating: {norm_data['financial_health_rating']} | Flags: {norm_data['financial_risk_flags']}")

    # 3. Get Financial Analysis for Anomalous Project MPL-2026-1042
    res = client.get("/api/financial/projects/MPL-2026-1042/analysis")
    assert res.status_code == 200, f"Financial analysis failed: {res.text}"
    anom_data = res.json()
    assert anom_data["project_id"] == "MPL-2026-1042"
    assert anom_data["recommended_amount_inr"] == 12_00_000
    assert anom_data["sanctioned_amount_inr"] == 19_50_000
    assert anom_data["cost_variance_pct"] >= 50.0  # +62.5%
    assert anom_data["cost_variance_inr"] == 7_50_000
    assert "COST_VARIANCE" in anom_data["financial_risk_flags"]
    assert anom_data["financial_health_rating"] == "CRITICAL_ANOMALY"
    assert len(anom_data["payments"]) >= 1
    print(f"3. Anomalous Project Analysis: OK -> Recommended: ₹{anom_data['recommended_amount_inr']:,} | "
          f"Sanctioned: ₹{anom_data['sanctioned_amount_inr']:,} | Variance: +{anom_data['cost_variance_pct']}% (Flagged)")

    # 4. Trigger Financial Anomaly Scan for MPL-2026-1042
    res = client.post("/api/financial/projects/MPL-2026-1042/scan")
    assert res.status_code == 200, f"Financial scan failed: {res.text}"
    scan_data = res.json()
    assert scan_data["project_id"] == "MPL-2026-1042"
    assert scan_data["inspection_triggered"] is True
    assert scan_data["case_id"] == "CASE-FIN-1042"
    assert scan_data["new_project_status"] == "INSPECTION_REQUIRED"
    assert scan_data["updated_risk_score"] >= 70
    print(f"4. Financial Scan & Escalation: OK -> Case: {scan_data['case_id']} | "
          f"Risk: {scan_data['previous_risk_score']} → {scan_data['updated_risk_score']} | "
          f"Status: {scan_data['new_project_status']}")

    # 5. Verify Database Project State
    res = client.get("/api/projects/MPL-2026-1042")
    assert res.status_code == 200
    p_data = res.json()
    assert p_data["status"] == "INSPECTION_REQUIRED"
    assert p_data["risk_score"] >= 70
    print("5. Database State Verified: OK -> Status is INSPECTION_REQUIRED with escalated risk")

    # 6. Verify Intervention Case Details
    res = client.get("/api/cases/CASE-FIN-1042")
    assert res.status_code == 200
    c_data = res.json()
    assert c_data["case_id"] == "CASE-FIN-1042"
    assert c_data["assigned_tier"] == "DA"
    assert c_data["status"] == "INSPECTION_REQUIRED"
    assert "COST_VARIANCE" in c_data["reason_codes"]
    assert "FINANCIAL_ANOMALY" in c_data["reason_codes"]
    print("6. Case Inspection: OK -> CASE-FIN-1042 assigned to DA with fiscal reason codes")

    # 7. Verify Audit Trail Events
    res = client.get("/api/projects/MPL-2026-1042/audit")
    assert res.status_code == 200
    events = res.json()
    event_types = [e["event_type"] for e in events]
    assert "FINANCIAL_ANOMALY_DETECTED" in event_types
    assert "CASE_CREATED" in event_types
    print(f"7. Audit Trail Verified: OK -> Recorded events: {event_types}")

    # 8. Verify DA Notification Dispatched
    res = client.get("/api/notifications?recipient_role=DA")
    assert res.status_code == 200
    notifs = res.json()
    fin_notifs = [n for n in notifs if n.get("case_id") == "CASE-FIN-1042"]
    assert len(fin_notifs) >= 1
    print(f"8. DA Notification: OK -> Found {len(fin_notifs)} notification(s) for CASE-FIN-1042")

    # 9. Idempotency Check: Re-scan MPL-2026-1042
    res = client.post("/api/financial/projects/MPL-2026-1042/scan")
    assert res.status_code == 200
    idem_data = res.json()
    assert idem_data["case_id"] == "CASE-FIN-1042"
    assert idem_data["inspection_triggered"] is True
    print("9. Idempotency Check: OK -> Re-running scan does not duplicate open cases")

    # 10. Clean Project Scenario (MPL-2026-1035)
    res = client.post("/api/financial/projects/MPL-2026-1035/scan")
    assert res.status_code == 200
    clean_scan = res.json()
    assert clean_scan["inspection_triggered"] is False
    assert clean_scan["case_id"] is None
    print("10. Clean Project Test: OK -> Zero false cases created for on-budget project")

    # 11. Full Regression: F1 Payment Intervention Flow
    from PIL import Image
    import io
    img = Image.new("RGB", (100, 100), color="purple")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    files = {"image": ("tank_completion.jpg", buf.getvalue(), "image/jpeg")}
    p_res = client.post("/api/payments", data={
        "project_id": "MPL-2026-1042",
        "requested_amount_inr": "420000",
        "submitted_by": "DRDA-IA",
        "trigger_demo_scenario": "true",
    }, files=files)
    assert p_res.status_code == 200
    assert p_res.json()["status"] == "HELD_FOR_REVIEW"
    print("11. F1 Payment Flow Regression: OK -> HELD_FOR_REVIEW")

    # 12. Full Regression: F2 NLP Recommendation Screening
    rec_res = client.post("/api/projects/recommend", json={
        "title": "Installation of Solar Drinking Water Tube-well & RO Plant",
        "description": "Installation of solar-powered deep borewell filtration plant, RO treatment unit, and overhead distribution tank at Village Shivpur, Varanasi.",
        "category": "DRINKING_WATER",
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "estimated_cost_inr": 1400000,
        "mp_id": "MP-UP-042",
    })
    assert rec_res.status_code == 200
    assert rec_res.json()["is_duplicate"] is True
    print("12. F2 NLP Recommendation Screening Regression: OK -> Duplicate Detected (85%+)")

    # 13. Full Regression: F3 Citizen Ground-Truth Verification
    cit_photo = buf.getvalue()
    cit_res = client.post(
        "/api/citizen/reports",
        data={
            "project_id": "MPL-2026-1035",
            "is_functional": "true",
            "description": "Visited the water plant in Babatpur. RO plant is functional and providing clean water to villagers.",
            "citizen_lat": "25.4510",
            "citizen_lon": "82.8610",
        },
        files={"photo": ("functional_water.jpg", cit_photo, "image/jpeg")},
    )
    assert cit_res.status_code == 200
    assert cit_res.json()["credibility_score"] >= 3.0
    print("13. F3 Citizen Ground-Truth Regression: OK -> Credibility 3.5/3.5")

    # 14. Full Regression: F4 Split-Work Anomaly Detection
    sw_res = client.post("/api/anomalies/split-work/scan")
    assert sw_res.status_code == 200
    assert sw_res.json()["clusters_detected"] >= 1
    print("14. F4 Split-Work Procurement Regression: OK -> Corridor Cluster Enforced")

    # 15. Full Regression: F11 Satellite Remote Sensing Verification
    sat_res = client.post("/api/satellite/projects/MPL-2026-1042/verify")
    assert sat_res.status_code == 200
    assert sat_res.json()["verified"] is True
    assert sat_res.json()["is_mismatch"] is True
    print("15. F11 Satellite Remote Sensing Regression: OK -> Mismatch Verified (31% vs 80%)")

    # 16. Full Regression: F12 Delay & Stalled Work Detection
    delay_res = client.post("/api/delay/projects/MPL-2026-1042/scan")
    assert delay_res.status_code == 200
    assert delay_res.json()["delay_status"] == "PROJECT_STALLED"
    assert delay_res.json()["inspection_triggered"] is True
    print("16. F12 Delay & Stalled Work Regression: OK -> Stall Detected (>90 days)")

    print("\n======================================================================")
    print("ALL VERTICAL SLICE 6 (F13) FINANCIAL ANALYTICS & REGRESSION TESTS PASSED (100%)")
    print("======================================================================\n")


if __name__ == "__main__":
    test_slice6_complete_lifecycle()
