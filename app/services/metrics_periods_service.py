"""Multi-period KPI: several manual_metrics per audit, one active for report/AI."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditMaterial, AuditProject
from app.services.metrics_service import calculate_derived_metrics
from app.services.period_service import is_valid_period, period_sort_key


def _parse_material_metrics(material: AuditMaterial) -> dict[str, Any]:
    if not material.raw_content:
        return {}
    try:
        data = json.loads(material.raw_content)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _manual_metrics_materials(project: AuditProject) -> list[AuditMaterial]:
    return [
        m
        for m in (project.materials or [])
        if m.type == "manual_metrics" and not bool(getattr(m, "excluded_from_analysis", False))
    ]


def _period_row_from_material(mat: AuditMaterial) -> dict[str, Any]:
    raw = _parse_material_metrics(mat)
    calc = calculate_derived_metrics(raw)
    period = calc.get("period") or raw.get("period")
    return {
        "material_id": mat.id,
        "period": period,
        "period_valid": is_valid_period(period),
        "budget": calc.get("budget"),
        "clicks": calc.get("clicks"),
        "leads": calc.get("leads"),
        "leads_forms": calc.get("leads_forms"),
        "leads_messenger": calc.get("leads_messenger"),
        "sales": calc.get("sales"),
        "revenue": calc.get("revenue"),
        "gross_profit": calc.get("gross_profit"),
        "margin_percent": calc.get("margin_percent"),
        "drr": calc.get("drr"),
        "cpl": calc.get("cpl"),
        "cpa": calc.get("cpa"),
        "romi": calc.get("romi"),
        "needs_review": bool(calc.get("needs_review")),
        "updated_at": (
            mat.updated_at.isoformat() if getattr(mat, "updated_at", None) else None
        ),
    }


def _dedupe_metrics_period_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """One row per period label — keep newest material (J-UX duplicate KPI months)."""
    by_key: dict[str, dict[str, Any]] = {}
    for row in rows:
        period = (row.get("period") or "").strip()
        key = period.lower() if period else f"__mat_{row.get('material_id')}"
        prev = by_key.get(key)
        if prev is None:
            by_key[key] = row
            continue
        prev_ts = prev.get("updated_at") or ""
        cur_ts = row.get("updated_at") or ""
        if cur_ts > prev_ts:
            by_key[key] = row
        elif cur_ts == prev_ts and (row.get("material_id") or 0) > (prev.get("material_id") or 0):
            by_key[key] = row
    deduped = list(by_key.values())
    deduped.sort(key=lambda r: period_sort_key(r.get("period") or ""))
    return deduped


def list_metrics_period_rows(project: AuditProject) -> list[dict[str, Any]]:
    """All KPI periods, deduped by month label, sorted chronologically."""
    rows = [_period_row_from_material(mat) for mat in _manual_metrics_materials(project)]
    rows.sort(key=lambda r: period_sort_key(r.get("period") or ""))
    return _dedupe_metrics_period_rows(rows)


def resolve_latest_period_metrics_material(project: AuditProject) -> AuditMaterial | None:
    """Material for the chronologically latest valid KPI period."""
    rows = list_metrics_period_rows(project)
    if not rows:
        return None
    latest_id = rows[-1]["material_id"]
    return next((m for m in _manual_metrics_materials(project) if m.id == latest_id), None)


def resolve_active_metrics_material(project: AuditProject) -> AuditMaterial | None:
    """Report/AI: always the latest KPI month by date (not a stale manual pin)."""
    return resolve_latest_period_metrics_material(project)


def ensure_active_metrics_material_id(project: AuditProject, db: Session | None = None) -> int | None:
    """Sync active_metrics_material_id to the latest KPI period by date."""
    mat = resolve_latest_period_metrics_material(project)
    if not mat:
        if getattr(project, "active_metrics_material_id", None) is not None:
            project.active_metrics_material_id = None
            if db is not None:
                db.flush()
        return None
    if getattr(project, "active_metrics_material_id", None) != mat.id:
        project.active_metrics_material_id = mat.id
        if db is not None:
            db.flush()
    return mat.id


def load_active_manual_metrics_dict(project: AuditProject) -> dict[str, Any]:
    """KPI dict for report/AI — latest period by date."""
    empty: dict[str, Any] = {
        "period": None,
        "budget": None,
        "clicks": None,
        "leads": None,
        "sales": None,
        "revenue": None,
        "gross_profit": None,
        "margin_percent": None,
    }
    mat = resolve_active_metrics_material(project)
    if not mat:
        return empty
    raw = _parse_material_metrics(mat)
    for key in empty:
        if raw.get(key) not in (None, ""):
            empty[key] = raw.get(key)
    return empty


def list_metrics_periods(project: AuditProject) -> list[dict[str, Any]]:
    """Periods for UI; is_active marks the latest month used in report/AI."""
    rows = list_metrics_period_rows(project)
    latest_id = rows[-1]["material_id"] if rows else None
    for row in rows:
        row["is_active"] = row["material_id"] == latest_id
    return rows


def set_active_metrics_period(project: AuditProject, material_id: int, db: Session) -> dict[str, Any]:
    """Legacy API: re-sync to latest period by date (manual pin removed in J-UX)."""
    ensure_active_metrics_material_id(project, db)
    return {
        "active_material_id": getattr(project, "active_metrics_material_id", None),
        "periods": list_metrics_periods(project),
    }


def set_active_after_material_created(project: AuditProject, material: AuditMaterial, db: Session) -> None:
    ensure_active_metrics_material_id(project, db)


def comparison_period_rows(project: AuditProject) -> list[dict[str, Any]]:
    """Before/after comparison — same deduped periods as list_metrics_periods."""
    rows = list_metrics_period_rows(project)
    return [
        {k: v for k, v in row.items() if k not in ("is_active", "period_valid", "updated_at")}
        for row in rows
    ]
