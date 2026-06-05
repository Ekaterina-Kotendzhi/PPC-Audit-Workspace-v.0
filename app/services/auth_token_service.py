from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config import settings


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(raw: str) -> bytes:
    padding = "=" * ((4 - len(raw) % 4) % 4)
    return base64.urlsafe_b64decode((raw + padding).encode("ascii"))


def _sign(message: bytes) -> str:
    secret = (settings.AUTH_JWT_SECRET or "").encode("utf-8")
    digest = hmac.new(secret, message, hashlib.sha256).digest()
    return _b64url_encode(digest)


def create_access_token(*, actor: str, role: str, user_name: str | None = None) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=max(1, int(settings.AUTH_ACCESS_TOKEN_MINUTES)))
    payload: dict[str, Any] = {
        "sub": actor,
        "role": role,
        "name": user_name or actor,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    payload_raw = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    encoded_payload = _b64url_encode(payload_raw)
    signature = _sign(encoded_payload.encode("utf-8"))
    return f"{encoded_payload}.{signature}"


def parse_access_token(token: str | None) -> dict[str, Any] | None:
    if not token or "." not in token:
        return None
    encoded_payload, encoded_sig = token.split(".", 1)
    expected = _sign(encoded_payload.encode("utf-8"))
    if not hmac.compare_digest(encoded_sig, expected):
        return None
    try:
        payload = json.loads(_b64url_decode(encoded_payload).decode("utf-8"))
    except Exception:  # noqa: BLE001
        return None
    exp = int(payload.get("exp") or 0)
    now = int(datetime.now(timezone.utc).timestamp())
    if exp <= now:
        return None
    return payload
