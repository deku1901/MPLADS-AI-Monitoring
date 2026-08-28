"""
ML Anomaly Detection module.

Uses Isolation Forest (scikit-learn) + statistical thresholds to detect
unusual financial patterns in MPLADS projects.

The model is trained on seed project data at application startup.
No external training pipeline needed.
"""
from __future__ import annotations
import numpy as np
from sklearn.ensemble import IsolationForest

from config import settings

# Singleton model — fitted once at startup on seed data
_model: IsolationForest | None = None

# Feature names (must match extraction order in extract_features())
FEATURE_NAMES = [
    "recommended_amount_inr",
    "sanctioned_amount_inr",
    "variance_pct",
    "payment_to_progress_ratio",
    "days_since_sanction",
    "payment_count",
    "total_paid_pct",
]


def extract_features(project_data: dict) -> list[float]:
    """
    Extract ML feature vector from project data dict.

    Expected keys:
        recommended_amount_inr, sanctioned_amount_inr, current_payment_amount,
        reported_progress_pct, days_since_sanction, payment_count,
        total_paid_inr
    """
    rec = float(project_data.get("recommended_amount_inr") or 0)
    sac = float(project_data.get("sanctioned_amount_inr") or rec or 1)
    variance_pct = ((sac - rec) / rec * 100) if rec > 0 else 0.0

    progress = float(project_data.get("reported_progress_pct") or 1)
    payment_amt = float(project_data.get("current_payment_amount") or 0)
    payment_to_progress = payment_amt / max(progress, 1)

    days_since_sanction = float(project_data.get("days_since_sanction") or 0)
    payment_count = float(project_data.get("payment_count") or 0)

    total_paid = float(project_data.get("total_paid_inr") or 0)
    total_paid_pct = (total_paid / sac * 100) if sac > 0 else 0.0

    return [
        rec,
        sac,
        variance_pct,
        payment_to_progress,
        days_since_sanction,
        payment_count,
        total_paid_pct,
    ]


# Seed data for training (representative of clean projects)
_SEED_FEATURES: list[list[float]] = [
    [1_200_000, 1_250_000, 4.2,  5000, 30, 1, 25.0],
    [800_000,   850_000,   6.25, 4000, 45, 1, 30.0],
    [500_000,   510_000,   2.0,  3000, 20, 1, 20.0],
    [2_000_000, 2_100_000, 5.0,  6000, 60, 2, 40.0],
    [1_500_000, 1_600_000, 6.7,  5500, 55, 2, 50.0],
    [300_000,   310_000,   3.3,  2500, 25, 1, 15.0],
    [700_000,   720_000,   2.9,  3500, 35, 1, 28.0],
    [1_000_000, 1_050_000, 5.0,  4500, 40, 2, 35.0],
    [600_000,   620_000,   3.3,  3200, 28, 1, 22.0],
    [900_000,   940_000,   4.4,  4200, 50, 2, 45.0],
    # Outliers to help Isolation Forest calibrate
    [1_200_000, 1_800_000, 50.0, 25000, 10, 3, 90.0],  # high variance
    [500_000,   510_000,   2.0,  30000, 5,  4, 95.0],   # high payment vs progress
]


def fit_model() -> None:
    """Fit Isolation Forest on seed data. Call once at app startup."""
    global _model
    X = np.array(_SEED_FEATURES)
    _model = IsolationForest(
        n_estimators=100,
        contamination=0.15,
        random_state=42,
    )
    _model.fit(X)


def get_anomaly_score(features: list[float]) -> float:
    """
    Return anomaly score in [0, 1] where 1.0 = maximally anomalous.
    Isolation Forest raw score is in [-0.5, 0.5]; we normalise to [0, 1].
    """
    global _model
    if _model is None:
        fit_model()
    X = np.array([features])
    raw = _model.score_samples(X)[0]   # higher (less negative) = more normal
    # Normalise: raw ∈ [-0.5, 0.5] → anomaly_score ∈ [0, 1]
    score = float(np.clip((-raw + 0.5), 0.0, 1.0))
    return score


def detect_financial_anomalies(project_data: dict) -> dict:
    """
    Run all financial anomaly detectors.

    Returns:
        {
            anomaly_score: float,          # 0–1 from Isolation Forest
            variance_pct: float,
            financial_risk_flags: list[str],
        }
    """
    features = extract_features(project_data)
    anomaly_score = get_anomaly_score(features)

    flags: list[str] = []
    variance_pct = features[FEATURE_NAMES.index("variance_pct")]

    if variance_pct > settings.COST_VARIANCE_THRESHOLD_PCT:
        flags.append("COST_VARIANCE")

    # Overpayment: payment > (progress% × sanctioned_amount × 1.1)
    sac = float(project_data.get("sanctioned_amount_inr") or 1)
    progress = float(project_data.get("reported_progress_pct") or 1)
    payment_amt = float(project_data.get("current_payment_amount") or 0)
    expected_max = (progress / 100.0) * sac * 1.1
    if payment_amt > expected_max and payment_amt > 0:
        flags.append("OVERPAYMENT_RISK")

    return {
        "anomaly_score": round(anomaly_score, 4),
        "variance_pct": round(variance_pct, 2),
        "financial_risk_flags": flags,
    }
