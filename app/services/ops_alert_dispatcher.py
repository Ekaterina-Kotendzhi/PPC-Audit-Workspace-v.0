"""Dispatch operational alerts to external channels with cooldown."""
from __future__ import annotations

import time
from threading import Lock
from typing import Any

import requests

from app.config import settings

SEVERITY_ORDER = {"warning": 1, "critical": 2}


class OpsAlertDispatcher:
    def __init__(self) -> None:
        self._lock = Lock()
        self._last_sent: dict[str, float] = {}

    def _should_send(self, code: str) -> bool:
        cooldown = max(1, int(settings.OPS_ALERT_COOLDOWN_SECONDS))
        now = time.time()
        with self._lock:
            last = self._last_sent.get(code, 0.0)
            if now - last < cooldown:
                return False
            self._last_sent[code] = now
            return True

    def _passes_severity(self, severity: str) -> bool:
        minimum = (settings.OPS_ALERT_MIN_SEVERITY or "warning").strip().lower()
        return SEVERITY_ORDER.get(severity, 0) >= SEVERITY_ORDER.get(minimum, 1)

    def dispatch(self, alerts: list[dict[str, Any]]) -> dict[str, int]:
        if not settings.OPS_ALERTS_ENABLED:
            return {"sent": 0, "skipped": len(alerts)}
        sent = 0
        skipped = 0
        for alert in alerts:
            severity = str(alert.get("severity") or "warning").lower()
            code = str(alert.get("code") or "OPS_ALERT")
            message = str(alert.get("message") or "Операционное предупреждение")
            if not self._passes_severity(severity) or not self._should_send(code):
                skipped += 1
                continue
            text = f"[PPC Audit][{severity.upper()}] {message}"
            sent_to_any = self._send_webhook(text) or self._send_telegram(text)
            if sent_to_any:
                sent += 1
            else:
                skipped += 1
        return {"sent": sent, "skipped": skipped}

    @staticmethod
    def _send_webhook(text: str) -> bool:
        url = (settings.OPS_ALERT_WEBHOOK_URL or "").strip()
        if not url:
            return False
        try:
            response = requests.post(url, json={"text": text}, timeout=5)
            return response.status_code < 300
        except requests.RequestException:
            return False

    @staticmethod
    def _send_telegram(text: str) -> bool:
        token = (settings.OPS_TELEGRAM_BOT_TOKEN or "").strip()
        chat_id = (settings.OPS_TELEGRAM_CHAT_ID or "").strip()
        if not token or not chat_id:
            return False
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            response = requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=5)
            return response.status_code < 300
        except requests.RequestException:
            return False


ops_alert_dispatcher = OpsAlertDispatcher()
