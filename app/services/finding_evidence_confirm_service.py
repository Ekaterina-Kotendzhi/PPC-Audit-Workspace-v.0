"""Evidence quality gate before G7 confirm (M2.4)."""
from __future__ import annotations

import json
from typing import Any

from app.models import AuditFinding
from app.services.direct_health_findings_service import DIRECT_HEALTH_SOURCE
from app.services.evidence_helpers import parse_material_ref

_SKIP_TYPES = {"quality_guard", "system", "system_note"}


def _load_evidence(finding: AuditFinding) -> list[dict[str, Any]]:
    raw = getattr(finding, "evidence_json", None)
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _material_evidence_rows(evidence: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in evidence:
        mtype = str(row.get("material_type") or "").strip().lower()
        if mtype in _SKIP_TYPES:
            continue
        if parse_material_ref(row.get("material_id")) is not None:
            rows.append(row)
        elif mtype and mtype not in _SKIP_TYPES:
            rows.append(row)
    return rows


def _is_direct_health_finding(finding: AuditFinding) -> bool:
    for row in _load_evidence(finding):
        if row.get("source") == DIRECT_HEALTH_SOURCE:
            return True
    orig = finding.original_ai_output
    return isinstance(orig, dict) and orig.get("source") == DIRECT_HEALTH_SOURCE


def assess_finding_evidence_for_confirm(finding: AuditFinding) -> dict[str, Any]:
    """Rule-based check before human_confirmed + KB sync."""
    if _is_direct_health_finding(finding):
        return {
            "ok": True,
            "level": (finding.evidence_level or "strong"),
            "warnings": [],
            "material_evidence_count": 0,
            "requires_acknowledgement": False,
            "source": DIRECT_HEALTH_SOURCE,
        }

    kind = (getattr(finding, "finding_kind", None) or "hypothesis").strip().lower()
    if kind in {"risk_pattern", "needs_data"}:
        return {
            "ok": True,
            "level": (finding.evidence_level or "none"),
            "warnings": [],
            "material_evidence_count": len(_material_evidence_rows(_load_evidence(finding))),
            "requires_acknowledgement": False,
        }

    level = (finding.evidence_level or "none").strip().lower()
    evidence = _load_evidence(finding)
    materials = _material_evidence_rows(evidence)
    warnings: list[str] = []

    if not evidence:
        warnings.append("У вывода нет блока evidence — добавьте источник из материалов аудита.")
    elif not materials:
        warnings.append("В evidence нет привязки к материалу (mat_N) — проверьте перед обучением базы знаний.")
    if level == "none":
        warnings.append("Уровень доказательств «none» — вывод не должен попадать в KB без ручной проверки.")
    elif level == "weak" and len(materials) < 1:
        warnings.append("Уровень «weak» без цитаты из материала — подтверждайте только если проверили вручную.")

    ok = len(warnings) == 0 or (level == "strong" and len(materials) > 0)
    if level == "medium" and len(materials) > 0:
        ok = True

    return {
        "ok": ok,
        "level": level,
        "warnings": warnings,
        "material_evidence_count": len(materials),
        "requires_acknowledgement": bool(warnings) and not ok,
    }
