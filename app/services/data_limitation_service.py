"""Accepted report data limitations (optional checklist items)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditProject

MINIMUM_FOR_AUDIT = ("monthly_dynamics",)
BLOCKED_LIMITATION_IDS = frozenset(MINIMUM_FOR_AUDIT)

_CHECKLIST_LABELS = {
    "monthly_dynamics": "Динамика по месяцам (Директ)",
    "period": "Период",
    "budget": "Бюджет",
    "clicks": "Клики",
    "leads": "Заявки",
    "sales": "Продажи",
    "revenue": "Выручка",
    "search_queries": "Поисковые запросы",
    "metrika": "Цели Метрики",
    "crm": "CRM-статусы",
    "campaign_screenshots": "Скриншоты кампаний",
    "landing": "Посадочные страницы",
    "lead_quality": "Комментарии по качеству лидов",
}


def get_accepted_limitations(project: AuditProject) -> list[dict[str, Any]]:
    raw = getattr(project, "accepted_data_limitations_json", None)
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [row for row in data if isinstance(row, dict) and row.get("id")]


def accepted_limitation_ids(project: AuditProject) -> set[str]:
    return {str(row["id"]) for row in get_accepted_limitations(project)}


def can_accept_limitation(item_id: str) -> bool:
    return item_id not in BLOCKED_LIMITATION_IDS


def _checklist_label(item_id: str) -> str:
    return _CHECKLIST_LABELS.get(item_id, item_id)


def accept_data_limitation(
    project: AuditProject,
    item_id: str,
    *,
    note: str | None = None,
    db: Session,
) -> dict[str, Any]:
    """Record that a non-critical data item is intentionally missing."""
    item_id = (item_id or "").strip()
    if not item_id:
        raise ValueError("Укажите элемент чеклиста")
    if not can_accept_limitation(item_id):
        raise ValueError(
            "Период, бюджет, клики и заявки нельзя оставить как ограничение — добавьте метрики"
        )

    existing = get_accepted_limitations(project)
    if any(row.get("id") == item_id for row in existing):
        return {"id": item_id, "label": _checklist_label(item_id), "already_accepted": True}

    entry = {
        "id": item_id,
        "label": _checklist_label(item_id),
        "note": (note or "").strip() or None,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
    }
    existing.append(entry)
    project.accepted_data_limitations_json = json.dumps(existing, ensure_ascii=False)
    project.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(project)
    return entry


def apply_accepted_limitations_to_coverage(
    coverage: dict[str, Any],
    accepted_ids: set[str],
) -> dict[str, Any]:
    """Mark accepted missing checklist rows as report limitations, not open gaps."""
    if not accepted_ids:
        coverage["accepted_limitations"] = []
        return coverage

    checklist = []
    for item in coverage.get("checklist") or []:
        row = dict(item)
        if row.get("status") == "missing" and row.get("id") in accepted_ids:
            row["status"] = "limitation"
            row["status_label"] = "Ограничение отчёта"
            row["reason"] = row.get("reason") or f"Данные не предоставлены: {row.get('label', row['id']).lower()}"
        checklist.append(row)

    missing_items = [c for c in checklist if c.get("status") == "missing"]
    accepted_limitations = [
        {
            "id": c["id"],
            "label": c["label"],
            "reason": c.get("reason"),
        }
        for c in checklist
        if c.get("status") == "limitation"
    ]

    coverage = dict(coverage)
    coverage["checklist"] = checklist
    coverage["missing_items"] = missing_items
    coverage["accepted_limitations"] = accepted_limitations
    return coverage
