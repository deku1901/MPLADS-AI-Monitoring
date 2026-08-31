"""
Test Suite for Slice 10 / F17: Project Completion Verification Engine.

Tests:
1. Clean Project Completion: Physical 100%, Satellite consistent, Photos authentic -> VERIFIED
2. Disputed Project Completion: Incomplete physical/satellite mismatch -> COMPLETION_DISPUTED + Case Created
3. Completion Dossier API Retrieval
4. Audit Trail and DA Notification Generation
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from main import app

client = TestClient(app)


def test_slice10_completion_verification_clean():
    """Verify clean completed reference project (MPL-2026-1035) reaches VERIFIED status."""
    # 1. Reset database
    res = client.post("/api/seed/reset")
    assert res.status_code == 200

    # 2. Trigger Completion Verification on reference completed project
    r = client.post(
        "/api/projects/MPL-2026-1035/verify-completion",
        json={
            "completion_notes": "All civil works and RO equipment operational.",
            "final_expenditure_inr": 820000,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["project_id"] == "MPL-2026-1035"
    assert data["is_verified"] is True
    assert data["new_status"] == "VERIFIED"
    assert data["verification_score"] >= 70.0
    assert data["signals"]["verdict"] == "VERIFIED"

    # 3. Retrieve Dossier
    dos_res = client.get("/api/projects/MPL-2026-1035/completion-dossier")
    assert dos_res.status_code == 200
    dos = dos_res.json()
    assert dos["project_id"] == "MPL-2026-1035"
    assert dos["status"] == "VERIFIED"


def test_slice10_completion_verification_disputed():
    """Verify active project with satellite mismatch or in-execution state is disputed and creates case."""
    # Trigger completion verification on MPL-2026-1042 (which is currently in EXECUTION with 30% progress)
    r = client.post(
        "/api/projects/MPL-2026-1042/verify-completion",
        json={"completion_notes": "Claiming full completion prematurely"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["project_id"] == "MPL-2026-1042"
    assert data["is_verified"] is False
    assert data["new_status"] == "INSPECTION_REQUIRED"
    assert data["signals"]["verdict"] == "COMPLETION_DISPUTED"
    assert len(data["signals"]["reason_codes"]) > 0
    assert data["case_id"] is not None
    assert "CASE-COMPL" in data["case_id"]

    # Verify audit event generated
    audit_res = client.get("/api/projects/MPL-2026-1042/audit")
    assert audit_res.status_code == 200
    events = audit_res.json()
    event_types = [e["event_type"] for e in events]
    assert "COMPLETION_DISPUTED" in event_types
