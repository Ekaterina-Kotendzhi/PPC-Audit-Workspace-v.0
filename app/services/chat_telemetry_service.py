"""In-memory telemetry for audit chat quality and reliability."""
from __future__ import annotations

from threading import Lock
from typing import Any
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import AuditChatTelemetryEvent


class _ChatTelemetry:
    def __init__(self) -> None:
        self._lock = Lock()
        self._data: dict[str, Any] = {
            "total_requests": 0,
            "fallback_used_count": 0,
            "errors_count": 0,
            "errors_by_type": {},
            "confidence": {"high": 0, "medium": 0, "low": 0},
            "include_unverified_true": 0,
            "latencies_ms": [],
        }

    def record(
        self,
        *,
        duration_ms: int | None,
        fallback_used: bool,
        confidence_level: str,
        include_unverified: bool,
        errored: bool = False,
        error_type: str | None = None,
    ) -> None:
        with self._lock:
            self._data["total_requests"] += 1
            if fallback_used:
                self._data["fallback_used_count"] += 1
            if errored:
                self._data["errors_count"] += 1
                et = (error_type or "unknown").lower()
                errors_by_type = self._data["errors_by_type"]
                errors_by_type[et] = errors_by_type.get(et, 0) + 1
            if include_unverified:
                self._data["include_unverified_true"] += 1
            if confidence_level in self._data["confidence"]:
                self._data["confidence"][confidence_level] += 1
            if duration_ms is not None and duration_ms >= 0:
                latencies = self._data["latencies_ms"]
                latencies.append(int(duration_ms))
                if len(latencies) > 1000:
                    del latencies[:-1000]

    @staticmethod
    def _percentile(values: list[int], p: float) -> int | None:
        if not values:
            return None
        sorted_vals = sorted(values)
        idx = int(round((len(sorted_vals) - 1) * p))
        return sorted_vals[max(0, min(idx, len(sorted_vals) - 1))]

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            total = int(self._data["total_requests"])
            fallback = int(self._data["fallback_used_count"])
            errors = int(self._data["errors_count"])
            include_unverified_true = int(self._data["include_unverified_true"])
            confidence = dict(self._data["confidence"])
            errors_by_type = dict(self._data["errors_by_type"])
            latencies = list(self._data["latencies_ms"])

        return {
            "total_requests": total,
            "fallback_used_count": fallback,
            "fallback_rate": round((fallback / total), 4) if total else 0.0,
            "errors_count": errors,
            "error_rate": round((errors / total), 4) if total else 0.0,
            "include_unverified_true_count": include_unverified_true,
            "confidence": confidence,
            "errors_by_type": errors_by_type,
            "latency_ms": {
                "count": len(latencies),
                "p50": self._percentile(latencies, 0.50),
                "p95": self._percentile(latencies, 0.95),
                "max": max(latencies) if latencies else None,
            },
        }


chat_telemetry = _ChatTelemetry()


def save_chat_telemetry_event(
    db: Session,
    *,
    audit_project_id: int | None,
    provider: str,
    model_name: str | None,
    duration_ms: int | None,
    fallback_used: bool,
    sources_count: int,
    include_unverified: bool,
    confidence_level: str,
    errored: bool,
    error_type: str | None = None,
) -> None:
    db.add(AuditChatTelemetryEvent(
        audit_project_id=audit_project_id,
        provider=provider,
        model_name=model_name,
        duration_ms=duration_ms,
        fallback_used=fallback_used,
        sources_count=sources_count,
        include_unverified=include_unverified,
        confidence_level=confidence_level,
        errored=errored,
        error_type=error_type,
    ))


def aggregate_chat_telemetry_db(db: Session, limit: int = 1000, hours: int | None = None) -> dict[str, Any]:
    query = db.query(AuditChatTelemetryEvent)
    if hours is not None and hours > 0:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        query = query.filter(AuditChatTelemetryEvent.created_at >= since)
    rows = query.order_by(AuditChatTelemetryEvent.created_at.desc()).limit(limit).all()
    total = len(rows)
    fallback = sum(1 for r in rows if r.fallback_used)
    errors = sum(1 for r in rows if r.errored)
    include_unverified_true = sum(1 for r in rows if r.include_unverified)
    confidence = {"high": 0, "medium": 0, "low": 0}
    latencies = []
    by_provider: dict[str, int] = {}
    by_model: dict[str, int] = {}
    errors_by_type: dict[str, int] = {}
    for r in rows:
        lvl = (r.confidence_level or "medium").lower()
        if lvl in confidence:
            confidence[lvl] += 1
        if r.duration_ms is not None and r.duration_ms >= 0:
            latencies.append(int(r.duration_ms))
        provider = (r.provider or "unknown").strip() or "unknown"
        model = (r.model_name or "unknown").strip() or "unknown"
        by_provider[provider] = by_provider.get(provider, 0) + 1
        by_model[model] = by_model.get(model, 0) + 1
        if r.errored:
            et = (r.error_type or "unknown").lower()
            errors_by_type[et] = errors_by_type.get(et, 0) + 1
    return {
        "total_requests": total,
        "fallback_used_count": fallback,
        "fallback_rate": round((fallback / total), 4) if total else 0.0,
        "errors_count": errors,
        "error_rate": round((errors / total), 4) if total else 0.0,
        "include_unverified_true_count": include_unverified_true,
        "confidence": confidence,
        "latency_ms": {
            "count": len(latencies),
            "p50": _ChatTelemetry._percentile(latencies, 0.50),
            "p95": _ChatTelemetry._percentile(latencies, 0.95),
            "max": max(latencies) if latencies else None,
        },
        "by_provider": by_provider,
        "by_model": by_model,
        "errors_by_type": errors_by_type,
        "hours_window": hours,
    }


def cleanup_chat_telemetry_db(db: Session, older_than_days: int = 90) -> int:
    threshold = datetime.now(timezone.utc) - timedelta(days=max(1, older_than_days))
    rows = (
        db.query(AuditChatTelemetryEvent)
        .filter(AuditChatTelemetryEvent.created_at < threshold)
        .all()
    )
    deleted = len(rows)
    for row in rows:
        db.delete(row)
    if deleted:
        db.commit()
    return deleted


def as_prometheus_text(in_memory: dict[str, Any], persisted: dict[str, Any]) -> str:
    def g(metric: str, value: Any, labels: str = "") -> str:
        suffix = f"{{{labels}}}" if labels else ""
        return f"{metric}{suffix} {0 if value is None else value}"

    lines = [
        "# HELP ppc_chat_requests_total Total chat ask requests.",
        "# TYPE ppc_chat_requests_total gauge",
        g("ppc_chat_requests_total", in_memory.get("total_requests")),
        g("ppc_chat_requests_total", persisted.get("total_requests"), 'source="db"'),
        "# HELP ppc_chat_error_rate Chat error rate.",
        "# TYPE ppc_chat_error_rate gauge",
        g("ppc_chat_error_rate", in_memory.get("error_rate")),
        g("ppc_chat_error_rate", persisted.get("error_rate"), 'source="db"'),
        "# HELP ppc_chat_fallback_rate Chat fallback usage rate.",
        "# TYPE ppc_chat_fallback_rate gauge",
        g("ppc_chat_fallback_rate", in_memory.get("fallback_rate")),
        g("ppc_chat_fallback_rate", persisted.get("fallback_rate"), 'source="db"'),
        "# HELP ppc_chat_latency_ms_p95 Chat latency p95 ms.",
        "# TYPE ppc_chat_latency_ms_p95 gauge",
        g("ppc_chat_latency_ms_p95", (in_memory.get("latency_ms") or {}).get("p95")),
        g("ppc_chat_latency_ms_p95", (persisted.get("latency_ms") or {}).get("p95"), 'source="db"'),
    ]
    for provider, count in (persisted.get("by_provider") or {}).items():
        safe_provider = str(provider).replace('"', '\\"')
        lines.append(g("ppc_chat_requests_by_provider_total", count, f'source="db",provider="{safe_provider}"'))
    for model, count in (persisted.get("by_model") or {}).items():
        safe_model = str(model).replace('"', '\\"')
        lines.append(g("ppc_chat_requests_by_model_total", count, f'source="db",model="{safe_model}"'))
    for level, count in (persisted.get("confidence") or {}).items():
        safe_level = str(level).replace('"', '\\"')
        lines.append(g("ppc_chat_confidence_total", count, f'source="db",level="{safe_level}"'))
    for et, count in (persisted.get("errors_by_type") or {}).items():
        safe_et = str(et).replace('"', '\\"')
        lines.append(g("ppc_chat_errors_total", count, f'source="db",type="{safe_et}"'))
    return "\n".join(lines) + "\n"
