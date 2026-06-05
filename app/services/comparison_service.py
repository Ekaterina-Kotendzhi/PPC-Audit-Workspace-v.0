"""Before/after comparison across multiple KPI periods (J13)."""
from __future__ import annotations

from typing import Any, Dict, List

from app.models import AuditProject
from app.services.metrics_periods_service import comparison_period_rows


def _delta(after: Any, before: Any) -> Dict[str, Any]:
    def _num(value: Any) -> float | None:
        if value is None or value == "":
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    a = _num(after)
    b = _num(before)
    if a is None or b is None:
        return {"absolute": None, "percent": None}
    absolute = round(a - b, 2)
    percent = round((absolute / b) * 100, 1) if b != 0 else None
    return {"absolute": absolute, "percent": percent}


def build_before_after_comparison(project: AuditProject) -> Dict[str, Any]:
    valid_periods = comparison_period_rows(project)
    if len(valid_periods) < 2:
        message = "Сравнение появится после добавления минимум двух периодов с корректными датами."
        return {
            "available": False,
            "periods": valid_periods,
            "message": message,
            "missing_periods": max(0, 2 - len(valid_periods)),
            "deltas": {},
            "charts": [],
            "active_material_id": getattr(project, "active_metrics_material_id", None),
        }

    before = valid_periods[0]
    after = valid_periods[-1]
    keys = ["budget", "clicks", "leads", "sales", "revenue", "gross_profit", "drr", "cpl", "cpa", "romi"]
    deltas = {key: _delta(after.get(key), before.get(key)) for key in keys}

    charts = [
        {
            "type": "bar",
            "title": "Сравнение бюджета, заявок и продаж",
            "data": {
                "labels": [before["period"], after["period"]],
                "datasets": [
                    {"label": "Бюджет", "data": [before.get("budget"), after.get("budget")]},
                    {"label": "Заявки", "data": [before.get("leads"), after.get("leads")]},
                    {"label": "Продажи", "data": [before.get("sales"), after.get("sales")]},
                ],
            },
        },
        {
            "type": "line",
            "title": "Динамика по периодам",
            "metric": "leads",
            "data": {
                "labels": [item["period"] for item in valid_periods],
                "datasets": [
                    {"label": "Заявки", "data": [item.get("leads") for item in valid_periods]},
                ],
            },
        },
    ]
    return {
        "available": True,
        "periods": valid_periods,
        "before": before,
        "after": after,
        "deltas": deltas,
        "charts": charts,
        "message": "Сравнение построено по первому и последнему периоду (по дате). Для отчёта и AI используется активный период.",
        "active_material_id": getattr(project, "active_metrics_material_id", None),
    }
