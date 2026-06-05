"""Direct document slice: import KPI periods, analytics for UI, setup context for AI."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditMaterial, AuditProject
from app.services.material_helpers import document_slice_from_material
from app.services.metrics_service import validate_metrics_payload
from app.services.period_service import parse_direct_month_label, parse_period
from app.services.direct_health_service import build_direct_health_score
from app.services.direct_setup_helpers import (
    SETUP_KIND_LABELS,
    screenshot_setup_kind_for_project,
)
from app.services.yandex_direct_xlsx_service import (
    build_conditions_insights,
    build_slice_insights,
    slim_conditions_for_ai,
    slice_monthly_to_metrics_list,
)

SETUP_KIND_LABELS = {
    "structure": "Структура рекламных кампаний",
    "strategy": "Стратегия и цели Метрики",
    "adjustments": "Корректировки ставок",
    "creative": "Тексты и объявления",
    "other": "Настройки (прочее)",
}


def _direct_slice_rank(slice_data: dict[str, Any]) -> int:
    monthly = len(slice_data.get("monthly") or [])
    campaigns = len(slice_data.get("campaigns") or [])
    totals = slice_data.get("totals") or {}
    has_totals = 20 if (totals.get("cost") or 0) > 0 else 0
    return monthly * 10 + min(campaigns, 40) + has_totals


def find_primary_direct_slice(project: AuditProject) -> tuple[AuditMaterial | None, dict[str, Any] | None]:
    best: tuple[AuditMaterial | None, dict[str, Any] | None] = (None, None)
    best_rank = -1
    for mat in project.materials or []:
        if mat.type != "document":
            continue
        slice_data = document_slice_from_material(mat)
        if not slice_data or slice_data.get("format") != "yandex_direct_xlsx":
            continue
        rank = _direct_slice_rank(slice_data)
        if rank > best_rank:
            best_rank = rank
            best = (mat, slice_data)
    return best


def period_display_from_monthly(monthly: list[dict[str, Any]]) -> str | None:
    """Период для KPI-полоски: из meta файла или первый—последний месяц в срезе."""
    labels = [str(row.get("month") or "").strip() for row in monthly if row.get("month")]
    if not labels:
        return None
    if len(labels) == 1:
        return labels[0]
    return f"{labels[0]} — {labels[-1]}"


def build_direct_charts(document_slice: dict[str, Any]) -> list[dict[str, Any]]:
    monthly = document_slice.get("monthly") or []
    charts: list[dict[str, Any]] = []
    if len(monthly) >= 1:
        labels = [row.get("month") or "?" for row in monthly]
        leads_data = [row.get("leads") or 0 for row in monthly]
        cost_data = [round(float(row.get("cost") or 0), 0) for row in monthly]
        cpl_data = []
        for row in monthly:
            cpl = row.get("cpl")
            cpl_data.append(round(float(cpl), 0) if cpl is not None else 0)
        charts.extend([
            {
                "type": "bar",
                "title": "Расход по месяцам",
                "description": "Динамика расхода из Excel",
                "source": "direct_slice",
                "data": {"labels": labels, "datasets": [{"label": "Расход, ₽", "data": cost_data}]},
            },
            {
                "type": "bar",
                "title": "Заявки по месяцам",
                "description": "Конверсии из Excel (форма + мессенджер, если разделены)",
                "source": "direct_slice",
                "data": {"labels": labels, "datasets": [{"label": "Заявки", "data": leads_data}]},
            },
        ])
        if any(cpl_data):
            charts.append({
                "type": "bar",
                "title": "CPL по месяцам",
                "description": "Стоимость лида (расход / лиды)",
                "source": "direct_slice",
                "data": {"labels": labels, "datasets": [{"label": "CPL, ₽", "data": cpl_data}]},
            })

    campaigns = document_slice.get("campaigns") or []
    if len(campaigns) >= 2:
        top = sorted(campaigns, key=lambda c: -(c.get("leads") or 0))[:8]
        charts.append(
            {
                "type": "bar",
                "title": "Заявки по кампаниям",
                "description": "Агрегат за весь период отчёта (Excel Директа)",
                "source": "direct_slice",
                "data": {
                    "labels": [(c.get("campaign_name") or c.get("campaign_id") or "?")[:40] for c in top],
                    "datasets": [{"label": "Заявки", "data": [c.get("leads") or 0 for c in top]}],
                },
            }
        )
    return charts


def build_direct_conditions_block(slice_data: dict[str, Any]) -> dict[str, Any] | None:
    summary = slice_data.get("conditions_summary")
    if not summary:
        return None
    if not summary.get("insights"):
        summary = dict(summary)
        summary["insights"] = build_conditions_insights(summary)
    return summary


def build_direct_analytics(
    project: AuditProject,
    *,
    coverage: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    mat, slice_data = find_primary_direct_slice(project)
    if not slice_data:
        return None
    monthly = slice_data.get("monthly") or []
    campaigns = slice_data.get("campaigns") or []
    insights = list(slice_data.get("insights") or build_slice_insights(slice_data))
    conditions = build_direct_conditions_block(slice_data)
    if conditions:
        seen = {i.get("id") for i in insights}
        for item in conditions.get("insights") or []:
            if item.get("id") not in seen:
                insights.append(item)
    period = slice_data.get("period") or period_display_from_monthly(monthly)
    base = {
        "material_id": mat.id if mat else None,
        "report_type": slice_data.get("report_type"),
        "period": period,
        "goals": slice_data.get("goals"),
        "monthly": monthly,
        "campaigns": campaigns,
        "totals": slice_data.get("totals"),
        "conditions": conditions,
        "insights": insights,
        "charts": build_direct_charts(slice_data),
        "can_import_periods": len(monthly) >= 1,
        "months_count": len(monthly),
    }
    base["health"] = build_direct_health_score(project, base, coverage=coverage)
    return base


def build_direct_statistics_for_ai(
    direct_analytics: dict[str, Any],
    context_options: dict[str, bool] | None = None,
) -> dict[str, Any]:
    """Compact Direct payload for AI: health + KPI, without duplicating raw Excel text."""
    opts = context_options or {}
    health = direct_analytics.get("health") or {}
    payload: dict[str, Any] = {
        "period": direct_analytics.get("period"),
        "goals": direct_analytics.get("goals"),
        "totals": direct_analytics.get("totals"),
        "monthly": direct_analytics.get("monthly") or [],
        "insights": (direct_analytics.get("insights") or [])[:10],
        "health": {
            "score": health.get("score"),
            "grade": health.get("grade"),
            "summary_explain": health.get("summary_explain"),
            "score_breakdown": health.get("score_breakdown"),
            "template_findings": health.get("template_findings"),
            "performance_issues": health.get("performance_issues"),
            "action_plan": health.get("action_plan"),
            "data_quality": health.get("data_quality"),
            "zones": health.get("zones"),
        },
    }
    if opts.get("send_direct_campaign_detail"):
        payload["campaigns"] = direct_analytics.get("campaigns") or []
    return payload


def build_direct_conditions_for_ai(project: AuditProject) -> dict[str, Any]:
    _, slice_data = find_primary_direct_slice(project)
    if not slice_data:
        return {}
    conditions = build_direct_conditions_block(slice_data)
    return slim_conditions_for_ai(conditions)


def build_direct_setup_context(project: AuditProject) -> dict[str, Any]:
    blocks: list[dict[str, str]] = []
    ocr_by_title: dict[str, AuditMaterial] = {}
    for mat in project.materials or []:
        if mat.type == "screenshot_ocr":
            ocr_by_title[mat.title or ""] = mat

    for mat in project.materials or []:
        if mat.type != "screenshot":
            continue
        kind = screenshot_setup_kind_for_project(mat, project)
        title = mat.title or ""
        text = (mat.extracted_text or "").strip()
        if len(text) < 20:
            for ocr_title, ocr_mat in ocr_by_title.items():
                if title and title in ocr_title:
                    text = (ocr_mat.extracted_text or "").strip()
                    break
        if len(text) < 20:
            continue
        blocks.append(
            {
                "kind": kind,
                "label": SETUP_KIND_LABELS.get(kind, SETUP_KIND_LABELS["other"]),
                "title": title,
                "text": text[:4000],
                "material_id": f"mat_{mat.id}",
            }
        )
    return {"blocks": blocks, "has_setup": bool(blocks)}


def import_monthly_periods_from_material(
    project: AuditProject,
    material: AuditMaterial,
    db: Session,
    *,
    set_active_last: bool = True,
) -> dict[str, Any]:
    slice_data = document_slice_from_material(material)
    if not slice_data:
        raise ValueError("В документе нет среза Директа")
    payloads = slice_monthly_to_metrics_list(slice_data)
    if not payloads:
        raise ValueError("В срезе нет помесячных данных для импорта")

    created_ids: list[int] = []
    for idx, payload in enumerate(payloads):
        normalized, review_reasons = validate_metrics_payload(payload)
        normalized["import_source"] = "yandex_direct_xlsx"
        # J-UX: KPI-периоды из Excel Директа уже являются "истиной" для показателей расходов/кликов/заявок.
        # Отсутствие sales/revenue для CPA/ROMI является нормальным сценарием для запуска аудита,
        # поэтому не превращаем это в обязательные "Проверьте периоды KPI".
        ignored_reasons = {
            "Нет продаж — CPA требует проверки",
            "Нет выручки — ROMI требует проверки",
        }
        filtered_reasons = [r for r in review_reasons if r not in ignored_reasons]
        needs_review = bool(filtered_reasons)
        review_reason = "; ".join(dict.fromkeys(filtered_reasons)) if filtered_reasons else None
        content = json.dumps(normalized, ensure_ascii=False)
        row = AuditMaterial(
            audit_project_id=project.id,
            type="manual_metrics",
            title=f"Метрики: {normalized.get('period') or 'период'}",
            raw_content=content,
            extracted_text=content,
            confidence=0.85,
            needs_review=needs_review,
            review_reason=review_reason,
            status="needs_review" if needs_review else "ready",
        )
        db.add(row)
        db.flush()
        created_ids.append(row.id)

    if set_active_last and created_ids:
        from app.services.metrics_periods_service import ensure_active_metrics_material_id

        ensure_active_metrics_material_id(project, db)

    return {
        "created_count": len(created_ids),
        "material_ids": created_ids,
        "active_material_id": project.active_metrics_material_id,
    }


def month_label_to_period_display(month_label: str) -> str:
    """Normalize «янв 2026» → valid period string."""
    expanded = parse_direct_month_label(month_label)
    try:
        return parse_period(expanded)["display"]
    except ValueError:
        return expanded
