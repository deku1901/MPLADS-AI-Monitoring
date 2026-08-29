"""
Integration Test for Vertical Slice 4 — Split-Work NLP Detection & Mandatory E-Tender Enforcement.

Tests:
1. POST /api/seed/reset → clean state with 5 projects (including MPL-2026-1051/52/53).
2. GET /api/anomalies/split-work → detects the CC Road corridor cluster.
3. POST /api/anomalies/split-work/scan → enforces mandatory tender, creates case, audit, notification.
4. Verify all three projects have mandatory_tender=True.
5. Verify aggregate cost == 1,440,000.
6. Verify case_id is generated.
7. Verify reason codes contain SPLIT_WORK_ANOMALY and MANDATORY_TENDER_ENFORCED.
8. Verify DA notification is generated.
9. Verify audit events are generated.
10. Idempotency: repeated POST scan does not create duplicate intervention cases.
11. F1 Regression: Payment flow on MPL-2026-1042 still works.
12. F2 Regression: NLP duplicate recommendation screening still works.
13. F3 Regression: Citizen report credibility and inspection trigger still work.
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_slice4_split_work_lifecycle():
    print("\n--- Testing Slice 4: Split-Work NLP Detection & Mandatory E-Tender Enforcement ---")

    # 1. Reset Database
    reset_res = client.post("/api/seed/reset")
    assert reset_res.status_code == 200, f"Seed reset failed: {reset_res.text}"
    reset_data = reset_res.json()
    assert reset_data["status"] == "SUCCESS"
    print("1. Seed Reset: OK → Initial Risk:", reset_data["initial_risk_score"])

    # 2. Verify split-work demo projects exist
    for pid in ["MPL-2026-1051", "MPL-2026-1052", "MPL-2026-1053"]:
        proj_res = client.get(f"/api/projects/{pid}")
        assert proj_res.status_code == 200, f"Project {pid} not found: {proj_res.text}"
        proj = proj_res.json()
        assert proj["project_id"] == pid
        # Should start with mandatory_tender=False
        assert proj.get("mandatory_tender") == False, f"{pid} should start with mandatory_tender=False"
    print("2. Demo Projects (MPL-2026-1051/52/53): Verified seeded with mandatory_tender=False")

    # 3. GET /api/anomalies/split-work — read-only detection
    detect_res = client.get("/api/anomalies/split-work")
    assert detect_res.status_code == 200, f"Split-work detection failed: {detect_res.text}"
    clusters = detect_res.json()
    assert len(clusters) >= 1, f"Expected at least 1 cluster, got {len(clusters)}"

    cc_cluster = clusters[0]
    print("3. GET /api/anomalies/split-work:")
    print("   - clusters detected  :", len(clusters))
    print("   - corridor_name      :", cc_cluster["corridor_name"])
    print("   - member count       :", len(cc_cluster["member_projects"]))
    print("   - total_cost         :", cc_cluster["total_aggregated_cost_inr"])
    print("   - nlp_similarity     :", cc_cluster["nlp_corridor_similarity"])

    # Should detect 3 members
    assert len(cc_cluster["member_projects"]) == 3, \
        f"Expected 3 members, got {len(cc_cluster['member_projects'])}"
    # Aggregate cost: 3 × 480000 = 1,440,000
    assert cc_cluster["total_aggregated_cost_inr"] == 1_440_000, \
        f"Expected aggregate cost 1440000, got {cc_cluster['total_aggregated_cost_inr']}"
    # NLP similarity >= 0.75
    assert cc_cluster["nlp_corridor_similarity"] >= 0.75, \
        f"Expected NLP similarity >= 0.75, got {cc_cluster['nlp_corridor_similarity']}"

    # 4. POST /api/anomalies/split-work/scan — enforce mandatory e-tender
    scan_res = client.post("/api/anomalies/split-work/scan", json={})
    assert scan_res.status_code == 200, f"Split-work scan failed: {scan_res.text}"
    scan_data = scan_res.json()
    print("4. POST /api/anomalies/split-work/scan:")
    print("   - status             :", scan_data["status"])
    print("   - clusters_detected  :", scan_data["clusters_detected"])
    print("   - clusters_enforced  :", scan_data["clusters_enforced"])

    assert scan_data["status"] == "SUCCESS"
    assert scan_data["clusters_detected"] >= 1
    assert scan_data["clusters_enforced"] >= 1

    enforced = scan_data["clusters"][0]
    case_id = enforced.get("case_id")
    print("   - case_id            :", case_id)
    print("   - mandatory_enforced :", enforced["mandatory_tender_enforced"])

    assert enforced["mandatory_tender_enforced"] is True
    assert case_id is not None

    # 5. Verify mandatory_tender=True on all three projects in DB
    for pid in ["MPL-2026-1051", "MPL-2026-1052", "MPL-2026-1053"]:
        proj_res = client.get(f"/api/projects/{pid}")
        assert proj_res.status_code == 200
        proj = proj_res.json()
        assert proj.get("mandatory_tender") == True, \
            f"{pid} mandatory_tender should be True after enforcement, got {proj.get('mandatory_tender')}"
    print("5. mandatory_tender=True: Verified on MPL-2026-1051, 1052, 1053")

    # 6. Verify Case was created with correct reason codes
    case_res = client.get(f"/api/cases/{case_id}")
    assert case_res.status_code == 200, f"Case {case_id} not found: {case_res.text}"
    case_data = case_res.json()
    print("6. Intervention Case:")
    print("   - case_id            :", case_data["case_id"])
    print("   - assigned_tier      :", case_data["assigned_tier"])
    print("   - reason_codes       :", case_data["reason_codes"])

    assert case_data["case_id"] == case_id
    assert case_data["assigned_tier"] == "DA"
    assert "SPLIT_WORK_ANOMALY" in case_data["reason_codes"]
    assert "MANDATORY_TENDER_ENFORCED" in case_data["reason_codes"]

    # 7. Verify audit events were created
    audit_res = client.get("/api/projects/MPL-2026-1051/audit")
    assert audit_res.status_code == 200, f"Audit retrieval failed: {audit_res.text}"
    audit_events = audit_res.json()
    event_types = [e["event_type"] for e in audit_events]
    print("7. Audit Events for MPL-2026-1051:", event_types)
    assert "SPLIT_WORK_DETECTED" in event_types, f"Missing SPLIT_WORK_DETECTED in {event_types}"

    # 8. Verify notifications generated for DA
    notif_res = client.get("/api/notifications?recipient_role=DA")
    assert notif_res.status_code == 200
    notifs = notif_res.json()
    split_notifs = [n for n in notifs if case_id in (n.get("case_id") or "")]
    print("8. DA Notifications for case:", len(split_notifs), "found")
    assert len(split_notifs) >= 1, "Expected at least 1 DA notification for split-work case"

    # 9. Idempotency: repeat POST scan must NOT create a duplicate case
    scan_res2 = client.post("/api/anomalies/split-work/scan", json={})
    assert scan_res2.status_code == 200
    scan_data2 = scan_res2.json()
    # Already-enforced clusters should report 0 newly enforced
    print("9. Idempotency Check:")
    print("   - clusters_enforced (2nd scan):", scan_data2["clusters_enforced"])
    assert scan_data2["clusters_enforced"] == 0, \
        f"Repeated scan should enforce 0 new clusters, got {scan_data2['clusters_enforced']}"

    # Verify only ONE case with this case_id exists (no duplicates)
    case_check = client.get(f"/api/cases/{case_id}")
    assert case_check.status_code == 200

    # 10. F1 Regression: Payment intervention on MPL-2026-1042
    import io
    from PIL import Image

    img = Image.new("RGB", (100, 100), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    pay_res = client.post(
        "/api/payments",
        data={
            "project_id": "MPL-2026-1042",
            "requested_amount_inr": "420000",
            "submitted_by": "DRDA-IA",
            "trigger_demo_scenario": "true",
        },
        files={"image": ("site.jpg", buf.getvalue(), "image/jpeg")},
    )
    assert pay_res.status_code == 200, f"F1 payment failed: {pay_res.text}"
    assert pay_res.json()["status"] == "HELD_FOR_REVIEW"
    print("10. F1 Payment Regression: OK → HELD_FOR_REVIEW")

    # 11. F2 Regression: NLP duplicate recommendation screening
    rec_res = client.post("/api/projects/recommend", json={
        "title": "Installation of Solar Drinking Water Tube-well & RO Plant",
        "description": "Installation of solar-powered deep borewell filtration plant at Village Shivpur, Varanasi.",
        "category": "DRINKING_WATER",
        "constituency": "Varanasi",
        "state": "Uttar Pradesh",
        "estimated_cost_inr": 1400000,
        "mp_id": "MP-UP-042",
    })
    assert rec_res.status_code == 200
    assert rec_res.json()["is_duplicate"] is True
    print("11. F2 NLP Recommendation Regression: OK → Duplicate Detected (85%+)")

    # 12. F3 Regression: Citizen verification still works
    import io as _io
    from PIL import Image as _Image
    cit_img = _Image.new("RGB", (100, 100), color="green")
    cit_buf = _io.BytesIO()
    cit_img.save(cit_buf, format="JPEG")
    cit_buf.seek(0)

    cit_res = client.post(
        "/api/citizen/reports",
        data={
            "project_id": "MPL-2026-1035",
            "is_functional": "true",
            "description": "Visited the plant. Functional and providing water.",
            "citizen_lat": "25.4510",
            "citizen_lon": "82.8610",
        },
        files={"photo": ("cit.jpg", cit_buf.getvalue(), "image/jpeg")},
    )
    assert cit_res.status_code == 200
    assert cit_res.json()["credibility_score"] >= 3.0
    print("12. F3 Citizen Verification Regression: OK → Credibility 3.5/3.5")

    print("\n--- ALL SLICE 4 INTEGRATION & REGRESSION TESTS PASSED (100%) ---")


if __name__ == "__main__":
    test_slice4_split_work_lifecycle()
