"""
Application configuration — all tunable parameters in one place.
No thresholds are hardcoded elsewhere.
"""
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    # --- Auth ---
    SECRET_KEY: str = "mplads-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./mplads.db"

    # --- Demo / Timer ---
    DEMO_MODE: bool = True
    # Real hours are divided by this factor in demo mode (3600 → hours become seconds)
    DEMO_ACCELERATION_FACTOR: int = 3600

    # --- Email ---
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "demo@mplads-ai.dev"

    # --- LLM ---
    LLM_PROVIDER: Literal["mock", "gemini", "anthropic"] = "mock"
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    # --- File Storage ---
    UPLOAD_DIR: str = "./uploads"

    # ---- Risk weights (must sum to 1.0) ----
    RISK_WEIGHT_FINANCIAL: float = 0.30
    RISK_WEIGHT_DUPLICATE: float = 0.25
    RISK_WEIGHT_CV: float = 0.20
    RISK_WEIGHT_TIMELINE: float = 0.15
    RISK_WEIGHT_COMPLIANCE: float = 0.10

    # ---- Risk thresholds ----
    RISK_THRESHOLD_CASE: int = 70       # auto-create case
    RISK_THRESHOLD_CRITICAL: int = 90   # auto-hold payment immediately

    # ---- Detector thresholds ----
    COST_VARIANCE_THRESHOLD_PCT: float = 25.0
    NLP_DUPLICATE_THRESHOLD: float = 0.85
    NLP_SPLIT_WORK_THRESHOLD: float = 0.75
    PHASH_HAMMING_THRESHOLD: int = 10
    PROGRESS_MISMATCH_THRESHOLD_PCT: float = 20.0
    SATELLITE_STALL_DAYS: int = 90

    # ---- SLA windows (in real hours; divided by acceleration factor in demo) ----
    SLA_SANCTION_DEADLINE_DAYS: int = 45
    SLA_T1_RESPONSE_HOURS: int = 48    # Initial response window (DA)
    SLA_T2_REMINDER_HOURS: int = 24    # After reminder
    SLA_T3_ESCALATION_L2_HOURS: int = 48  # SNA window
    SLA_T4_ESCALATION_L3_HOURS: int = 72  # Ministry window

    # ---- Citizen verification ----
    CITIZEN_CREDIBILITY_THRESHOLD: float = 3.0

    # ---- Escalation tiers ----
    ESCALATION_TIERS: list[str] = ["DA", "SNA", "MINISTRY"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
