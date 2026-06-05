from __future__ import annotations

from collections import deque
from datetime import datetime, timedelta, timezone
from threading import Lock


class OpsTelemetry:
    """In-memory operational telemetry (lightweight MVP)."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._api_5xx_events: deque[datetime] = deque()

    def _prune(self, *, now: datetime, window: timedelta) -> None:
        threshold = now - window
        while self._api_5xx_events and self._api_5xx_events[0] < threshold:
            self._api_5xx_events.popleft()

    def record_status(self, status_code: int) -> None:
        if status_code < 500:
            return
        now = datetime.now(timezone.utc)
        with self._lock:
            self._api_5xx_events.append(now)
            self._prune(now=now, window=timedelta(hours=1))

    def snapshot(self) -> dict[str, int]:
        now = datetime.now(timezone.utc)
        with self._lock:
            self._prune(now=now, window=timedelta(hours=1))
            return {
                "api_5xx_last_hour": len(self._api_5xx_events),
            }


ops_telemetry = OpsTelemetry()
