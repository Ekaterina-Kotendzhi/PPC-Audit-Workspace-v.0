"""UTC datetime helpers for API serialization."""
from __future__ import annotations

from datetime import datetime, timezone


def ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def serialize_api_datetime(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return ensure_utc(dt).strftime("%Y-%m-%dT%H:%M:%SZ")
