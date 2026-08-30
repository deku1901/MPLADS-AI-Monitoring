"""
Satellite Remote Sensing & Multi-Temporal Change Detection Engine (Slice 5A).

Provides deterministic Sentinel-2 optical remote sensing simulation:
- T0 (Baseline Pre-Sanction Pass) vs T1 (Current Sentinel-2 Pass)
- NDBI (Normalized Difference Built-up Index: (SWIR - NIR) / (SWIR + NIR))
- NDVI (Normalized Difference Vegetation Index: (NIR - Red) / (NIR + Red))
- Structural build-up change score (0.0 to 1.0)
- AI-estimated physical progress percentage
- Progress mismatch calculation against self-reported progress:
    mismatch = abs(reported_progress_pct - ai_estimated_progress_pct)
    flagged if mismatch > 20% (Statutory Threshold)
"""

from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any
from config import settings


def analyze_satellite_imagery(
    *,
    project_id: str,
    project_title: str,
    category: str | None = "DRINKING_WATER",
    constituency: str | None = "Varanasi",
    lat: float | None = 25.3520,
    lon: float | None = 82.9510,
    reported_progress_pct: int = 80,
    sanction_date: datetime | None = None,
) -> dict[str, Any]:
    """
    Perform deterministic multi-temporal satellite change detection.
    """
    now = datetime.utcnow()
    t0_date = sanction_date or (now - timedelta(days=150))
    t1_date = now - timedelta(days=5)

    # Deterministic behavior for demo project MPL-2026-1042
    if project_id == "MPL-2026-1042":
        baseline_ndbi = -0.14
        baseline_ndvi = 0.56
        current_ndbi = 0.16
        current_ndvi = 0.35
        structural_change = 0.31
        ai_progress_pct = 31
        confidence = 0.94
        t0_cloud = 2.8
        t1_cloud = 4.1
        summary = (
            "Multi-temporal Sentinel-2 MSI spectral analysis reveals shallow ground excavation and "
            "rudimentary foundation slab. Structural overhead reservoir and filtration housing "
            "are completely absent on site. Estimated physical progress is 31% against 80% reported."
        )
    elif "1035" in project_id:  # Completed reference project
        baseline_ndbi = -0.10
        baseline_ndvi = 0.52
        current_ndbi = 0.68
        current_ndvi = 0.14
        structural_change = 0.88
        ai_progress_pct = reported_progress_pct
        confidence = 0.96
        t0_cloud = 1.9
        t1_cloud = 3.2
        summary = (
            "Sentinel-2 multi-spectral verification confirms high-density built-up signature (NDBI +0.68). "
            "Finished community asset structural footprint aligns with reported completion milestone."
        )
    else:
        # Generic consistent project simulation
        baseline_ndbi = -0.12
        baseline_ndvi = 0.54
        current_ndbi = 0.42
        current_ndvi = 0.22
        structural_change = float(reported_progress_pct) / 100.0
        ai_progress_pct = max(min(reported_progress_pct - 2, 100), 0)
        confidence = 0.92
        t0_cloud = 3.5
        t1_cloud = 4.8
        summary = (
            f"Multi-temporal change detection confirms progressive construction footprint "
            f"(NDBI change from {baseline_ndbi:+.2f} to {current_ndbi:+.2f}). "
            f"Observed structural change aligns with reported progress ({reported_progress_pct}%)."
        )

    mismatch_pct = abs(reported_progress_pct - ai_progress_pct)
    is_mismatch = mismatch_pct > settings.PROGRESS_MISMATCH_THRESHOLD_PCT

    baseline_pass = {
        "pass_id": f"S2A-{t0_date.strftime('%Y%m%d')}-T0-B04",
        "date": t0_date.strftime("%Y-%m-%d"),
        "cloud_cover_pct": t0_cloud,
        "resolution_m": 10.0,
        "ndbi_score": baseline_ndbi,
        "ndvi_score": baseline_ndvi,
        "spectral_band": "B8-B4-B3 (False Color Urban)",
        "sensor": "Sentinel-2A MSI Level-2A",
    }

    current_pass = {
        "pass_id": f"S2B-{t1_date.strftime('%Y%m%d')}-T1-B04",
        "date": t1_date.strftime("%Y-%m-%d"),
        "cloud_cover_pct": t1_cloud,
        "resolution_m": 10.0,
        "ndbi_score": current_ndbi,
        "ndvi_score": current_ndvi,
        "spectral_band": "B8-B4-B3 (False Color Urban)",
        "sensor": "Sentinel-2B MSI Level-2A",
    }

    return {
        "project_id": project_id,
        "project_title": project_title,
        "category": category or "DRINKING_WATER",
        "constituency": constituency or "Varanasi",
        "coordinates": {"lat": lat or 25.3520, "lon": lon or 82.9510},
        "baseline_pass": baseline_pass,
        "current_pass": current_pass,
        "structural_change_score": round(structural_change, 3),
        "ai_estimated_progress_pct": ai_progress_pct,
        "reported_progress_pct": reported_progress_pct,
        "mismatch_pct": mismatch_pct,
        "is_mismatch": is_mismatch,
        "confidence_score": confidence,
        "resolution_meters": 10.0,
        "sensor": "Sentinel-2 MSI Level-2A",
        "analysis_summary": summary,
    }
