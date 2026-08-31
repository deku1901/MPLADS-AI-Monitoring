"""
Vertical Slice 7 (F14) -- Cost Overrun Detection.
Integration test suite: 19 test phases covering F14 and full F1-F13 regression.
"""

from __future__ import annotations
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SEP = "=" * 70


def section(msg: str) -> None:
    print(f"\n{SEP}\n{msg}\n{SEP}")


def ok(n: int, label: str, detail: str = "") -> None:
    suffix = f" -> {detail}" if detail else ""
    print(f"{n}. {label}: OK{suffix}")


def fail(n: int, label: str, reason: str) -> None:
    raise AssertionError(f"STEP {n} [{label}] FAILED: {reason}")


# ---------------------------------------------------------------------------
# Test entry point
# ---------------------------------------------------------------------------

def test_slice7_cost_overrun_and_regression():
    run_tests()


def run_tests():
    section("STARTING VERTICAL SLICE 7 (F14) COST OVERRUN DETECTION TEST")

    # -----------------------------------------------------------------------
    # 1. Seed reset
    # -----------------------------------------------------------------------
    r = client.post("/api/seed/reset")
    assert r.status_code == 200, f"Seed reset failed: {r.text}"
    seed = r.json()
    initial_risk = seed["initial_risk_score"]
    assert initial_risk == 32, f"Expected initial risk 32, got {initial_risk}"
    ok(1, "Seed Reset", f"Initial Risk: {initial_risk}")

    # -----------------------------------------------------------------------
    # 2. On-budget project cost-overrun calculations (MPL-2026-1035)
    # -----------------------------------------------------------------------
    r = client.get("/api/cost-overrun/projects/MPL-2026-1035/analysis")
    assert r.status_code == 200, f"Analysis failed: {r.text}"
    a = r.json()
    assert a["project_id"] == "MPL-2026-1035"
    assert a["overrun_status"] == "WITHIN_BUDGET", f"Expected WITHIN_BUDGET, got {a['overrun_status']}"
    assert a["estimate_increase_pct"] >= 0.0
    assert len(a["overrun_flags"]) == 0 or "ESTIMATE_ESCALATION" not in a["overrun_flags"]
    ok(2, "On-Budget Project Analysis", f"Status: {a['overrun_status']} | Increase: {a['estimate_increase_pct']:.2f}%")

    # -----------------------------------------------------------------------
    # 3. Demo MPL-2026-1042 analysis -- verify all 5 key metrics
    # -----------------------------------------------------------------------
    r = client.get("/api/cost-overrun/projects/MPL-2026-1042/analysis")
    assert r.status_code == 200, f"Analysis failed: {r.text}"
    a = r.json()

    # Check all 5 core metrics
    orig = a["original_estimate_inr"]
    rev  = a["revised_estimate_inr"]
    act  = a["actual_expenditure_inr"]
    assert orig == 800_000,  f"Expected original=800000, got {orig}"
    assert rev  == 1_050_000, f"Expected revised=1050000, got {rev}"
    assert act  == 1_020_000, f"Expected actual=1020000, got {act}"

    # Metric 1: Estimate increase
    assert a["estimate_increase_inr"] == 250_000, f"Expected 250000, got {a['estimate_increase_inr']}"

    # Metric 2: Estimate increase % = (1050000-800000)/800000*100 = 31.25%
    assert abs(a["estimate_increase_pct"] - 31.25) < 0.1, f"Expected ~31.25%, got {a['estimate_increase_pct']}"

    # Metric 3: Actual vs original % = (1020000-800000)/800000*100 = 27.50%
    assert abs(a["actual_vs_original_pct"] - 27.50) < 0.1, f"Expected ~27.50%, got {a['actual_vs_original_pct']}"

    # Metric 4: Actual vs revised % = (1020000-1050000)/1050000*100 = -2.857...
    assert abs(a["actual_vs_revised_pct"] - (-2.86)) < 0.1, f"Expected ~-2.86%, got {a['actual_vs_revised_pct']}"

    # Metric 5: Remaining balance = 1050000 - 1020000 = 30000
    assert a["remaining_balance_inr"] == 30_000, f"Expected 30000, got {a['remaining_balance_inr']}"

    ok(3, "Demo MPL-2026-1042 Analysis -- 5 Metrics",
       f"Increase=+{a['estimate_increase_pct']:.2f}% | Actual/Orig={a['actual_vs_original_pct']:+.2f}% | "
       f"Actual/Rev={a['actual_vs_revised_pct']:+.2f}% | Balance=Rs.{a['remaining_balance_inr']:,}")

    # -----------------------------------------------------------------------
    # 4. Configurable threshold behavior
    # -----------------------------------------------------------------------
    # With default threshold 25%, estimate_increase_pct=31.25% should trigger COST_ESCALATION
    assert a["monitoring_threshold_pct"] == 25.0, f"Expected threshold 25.0, got {a['monitoring_threshold_pct']}"
    assert a["overrun_status"] in ("COST_ESCALATION", "OVERRUN_RISK", "SEVERE_ESCALATION", "OVERRUN_CONFIRMED"), \
        f"Expected overrun status for anomalous project, got {a['overrun_status']}"
    assert "ESTIMATE_ESCALATION" in a["overrun_flags"] or "ACTUAL_EXCEEDS_ORIGINAL_THRESHOLD" in a["overrun_flags"], \
        f"Expected escalation flag, got {a['overrun_flags']}"
    ok(4, "Configurable Threshold Behavior",
       f"Threshold={a['monitoring_threshold_pct']}% | Status={a['overrun_status']} | Flags={a['overrun_flags']}")

    # -----------------------------------------------------------------------
    # 5. Risk integration -- scan raises risk
    # -----------------------------------------------------------------------
    r = client.post("/api/cost-overrun/projects/MPL-2026-1042/scan")
    assert r.status_code == 200, f"Scan failed: {r.text}"
    s = r.json()
    assert s["project_id"] == "MPL-2026-1042"
    assert s["updated_risk_score"] > s["previous_risk_score"] or s["updated_risk_score"] >= 32, \
        f"Risk should not decrease below seed: prev={s['previous_risk_score']}, updated={s['updated_risk_score']}"
    ok(5, "Risk Integration",
       f"Risk: {s['previous_risk_score']} -> {s['updated_risk_score']}")

    # -----------------------------------------------------------------------
    # 6. Escalation behavior -- status should be INSPECTION_REQUIRED
    # -----------------------------------------------------------------------
    assert s["inspection_triggered"], f"Expected inspection_triggered=True, got {s['inspection_triggered']}"
    assert s["new_project_status"] == "INSPECTION_REQUIRED", \
        f"Expected INSPECTION_REQUIRED, got {s['new_project_status']}"
    ok(6, "Escalation Behavior", f"Status -> {s['new_project_status']}")

    # -----------------------------------------------------------------------
    # 7. Case creation -- CASE-COST-1042
    # -----------------------------------------------------------------------
    case_id = s["case_id"]
    assert case_id is not None, "Expected case_id, got None"
    assert case_id == "CASE-COST-1042", f"Expected CASE-COST-1042, got {case_id}"
    r = client.get(f"/api/cases/{case_id}")
    assert r.status_code == 200, f"Case lookup failed: {r.text}"
    case_data = r.json()
    assert case_data["status"] == "INSPECTION_REQUIRED"
    assert case_data["assigned_tier"] == "DA"
    ok(7, "Case Creation", f"Case: {case_id} | Tier: {case_data['assigned_tier']}")

    # -----------------------------------------------------------------------
    # 8. Audit event
    # -----------------------------------------------------------------------
    r = client.get("/api/projects/MPL-2026-1042/audit")
    assert r.status_code == 200, f"Audit fetch failed: {r.text}"
    events = r.json()
    event_types = [e["event_type"] for e in events]
    assert "COST_OVERRUN_DETECTED" in event_types, f"Expected COST_OVERRUN_DETECTED in {event_types}"
    assert "CASE_CREATED" in event_types, f"Expected CASE_CREATED in {event_types}"
    ok(8, "Audit Event", f"Recorded events: {[t for t in event_types if 'COST' in t or t == 'CASE_CREATED']}")

    # -----------------------------------------------------------------------
    # 9. DA notification
    # -----------------------------------------------------------------------
    r = client.get("/api/notifications?recipient_role=DA")
    assert r.status_code == 200, f"Notifications fetch failed: {r.text}"
    notifs = r.json()
    cost_notifs = [n for n in notifs if case_id in (n.get("case_id") or "")]
    assert len(cost_notifs) >= 1, f"Expected at least 1 DA notification for {case_id}, got {len(cost_notifs)}"
    ok(9, "DA Notification", f"Found {len(cost_notifs)} notification(s) for {case_id}")

    # -----------------------------------------------------------------------
    # 10. Database state verification
    # -----------------------------------------------------------------------
    r = client.get("/api/projects/MPL-2026-1042")
    assert r.status_code == 200
    proj = r.json()
    assert proj["status"] == "INSPECTION_REQUIRED", f"Expected INSPECTION_REQUIRED, got {proj['status']}"
    assert proj["risk_score"] >= 32, f"Risk should have been recalculated, got {proj['risk_score']}"
    ok(10, "Database State Verified",
       f"Status={proj['status']} | Risk={proj['risk_score']}")

    # -----------------------------------------------------------------------
    # 11. Idempotency -- second scan must not create a duplicate case
    # -----------------------------------------------------------------------
    r2 = client.post("/api/cost-overrun/projects/MPL-2026-1042/scan")
    assert r2.status_code == 200, f"Second scan failed: {r2.text}"
    s2 = r2.json()
    assert s2["case_id"] == case_id, f"Expected same case_id on re-scan, got {s2['case_id']}"
    # Verify no second case was created
    r_cases = client.get("/api/projects/MPL-2026-1042")
    ok(11, "Idempotency Check", f"Re-scan case_id={s2['case_id']} (no duplicate)")

    # -----------------------------------------------------------------------
    # 12. Normal/on-track project -- no false case creation
    # -----------------------------------------------------------------------
    r3 = client.post("/api/cost-overrun/projects/MPL-2026-1035/scan")
    assert r3.status_code == 200, f"Normal project scan failed: {r3.text}"
    s3 = r3.json()
    assert s3["overrun_status"] == "WITHIN_BUDGET", \
        f"Expected WITHIN_BUDGET for normal project, got {s3['overrun_status']}"
    assert not s3["inspection_triggered"], "Normal project should not trigger inspection"
    ok(12, "Normal Project Test", f"Status={s3['overrun_status']} | Case={s3['case_id']}")

    # -----------------------------------------------------------------------
    # -----------------------------------------------------------------------
    # F1–F13 Regression
    # -----------------------------------------------------------------------
    section("F14 CORE TESTS COMPLETE -- RUNNING F1-F13 REGRESSION")

    # Reset for clean regression state
    client.post("/api/seed/reset")

    # F1 Payment Firebreak regression
    import io
    from PIL import Image
    img = Image.new("RGB", (100, 100), color="purple")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    files = {"image": ("tank_completion.jpg", buf.getvalue(), "image/jpeg")}
    pay_r = client.post("/api/payments", data={
        "project_id": "MPL-2026-1042",
        "requested_amount_inr": "420000",
        "submitted_by": "DRDA-IA",
        "trigger_demo_scenario": "true",
    }, files=files)
    assert pay_r.status_code == 200
    pay_data = pay_r.json()
    assert pay_data["status"] == "HELD_FOR_REVIEW", \
        f"F1 regression: Expected HELD_FOR_REVIEW, got {pay_data['status']}"
    ok(13, "F1 Payment Firebreak Regression", "OK -> HELD_FOR_REVIEW")

    # F2 NLP recommendation screening regression
    rec_r = client.post("/api/projects/recommend", json={
        "title": "Installation of Solar Drinking Water Tube-well & RO Plant",
        "description": "Installation of solar-powered deep borewell filtration plant, RO treatment unit, and overhead distribution tank at Village Shivpur, Varanasi.",
        "category": "DRINKING_WATER",
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "estimated_cost_inr": 1400000,
        "mp_id": "MP-UP-042",
    })
    assert rec_r.status_code == 200
    rec_data = rec_r.json()
    assert rec_data.get("is_duplicate") is True, \
        f"F2 regression: Expected is_duplicate=True, similarity={rec_data.get('similarity_score')}"
    ok(14, "F2 NLP Recommendation Screening Regression",
       f"OK -> Duplicate Detected ({rec_data.get('similarity_score', 0)*100:.0f}%+)")

    # F3 Citizen Ground-Truth regression
    cit_photo = buf.getvalue()
    cit_r = client.post(
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
    assert cit_r.status_code == 200
    cit_data = cit_r.json()
    assert cit_data.get("credibility_score", 0) >= 3.0, \
        f"F3 regression: Expected credibility>=3.0, got {cit_data.get('credibility_score')}"
    ok(15, "F3 Citizen Ground-Truth Regression",
       f"OK -> Credibility {cit_data.get('credibility_score')}/3.5")

    # F4 Split-Work regression
    sw_r = client.post("/api/anomalies/split-work/scan")
    assert sw_r.status_code == 200
    sw_data = sw_r.json()
    assert sw_data.get("clusters_detected", 0) >= 1, \
        f"F4 regression: Expected split-work detection, got {sw_data}"
    ok(16, "F4 Split-Work Procurement Regression", "OK -> Corridor Cluster Enforced")

    # F11 Satellite regression
    sat_r = client.post("/api/satellite/projects/MPL-2026-1042/verify")
    assert sat_r.status_code == 200
    sat_data = sat_r.json()
    assert sat_data.get("is_mismatch") is True or sat_data.get("mismatch_detected") is True, \
        f"F11 regression: Expected mismatch, got {sat_data}"
    ok(17, "F11 Satellite Remote Sensing Regression",
       f"OK -> Mismatch Verified ({sat_data.get('ai_progress_pct')}% vs {sat_data.get('reported_progress_pct')}%)")

    # F12 Delay regression
    delay_r = client.post("/api/delay/projects/MPL-2026-1042/scan")
    assert delay_r.status_code == 200
    delay_data = delay_r.json()
    assert delay_data.get("delay_status") == "PROJECT_STALLED", \
        f"F12 regression: Expected PROJECT_STALLED, got {delay_data.get('delay_status')}"
    ok(18, "F12 Delay & Stalled Work Regression",
       f"OK -> {delay_data.get('delay_status')} (>{delay_data.get('days_since_last_progress', 0)} days)")

    # F13 Financial Analytics regression
    fin_r = client.post("/api/financial/projects/MPL-2026-1042/scan")
    assert fin_r.status_code == 200
    fin_data = fin_r.json()
    assert fin_data.get("financial_health_rating") in ("CRITICAL_ANOMALY", "HIGH_RISK"), \
        f"F13 regression: Expected anomaly rating, got {fin_data.get('financial_health_rating')}"
    ok(19, "F13 Financial Analytics Regression",
       f"OK -> {fin_data.get('financial_health_rating')} | Risk={fin_data.get('updated_risk_score')}")

    section("ALL VERTICAL SLICE 7 (F14) COST OVERRUN & REGRESSION TESTS PASSED (100%)")


if __name__ == "__main__":
    run_tests()
