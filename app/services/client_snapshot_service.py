"""Client snapshot DTO for PDF/PPTX — workspace vs client export (R1)."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import object_session

from app.models import AuditProject, AuditRun
from app.services.ai_service import metrics_from_project
from app.services.analysis_stale_service import build_analysis_freshness
from app.services.audit_run_helpers import latest_run
from app.services.audit_plan_service import (
    baseline_has_content,
    forecast_has_content,
    load_audit_plan,
    merge_forecast_from_offer,
    sync_audit_plan_reference_period,
    targets_has_content,
)
from app.services.data_coverage_service import assess_data_coverage
from app.services.finding_illustration_service import enrich_finding_illustration
from app.services.report_appendix_service import build_snapshot_appendix
from app.services.direct_slice_service import build_direct_analytics


def report_priority_label(value: Any) -> str:
    key = str(value or "medium").lower()
    return {
        "high": "Требует внимания в первую очередь",
        "medium": "Важно проверить до масштабирования",
        "low": "Можно отложить — наблюдение",
    }.get(key, "Важно проверить до масштабирования")


def _json_loads_safe(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def _last_successful_output(project: AuditProject) -> dict[str, Any]:
    """Свежий output_json последнего AI-анализа (прямой запрос, без устаревшего project.runs)."""
    run: AuditRun | None = None
    session = object_session(project)
    if session is not None and project.id:
        run = (
            session.query(AuditRun)
            .filter(
                AuditRun.audit_project_id == project.id,
                AuditRun.action == "ai_analysis",
                AuditRun.status == "success",
                AuditRun.output_json.isnot(None),
            )
            .order_by(AuditRun.created_at.desc(), AuditRun.id.desc())
            .first()
        )
    if run is None:
        run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run or not run.output_json:
        return {}
    data = _json_loads_safe(run.output_json, {})
    if not isinstance(data, dict):
        return {}
    if data.get("audit_summary") is not None or data.get("commercial_offer"):
        return data
    return {}


def _enrich_snapshot_analysis(
    data: dict[str, Any],
    project: AuditProject,
) -> dict[str, Any]:
    """Подтянуть краткий вывод и КП для клиентского PDF/HTML (как на вкладке Отчёт)."""
    from app.services.audit_summary_enrich_service import enrich_audit_summary
    from app.services.commercial_offer_enrich_service import (
        enrich_commercial_offer,
        is_generic_commercial_offer,
    )

    da = build_direct_analytics(project) or {}
    input_data: dict[str, Any] = {
        "niche": (project.client.niche if project.client else None),
    }
    if da:
        input_data["direct_statistics"] = da

    enrich_audit_summary(data, input_data, force_refresh=False)
    offer = data.get("commercial_offer")
    generic_offer = not isinstance(offer, dict) or is_generic_commercial_offer(offer)
    enrich_commercial_offer(data, input_data, force_refresh=generic_offer)
    return data


def _analysis_completed(project: AuditProject) -> bool:
    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    return run is not None


def _is_direct_health_finding_row(finding) -> bool:
    evidence = _json_loads_safe(finding.evidence_json, [])
    if not isinstance(evidence, list):
        return False
    return any(
        isinstance(item, dict) and item.get("source") == "direct_health"
        for item in evidence
    )


def _findings_pending_review(project: AuditProject, *, analysis_done: bool) -> int:
    if not analysis_done:
        return 0
    pending = 0
    for finding in project.findings:
        if _is_direct_health_finding_row(finding):
            continue
        status = finding.status or "ai_generated"
        if status in ("human_confirmed", "human_edited", "human_rejected"):
            continue
        pending += 1
    return pending


def _confirmed_observations(project: AuditProject, *, limit: int | None = None) -> list[dict[str, Any]]:
    severity_order = {"high": 0, "medium": 1, "low": 2}
    findings = [
        finding
        for finding in project.findings
        if (finding.status or "ai_generated") in ("human_confirmed", "human_edited")
        and not _is_direct_health_finding_row(finding)
    ]
    findings.sort(
        key=lambda finding: (
            severity_order.get(str(finding.severity or "medium").lower(), 1),
            finding.id or 0,
        )
    )

    items: list[dict[str, Any]] = []
    for finding in findings:
        row = {
            "finding_id": finding.id,
            "area": finding.area,
            "problem": finding.problem,
            "recommendation": finding.recommendation,
        }
        illustration = enrich_finding_illustration(
            finding,
            project,
            audit_id=project.id,
            include_data_uri=True,
        )
        if illustration.get("illustration_image_data_uri"):
            row["illustration_image_data_uri"] = illustration["illustration_image_data_uri"]
            row["illustration_title"] = illustration.get("illustration_title")
            row["illustration_caption"] = illustration.get("illustration_caption")
        elif illustration.get("illustration_material_id"):
            row["illustration_pending_caption"] = True
            row["illustration_title"] = illustration.get("illustration_title")
        items.append(row)
        if limit is not None and len(items) >= limit:
            break
    return items


def _zone_priority_charts(charts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for chart in charts:
        title = str(chart.get("title") or "").lower()
        if "зон" in title or "оценка по зонам" in title:
            result.append(chart)
    return result


def _build_limitations_text(coverage: dict[str, Any], zone_charts: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for item in coverage.get("accepted_limitations") or []:
        label = str(item.get("label") or "").strip()
        reason = str(item.get("reason") or "").strip()
        if label:
            parts.append(f"{label} — {reason}" if reason else label)
    for chart in zone_charts:
        reason = str(chart.get("review_reason") or "").strip()
        if reason and reason not in parts:
            parts.append(reason)
    if not parts:
        parts.append(
            "Оценка выполнена по загруженным материалам без прямого подключения API Яндекс Директа и Метрики."
        )
    return " ".join(parts[:4])


def _build_direct_health_snapshot(project: AuditProject) -> dict[str, Any]:
    da = build_direct_analytics(project)
    health = (da or {}).get("health")
    if not health:
        return {}
    plan = health.get("action_plan") or {}
    prioritized = (plan.get("prioritized") or [])[:3]
    top_issues = (health.get("performance_issues") or health.get("top_issues") or [])[:3]
    return {
        "available": True,
        "health_score": health.get("health_score"),
        "grade": health.get("grade"),
        "summary_explain": health.get("summary_explain") or "",
        "top_reasons": [
            {"title": i.get("title"), "detail": i.get("detail")}
            for i in top_issues
        ],
        "action_plan": prioritized,
        "period": (da or {}).get("period"),
    }


def build_client_snapshot(project: AuditProject) -> dict[str, Any]:
    """Единый DTO выдержки для клиента (PDF/PPTX/UI preview)."""
    coverage = assess_data_coverage(project)
    is_preliminary = bool(coverage.get("is_preliminary"))
    last_run = _last_successful_output(project)
    analysis_done = _analysis_completed(project) and not is_preliminary

    if last_run and analysis_done:
        last_run = _enrich_snapshot_analysis(dict(last_run), project)

    audit_summary = dict(last_run.get("audit_summary") or {}) if last_run else {}
    if is_preliminary and audit_summary:
        audit_summary = {**audit_summary, "priority": "low"}

    metrics = metrics_from_project(project) if project.materials else (last_run.get("metrics") or {} if last_run else {})
    commercial_offer = {} if is_preliminary else (last_run.get("commercial_offer") or {} if last_run else {})
    audit_plan = sync_audit_plan_reference_period(
        project,
        merge_forecast_from_offer(load_audit_plan(project), commercial_offer),
    )
    charts = (last_run.get("charts") or [] if last_run else [])
    if is_preliminary:
        direct_analytics = build_direct_analytics(project) or {}
        direct_charts = direct_analytics.get("charts") or []
        if direct_charts:
            charts = direct_charts
    zone_charts = _zone_priority_charts(charts)

    freshness = build_analysis_freshness(project)
    findings_pending = _findings_pending_review(project, analysis_done=analysis_done)
    analysis_stale = bool(freshness.get("analysis_stale"))

    draft_reason = ""
    is_draft = False
    if is_preliminary:
        missing = [
            str(i.get("label") or "").strip()
            for i in (coverage.get("missing_items") or [])
            if i.get("label")
        ]
        missing_text = ", ".join(missing[:5]) if missing else "дополнительных источников"
        is_draft = True
        draft_reason = (
            f"Предварительный отчёт по базовым данным. Для полноценного PPC-аудита не хватает: {missing_text}."
        )
    elif findings_pending > 0:
        is_draft = True
        word = "вывод" if findings_pending == 1 else "выводов"
        draft_reason = (
            f"Предварительная версия: осталось проверить {findings_pending} {word} "
            "на вкладке «Проверка выводов» перед отправкой клиенту."
        )
    elif analysis_stale:
        is_draft = True
        draft_reason = (
            "Данные обновлены после последнего AI-анализа. Перезапустите анализ или предупредите клиента, "
            "что текстовые выводы могут быть устаревшими."
        )

    generated_at = datetime.now().strftime("%d.%m.%Y %H:%M")
    audit_date = project.updated_at.strftime("%d.%m.%Y") if project.updated_at else generated_at
    last_analysis_at = freshness.get("last_analysis_at")
    analysis_label = ""
    if last_analysis_at and analysis_done:
        if hasattr(last_analysis_at, "strftime"):
            analysis_label = last_analysis_at.strftime("%d.%m.%Y %H:%M")
        else:
            analysis_label = str(last_analysis_at)

    return {
        "is_preliminary": is_preliminary,
        "is_draft": is_draft,
        "is_ready_for_client": analysis_done and not is_draft,
        "draft_reason": draft_reason,
        "findings_pending": findings_pending,
        "analysis_stale": analysis_stale,
        "analysis_done": analysis_done,
        "generated_at": generated_at,
        "audit_date": audit_date,
        "last_analysis_at": analysis_label,
        "cover": {
            "client_name": project.client.name,
            "niche": project.client.niche or "Не указана",
            "website": project.client.website or "Не указан",
            "region": project.client.region or "",
        },
        "goal": (project.goal or "").strip() or "Не указана",
        "audit_summary": audit_summary,
        "metrics": metrics,
        "commercial_offer": commercial_offer,
        "audit_plan": audit_plan,
        "has_forecast": forecast_has_content(audit_plan.get("forecast")),
        "has_baseline": baseline_has_content(audit_plan.get("baseline")),
        "has_targets": targets_has_content(audit_plan.get("targets")),
        "zone_charts": zone_charts,
        "confirmed_observations": _confirmed_observations(project),
        "limitations_text": _build_limitations_text(coverage, zone_charts),
        "priority_label": report_priority_label(audit_summary.get("priority")),
        "cannot_evaluate": list(coverage.get("cannot_evaluate") or []) if is_preliminary else [],
        "report_appendix": build_snapshot_appendix(project),
        "direct_health": _build_direct_health_snapshot(project),
    }
