"""Operational telemetry endpoints."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditRun
from app.services.chat_telemetry_service import chat_telemetry
from app.services.chat_telemetry_service import aggregate_chat_telemetry_db, as_prometheus_text, cleanup_chat_telemetry_db
from app.services.ops_alert_dispatcher import ops_alert_dispatcher
from app.services.ops_telemetry_service import ops_telemetry

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


@router.get("/chat")
def get_chat_telemetry(
    db: Session = Depends(get_db),
    hours: int | None = Query(default=None, ge=1, le=24 * 30),
):
    """Return aggregated in-memory telemetry for audit chat."""
    return {
        "in_memory": chat_telemetry.snapshot(),
        "persisted": aggregate_chat_telemetry_db(db, hours=hours),
    }


@router.get("/chat/prometheus", response_class=PlainTextResponse)
def get_chat_telemetry_prometheus(
    db: Session = Depends(get_db),
    hours: int | None = Query(default=None, ge=1, le=24 * 30),
):
    in_memory = chat_telemetry.snapshot()
    persisted = aggregate_chat_telemetry_db(db, hours=hours)
    return as_prometheus_text(in_memory, persisted)


@router.post("/chat/cleanup")
def cleanup_chat_telemetry(days: int = Query(default=90, ge=1, le=3650), db: Session = Depends(get_db)):
    deleted = cleanup_chat_telemetry_db(db, older_than_days=days)
    return {"deleted": deleted, "older_than_days": days}


@router.get("/ops")
def get_ops_telemetry(
    db: Session = Depends(get_db),
    hours: int = Query(default=24, ge=1, le=24 * 30),
    notify: bool = Query(default=False),
):
    now = datetime.now(timezone.utc)
    since = now - timedelta(hours=hours)

    failed_by_action_rows = (
        db.query(AuditRun.action, func.count(AuditRun.id))
        .filter(AuditRun.status == "failed", AuditRun.created_at >= since)
        .group_by(AuditRun.action)
        .all()
    )
    failed_by_action = {action: int(count) for action, count in failed_by_action_rows}
    total_failed_runs = sum(failed_by_action.values())
    in_memory = ops_telemetry.snapshot()
    api_5xx_last_hour = int(in_memory.get("api_5xx_last_hour", 0))

    alerts: list[dict[str, str | int]] = []
    if api_5xx_last_hour > 0:
        alerts.append({
            "code": "API_5XX_SPIKE",
            "severity": "warning" if api_5xx_last_hour < 5 else "critical",
            "message": f"За последний час зафиксировано {api_5xx_last_hour} ответов API 5xx",
            "value": api_5xx_last_hour,
        })
    if total_failed_runs > 0:
        alerts.append({
            "code": "FAILED_RUNS",
            "severity": "warning" if total_failed_runs < 3 else "critical",
            "message": f"За последние {hours}ч есть {total_failed_runs} неуспешных запусков",
            "value": total_failed_runs,
        })

    dispatch_result = {"sent": 0, "skipped": 0}
    if notify:
        dispatch_result = ops_alert_dispatcher.dispatch(alerts)

    return {
        "window_hours": hours,
        "in_memory": in_memory,
        "failed_runs": {
            "total": total_failed_runs,
            "by_action": failed_by_action,
        },
        "alerts": alerts,
        "dispatch": dispatch_result,
    }
