"""
Audit Service — immutable append-only event log.

Every significant state change in the system calls write_event().
Events are NEVER updated or deleted.
"""
from __future__ import annotations
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from models import AuditEvent


def write_event(
    db: Session,
    event_type: str,
    *,
    project_id: str | None = None,
    case_id: str | None = None,
    actor_id: str = "SYSTEM",
    actor_role: str = "SYSTEM",
    description: str = "",
    old_value: str | None = None,
    new_value: str | None = None,
    metadata: dict | None = None,
) -> AuditEvent:
    """
    Write an immutable audit event.

    event_type examples:
        STATUS_CHANGE, RISK_SCORE_COMPUTED, CASE_CREATED, PAYMENT_HELD,
        PAYMENT_RELEASED, PAYMENT_REJECTED, CASE_ESCALATED, CASE_RESOLVED,
        EVIDENCE_SUBMITTED, NOTIFICATION_SENT, TIMER_EXPIRED, REMINDER_SENT
    """
    event = AuditEvent(
        project_id=project_id,
        case_id=case_id,
        event_type=event_type,
        actor_id=actor_id,
        actor_role=actor_role,
        description=description,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        event_metadata=metadata or {},
    )
    db.add(event)
    db.flush()   # get event_id without committing outer transaction
    return event
