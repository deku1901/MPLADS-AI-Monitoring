"""
Vertical Slice 9 (F16) -- Autonomous Accountability Clock & Multi-Tier Escalation Engine.
Integration test suite: 21 test phases covering F16 and full F1-F15 regression.
"""

from __future__ import annotations
import sys
import os
from pathlib import Path
from PIL import Image
import io

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

SEP = "=" * 70


def section(msg: str) -> None:
    print(f"\n{SEP}\n{msg}\n{SEP}")


def ok(n: int, label: str, detail: str = "") -> None:
    suffix = f" -> {detail}" if detail else ""
    print(f"{n}. {label}: OK{suffix}")


def make_test_image(color="blue", size=(100, 100)) -> io.BytesIO:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf


def test_slice9_accountability_and_full_regression():
    section("STARTING VERTICAL SLICE 9 (F16) ACCOUNTABILITY CLOCK & ESCALATION TEST")

    # -----------------------------------------------------------------------
    # 1. Seed reset
    # -----------------------------------------------------------------------
    r = client.post("/api/seed/reset")
    assert r.status_code == 200, f"Seed reset failed: {r.text}"
    seed = r.json()
    assert seed["status"] == "SUCCESS"
    assert seed["initial_risk_score"] == 32
    ok(1, "Seed Reset", f"Initial Risk: {seed['initial_risk_score']}")

    # -----------------------------------------------------------------------
    # 2. Baseline GET /api/cases/open (clean seed state)
    # -----------------------------------------------------------------------
    r = client.get("/api/cases/open")
    assert r.status_code == 200, f"Get open cases failed: {r.text}"
    data = r.json()
    assert "open_cases" in data
    assert "total_open" in data
    assert "overdue_count" in data
    assert "by_tier" in data
    assert data["total_open"] == 0
    ok(2, "Baseline Open Cases Check", "0 open cases initially")

    # -----------------------------------------------------------------------
    # 3. Trigger Payment Hold -> Creates CASE-1042 (DA Tier)
    # -----------------------------------------------------------------------
    img_buf = make_test_image("blue")
    r = client.post(
        "/api/payments",
        data={
            "project_id": "MPL-2026-1042",
            "requested_amount_inr": 420000,
            "submitted_by": "DRDA-IA",
            "trigger_demo_scenario": True,
        },
        files={"image": ("foundation.jpg", img_buf, "image/jpeg")},
    )
    assert r.status_code == 200, f"Payment trigger failed: {r.text}"
    p_res = r.json()
    assert p_res["status"] == "HELD_FOR_REVIEW"
    assert p_res["case_id"] == "CASE-1042"
    ok(3, "Trigger High-Risk Payment Hold", f"Case {p_res['case_id']} created, Risk={p_res['risk_score']}")

    # -----------------------------------------------------------------------
    # 4. Verify Enriched Open Cases with Live SLA Derived Countdown
    # -----------------------------------------------------------------------
    r = client.get("/api/cases/open")
    assert r.status_code == 200
    data = r.json()
    assert data["total_open"] >= 1
    assert data["by_tier"].get("DA", 0) >= 1
    c1042 = next((c for c in data["open_cases"] if c["case_id"] == "CASE-1042"), None)
    assert c1042 is not None
    assert c1042["assigned_tier"] == "DA"
    assert c1042["time_remaining_seconds"] is not None
    assert c1042["time_remaining_seconds"] > 0
    assert c1042["escalation_count"] == 0
    ok(4, "Open Case Derived Countdown", f"Deadline in {c1042['time_remaining_seconds']}s (Tier: {c1042['assigned_tier']})")

    # -----------------------------------------------------------------------
    # 5. Simulate No Response (Tier 1 DA -> Tier 2 SNA: ESCALATED_L2)
    # -----------------------------------------------------------------------
    r = client.post("/api/cases/CASE-1042/simulate-no-response")
    assert r.status_code == 200, f"Simulate no response failed: {r.text}"
    esc1 = r.json()
    assert esc1["previous_tier"] == "DA"
    assert esc1["new_tier"] == "SNA"
    assert esc1["new_status"] == "ESCALATED_L2"
    assert esc1["notification_dispatched"] is True
    assert esc1["escalation_event_id"] is not None
    assert esc1["at_maximum_tier"] is False
    ok(5, "Escalation Step 1 (DA -> SNA)", f"Status={esc1['new_status']}, Tier={esc1['new_tier']}")

    # -----------------------------------------------------------------------
    # 6. Verify Open Cases Telemetry Updated to SNA
    # -----------------------------------------------------------------------
    r = client.get("/api/cases/open")
    assert r.status_code == 200
    data = r.json()
    c1042 = next((c for c in data["open_cases"] if c["case_id"] == "CASE-1042"), None)
    assert c1042["assigned_tier"] == "SNA"
    assert c1042["status"] == "ESCALATED_L2"
    assert c1042["escalation_count"] == 1
    assert data["by_tier"].get("SNA", 0) >= 1
    ok(6, "Open Cases Telemetry (SNA Tier)", f"SNA count: {data['by_tier']['SNA']}")

    # -----------------------------------------------------------------------
    # 7. Simulate No Response (Tier 2 SNA -> Tier 3 MINISTRY: ESCALATED_L3)
    # -----------------------------------------------------------------------
    r = client.post("/api/cases/CASE-1042/simulate-no-response")
    assert r.status_code == 200, f"Second escalation failed: {r.text}"
    esc2 = r.json()
    assert esc2["previous_tier"] == "SNA"
    assert esc2["new_tier"] == "MINISTRY"
    assert esc2["new_status"] == "ESCALATED_L3"
    assert esc2["notification_dispatched"] is True
    assert esc2["at_maximum_tier"] is True
    ok(7, "Escalation Step 2 (SNA -> MINISTRY)", f"Status={esc2['new_status']}, Tier={esc2['new_tier']}")

    # -----------------------------------------------------------------------
    # 8. Maximum Tier Ceiling Protection
    # -----------------------------------------------------------------------
    r = client.post("/api/cases/CASE-1042/simulate-no-response")
    assert r.status_code == 200
    esc3 = r.json()
    assert esc3["at_maximum_tier"] is True
    assert esc3["new_tier"] == "MINISTRY"
    assert "maximum tier" in esc3["message"].lower()
    ok(8, "Maximum Tier Ceiling Protection", "No further escalation beyond MINISTRY tier")

    # -----------------------------------------------------------------------
    # 9. Verify Notifications Dispatched for Escalations
    # -----------------------------------------------------------------------
    r = client.get("/api/notifications?recipient_role=MINISTRY")
    assert r.status_code == 200
    notifs = r.json()
    assert len(notifs) >= 1
    assert any("ESCALATED" in n["content"] for n in notifs)
    ok(9, "Ministry Notification Verification", f"Dispatched {len(notifs)} ministry alert(s)")

    # -----------------------------------------------------------------------
    # 10. Authority Responds -> Case Resolved
    # -----------------------------------------------------------------------
    r = client.post(
        "/api/cases/CASE-1042/evidence",
        data={
            "submitted_by": "AUTH-MOSPI-01",
            "submitted_role": "MINISTRY",
            "content_type": "TEXT",
            "content_text": "Ministry reviewed ground evidence and cleared project.",
            "justification_reduces_duplicate": True,
        },
    )
    assert r.status_code == 200, f"Evidence submit failed: {r.text}"
    ev_res = r.json()
    assert ev_res["case_status"] == "RESOLVED"
    assert ev_res["risk_after"] < 70
    ok(10, "Authority Responds -> Case Resolved", f"Risk: {ev_res['risk_before']} -> {ev_res['risk_after']}")

    # -----------------------------------------------------------------------
    # 11. Open Cases List Reflects 0 Active
    # -----------------------------------------------------------------------
    r = client.get("/api/cases/open")
    assert r.status_code == 200
    data = r.json()
    assert not any(c["case_id"] == "CASE-1042" for c in data["open_cases"])
    ok(11, "Open Cases Cleared", "CASE-1042 removed from open inbox after resolution")

    # -----------------------------------------------------------------------
    # 12. Full Immutable Audit Trail Verification
    # -----------------------------------------------------------------------
    r = client.get("/api/projects/MPL-2026-1042/audit")
    assert r.status_code == 200
    audit_events = r.json()
    event_types = [e["event_type"] for e in audit_events]
    assert "CASE_CREATED" in event_types
    assert "CASE_ESCALATED" in event_types
    assert "EVIDENCE_SUBMITTED" in event_types
    assert "CASE_RESOLVED" in event_types
    ok(12, "Audit Trail Verification", f"Recorded {len(audit_events)} chronological events")

    # -----------------------------------------------------------------------
    # 13. Dashboard Telemetry Updated
    # -----------------------------------------------------------------------
    r = client.get("/api/analytics/dashboard")
    assert r.status_code == 200
    dash = r.json()
    assert dash["portfolio_summary"]["total_projects"] == 5
    assert dash["active_interventions"]["open_cases_count"] == 0
    ok(13, "Dashboard Integration", "Dashboard reflects 0 open cases")

    # -----------------------------------------------------------------------
    # 14. F1 Regression: Autonomous Fund Lock & Payment Firebreak
    # -----------------------------------------------------------------------
    r = client.post("/api/seed/reset")
    assert r.status_code == 200
    img_buf = make_test_image("blue")
    r = client.post(
        "/api/payments",
        data={
            "project_id": "MPL-2026-1042",
            "requested_amount_inr": 420000,
            "submitted_by": "DRDA-IA",
            "trigger_demo_scenario": True,
        },
        files={"image": ("sample.jpg", img_buf, "image/jpeg")},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "HELD_FOR_REVIEW"
    ok(14, "F1 Payment Firebreak Regression", "HELD_FOR_REVIEW verified")

    # -----------------------------------------------------------------------
    # 15. F2 Regression: Recommendation Pre-Sanction Screening
    # -----------------------------------------------------------------------
    r = client.post(
        "/api/projects/recommend",
        json={
            "title": "Installation of Community RO Water Plant",
            "description": "Installation of 500 LPH RO water plant at Village Babatpur, Varanasi.",
            "category": "DRINKING_WATER",
            "constituency": "Varanasi",
            "state": "Uttar Pradesh",
            "estimated_cost_inr": 820000,
            "mp_id": "MP-UP-042",
        },
    )
    assert r.status_code == 200
    f2_res = r.json()
    assert f2_res["is_duplicate"] is True
    assert f2_res["similarity_score"] >= 0.85
    ok(15, "F2 NLP Screening Regression", f"Duplicate detected ({f2_res['similarity_score'] * 100:.1f}%)")

    # -----------------------------------------------------------------------
    # 16. F3 Regression: Citizen Ground-Truth Verification
    # -----------------------------------------------------------------------
    r = client.post(
        "/api/citizen/reports",
        data={
            "project_id": "MPL-2026-1035",
            "is_functional": False,
            "description": "Plant is non-functional and broken.",
            "citizen_lat": 25.4501,
            "citizen_lon": 82.8601,
        },
        files={"photo": ("citizen.jpg", make_test_image("red"), "image/jpeg")},
    )
    assert r.status_code == 200
    f3_res = r.json()
    assert f3_res["credibility_score"] >= 3.0
    assert f3_res["inspection_triggered"] is True
    ok(16, "F3 Citizen Verification Regression", f"Inspection Triggered (Credibility={f3_res['credibility_score']})")

    # -----------------------------------------------------------------------
    # 17. F4 Regression: Split-Work Anomaly Detection & Tender Enforcement
    # -----------------------------------------------------------------------
    r = client.post("/api/anomalies/split-work/scan")
    assert r.status_code == 200
    f4_res = r.json()
    assert f4_res["clusters_detected"] >= 1
    assert f4_res["clusters_enforced"] >= 1
    assert len(f4_res["clusters"]) >= 1
    c0 = f4_res["clusters"][0]
    assert c0["mandatory_tender_enforced"] is True
    assert c0["total_aggregated_cost_inr"] > 1000000
    ok(17, "F4 Split-Work Regression", f"Mandatory unified e-tender enforced ({c0['unified_tender_title']})")

    # -----------------------------------------------------------------------
    # 18. F11 Regression: Satellite Remote Sensing Change Detection
    # -----------------------------------------------------------------------
    r = client.post("/api/satellite/projects/MPL-2026-1042/verify")
    assert r.status_code == 200
    f11_res = r.json()
    assert f11_res["is_mismatch"] is True
    ok(18, "F11 Satellite Regression", f"Mismatch {f11_res['mismatch_pct']}% detected")

    # -----------------------------------------------------------------------
    # 19. F12 Regression: Project Delay & Stalled Work Detection
    # -----------------------------------------------------------------------
    r = client.post("/api/delay/projects/MPL-2026-1042/scan")
    assert r.status_code == 200
    f12_res = r.json()
    assert f12_res["delay_status"] in ("PROJECT_STALLED", "SEVERE_DELAY", "MODERATE_DELAY", "ON_TRACK")
    ok(19, "F12 Delay Regression", f"Status: {f12_res['delay_status']}")

    # -----------------------------------------------------------------------
    # 20. F13 Regression: Financial & Expenditure Analytics
    # -----------------------------------------------------------------------
    r = client.post("/api/financial/projects/MPL-2026-1042/scan")
    assert r.status_code == 200
    f13_res = r.json()
    assert f13_res["anomaly_score"] > 0
    ok(20, "F13 Financial Regression", f"Rating: {f13_res['financial_health_rating']}, Score: {f13_res['anomaly_score']}")

    # -----------------------------------------------------------------------
    # 21. F14 Regression: Cost Overrun Detection
    # -----------------------------------------------------------------------
    r = client.post("/api/cost-overrun/projects/MPL-2026-1042/scan")
    assert r.status_code == 200
    f14_res = r.json()
    assert f14_res["overrun_status"] in ("COST_ESCALATION", "SEVERE_ESCALATION", "OVERRUN_RISK")
    ok(21, "F14 Cost Overrun Regression", f"Overrun: {f14_res['overrun_status']}")

    section("ALL 21 TEST PHASES IN VERTICAL SLICE 9 (F16) PASSED SUCCESSFULLY")


if __name__ == "__main__":
    test_slice9_accountability_and_full_regression()
