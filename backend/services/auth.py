"""
Authentication & RBAC Service for MPLADS Demo Prototype.

Provides JWT token generation, role verification, and deterministic
persona profiles mapped directly to the active database entities:
- MP (Member of Parliament)
- DA (District Authority / Collector)
- SNA (State Nodal Authority / State Planning Secretary)
- MINISTRY (MoSPI Central Executive)
- CITIZEN (Public Verifier)
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Any

from jose import jwt, JWTError
from sqlalchemy.orm import Session

from config import settings
from models import Authority, MP

logger = logging.getLogger("auth")

SECRET_KEY = getattr(settings, "JWT_SECRET_KEY", "mplads-ai-demo-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours for demo

PERSONA_CATALOG = [
    {
        "user_id": "AUTH-MOSPI-01",
        "name": "Shri Anil Gupta",
        "role": "MINISTRY",
        "designation": "Joint Secretary & Central Nodal Officer",
        "jurisdiction": "MoSPI Headquarters, New Delhi",
        "email": "monitoring.mplads@mospi.gov.in",
        "avatar_emoji": "🏛️",
        "default_route": "/national-dashboard",
    },
    {
        "user_id": "AUTH-SNA-01",
        "name": "Smt. Sunita Verma, IAS",
        "role": "SNA",
        "designation": "Special Secretary (Planning) & State Nodal Officer",
        "jurisdiction": "Uttar Pradesh State, Lucknow",
        "email": "sna.up@mplads.gov.in",
        "avatar_emoji": "🏢",
        "default_route": "/sna-dashboard",
    },
    {
        "user_id": "AUTH-DA-01",
        "name": "Shri Rajesh Sharma, IAS",
        "role": "DA",
        "designation": "District Magistrate & District Authority",
        "jurisdiction": "Varanasi District, Uttar Pradesh",
        "email": "collector.varanasi@mplads.gov.in",
        "avatar_emoji": "⚖️",
        "default_route": "/da-dashboard",
    },
    {
        "user_id": "MP-UP-042",
        "name": "Shri R. K. Singh",
        "role": "MP",
        "designation": "Member of Parliament (Lok Sabha)",
        "jurisdiction": "Varanasi Parliamentary Constituency",
        "email": "mp.varanasi@sansad.nic.in",
        "avatar_emoji": "🇮🇳",
        "default_route": "/mp-dashboard",
    },
    {
        "user_id": "CITIZEN-USER",
        "name": "Citizen Verifier (Public)",
        "role": "CITIZEN",
        "designation": "Public Transparency Participant",
        "jurisdiction": "All-India Open Portal",
        "email": "citizen@mplads-public.gov.in",
        "avatar_emoji": "👥",
        "default_route": "/citizen",
    },
]


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_personas(db: Session | None = None) -> list[dict[str, Any]]:
    """Return list of standard personas for the quick-switcher."""
    return PERSONA_CATALOG


def authenticate_user(db: Session, username: str, password: str = "demo123") -> dict[str, Any]:
    """
    Authenticate user by username / ID.
    Supports Authority IDs (AUTH-DA-01..), MP IDs (MP-UP-042..), or 'citizen'.
    """
    u_lower = username.strip().lower()

    # 1. Match against known persona catalog
    matched_persona = None
    for p in PERSONA_CATALOG:
        if p["user_id"].lower() == u_lower or p["role"].lower() == u_lower:
            matched_persona = p
            break

    # 2. Match against Authority DB
    if not matched_persona:
        auth_rec = db.query(Authority).filter(Authority.authority_id.ilike(username.strip())).first()
        if auth_rec:
            matched_persona = {
                "user_id": auth_rec.authority_id,
                "name": auth_rec.name,
                "role": auth_rec.role,
                "designation": f"{auth_rec.role} Official",
                "jurisdiction": f"{auth_rec.jurisdiction_district or ''}, {auth_rec.jurisdiction_state or ''}".strip(", "),
                "email": auth_rec.email,
                "avatar_emoji": "⚖️" if auth_rec.role == "DA" else ("🏢" if auth_rec.role == "SNA" else "🏛️"),
                "default_route": f"/{auth_rec.role.lower()}-dashboard" if auth_rec.role != "MINISTRY" else "/national-dashboard",
            }

    # 3. Match against MP DB
    if not matched_persona:
        mp_rec = db.query(MP).filter(MP.mp_id.ilike(username.strip())).first()
        if mp_rec:
            matched_persona = {
                "user_id": mp_rec.mp_id,
                "name": mp_rec.name,
                "role": "MP",
                "designation": f"Member of Parliament ({mp_rec.mp_type})",
                "jurisdiction": f"{mp_rec.constituency}, {mp_rec.state}",
                "email": f"{mp_rec.mp_id.lower()}@sansad.nic.in",
                "avatar_emoji": "🇮🇳",
                "default_route": "/mp-dashboard",
            }

    # Fallback to Citizen if unmatched
    if not matched_persona:
        matched_persona = PERSONA_CATALOG[-1]

    # Generate JWT
    token_payload = {
        "sub": matched_persona["user_id"],
        "name": matched_persona["name"],
        "role": matched_persona["role"],
        "jurisdiction": matched_persona["jurisdiction"],
    }
    access_token = create_access_token(token_payload)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": matched_persona,
    }
