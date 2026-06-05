"""In-memory login attempt limiter for auth hardening."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from threading import Lock

from app.config import settings


class AuthSecurityLimiter:
    def __init__(self) -> None:
        self._lock = Lock()
        self._attempts: dict[str, int] = {}
        self._blocked_until: dict[str, datetime] = {}

    def _key(self, username: str, client_ip: str) -> str:
        return f"{username.strip().lower()}|{client_ip.strip() or 'unknown'}"

    def check_allowed(self, username: str, client_ip: str) -> tuple[bool, int]:
        key = self._key(username, client_ip)
        now = datetime.now(timezone.utc)
        with self._lock:
            blocked = self._blocked_until.get(key)
            if blocked and blocked > now:
                left = int((blocked - now).total_seconds())
                return False, max(1, left)
            if blocked and blocked <= now:
                self._blocked_until.pop(key, None)
                self._attempts.pop(key, None)
        return True, 0

    def register_failure(self, username: str, client_ip: str) -> tuple[bool, int]:
        key = self._key(username, client_ip)
        limit = max(1, int(settings.AUTH_LOGIN_MAX_ATTEMPTS))
        lock_minutes = max(1, int(settings.AUTH_LOGIN_LOCK_MINUTES))
        now = datetime.now(timezone.utc)
        with self._lock:
            attempts = self._attempts.get(key, 0) + 1
            self._attempts[key] = attempts
            if attempts >= limit:
                blocked_until = now + timedelta(minutes=lock_minutes)
                self._blocked_until[key] = blocked_until
                self._attempts[key] = 0
                return True, int((blocked_until - now).total_seconds())
        return False, 0

    def register_success(self, username: str, client_ip: str) -> None:
        key = self._key(username, client_ip)
        with self._lock:
            self._attempts.pop(key, None)
            self._blocked_until.pop(key, None)


auth_security_limiter = AuthSecurityLimiter()
