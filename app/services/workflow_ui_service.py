"""Unified workflow UI: data_issues + workflow_ui for audit detail API."""
from __future__ import annotations

import json
from typing import Any

from app.models import AuditProject
from app.schemas import ReviewQueueItem
from app.services.data_coverage_service import MINIMUM_FOR_AUDIT
from app.services.period_service import is_valid_period

PHASE_BY_STATE = {
    "NO_DATA": "collect",
    "TEMPLATE_CREATED": "collect",
    "DATA_NEEDS_REVIEW": "verify",
    "READY_FOR_ANALYSIS": "verify",
    "ANALYSIS_RUNNING": "analyze",
    "ANALYSIS_FAILED": "failed",
    "ANALYSIS_DONE": "report",
    "REPORT_READY": "report",
}

ACTIONS_BY_TYPE = {
    "missing_data": ["add_data", "accept_limitation"],
    "invalid_data": ["fix"],
    "material_review": ["fix", "verify"],
    "finding_review": ["review", "confirm", "reject"],
}


def _missing_data_actions(checklist_id: str) -> list[str]:
    actions = list(ACTIONS_BY_TYPE["missing_data"])
    if checklist_id in MINIMUM_FOR_AUDIT:
        return [a for a in actions if a != "accept_limitation"]
    return actions


def _issue_severity(issue_type: str, checklist_id: str, *, analysis_completed: bool = False) -> str:
    if issue_type == "finding_review":
        return "warning"
    if issue_type in {"invalid_data", "material_review"}:
        return "blocking"
    if issue_type == "missing_data" and checklist_id in MINIMUM_FOR_AUDIT:
        if analysis_completed:
            return "warning"
        return "blocking"
    return "warning"


def _invalid_metric_material_issues(project: AuditProject) -> list[dict[str, Any]]:
    """Ручные manual_metrics не показываем в чеклисте — KPI только из Excel Директа."""
    return []


def _invalid_metric_material_issues_legacy(project: AuditProject) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for material in project.materials or []:
        if material.type != "manual_metrics" or not material.raw_content:
            continue
        try:
            payload = json.loads(material.raw_content)
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, dict):
            continue
        period = (payload.get("period") or "").strip()
        if period and not is_valid_period(period):
            issues.append({
                "id": f"period_material_{material.id}",
                "issue_type": "invalid_data",
                "severity": "blocking",
                "label": material.title or "Период в метриках",
                "status_label": "Неверный формат",
                "reason": "Укажите период: апрель 2026, 04.2026 или 01.04.2026 — 30.04.2026",
                "source": "material",
                "ref_type": "material",
                "ref_id": material.id,
                "actions": ACTIONS_BY_TYPE["invalid_data"],
                "visible_after_analysis": False,
                "resolved": False,
            })
    return issues


def _is_direct_import_metrics_noise(project: AuditProject, queue_item: ReviewQueueItem) -> bool:
    """Ignore KPI review noise for Direct-imported months (missing sales/revenue is expected)."""
    if queue_item.item_type != "material":
        return False
    material = next((m for m in (project.materials or []) if m.id == queue_item.id), None)
    if not material or material.type != "manual_metrics" or not material.raw_content:
        return False
    try:
        payload = json.loads(material.raw_content)
    except json.JSONDecodeError:
        return False
    if not isinstance(payload, dict):
        return False
    if payload.get("import_source") != "yandex_direct_xlsx":
        return False
    reason = str(queue_item.reason or "")
    allowed = (
        "Нет продаж — CPA требует проверки",
        "Нет выручки — ROMI требует проверки",
    )
    if not reason:
        return False
    parts = [p.strip() for p in reason.split(";") if p.strip()]
    return bool(parts) and all(p in allowed for p in parts)


def build_data_issues(
    project: AuditProject,
    *,
    coverage: dict[str, Any],
    review_queue: list[ReviewQueueItem],
    include_findings: bool = True,
    analysis_completed: bool = False,
) -> list[dict[str, Any]]:
    """Merge coverage checklist and review queue into a single issue list."""
    issues: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for item in coverage.get("checklist") or []:
        if item.get("status") not in ("missing",):
            continue
        issue_id = str(item["id"])
        if issue_id in seen_ids:
            continue
        seen_ids.add(issue_id)
        issue_type = "missing_data"
        issues.append({
            "id": issue_id,
            "issue_type": issue_type,
            "severity": _issue_severity(issue_type, issue_id, analysis_completed=analysis_completed),
            "label": item.get("label") or issue_id,
            "status_label": item.get("status_label") or "Не указано",
            "reason": item.get("reason") or f"Не указано: {item.get('label', issue_id).lower()}",
            "source": "coverage",
            "ref_type": None,
            "ref_id": None,
            "actions": _missing_data_actions(issue_id),
            "visible_after_analysis": analysis_completed and issue_id not in MINIMUM_FOR_AUDIT,
            "resolved": False,
        })

    for extra in _invalid_metric_material_issues(project):
        if extra["id"] not in seen_ids:
            seen_ids.add(extra["id"])
            issues.append(extra)

    for queue_item in review_queue:
        if queue_item.item_type == "finding" and not include_findings:
            continue
        if _is_direct_import_metrics_noise(project, queue_item):
            continue
        prefix = "material" if queue_item.item_type == "material" else "finding"
        issue_id = f"{prefix}_{queue_item.id}"
        if issue_id in seen_ids:
            continue
        seen_ids.add(issue_id)
        issue_type = "material_review" if queue_item.item_type == "material" else "finding_review"
        issues.append({
            "id": issue_id,
            "issue_type": issue_type,
            "severity": _issue_severity(issue_type, issue_id, analysis_completed=analysis_completed),
            "label": queue_item.title,
            "status_label": "Требует проверки",
            "reason": queue_item.reason or "Требует проверки",
            "source": queue_item.item_type,
            "ref_type": queue_item.item_type,
            "ref_id": queue_item.id,
            "actions": list(ACTIONS_BY_TYPE[issue_type]),
            "visible_after_analysis": issue_type == "finding_review",
            "resolved": False,
        })

    return issues


def _readiness_percent(coverage: dict[str, Any], issues: list[dict[str, Any]]) -> int:
    minimum = coverage.get("minimum_for_audit") or []
    if not minimum:
        return int(coverage.get("audit_percent") or 0)
    blocking_minimum = {
        i["id"] for i in issues
        if i.get("severity") == "blocking" and not i.get("resolved")
        and (i["id"] in MINIMUM_FOR_AUDIT or i["id"].startswith("period"))
    }
    present = sum(
        1 for row in minimum
        if row.get("present") and row.get("id") not in blocking_minimum
    )
    return int(round(100 * present / len(minimum))) if minimum else 0


def _next_action_hint(issues: list[dict[str, Any]], readiness: dict[str, Any], workflow: dict[str, Any]) -> str:
    state = workflow.get("state")
    if state == "ANALYSIS_FAILED":
        return "Анализ завершился с ошибкой: проверьте материалы и запустите повторно"
    if state == "ANALYSIS_RUNNING":
        return "AI-анализ выполняется. Дождитесь завершения"
    if state in {"NO_DATA", "TEMPLATE_CREATED"}:
        return "Загрузите Excel из Яндекс Директа на вкладке «Директ» или добавьте материалы"
    open_blocking = [i for i in issues if i.get("severity") == "blocking" and not i.get("resolved")]
    if open_blocking:
        first = open_blocking[0]
        label = first.get("label") or "обязательный пункт"
        reason = first.get("reason") or "нужно исправить данные"
        return f"Сначала исправьте «{label}»: {reason}"
    if state == "READY_FOR_ANALYSIS":
        return ""
    warnings = readiness.get("warnings") or []
    if warnings:
        return warnings[0]
    if state in {"ANALYSIS_DONE", "REPORT_READY"}:
        return "Анализ завершён. Закройте оставшиеся пункты или отметьте ограничения отчёта"
    return "Продолжите сбор и проверку данных"


def _export_mode(workflow: dict[str, Any], coverage: dict[str, Any], project: AuditProject) -> str:
    if workflow.get("analysis_failed"):
        return "template"
    if coverage.get("is_preliminary") or not coverage.get("has_materials"):
        return "template"
    if workflow.get("state") == "REPORT_READY" and not project.needs_review:
        return "final"
    if workflow.get("show_ai_report_sections"):
        return "draft"
    return "template"


def _tab_config(
    workflow: dict[str, Any],
    *,
    has_direct_dynamics: bool = False,
) -> dict[str, dict[str, Any]]:
    show_results = bool(workflow.get("show_ai_report_sections"))
    state = workflow.get("state")
    show_dynamics = has_direct_dynamics and not show_results
    default_data = state in {
        "NO_DATA", "TEMPLATE_CREATED", "DATA_NEEDS_REVIEW", "READY_FOR_ANALYSIS",
        "ANALYSIS_RUNNING", "ANALYSIS_FAILED",
    } and not show_dynamics
    return {
        "data": {"visible": True, "enabled": True, "default": default_data},
        "results": {
            "visible": show_results,
            "enabled": show_results,
            "default": show_results and state in {"ANALYSIS_DONE", "REPORT_READY"},
        },
        "report": {
            "visible": show_results or show_dynamics,
            "enabled": show_results or show_dynamics,
            "default": show_dynamics,
        },
        "chat": {
            "visible": show_results or show_dynamics,
            "enabled": (show_results or show_dynamics) and state != "ANALYSIS_RUNNING",
            "default": False,
        },
    }


def build_workflow_ui(
    project: AuditProject,
    *,
    issues: list[dict[str, Any]],
    readiness: dict[str, Any],
    workflow: dict[str, Any],
    coverage: dict[str, Any],
) -> dict[str, Any]:
    """Build workflow_ui block for GET /api/audits/{id}."""
    state = workflow.get("state", "NO_DATA")
    phase = PHASE_BY_STATE.get(state, "collect")
    open_issues = [i for i in issues if not i.get("resolved")]
    blocking = [i for i in open_issues if i.get("severity") == "blocking"]
    can_run = (
        bool(readiness.get("can_run_analysis"))
        and state == "READY_FOR_ANALYSIS"
        and not coverage.get("is_preliminary", True)
        and len(blocking) == 0
    )
    block_reasons = readiness.get("block_reasons") or []

    if state == "ANALYSIS_RUNNING":
        primary = {
            "id": "run_analysis",
            "label": "Анализ выполняется…",
            "enabled": False,
            "reason_disabled": "Дождитесь завершения",
        }
    elif state == "ANALYSIS_FAILED":
        primary = {
            "id": "run_analysis",
            "label": "Повторить AI-анализ",
            "enabled": True,
            "reason_disabled": None,
        }
    elif state in {"ANALYSIS_DONE", "REPORT_READY"}:
        rerun_ok = bool(readiness.get("can_run_analysis"))
        primary = {
            "id": "rerun_analysis",
            "label": "Перезапустить AI-анализ",
            "enabled": rerun_ok,
            "reason_disabled": None
            if rerun_ok
            else (block_reasons[0] if block_reasons else "Проверьте материалы перед повторным запуском"),
        }
    elif not coverage.get("has_materials") and state in {"NO_DATA", "TEMPLATE_CREATED"}:
        primary = {
            "id": "create_structure",
            "label": "Создать структуру аудита",
            "enabled": True,
            "reason_disabled": None,
        }
    elif can_run:
        primary = {
            "id": "run_analysis",
            "label": "Запустить AI-анализ",
            "enabled": True,
            "reason_disabled": None,
        }
    else:
        primary = {
            "id": "run_analysis",
            "label": "Запустить AI-анализ",
            "enabled": False,
            "reason_disabled": block_reasons[0] if block_reasons else "Данные требуют проверки",
        }

    draft_enabled = bool(readiness.get("force_draft_allowed")) and not can_run and state not in {"ANALYSIS_RUNNING"}
    secondary = {
        "id": "run_draft",
        "label": "Запустить черновик",
        "enabled": draft_enabled,
        "reason_disabled": None if draft_enabled else "Черновик недоступен",
    }

    has_direct_dynamics = False
    try:
        from app.services.direct_slice_service import build_direct_analytics

        da = build_direct_analytics(project) or {}
        has_direct_dynamics = len(da.get("monthly") or []) > 0
    except Exception:
        has_direct_dynamics = False

    return {
        "phase": phase,
        "state": state,
        "status_label": workflow.get("label") or state,
        "readiness_percent": _readiness_percent(coverage, issues),
        "issues_open_count": len(open_issues),
        "issues_blocking_count": len(blocking),
        "next_action_hint": _next_action_hint(issues, readiness, workflow),
        "primary_button": primary,
        "secondary_button": secondary,
        "export_mode": _export_mode(workflow, coverage, project),
        "tabs": _tab_config(workflow, has_direct_dynamics=has_direct_dynamics),
    }
