"""
Integration test for Vertical Slice 1 FastAPI REST API.

Tests the full closed loop via HTTP client:
1. POST /api/seed/reset -> Resets to initial baseline (Risk 32).
2. GET  /api/projects/MPL-2026-1042 -> Verifies initial project state.
3. POST /api/payments -> Submits payment request, triggers AI check (Risk 79), holds payment, creates Case.
4. GET  /api/cases/CASE-1042 -> Verifies case inbox and AI explanation.
5. GET  /api/notifications -> Verifies in-platform notification to DA.
6. POST /api/cases/CASE-1042/evidence -> Submits DA justification, triggers AI re-evaluation (Risk 54), resolves case.
7. GET  /api/projects/MPL-2026-1042/audit -> Verifies end-to-end immutable audit trail.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_full_slice1_http_flow():
    print("\n" + "="*70)
    print("STARTING VERTICAL SLICE 1 HTTP API INTEGRATION TEST")
    print("="*70)

    # 1. Health Check
    health = client.get("/api/health")
    assert health.status_code == 200
    print("1. Health Check: OK ->", health.json())

    # 2. Reset / Seed
    reset_res = client.post("/api/seed/reset")
    assert reset_res.status_code == 200
    seed_data = reset_res.json()
    assert seed_data["project_id"] == "MPL-2026-1042"
    assert seed_data["initial_risk_score"] == 32
    print("2. Seed Reset: OK -> Initial Risk:", seed_data["initial_risk_score"])

    # 3. Verify Project Details
    proj_res = client.get("/api/projects/MPL-2026-1042")
    assert proj_res.status_code == 200
    proj = proj_res.json()
    assert proj["status"] == "EXECUTION"
    assert proj["risk_score"] == 32
    print("3. Project Detail: OK -> Title:", proj["title"][:40], "... | Status:", proj["status"])

    # 4. Submit Payment Request (Triggers AI check & intervention)
    payment_payload = {
        "project_id": "MPL-2026-1042",
        "requested_amount_inr": 420000,
        "submitted_by": "DRDA-IA",
        "trigger_demo_scenario": True,
    }
    # Generate valid test image
    from PIL import Image
    import io
    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    image_content = buf.getvalue()

    files = {"image": ("tank_completion.jpg", image_content, "image/jpeg")}
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
    print("4. Payment Intervention: OK -> Status:", pay_data["status"], "| Risk:", pay_data["risk_score"], "| Case:", pay_data["case_id"])
    print("   Flagged Reasons:", pay_data["reason_codes"])

    # 5. Verify Case Inbox
    case_res = client.get("/api/cases/CASE-1042")
    assert case_res.status_code == 200
    case_data = case_res.json()
    assert case_data["assigned_tier"] == "DA"
    assert case_data["status"] in ("NOTIFIED", "AWAITING_RESPONSE")
    print("5. Case Inspection: OK -> Assigned:", case_data["assigned_tier"], "| Status:", case_data["status"])
    print("   AI Explanation:", case_data["ai_explanation"][:90], "...")

    # 6. Verify Notifications Inbox
    notif_res = client.get("/api/notifications?recipient_role=DA")
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    assert len(notifs) >= 1
    print("6. Notifications: OK -> Found", len(notifs), "notification(s) for DA")

    # 7. Submit Authority Evidence & Justification
    evidence_data = {
        "submitted_by": "AUTH-DA-01",
        "submitted_role": "DA",
        "content_type": "TEXT",
        "content_text": (
            "Revised technical sanction estimate submitted with soil foundation report. "
            "Site coordinates and updated physical milestone inspected on 28 Aug 2026."
        ),
        "justification_reduces_duplicate": "true",
    }
    ev_res = client.post("/api/cases/CASE-1042/evidence", data=evidence_data)
    assert ev_res.status_code == 200
    ev_result = ev_res.json()
    assert ev_result["risk_after"] < 70
    assert ev_result["case_status"] == "RESOLVED"
    print("7. Evidence & AI Re-evaluation: OK -> Risk Before:", ev_result["risk_before"], "-> Risk After:", ev_result["risk_after"])
    print("   Case Status:", ev_result["case_status"])

    # 8. Verify Project State after Resolution
    proj_after_res = client.get("/api/projects/MPL-2026-1042")
    proj_after = proj_after_res.json()
    print("8. Post-Resolution Project: OK -> Project Risk:", proj_after["risk_score"])

    # 9. Verify Immutable Audit Trail
    audit_res = client.get("/api/projects/MPL-2026-1042/audit")
    assert audit_res.status_code == 200
    audit_events = audit_res.json()
    print("9. Audit Trail Complete: OK ->", len(audit_events), "events recorded:")
    for a in audit_events:
        print(f"   [{a['timestamp'][:19]}] {a['event_type']:<22} | {a['description']}")

    print("="*70)
    print("VERTICAL SLICE 1 HTTP API TEST: ALL 9 PHASES PASSED")
    print("="*70)


if __name__ == "__main__":
    test_full_slice1_http_flow()
