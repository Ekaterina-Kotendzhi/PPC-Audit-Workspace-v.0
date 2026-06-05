"""Detect materials changed after the last successful AI analysis run."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.models import AuditProject
from app.services.audit_run_helpers import latest_run
from app.services.material_helpers import material_for_ai, material_type_label


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _last_successful_analysis_run(project: AuditProject):
    return latest_run(project, action="ai_analysis", status="success")


def _metrics_from_run(run) -> dict[str, Any]:
    if not run or not run.output_json:
        return {}
    try:
        data = json.loads(run.output_json)
        return dict(data.get("metrics") or {})
    except (TypeError, json.JSONDecodeError):
        return {}


def _material_types_from_run(run) -> list[str]:
    if not run or not run.input_json:
        return []
    try:
        data = json.loads(run.input_json)
        materials = data.get("materials") or []
        types = sorted({str(m.get("type")) for m in materials if m.get("type")})
        return types
    except (TypeError, json.JSONDecodeError):
        return []


def _material_ids_from_run(run) -> list[int]:
    """Numeric material ids sent in materials[] of the last AI prompt."""
    if not run or not run.input_json:
        return []
    try:
        data = json.loads(run.input_json)
        materials = data.get("materials") or []
        ids: list[int] = []
        for item in materials:
            if not isinstance(item, dict):
                continue
            raw_id = item.get("id")
            if isinstance(raw_id, int):
                ids.append(raw_id)
                continue
            if isinstance(raw_id, str) and raw_id.startswith("mat_"):
                try:
                    ids.append(int(raw_id.replace("mat_", "", 1)))
                except ValueError:
                    continue
        return sorted(set(ids))
    except (TypeError, json.JSONDecodeError):
        return []


def build_analysis_freshness(project: AuditProject) -> dict[str, Any]:
    """Return stale flag and summary for audit detail API."""
    last_run = _last_successful_analysis_run(project)
    if not last_run or not last_run.created_at:
        return {
            "analysis_stale": False,
            "last_analysis_at": None,
            "stale_materials": [],
            "last_analysis_metrics": None,
            "last_analysis_material_types": [],
            "material_ids_in_last_analysis": [],
        }

    last_at = _as_utc(last_run.created_at)
    stale_materials: list[dict[str, Any]] = []
    for material in project.materials or []:
        # Only AI-relevant, non-excluded materials should trigger stale banner.
        if not material_for_ai(material):
            continue
        touched = _as_utc(material.updated_at) or _as_utc(material.created_at)
        if touched and touched > last_at:
            stale_materials.append({
                "id": material.id,
                "type": material.type,
                "title": material.title or material_type_label(material.type),
            })

    return {
        "analysis_stale": bool(stale_materials),
        "last_analysis_at": last_run.created_at,
        "stale_materials": stale_materials,
        "last_analysis_metrics": _metrics_from_run(last_run) or None,
        "last_analysis_material_types": _material_types_from_run(last_run),
        "material_ids_in_last_analysis": _material_ids_from_run(last_run),
    }
