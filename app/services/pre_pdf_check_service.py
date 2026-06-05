"""Pre-PDF readiness checklist (M2.17)."""
from __future__ import annotations

import json
import re
from typing import Any

from app.models import AuditProject
from app.services.analysis_stale_service import build_analysis_freshness
from app.services.audit_run_helpers import latest_run
from app.services.client_snapshot_service import build_client_snapshot
from app.services.direct_slice_service import build_direct_analytics
from app.services.finding_illustration_service import build_report_illustrations_summary
from app.services.note_metrics_service import effective_metrics_raw
from app.services.review_service import count_needs_review

_NUMBER_RE = re.compile(r"(?<!\d)(\d[\d\s]{0,12}\d|\d+(?:[.,]\d+)?)(?!\d)")


def _summary_text(summary: dict[str, Any]) -> str:
    parts = [
        summary.get("client_problem"),
        summary.get("main_risk"),
        summary.get("short_conclusion"),
    ]
    return " ".join(str(part or "").strip() for part in parts if str(part or "").strip())


def _parse_number(raw: str) -> float | None:
    cleaned = str(raw or "").replace("\u00a0", " ").replace(" ", "").replace(",", ".")
    try:
        return float(cleaned)
    except (TypeError, ValueError):
        return None


def _numbers_near_keywords(text: str, keywords: tuple[str, ...]) -> list[float]:
    lowered = text.lower()
    found: list[float] = []
    for keyword in keywords:
        for match in re.finditer(re.escape(keyword), lowered):
            window = lowered[max(0, match.start() - 24): match.end() + 48]
            for num_match in _NUMBER_RE.finditer(window):
                value = _parse_number(num_match.group(1))
                if value is None or value <= 0:
                    continue
                if 2000 <= value <= 2099 and float(value).is_integer():
                    continue
                found.append(value)
    return found


def _values_conflict(reference: float | None, candidates: list[float], *, rel: float = 0.25) -> bool:
    if reference is None or not candidates:
        return False
    ref = float(reference)
    if ref <= 0:
        return False
    plausible = [value for value in candidates if value <= ref * 8 or value >= ref / 8]
    if not plausible:
        return False
    return any(abs(value - ref) / ref > rel for value in plausible)


def _check_direct_ai_numeric_overlap(
    direct_analytics: dict[str, Any] | None,
    summary: dict[str, Any],
    metrics: dict[str, Any],
) -> tuple[bool, str]:
    text = _summary_text(summary)
    if not text:
        return True, "AI-summary не заполнен — после заполнения сверьте period, лиды, CPL и бюджет с Excel."

    if not direct_analytics:
        return True, "Срез Директа не загружен — сверьте числа в AI-summary с Excel вручную."

    totals = direct_analytics.get("totals") or {}
    period = str(direct_analytics.get("period") or metrics.get("period") or "").strip()
    conflicts: list[str] = []

    if period:
        period_years = re.findall(r"20\d{2}", period)
        summary_years = re.findall(r"20\d{2}", text)
        if period_years and summary_years and not any(y in summary_years for y in period_years):
            conflicts.append("период в AI-summary не совпадает с периодом среза Директа")

    metric_checks = (
        ("лиды", totals.get("leads") or metrics.get("leads"), ("лид", "заявк")),
        ("бюджет", totals.get("cost") or totals.get("budget") or metrics.get("budget"), ("бюджет", "расход")),
        ("CPL", totals.get("cpl") or metrics.get("cpl"), ("cpl", "стоимость лида")),
    )
    summary_fields = [
        str(summary.get("client_problem") or ""),
        str(summary.get("main_risk") or ""),
        str(summary.get("short_conclusion") or ""),
    ]
    for field in summary_fields:
        if not field.strip():
            continue
        for label, reference, keywords in metric_checks:
            candidates = _numbers_near_keywords(field, keywords)
            if not _values_conflict(reference, candidates):
                continue
            message = f"{label} в AI-summary расходятся с Excel Директа"
            if message not in conflicts:
                conflicts.append(message)

    if conflicts:
        return False, " ".join(conflicts) + ". Excel — источник цифр; AI-summary не должен подменять метрики."
    return True, "Числа в AI-summary не противоречат срезу Директа (автопроверка по ключевым словам)."


def _enrichment_coverage_from_project(project: AuditProject) -> dict[str, Any]:
    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run or not run.output_json:
        return {
            "direct_risks_total": 0,
            "enriched_count": 0,
            "coverage_percent": 100,
            "stubs_created": 0,
        }
    try:
        data = json.loads(run.output_json)
    except json.JSONDecodeError:
        return {
            "direct_risks_total": 0,
            "enriched_count": 0,
            "coverage_percent": 100,
            "stubs_created": 0,
        }
    cov = data.get("enrichment_coverage") or {}
    total = int(cov.get("direct_risks_total") or 0)
    enriched = int(cov.get("enriched_count") or 0)
    stubs = int(cov.get("stubs_created") or 0)
    percent = int(cov.get("coverage_percent") or (100 if total == 0 else round(100 * enriched / total)))
    return {
        "direct_risks_total": total,
        "enriched_count": enriched,
        "coverage_percent": percent,
        "stubs_created": stubs,
    }


def build_pre_pdf_check(project: AuditProject) -> dict[str, Any]:
    snap = build_client_snapshot(project)
    freshness = build_analysis_freshness(project)
    ill = build_report_illustrations_summary(project)
    metrics = effective_metrics_raw(project)
    review_queue = count_needs_review(project)

    items: list[dict[str, Any]] = []

    pending = int(snap.get("findings_pending") or 0)
    items.append({
        "id": "findings_review",
        "label": "AI-выводы проверены маркетологом",
        "ok": pending == 0,
        "detail": (
            "Все AI-выводы подтверждены или отклонены. Риски Excel не требуют проверки на «Выводах»."
            if pending == 0
            else f"Осталось проверить {pending} AI-вывод(ов) на вкладке «Выводы»."
        ),
    })

    is_draft = bool(snap.get("is_draft"))
    items.append({
        "id": "draft_status",
        "label": "Отчёт не в статусе черновика",
        "ok": not is_draft,
        "detail": snap.get("draft_reason") or "Готов к отправке клиенту.",
    })

    stale = bool(freshness.get("analysis_stale") or snap.get("analysis_stale"))
    items.append({
        "id": "analysis_fresh",
        "label": "AI-анализ актуален относительно данных",
        "ok": not stale,
        "detail": (
            "Данные не менялись после последнего анализа."
            if not stale
            else "Перезапустите AI-анализ или предупредите клиента об устаревших выводах."
        ),
    })

    missing_caps = int(ill.get("findings_missing_caption") or 0)
    items.append({
        "id": "illustration_captions",
        "label": "Подписи к скринам у подтверждённых выводов",
        "ok": missing_caps == 0,
        "detail": (
            "Все иллюстрации с подписью для PDF."
            if missing_caps == 0
            else f"У {missing_caps} скрин(ов) нет подписи — добавьте на вкладке «Выводы»."
        ),
    })

    metrics_review = bool(metrics.get("needs_review"))
    items.append({
        "id": "metrics_verified",
        "label": "KPI проверены (без needs_review)",
        "ok": not metrics_review,
        "detail": (
            "Активные метрики без пометки «требует проверки»."
            if not metrics_review
            else f"Метрики: {metrics.get('review_reason') or 'требуют проверки'}."
        ),
    })

    if review_queue > 0:
        items.append({
            "id": "materials_review",
            "label": "Материалы в очереди проверки",
            "ok": False,
            "detail": f"В очереди проверки {review_queue} материал(ов) — проверьте перед PDF.",
        })

    direct_analytics = build_direct_analytics(project) or {}
    health = direct_analytics.get("health") or {}
    summary = snap.get("audit_summary") or {}
    grade = str(health.get("grade") or "").upper()
    score = health.get("health_score")
    priority = str(summary.get("priority") or "").lower()
    health_ready = bool(grade or score is not None)
    consistency_ok = True
    consistency_detail = "Оценка кабинета не загружена — проверка уровня риска пропущена."
    if health_ready:
        consistency_detail = "Оценка кабинета и приоритет в AI-summary согласованы."
        if grade in {"D", "F"} and priority == "low":
            consistency_ok = False
            consistency_detail = (
                "Оценка кабинета показывает высокий риск (D/F), но в AI-summary низкий приоритет. "
                "Скорректируйте summary или перезапустите AI-анализ."
            )
        elif isinstance(score, (int, float)) and float(score) <= 45 and priority == "low":
            consistency_ok = False
            consistency_detail = (
                "Оценка кабинета ≤ 45 при low-приоритете в summary. "
                "Проверьте согласованность перед отправкой клиенту."
            )
    items.append({
        "id": "direct_ai_consistency",
        "label": "Оценка кабинета и AI-summary: уровень риска",
        "ok": consistency_ok,
        "detail": consistency_detail,
    })

    overlap_ok, overlap_detail = _check_direct_ai_numeric_overlap(direct_analytics, summary, metrics)
    items.append({
        "id": "direct_ai_no_overlap",
        "label": "Excel Директа и AI-summary: числа не противоречат",
        "ok": overlap_ok,
        "detail": overlap_detail,
    })

    analysis_done = bool(snap.get("analysis_done"))
    cov = _enrichment_coverage_from_project(project)
    total_risks = int(cov.get("direct_risks_total") or 0)
    if analysis_done and total_risks > 0:
        enriched = int(cov.get("enriched_count") or 0)
        stubs = int(cov.get("stubs_created") or 0)
        percent = int(cov.get("coverage_percent") or 0)
        enrichment_ok = percent >= 100 and stubs == 0
        if enrichment_ok:
            enrichment_detail = f"Обогащено AI: {enriched}/{total_risks} рисков Excel."
        elif stubs:
            enrichment_detail = (
                f"Обогащено AI: {enriched}/{total_risks}; {stubs} заглушек — "
                "перезапустите анализ или доработайте на «Выводах»."
            )
        else:
            enrichment_detail = (
                f"Обогащено AI: {enriched}/{total_risks} — не все риски Excel имеют AI-карточку. "
                "Перезапустите AI-анализ."
            )
        items.append({
            "id": "direct_ai_enrichment",
            "label": "Риски Excel обогащены AI (1:1)",
            "ok": enrichment_ok,
            "detail": enrichment_detail,
            "severity": "warning",
        })

    ready = all(
        item["ok"]
        for item in items
        if str(item.get("severity") or "blocking") != "warning"
    )
    return {
        "ready": ready,
        "items": items,
        "is_ready_for_client": bool(snap.get("is_ready_for_client")),
        "summary": (
            "Можно отправлять PDF клиенту."
            if ready
            else "Исправьте пункты ниже перед отправкой PDF."
        ),
    }
