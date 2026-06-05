"""Simple in-memory rate limiter for chat ask endpoint."""
from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
import time


class ChatRateLimiter:
    def __init__(self, *, limit_per_minute: int = 20) -> None:
        self.limit_per_minute = limit_per_minute
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        """Return allow flag and retry_after seconds when blocked."""
        now = time.time()
        window_start = now - 60.0
        with self._lock:
            q = self._events[key]
            while q and q[0] < window_start:
                q.popleft()
            if len(q) >= self.limit_per_minute:
                retry_after = int(max(1, 60 - (now - q[0])))
                return False, retry_after
            q.append(now)
            return True, 0


chat_rate_limiter = ChatRateLimiter(limit_per_minute=20)
