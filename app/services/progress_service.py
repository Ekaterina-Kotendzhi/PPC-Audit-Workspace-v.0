from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
from typing import Any, Dict

_PROGRESS: Dict[int, Dict[str, Any]] = {}
_LOCK = Lock()


def set_progress(audit_id: int, step: str, percent: int, message: str, status: str = "in_progress", **extra: Any) -> None:
    """Сохраняет текущий статус длительной операции в памяти процесса.

    Для MVP этого достаточно: WebSocket читает состояние и отправляет его клиенту.
    В продакшене можно заменить на Redis/PubSub.
    """
    payload: Dict[str, Any] = {
        "audit_id": audit_id,
        "step": step,
        "percent": max(0, min(100, int(percent))),
        "message": message,
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    payload.update(extra)
    with _LOCK:
        _PROGRESS[audit_id] = payload


def get_progress(audit_id: int) -> Dict[str, Any]:
    with _LOCK:
        return dict(_PROGRESS.get(audit_id) or {
            "audit_id": audit_id,
            "step": "idle",
            "percent": 0,
            "message": "Ожидание запуска анализа",
            "status": "idle",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })


def clear_progress(audit_id: int) -> None:
    with _LOCK:
        _PROGRESS.pop(audit_id, None)
