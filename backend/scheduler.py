"""
Automated Response Timer & Escalation Worker.

Monitors active intervention cases and automatically enforces SLAs:
1. Approaching/Expired Response Deadlines (T1) -> Sends reminder (REMINDER_SENT).
2. Expired Reminder Deadlines (T2) -> Escalates to State Nodal Authority (SNA) (ESCALATED_L2).
3. Expired SNA Deadlines (T3) -> Escalates to Ministry / MoSPI (ESCALATED_L3).
4. Expired Ministry Deadlines (T4) -> Flags INSPECTION_REQUIRED.

Uses existing services (cases.py, notifications.py, audit.py) and
respects DEMO_ACCELERATION_FACTOR from config.py.
"""

from __future__ import annotations
import logging
from datetime import datetime
from typing import Any

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal
from models import Case
from services.cases import send_reminder, escalate_case
from services.audit import write_event

logger = logging.getLogger("scheduler")

_scheduler: BackgroundScheduler | None = None


def check_and_process_deadlines(db: Session | None = None) -> dict[str, list[str]]:
    """
    Scans all active cases with expired response deadlines and applies the
    appropriate SLA action (Reminder -> Escalation L2 -> Escalation L3 -> Inspection).

    Returns a summary dict of actions taken:
    {"reminders": [...], "escalations_l2": [...], "escalations_l3": [...], "inspections": [...]}
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    summary: dict[str, list[str]] = {
        "reminders": [],
        "escalations_l2": [],
        "escalations_l3": [],
        "inspections": [],
    }

    try:
        now = datetime.utcnow()

        # Query all active/unresolved cases with an assigned deadline
        active_statuses = [
            "OPEN",
            "ASSIGNED",
            "NOTIFIED",
            "AWAITING_RESPONSE",
            "REMINDER_SENT",
            "ESCALATED_L2",
            "ESCALATED_L3",
        ]

        overdue_cases = (
            db.query(Case)
            .filter(
                Case.status.in_(active_statuses),
                Case.response_deadline.isnot(None),
                Case.response_deadline <= now,
            )
            .all()
        )

        for case in overdue_cases:
            case_id = case.case_id
            current_status = case.status

            if current_status in ("OPEN", "ASSIGNED", "NOTIFIED", "AWAITING_RESPONSE"):
                # Initial response window (T1) expired -> send reminder
                logger.info(f"[SLA WORKER] Deadline T1 expired for {case_id}. Sending reminder.")
                updated = send_reminder(db, case_id)
                if updated:
                    summary["reminders"].append(case_id)

            elif current_status == "REMINDER_SENT":
                # Reminder window (T2) expired -> escalate from DA to SNA
                logger.info(f"[SLA WORKER] Deadline T2 expired for {case_id}. Escalating to SNA.")
                updated = escalate_case(db, case_id, reason="TIMER_EXPIRED")
                if updated:
                    summary["escalations_l2"].append(case_id)

            elif current_status == "ESCALATED_L2":
                # SNA window (T3) expired -> escalate from SNA to Ministry
                logger.info(f"[SLA WORKER] Deadline T3 expired for {case_id}. Escalating to Ministry.")
                updated = escalate_case(db, case_id, reason="TIMER_EXPIRED")
                if updated:
                    summary["escalations_l3"].append(case_id)

            elif current_status == "ESCALATED_L3":
                # Ministry window (T4) expired -> flag for physical inspection
                logger.warning(f"[SLA WORKER] Ministry deadline T4 expired for {case_id}. Flagging INSPECTION_REQUIRED.")
                case.status = "INSPECTION_REQUIRED"
                write_event(
                    db,
                    event_type="STATUS_CHANGE",
                    project_id=case.project_id,
                    case_id=case_id,
                    actor_id="SYSTEM",
                    actor_role="SYSTEM",
                    description="All escalation SLAs expired without response. Flagged for mandatory field inspection.",
                    old_value="ESCALATED_L3",
                    new_value="INSPECTION_REQUIRED",
                )
                summary["inspections"].append(case_id)

        db.commit()
        return summary

    except Exception as e:
        db.rollback()
        logger.error(f"[SLA WORKER ERROR] Error processing case deadlines: {e}")
        return summary
    finally:
        if should_close:
            db.close()


def _scheduled_tick():
    """Worker tick executed periodically by APScheduler."""
    try:
        check_and_process_deadlines()
    except Exception as e:
        logger.error(f"[SLA WORKER ERROR] Unhandled exception in tick: {e}")


def start_scheduler(poll_interval_seconds: int | None = None) -> BackgroundScheduler:
    """
    Starts the background scheduler job.
    In DEMO_MODE, polls every 1 second by default.
    In production, polls every 30 seconds by default.
    """
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        logger.info("Scheduler already running.")
        return _scheduler

    if poll_interval_seconds is None:
        poll_interval_seconds = 1 if settings.DEMO_MODE else 30

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _scheduled_tick,
        "interval",
        seconds=poll_interval_seconds,
        id="case_deadline_checker",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"SLA Background Worker started (polling every {poll_interval_seconds}s).")
    return _scheduler


def stop_scheduler():
    """Stops the background scheduler cleanly."""
    global _scheduler
    if _scheduler is not None and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("SLA Background Worker stopped.")
        _scheduler = None
