"""
LLM Module — Abstract provider with MockProvider fallback.

For demo/offline reliability, MockProvider returns pre-generated case
explanations keyed by reason codes.  The provider is swapped at startup
based on settings.LLM_PROVIDER.
"""
from __future__ import annotations
import hashlib
from typing import Protocol
from config import settings


# ---------------------------------------------------------------------------
# Protocol (interface)
# ---------------------------------------------------------------------------

class LLMProvider(Protocol):
    def complete(self, prompt: str) -> str: ...


# ---------------------------------------------------------------------------
# Mock Provider — deterministic, no API key needed
# ---------------------------------------------------------------------------

# Pre-generated responses keyed by sorted reason_codes tuple
_MOCK_EXPLANATIONS: dict[str, str] = {
    "COST_VARIANCE,OVERPAYMENT_RISK,PHOTO_DUPLICATE,PROGRESS_MISMATCH": (
        "Project MPL-2026-1042 has been flagged HIGH RISK for the following reasons: "
        "(1) The sanctioned estimate is 62.5% higher than the original MP recommendation — "
        "significantly above the 25% variance threshold. "
        "(2) The payment request of ₹4.2 lakh is disproportionate to the reported physical "
        "progress of 31%, suggesting an overpayment risk. "
        "(3) The uploaded completion photograph matches a previously submitted image from "
        "another project — indicating a possible duplicate evidence submission. "
        "(4) Self-reported progress (85%) is inconsistent with AI-derived physical evidence (31%), "
        "a gap of 54 percentage points. "
        "Recommended action: Request the District Authority to verify the physical status of "
        "the site and provide a revised technical estimate justifying the cost increase."
    ),
    "COST_VARIANCE,PROGRESS_MISMATCH": (
        "This project shows a significant cost variance between recommendation and sanction, "
        "and reported physical progress does not align with available evidence. "
        "Independent verification of site status is recommended before payment is released."
    ),
    "PHOTO_DUPLICATE": (
        "An uploaded photograph matches a previously stored image from another MPLADS project. "
        "This may indicate reuse of evidence across different works. "
        "The District Authority should obtain fresh on-site photographs before approving payment."
    ),
    "SANCTION_DELAY": (
        "This project has exceeded the statutory 45-day sanction window. "
        "The District Authority is required to provide a decision — approval or rejection — "
        "to prevent project stalling."
    ),
    "DEFAULT": (
        "This project has been flagged by the AI monitoring system based on one or more "
        "anomalous signals detected during automated analysis. "
        "Please review the risk breakdown panel for specific indicators and take appropriate action."
    ),
}


class MockProvider:
    def complete(self, prompt: str) -> str:
        # Extract reason codes from prompt if present
        for key, explanation in _MOCK_EXPLANATIONS.items():
            codes = set(key.split(","))
            if all(code.lower() in prompt.lower() for code in codes):
                return explanation
        return _MOCK_EXPLANATIONS["DEFAULT"]


# ---------------------------------------------------------------------------
# Gemini Provider (stub — activate with valid API key)
# ---------------------------------------------------------------------------

class GeminiProvider:
    def __init__(self, api_key: str):
        self._key = api_key

    def complete(self, prompt: str) -> str:
        try:
            import google.generativeai as genai  # type: ignore
            genai.configure(api_key=self._key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"[LLM unavailable: {e}] " + _MOCK_EXPLANATIONS["DEFAULT"]


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_llm_provider() -> LLMProvider:
    if settings.LLM_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        return GeminiProvider(settings.GEMINI_API_KEY)
    return MockProvider()


_llm = get_llm_provider()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_case_explanation(reason_codes: list[str], project_id: str, risk_score: int) -> str:
    """Generate a human-readable explanation for a case."""
    codes_str = ", ".join(sorted(reason_codes))
    prompt = (
        f"You are an AI assistant for the MPLADS Monitoring Platform. "
        f"Project {project_id} has been flagged with risk score {risk_score}/100. "
        f"Reason codes: {codes_str}. "
        f"Write a concise 3-4 sentence explanation for the District Authority "
        f"explaining why this project is high risk and what action is recommended. "
        f"Do not use technical jargon."
    )
    return _llm.complete(prompt)


def generate_notification_body(
    case_id: str,
    project_id: str,
    risk_score: int,
    reason_codes: list[str],
    recipient_role: str,
) -> str:
    """Generate notification message for authority."""
    codes_str = ", ".join(reason_codes)
    return (
        f"[MPLADS AI MONITORING — DEMO PLATFORM]\n\n"
        f"Action Required — {recipient_role}\n\n"
        f"Case: {case_id}\n"
        f"Project: {project_id}\n"
        f"Risk Score: {risk_score}/100 (HIGH RISK)\n"
        f"Flags: {codes_str}\n\n"
        f"Please log in to the MPLADS Monitoring Platform to review this case "
        f"and take appropriate action within the response window.\n\n"
        f"— MPLADS AI Monitoring System\n\n"
        f"NOTE: This is a demonstration platform. No real government system "
        f"connections have been made. All payment holds are simulated UI state changes."
    )
