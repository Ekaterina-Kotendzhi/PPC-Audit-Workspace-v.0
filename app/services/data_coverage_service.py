"""Assess which PPC audit data is present vs missing (empty-state UX)."""
from __future__ import annotations

import json
import re
from typing import Any

from app.models import AuditProject
from app.services.ai_context_options import all_ai_context_options_enabled
from app.services.ai_service import metrics_from_project, prepare_materials_json
from app.services.data_limitation_service import (
    accepted_limitation_ids,
    apply_accepted_limitations_to_coverage,
)
from app.services.direct_setup_helpers import collect_direct_setup_kinds
from app.services.material_helpers import document_slice_from_material, is_semantics_export_material
from app.services.metrics_service import minimum_metrics_ready
from app.services.period_service import is_valid_period

UPLOAD_SUGGESTIONS = [
    "Скриншоты рекламных кампаний",
    "Поисковые запросы",
    "Данные по расходу",
    "Клики",
    "Заявки",
    "Продажи",
    "Выручку",
    "Цели Метрики",
    "CRM-статусы",
    "Комментарии по качеству лидов",
]

CANNOT_EVALUATE_WITHOUT_DATA = [
    "CPL",
    "CPA",
    "ROMI",
    "Качество заявок",
    "Эффективность кампаний",
    "Поисковые запросы",
    "Цели Метрики",
    "Связку с CRM",
    "Посадочные страницы",
    "Потери бюджета",
]

DATA_COLLECTION_RECOMMENDATION = (
    "Сначала добавьте период, расход, клики, заявки, продажи, поисковые запросы, "
    "цели Метрики, CRM-статусы и комментарии по качеству лидов."
)

ZONE_ROWS = [
    {"zone": "Семантика", "id": "search_queries", "missing_reason": "Нет поисковых запросов"},
    {"zone": "Аналитика/CRM", "id": "metrika_crm", "missing_reason": "Нет целей Метрики и CRM"},
    {"zone": "Посадочные", "id": "landing", "missing_reason": "Нет ссылок или скриншотов"},
    {"zone": "Бюджет", "id": "budget", "missing_reason": "Нет данных о расходах"},
]

CHECKLIST_ITEMS = [
    {"id": "period", "label": "Период", "kind": "metric", "field": "period"},
    {"id": "budget", "label": "Бюджет", "kind": "metric", "field": "budget"},
    {"id": "clicks", "label": "Клики", "kind": "metric", "field": "clicks"},
    {"id": "leads", "label": "Заявки", "kind": "metric", "field": "leads"},
    {"id": "sales", "label": "Продажи", "kind": "metric", "field": "sales"},
    {"id": "revenue", "label": "Выручка", "kind": "metric", "field": "revenue"},
    {"id": "search_queries", "label": "Поисковые запросы", "kind": "signal", "keywords": ["запрос", "семант", "минус", "ключев", "wordstat", "поисков"]},
    {"id": "metrika", "label": "Цели Метрики", "kind": "signal", "keywords": ["метрик", "цель", "goal", "utm", "счётчик", "счетчик"]},
    {"id": "crm", "label": "CRM-статусы", "kind": "signal", "keywords": ["crm", "лид", "статус", "продаж", "сделк", "amo", "bitrix"]},
    {"id": "campaign_screenshots", "label": "Скриншоты кампаний", "kind": "material", "types": ["screenshot", "screenshot_ocr"]},
    {"id": "landing", "label": "Посадочные страницы", "kind": "signal", "keywords": ["посадоч", "лендинг", "landing", "страниц", "оффер"]},
    {"id": "lead_quality", "label": "Комментарии по качеству лидов", "kind": "signal", "keywords": ["качеств", "лид", "некач", "целев", "мусор"]},
    {"id": "monthly_dynamics", "label": "Динамика по месяцам (Директ)", "kind": "direct_slice"},
    {"id": "semantics_conditions", "label": "Семантика (условия показа, Директ)", "kind": "direct_conditions"},
    {"id": "direct_setup", "label": "Скрины настроек (структура, стратегия)", "kind": "direct_setup"},
]

# Минимум аудита: срез Excel Директа (KPI из формы «Метрики» не используем).
MINIMUM_FOR_AUDIT = ["monthly_dynamics"]

# J4: готовность сквозной аналитики (не блокирует минимум аудита)
ANALYTICS_READINESS_ITEMS = [
    {"id": "ecommerce_tracking", "label": "E-commerce / цели продаж", "keywords": ["e-commerce", "ecommerce", "электронн", "транзакц", "purchase", "покупк"]},
    {"id": "crm_sync", "label": "CRM ↔ веб (лиды/сделки)", "keywords": ["crm", "amo", "bitrix", "сделк", "статус", "лид"]},
    {"id": "calltracking", "label": "Коллтрекинг / звонки", "keywords": ["коллтрек", "звонк", "comagic", "calltouch"]},
    {"id": "offline_sales", "label": "Офлайн-продажи в отчётах", "keywords": ["офлайн", "шоу-рум", "магазин", "розниц"]},
    {"id": "attribution", "label": "Модель атрибуции", "keywords": ["атрибуц", "оксон", "owox", "last click", "data-driven"]},
    {"id": "utm_discipline", "label": "UTM / разметка каналов", "keywords": ["utm", "разметк", "метк", "tag manager", "gtm"]},
]


def _text_blob(materials: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for m in materials:
        parts.append(str(m.get("content") or ""))
        parts.append(str(m.get("extracted_text") or ""))
        parts.append(str(m.get("title") or ""))
    return " ".join(parts).lower()


def _metric_present(metrics: dict[str, Any], field: str) -> bool:
    if field == "period":
        return is_valid_period(metrics.get("period"))
    value = metrics.get(field)
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _signal_present(blob: str, keywords: list[str]) -> bool:
    text = (blob or "").lower()
    if not text.strip():
        return False
    for kw in keywords:
        token = str(kw or "").strip().lower()
        if not token:
            continue
        # Prefer token-boundary-ish match to reduce accidental substring hits.
        pattern = rf"(?<!\w){re.escape(token)}"
        if re.search(pattern, text):
            return True
    return False


def _material_types_present(materials: list[dict[str, Any]], types: list[str]) -> bool:
    return any(m.get("type") in types for m in materials)


def _has_monthly_direct_slice(project: AuditProject) -> bool:
    for mat in project.materials or []:
        if getattr(mat, "type", None) != "document":
            continue
        sl = document_slice_from_material(mat)
        if not sl or sl.get("format") != "yandex_direct_xlsx":
            continue
        if len(sl.get("monthly") or []) >= 1:
            return True
        totals = sl.get("totals") or {}
        if (totals.get("cost") or 0) > 0:
            return True
        if len(sl.get("campaigns") or []) >= 1:
            return True
    return False


def _metrics_from_direct_slice(project: AuditProject) -> dict[str, Any]:
    """KPI minimum from uploaded Yandex Direct Excel (no manual metrics form)."""
    for mat in project.materials or []:
        if getattr(mat, "type", None) != "document":
            continue
        sl = document_slice_from_material(mat)
        if not sl or sl.get("format") != "yandex_direct_xlsx":
            continue
        totals = sl.get("totals") or {}
        monthly = sl.get("monthly") or []
        out: dict[str, Any] = {}
        period = sl.get("period")
        if period:
            out["period"] = period
        cost = totals.get("cost")
        clicks = totals.get("clicks")
        leads = totals.get("leads") or totals.get("conversions")
        if cost is None and monthly:
            cost = round(sum(float(m.get("cost") or 0) for m in monthly), 2)
        if clicks is None and monthly:
            clicks = sum(int(m.get("clicks") or 0) for m in monthly)
        if leads is None and monthly:
            leads = sum(int(m.get("leads") or 0) for m in monthly)
        if cost is not None:
            out["budget"] = cost
        if clicks is not None:
            out["clicks"] = clicks
        if leads is not None:
            out["leads"] = leads
        if out:
            return out
    return {}


def _has_semantics_export_material(project: AuditProject) -> bool:
    for mat in project.materials or []:
        if getattr(mat, "excluded_from_analysis", False):
            continue
        if is_semantics_export_material(mat):
            return True
    return False


def _has_direct_conditions_slice(project: AuditProject) -> bool:
    for mat in project.materials or []:
        if getattr(mat, "type", None) != "document":
            continue
        sl = document_slice_from_material(mat)
        summary = (sl or {}).get("conditions_summary") or {}
        if len(summary.get("top_by_spend") or []) >= 5:
            return True
    return False


def _has_direct_setup_screenshots(project: AuditProject) -> bool:
    return collect_direct_setup_kinds(project).get("sufficient", False)


def _parse_float_ru(value: str) -> float | None:
    raw = (value or "").strip().replace(" ", "")
    if not raw:
        return None
    # 166975,97 -> 166975.97 ; 166975.97 -> 166975.97
    normalized = raw.replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        return None


def _metrics_fallback_from_text(blob: str) -> dict[str, Any]:
    text = (blob or "").lower()
    out: dict[str, Any] = {"period": None, "budget": None, "clicks": None, "leads": None}

    period_ranges = re.findall(r"\b\d{2}\.\d{2}\.\d{4}\s*[-—]\s*\d{2}\.\d{2}\.\d{4}\b", text)
    if period_ranges:
        out["period"] = period_ranges[-1].replace("-", "—")
    else:
        month_period = re.findall(
            r"\b(январ[ьяе]|феврал[ьяе]|март[ае]?|апрел[ьяе]|ма[йяе]|июн[ьяе]|июл[ьяе]|август[ае]?|сентябр[ьяе]|октябр[ьяе]|ноябр[ьяе]|декабр[ьяе])\s+\d{4}\b",
            text,
        )
        if month_period:
            out["period"] = month_period[-1]

    total_line = next((line for line in text.splitlines() if "итого" in line), "")
    if total_line:
        nums = re.findall(r"\d[\d\s]*[.,]?\d*", total_line)
        parsed = [_parse_float_ru(n) for n in nums]
        parsed = [n for n in parsed if n is not None]
        # Common xlsx pattern: budget, clicks, conversions, ...
        if len(parsed) >= 1 and out["budget"] is None:
            out["budget"] = parsed[0]
        if len(parsed) >= 2 and out["clicks"] is None:
            out["clicks"] = int(parsed[1])
        if len(parsed) >= 3 and out["leads"] is None:
            out["leads"] = int(parsed[2])

    if out["budget"] is None:
        m = re.search(r"(расход|бюджет)[^\d]{0,20}(\d[\d\s]*[.,]?\d*)", text)
        if m:
            out["budget"] = _parse_float_ru(m.group(2))
    if out["clicks"] is None:
        m = re.search(r"клик[аиы]?[^\d]{0,20}(\d[\d\s]*[.,]?\d*)", text)
        if m:
            value = _parse_float_ru(m.group(1))
            out["clicks"] = int(value) if value is not None else None
    if out["leads"] is None:
        m = re.search(r"(заявк[аиы]?|конверс[ияи])[^\d]{0,20}(\d[\d\s]*[.,]?\d*)", text)
        if m:
            value = _parse_float_ru(m.group(2))
            out["leads"] = int(value) if value is not None else None

    return out


def _metrics_fallback_from_materials(materials: list[dict[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {"period": None, "budget": None, "clicks": None, "leads": None}
    for mat in materials:
        title = str(mat.get("title") or "").lower()
        content = mat.get("content")
        text = json.dumps(content, ensure_ascii=False) if isinstance(content, dict) else str(content or "")
        parsed = _metrics_fallback_from_text(text)
        for key in out:
            if out[key] in (None, "") and parsed.get(key) not in (None, ""):
                out[key] = parsed.get(key)

        # Support short manual notes: title="бюджет", content="200000"
        num = _parse_float_ru(text.strip())
        if num is not None:
            if out["budget"] is None and "бюдж" in title:
                out["budget"] = num
            if out["clicks"] is None and "клик" in title:
                out["clicks"] = int(num)
            if out["leads"] is None and ("заяв" in title or "конверс" in title):
                out["leads"] = int(num)
    return out


def assess_data_coverage(project: AuditProject) -> dict[str, Any]:
    """Return structured coverage for UI empty states and progress bars."""
    raw_materials = prepare_materials_json(project, all_ai_context_options_enabled())
    materials = project.materials or []
    metrics = metrics_from_project(project) or {}
    blob = _text_blob(raw_materials)
    fallback_metrics = _metrics_fallback_from_text(blob)
    fallback_by_material = _metrics_fallback_from_materials(raw_materials)
    merged_metrics = dict(metrics)
    for key, value in fallback_metrics.items():
        if merged_metrics.get(key) in (None, "") and value not in (None, ""):
            merged_metrics[key] = value
    for key, value in fallback_by_material.items():
        if merged_metrics.get(key) in (None, "") and value not in (None, ""):
            merged_metrics[key] = value
    for key, value in _metrics_from_direct_slice(project).items():
        if merged_metrics.get(key) in (None, "") and value not in (None, ""):
            merged_metrics[key] = value
    has_materials = len(materials) > 0
    has_document_material = any((m.get("type") == "document") for m in raw_materials)

    checklist: list[dict[str, Any]] = []
    action_by_id = {
        "period": "Добавить период",
        "budget": "Добавить бюджет",
        "clicks": "Добавить клики",
        "leads": "Добавить заявки",
    }
    for item in CHECKLIST_ITEMS:
        if item["kind"] == "metric":
            continue
        present = False
        action = "Добавить данные"
        if item["kind"] == "material":
            present = _material_types_present(raw_materials, item["types"])
            action = "Добавить скриншот" if not present else "Исправить"
        elif item["kind"] == "direct_slice":
            present = _has_monthly_direct_slice(project)
            action = "Загрузить XLSX Мастер отчётов" if not present else "Исправить"
        elif item["kind"] == "direct_conditions":
            present = _has_direct_conditions_slice(project)
            action = "Загрузить XLSX с колонкой «Условие показа»" if not present else "Исправить"
        elif item["kind"] == "direct_setup":
            present = _has_direct_setup_screenshots(project)
            action = "Добавить скрины настроек" if not present else "Исправить"
        else:
            present = _signal_present(blob, item["keywords"])
            if item["id"] == "search_queries":
                present = present or _has_semantics_export_material(project)
            action = "Добавить заметку или документ" if not present else "Исправить"

        checklist.append({
            "id": item["id"],
            "label": item["label"],
            "status": "present" if present else "missing",
            "status_label": "Есть" if present else "Не указано",
            "reason": None if present else (
                f"Не указано: {item['label'].lower()}"
                if item["kind"] != "metric" or not has_document_material
                else f"{item['label']} не извлечено из документа автоматически. Добавьте в «Метрики» или заметку в формате «{item['label']}: значение»."
            ),
            "action": action,
        })

    analytics_readiness: list[dict[str, Any]] = []
    for item in ANALYTICS_READINESS_ITEMS:
        present = _signal_present(blob, item["keywords"])
        analytics_readiness.append({
            "id": item["id"],
            "label": item["label"],
            "status": "present" if present else "missing",
            "status_label": "Есть" if present else "Не подтверждено",
            "reason": None if present else f"Нет сигналов в материалах: {item['label'].lower()}",
            "action": "Добавить заметку или скрин настройки" if not present else "Исправить",
        })
    analytics_present = sum(1 for c in analytics_readiness if c["status"] == "present")
    analytics_readiness_percent = (
        int(round(100 * analytics_present / len(ANALYTICS_READINESS_ITEMS)))
        if ANALYTICS_READINESS_ITEMS
        else 0
    )

    missing_items = [c for c in checklist if c["status"] == "missing"]
    minimum_missing = [c for c in checklist if c["id"] in MINIMUM_FOR_AUDIT and c["status"] == "missing"]

    present_count = sum(1 for c in checklist if c["status"] == "present")
    checklist_total = len(checklist)
    minimum_present = sum(1 for c in checklist if c["id"] in MINIMUM_FOR_AUDIT and c["status"] == "present")

    audit_percent = int(round(100 * minimum_present / len(MINIMUM_FOR_AUDIT))) if MINIMUM_FOR_AUDIT else 0
    report_percent = int(round(100 * present_count / checklist_total)) if checklist_total else 0

    if not has_materials:
        audit_percent = 0
        report_percent = 0

    has_structure = any(run.status == "success" for run in (project.runs or []))
    structure_percent = 100 if has_structure else 0

    has_direct_minimum = _has_monthly_direct_slice(project)
    is_preliminary = not has_materials or not has_direct_minimum

    zone_scores = []
    for row in ZONE_ROWS:
        if row["id"] == "search_queries":
            present = any(c["id"] == "search_queries" and c["status"] == "present" for c in checklist)
        elif row["id"] == "metrika_crm":
            metrika_ok = any(c["id"] == "metrika" and c["status"] == "present" for c in checklist)
            crm_ok = any(c["id"] == "crm" and c["status"] == "present" for c in checklist)
            present = metrika_ok and crm_ok
        elif row["id"] == "landing":
            present = any(c["id"] == "landing" and c["status"] == "present" for c in checklist)
        elif row["id"] == "budget":
            present = any(c["id"] == "budget" and c["status"] == "present" for c in checklist)
        else:
            item = next((c for c in checklist if c["id"] == row["id"]), None)
            present = bool(item and item["status"] == "present")
        zone_scores.append({
            "zone": row["zone"],
            "status": "Оценено" if present and not is_preliminary else "Не оценено",
            "reason": "Достаточно данных" if present and not is_preliminary else row["missing_reason"],
            "score": None,
        })

    return apply_accepted_limitations_to_coverage(
        {
        "has_materials": has_materials,
        "is_preliminary": is_preliminary,
        "structure_percent": structure_percent,
        "audit_percent": audit_percent,
        "report_percent": report_percent,
        "checklist": checklist,
        "analytics_readiness": analytics_readiness,
        "analytics_readiness_percent": analytics_readiness_percent,
        "missing_items": missing_items,
        "minimum_for_audit": [
            {"id": c["id"], "label": c["label"], "present": c["status"] == "present"}
            for c in checklist if c["id"] in MINIMUM_FOR_AUDIT
        ],
        "upload_suggestions": UPLOAD_SUGGESTIONS,
        "cannot_evaluate": CANNOT_EVALUATE_WITHOUT_DATA,
        "data_collection_recommendation": DATA_COLLECTION_RECOMMENDATION,
        "zone_scores": zone_scores,
        },
        accepted_limitation_ids(project),
    )
