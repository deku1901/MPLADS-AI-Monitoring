"""
Test Suite for Role-Specific Dashboards (MP, DA, SNA, MoSPI) and Authentication.

Validates:
1. MP Constituency Dashboard across multiple states & MPs
2. District Authority Operations Dashboard (SLA queue & payment holds)
3. State Nodal Authority Dashboard (District leaderboard & Tier-2 escalations)
4. MoSPI National Command Dashboard (All-India KPIs, State Matrix, Fiscal Ledger)
5. Auth & Demo Personas Endpoint
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    client.post("/api/seed/reset")


def test_auth_and_personas():
    """Verify demo login and persona catalog endpoints."""
    # 1. Personas endpoint
    r = client.get("/api/auth/personas")
    assert r.status_code == 200
    personas = r.json()
    assert len(personas) >= 5
    roles = [p["role"] for p in personas]
    assert "MP" in roles
    assert "DA" in roles
    assert "SNA" in roles
    assert "MINISTRY" in roles
    assert "CITIZEN" in roles

    # 2. Login endpoint with MoSPI persona
    login_res = client.post(
        "/api/auth/login",
        json={"username": "AUTH-MOSPI-01", "password": "demo123"},
    )
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "MINISTRY"


def test_mp_constituency_dashboards_multi_state():
    """Verify MP dashboards calculate realistic metrics across UP, Maharashtra, Karnataka, Bihar, Assam."""
    # 1. MP List
    r = client.get("/api/mp/list")
    assert r.status_code == 200
    mp_list = r.json()
    assert len(mp_list) >= 15

    # 2. Test Varanasi MP (UP)
    up_res = client.get("/api/mp/MP-UP-042/dashboard")
    assert up_res.status_code == 200
    up_data = up_res.json()
    assert up_data["mp"]["constituency"] == "Varanasi"
    assert up_data["budget_summary"]["annual_budget_inr"] == 50000000
    assert up_data["statutory_compliance"]["sc_threshold_pct"] == 15.0
    assert len(up_data["projects"]) >= 5
    assert len(up_data["sector_breakdown"]) > 0

    # 3. Test Pune MP (Maharashtra)
    mh_res = client.get("/api/mp/MP-MH-LS01/dashboard")
    assert mh_res.status_code == 200
    mh_data = mh_res.json()
    assert mh_data["mp"]["state"] == "Maharashtra"
    assert len(mh_data["projects"]) > 0

    # 4. Test Bengaluru South MP (Karnataka)
    ka_res = client.get("/api/mp/MP-KA-LS01/dashboard")
    assert ka_res.status_code == 200
    ka_data = ka_res.json()
    assert ka_data["mp"]["state"] == "Karnataka"


def test_da_operations_dashboard():
    """Verify District Authority dashboard returns 45-day SLA queue, payment holds, and active cases."""
    # 1. DA List
    r = client.get("/api/da/list")
    assert r.status_code == 200
    das = r.json()
    assert len(das) >= 5

    # 2. DA Varanasi Dashboard
    da_res = client.get("/api/da/AUTH-DA-01/dashboard")
    assert da_res.status_code == 200
    da_data = da_res.json()
    assert da_data["da"]["district"] == "Varanasi"
    assert "portfolio_summary" in da_data
    assert "sla_queue" in da_data
    assert "payment_holds" in da_data
    assert "cases" in da_data
    assert da_data["portfolio_summary"]["total_projects"] > 0


def test_sna_state_dashboard():
    """Verify State Nodal Authority dashboard returns district leaderboard and Tier-2 escalation queue."""
    # 1. SNA List
    r = client.get("/api/sna/list")
    assert r.status_code == 200
    snas = r.json()
    assert len(snas) >= 5

    # 2. SNA UP Dashboard
    sna_res = client.get("/api/sna/AUTH-SNA-01/dashboard")
    assert sna_res.status_code == 200
    sna_data = sna_res.json()
    assert sna_data["sna"]["state"] == "Uttar Pradesh"
    assert len(sna_data["district_leaderboard"]) > 0
    assert len(sna_data["mp_compliance"]) > 0
    assert "escalation_queue" in sna_data


def test_mospi_national_command_dashboard():
    """Verify MoSPI national command dashboard aggregates all 45 projects, state matrix, and fiscal ledger."""
    r = client.get("/api/mospi/dashboard")
    assert r.status_code == 200
    data = r.json()
    kpis = data["national_kpis"]
    assert kpis["total_projects"] >= 45
    assert kpis["total_states"] >= 5
    assert kpis["total_mps"] >= 15
    assert kpis["total_sanctioned_inr"] > 0

    # Fiscal Protection Ledger
    ledger = data["fiscal_ledger"]
    assert ledger["total_portfolio_inr"] > 0
    assert ledger["total_disbursed_inr"] > 0

    # State Comparative Matrix
    matrix = data["state_matrix"]
    assert len(matrix) >= 5
    state_names = [s["state"] for s in matrix]
    assert "Uttar Pradesh" in state_names
    assert "Maharashtra" in state_names
    assert "Karnataka" in state_names
    assert "Bihar" in state_names
    assert "Assam" in state_names
