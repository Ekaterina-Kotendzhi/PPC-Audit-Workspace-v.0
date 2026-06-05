"""Unified audit workflow state machine for UI and API."""
from __future__ import annotations

from typing import Any

from app.models import AuditProject
from app.services.audit_gate_service import build_analysis_readiness
from app.services.audit_run_helpers import latest_run

STATE_LABELS = {
    "NO_DATA": "Нет данных",
    "TEMPLATE_CREATED": "Структура создана",
    "DATA_NEEDS_REVIEW": "Данные требуют проверки",
    "READY_FOR_ANALYSIS": "Готов к AI-анализу",
    "ANALYSIS_RUNNING": "Анализ выполняется",
    "ANALYSIS_FAILED": "Ошибка анализа",
    "ANALYSIS_DONE": "Анализ завершён",
    "REPORT_READY": "Отчёт готов",
}


def _has_successful_analysis(project: AuditProject) -> bool:
    return (
        latest_run(
            project,
            action="ai_analysis",
            status="success",
            require_output=True,
        )
        is not None
    )


def _last_successful_ai_analysis(project: AuditProject):
    return latest_run(project, action="ai_analysis", status="success")


def _last_run_failed(project: AuditProject) -> bool:
    last = latest_run(project, action="ai_analysis", status=None)
    return bool(last and last.status == "failed")


def resolve_workflow_state(
    project: AuditProject,
    *,
    readiness: dict[str, Any] | None = None,
    coverage: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Derive a single workflow state without contradictions."""
    readiness = readiness or build_analysis_readiness(project)
    coverage = coverage or {}
    db_status = project.status or "draft"
    has_materials = bool(coverage.get("has_materials")) or bool(project.materials)
    has_structure = bool(coverage.get("structure_percent", 0) > 0) or _has_successful_analysis(project)
    has_findings = bool(project.findings)
    can_run = bool(readiness.get("can_run_analysis"))
    review_count = int(readiness.get("needs_review_count") or 0)
    is_preliminary = bool(coverage.get("is_preliminary"))

    if db_status == "in_progress":
        state = "ANALYSIS_RUNNING"
    elif db_status == "failed":
        state = "ANALYSIS_FAILED"
    elif not has_materials and not has_structure:
        state = "NO_DATA"
    elif not has_materials and has_structure:
        state = "TEMPLATE_CREATED"
    elif _last_successful_ai_analysis(project) and not is_preliminary and not has_findings:
        state = (
            "REPORT_READY"
            if db_status == "completed" and not project.needs_review
            else "ANALYSIS_DONE"
        )
    elif has_findings and not is_preliminary:
        # Выводы уже есть (AI или sync) — не прячем вкладки «Выводы»/«Отчёт» из‑за открытых пунктов чеклиста.
        state = (
            "REPORT_READY"
            if db_status == "completed" and not project.needs_review
            else "ANALYSIS_DONE"
        )
    elif not can_run or review_count > 0:
        state = "DATA_NEEDS_REVIEW"
    elif can_run:
        state = "READY_FOR_ANALYSIS"
    else:
        state = "DATA_NEEDS_REVIEW"

    return {
        "state": state,
        "label": STATE_LABELS.get(state, state),
        "can_run_analysis": can_run and state != "ANALYSIS_RUNNING",
        "show_ai_report_sections": state in {"ANALYSIS_DONE", "REPORT_READY"},
        "show_preliminary_template": state in {"NO_DATA", "TEMPLATE_CREATED"} or is_preliminary,
        "analysis_failed": state == "ANALYSIS_FAILED",
        "analysis_running": state == "ANALYSIS_RUNNING",
    }
