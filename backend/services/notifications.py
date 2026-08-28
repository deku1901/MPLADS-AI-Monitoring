"""
Notification Service — in-platform + email + simulated WhatsApp.

For MVP:
    - INAPP: stored in notification table (polled by frontend)
    - EMAIL: sent via Resend if API key is set; otherwise logged only
    - WHATSAPP_SIM: stored in notification table with channel=WHATSAPP_SIM
      and a clear demo disclaimer

All notifications carry the demo disclaimer string.
"""
from __future__ import annotations
import logging

from sqlalchemy.orm import Session

from models import Notification, Authority
from services.audit import write_event
from config import settings

logger = logging.getLogger("notifications")

DEMO_DISCLAIMER = (
    "\n\n[DEMO DISCLAIMER: This is a demonstration platform. "
    "No real government system connections exist. "
    "All payment holds are simulated UI state changes.]"
)


def send_notification(
    db: Session,
    *,
    recipient_id: str,
    recipient_role: str,
    case_id: str | None,
    project_id: str | None,
    content: str,
    channels: list[str] | None = None,
) -> list[Notification]:
    """
    Create notification records and optionally send real email.

    channels defaults to ["INAPP", "EMAIL"].
    """
    if channels is None:
        channels = ["INAPP", "EMAIL"]

    created: list[Notification] = []
    full_content = content + DEMO_DISCLAIMER

    for channel in channels:
        notif = Notification(
            case_id=case_id,
            project_id=project_id,
            recipient_id=recipient_id,
            recipient_role=recipient_role,
            channel=channel,
            content=full_content,
        )
        db.add(notif)
        db.flush()
        created.append(notif)

        if channel == "EMAIL":
            _send_email(recipient_id, full_content, db)
        elif channel == "WHATSAPP_SIM":
            logger.info(f"[WHATSAPP_SIM] To {recipient_id}: {content[:80]}...")

    # Audit
    write_event(
        db,
        event_type="NOTIFICATION_SENT",
        project_id=project_id,
        case_id=case_id,
        description=f"Notification sent to {recipient_role} ({recipient_id}) via {channels}",
    )

    return created


def _send_email(recipient_id: str, content: str, db: Session) -> None:
    """
    Send email via Resend if API key is configured.
    Falls back to log-only if key is absent.
    """
    authority = db.query(Authority).filter_by(authority_id=recipient_id).first()
    email = authority.email if authority else None

    if not settings.RESEND_API_KEY or not email:
        logger.info(f"[EMAIL_MOCK] Would send to {email or recipient_id}: {content[:60]}...")
        return

    try:
        import resend  # type: ignore
        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send({
            "from": settings.RESEND_FROM_EMAIL,
            "to": [email],
            "subject": "[MPLADS DEMO] Action Required — High Risk Project",
            "text": content,
        })
        logger.info(f"[EMAIL_SENT] {email}")
    except Exception as e:
        logger.warning(f"[EMAIL_FAILED] {e}")
