"""Build audit list row DTO (stage G3) without full workflow_ui."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from zoneinfo import ZoneInfo

from app.config import settings
from app.models import AuditMaterial, AuditProject, Client
from app.services.analysis_stale_service import build_analysis_freshness
from app.services.audit_run_helpers import latest_run
from app.services.client_contacts_service import client_has_contacts
from app.services.note_metrics_service import effective_metrics

LIST_STATE_LABELS: dict[str, str] = {
    "DRAFT_EMPTY": "Черновик",
    "DRAFT_DATA": "Черновик",
    "READY_ANALYSIS": "Готов к анализу",
    "ANALYSIS_RUNNING": "Анализ…",
    "ANALYSIS_FAILED": "Ошибка анализа",
    "REVIEW_PENDING": "На проверке",
    "STALE": "Данные обновлены",
    "REPORT_READY": "Отчёт готов",
}

LIST_STATE_BADGE: dict[str, str] = {
    "DRAFT_EMPTY": "draft",
    "DRAFT_DATA": "draft",
    "READY_ANALYSIS": "draft",
    "ANALYSIS_RUNNING": "in_progress",
    "ANALYSIS_FAILED": "failed",
    "REVIEW_PENDING": "needs_review",
    "STALE": "needs_review",
    "REPORT_READY": "completed",
}

FILE_MATERIAL_TYPES = frozenset({"document", "screenshot"})


def active_materials(project: AuditProject) -> list[AuditMaterial]:
    return [
        m for m in (project.materials or [])
        if not getattr(m, "excluded_from_analysis", False)
    ]


def quick_issues_open_count(project: AuditProject) -> int:
    count = sum(1 for m in active_materials(project) if m.needs_review)
    count += sum(1 for f in project.findings if f.needs_review)
    if project.needs_review:
        count = max(count, 1)
    return count


def list_needs_data_attention(project: AuditProject) -> bool:
    materials = active_materials(project)
    if not materials:
        return True
    if project.status != "draft":
        return False
    if any(m.needs_review for m in materials):
        return True
    metrics = effective_metrics(project)
    budget = metrics.get("budget")
    clicks = metrics.get("clicks")
    leads = metrics.get("leads") or metrics.get("conversions")
    return not (budget and clicks and leads)


def has_successful_analysis(project: AuditProject) -> bool:
    return latest_run(project, action="ai_analysis", status="success") is not None


def format_timezone_label(dt: datetime | None) -> str:
    if not dt:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    try:
        tz = ZoneInfo(settings.DISPLAY_TIMEZONE)
    except Exception:
        tz = ZoneInfo("Europe/Moscow")
    local = dt.astimezone(tz)
    suffix = settings.DISPLAY_TZ_SUFFIX or "UTC+3"
    return f"{local:%d.%m.%Y} · {local:%H:%M} {suffix}"


def _goal_short(goal: str | None, *, limit: int = 50) -> str:
    text = (goal or "").strip()
    if not text:
        return "—"
    if len(text) <= limit:
        return text
    return f"{text[:limit]}…"


def build_data_indicators(
    project: AuditProject,
    materials: list[AuditMaterial],
    *,
    has_analysis: bool,
    has_contacts: bool,
) -> dict[str, Any]:
    metrics = effective_metrics(project)
    has_metrics = bool(
        any(m.type == "manual_metrics" for m in materials)
        or (metrics.get("budget") and metrics.get("clicks"))
    )
    has_notes = any(m.type == "text_note" for m in materials)
    file_materials = [m for m in materials if m.type in FILE_MATERIAL_TYPES]
    files_count = len(file_materials)
    has_documents = any(
        m.type == "document" and (m.extracted_text or "").strip()
        for m in materials
    )
    return {
        "metrics": has_metrics,
        "notes": has_notes,
        "documents": has_documents,
        "files_count": files_count,
        "analysis": has_analysis,
        "contacts": has_contacts,
    }


def build_data_indicators_label(indicators: dict[str, Any]) -> str:
    parts: list[str] = []
    if indicators.get("metrics"):
        parts.append("Метрики ✓")
    if indicators.get("notes"):
        parts.append("Заметки ✓")
    if indicators.get("documents"):
        parts.append("Док. ✓")
    files_count = int(indicators.get("files_count") or 0)
    if files_count:
        parts.append(f"Файлы {files_count}")
    if indicators.get("analysis"):
        parts.append("Анализ ✓")
    if indicators.get("contacts"):
        parts.append("Контакт ✓")
    return " · ".join(parts) if parts else "—"


def build_data_indicators_tooltip(indicators: dict[str, Any]) -> str:
    lines: list[str] = []
    if indicators.get("metrics"):
        lines.append("Метрики: загружены (ручные / Excel)")
    else:
        lines.append("Метрики: нет")
    lines.append("Заметки: да" if indicators.get("notes") else "Заметки: нет")
    lines.append("Документы с текстом: да" if indicators.get("documents") else "Документы с текстом: нет")
    files_count = int(indicators.get("files_count") or 0)
    lines.append(f"Файлы (документы и скрины): {files_count}")
    lines.append("AI-анализ выполнен: да" if indicators.get("analysis") else "AI-анализ выполнен: нет")
    lines.append("Контакты клиента: да" if indicators.get("contacts") else "Контакты клиента: нет")
    return "\n".join(lines)


def resolve_list_state(
    *,
    status: str,
    findings_count: int,
    materials_count: int,
    issues_open_count: int,
    needs_data_attention: bool,
    analysis_stale: bool,
) -> str:
    if status == "in_progress":
        return "ANALYSIS_RUNNING"
    if status == "failed":
        return "ANALYSIS_FAILED"
    if analysis_stale and findings_count > 0:
        return "STALE"
    if status == "draft":
        if materials_count == 0:
            return "DRAFT_EMPTY"
        if needs_data_attention or issues_open_count > 0:
            return "DRAFT_DATA"
        return "READY_ANALYSIS"
    if issues_open_count > 0 or status == "needs_review":
        return "REVIEW_PENDING"
    if status == "completed":
        return "REPORT_READY"
    return "DRAFT_DATA"


def resolve_list_displays(list_state: str, *, findings_count: int, issues_open_count: int, needs_data_attention: bool, analysis_stale: bool) -> tuple[str, str, str, str, bool, str | None]:
    if list_state == "DRAFT_EMPTY":
        findings_display = "Нет данных"
        tasks_display = "Заполните данные"
        primary_action, primary_label = "continue", "Продолжить заполнение"
    elif list_state in {"DRAFT_DATA", "READY_ANALYSIS"}:
        findings_display = (
            str(findings_count) if findings_count > 0 else "Анализ не запускался"
        )
        if list_state == "DRAFT_DATA":
            if issues_open_count > 0:
                tasks_display = f"{issues_open_count} на проверке"
                primary_action, primary_label = "continue", "Проверить задачи"
            elif needs_data_attention:
                tasks_display = "Заполните данные"
                primary_action, primary_label = "continue", "Продолжить заполнение"
            else:
                tasks_display = "—"
                primary_action, primary_label = "continue", "Продолжить"
        else:
            tasks_display = "—"
            primary_action, primary_label = "run_analysis", "Запустить анализ"
    elif list_state == "ANALYSIS_RUNNING":
        findings_display = "—"
        tasks_display = "—"
        primary_action, primary_label = "disabled_running", "Анализ…"
    elif list_state == "ANALYSIS_FAILED":
        findings_display = "—"
        tasks_display = "1 · повторить"
        primary_action, primary_label = "run_analysis", "Повторить анализ"
    elif list_state == "STALE":
        findings_display = f"{findings_count} · устар." if findings_count > 0 else "0 · нет данных"
        tasks_display = f"{issues_open_count} на проверке" if issues_open_count > 0 else "Перезапустить AI"
        primary_action, primary_label = "run_analysis", "Перезапустить AI"
    elif list_state == "REVIEW_PENDING":
        findings_display = str(findings_count) if findings_count > 0 else "0 · нет данных"
        tasks_display = f"{issues_open_count} на проверке" if issues_open_count > 0 else "—"
        primary_action, primary_label = "review_findings", "Проверить выводы"
    else:  # REPORT_READY
        findings_display = str(findings_count) if findings_count > 0 else "0 · нет данных"
        tasks_display = "—"
        primary_action, primary_label = "open", "Открыть отчёт"

    has_analysis_done = list_state in {"REVIEW_PENDING", "STALE", "REPORT_READY"}
    export_allowed = list_state == "REPORT_READY" and findings_count > 0 and has_analysis_done
    export_block_reason = None if export_allowed else "Доступен после AI-анализа и проверки выводов"
    if list_state == "REVIEW_PENDING" and findings_count > 0:
        export_allowed = False
        export_block_reason = "Предпросмотр отчёта — в карточке аудита"

    return findings_display, tasks_display, primary_action, primary_label, export_allowed, export_block_reason


def requires_attention(
    *,
    list_state: str,
    status: str,
    issues_open_count: int,
    needs_data_attention: bool,
    analysis_stale: bool,
) -> bool:
    if list_state == "REPORT_READY" and issues_open_count == 0:
        return False
    return (
        issues_open_count > 0
        or status == "needs_review"
        or status == "failed"
        or list_state == "DRAFT_EMPTY"
        or (list_state == "DRAFT_DATA" and needs_data_attention)
        or analysis_stale
    )


def resolve_source_label(materials: list[AuditMaterial]) -> str:
    has_files = any(m.type in FILE_MATERIAL_TYPES for m in materials)
    has_manual = any(m.type in {"manual_metrics", "text_note"} for m in materials)
    if has_files and has_manual:
        return "смешанный"
    if has_files:
        return "файл"
    if materials:
        return "ручной"
    return "ручной"


def build_audit_list_row(project: AuditProject) -> dict[str, Any]:
    client: Client | None = project.client
    materials = active_materials(project)
    materials_count = len(materials)
    findings_count = len(project.findings or [])
    issues_open_count = quick_issues_open_count(project)
    needs_data_attention = list_needs_data_attention(project)
    freshness = build_analysis_freshness(project)
    analysis_stale = bool(freshness.get("analysis_stale"))
    has_analysis = has_successful_analysis(project)
    has_contacts = client_has_contacts(client)

    list_state = resolve_list_state(
        status=project.status or "draft",
        findings_count=findings_count,
        materials_count=materials_count,
        issues_open_count=issues_open_count,
        needs_data_attention=needs_data_attention,
        analysis_stale=analysis_stale,
    )
    (
        findings_display,
        tasks_display,
        primary_action,
        primary_action_label,
        export_allowed,
        export_block_reason,
    ) = resolve_list_displays(
        list_state,
        findings_count=findings_count,
        issues_open_count=issues_open_count,
        needs_data_attention=needs_data_attention,
        analysis_stale=analysis_stale,
    )

    goal_full = (project.goal or "").strip()
    data_indicators = build_data_indicators(
        project,
        materials,
        has_analysis=has_analysis,
        has_contacts=has_contacts,
    )

    return {
        "id": project.id,
        "client_name": client.name if client else "—",
        "niche": client.niche if client else None,
        "niche_display": client.niche if client else None,
        "goal": project.goal,
        "goal_full": goal_full,
        "goal_short": _goal_short(goal_full),
        "status": project.status,
        "status_badge": LIST_STATE_BADGE.get(list_state, project.status or "draft"),
        "findings_count": findings_count,
        "issues_open_count": issues_open_count,
        "review_queue_count": issues_open_count,
        "materials_count": materials_count,
        "needs_data_attention": needs_data_attention,
        "analysis_stale": analysis_stale,
        "has_contacts": has_contacts,
        "has_analysis": has_analysis,
        "needs_review_count": issues_open_count,
        "created_at": project.created_at,
        "timezone_label": format_timezone_label(project.created_at),
        "updated_at": project.updated_at,
        "updated_timezone_label": format_timezone_label(project.updated_at),
        "source_label": resolve_source_label(materials),
        "list_state": list_state,
        "list_state_label": LIST_STATE_LABELS.get(list_state, list_state),
        "findings_display": findings_display,
        "tasks_display": tasks_display,
        "primary_action": primary_action,
        "primary_action_label": primary_action_label,
        "export_allowed": export_allowed,
        "export_block_reason": export_block_reason,
        "data_indicators": data_indicators,
        "data_indicators_label": build_data_indicators_label(data_indicators),
        "data_indicators_tooltip": build_data_indicators_tooltip(data_indicators),
        "requires_attention": requires_attention(
            list_state=list_state,
            status=project.status or "draft",
            issues_open_count=issues_open_count,
            needs_data_attention=needs_data_attention,
            analysis_stale=analysis_stale,
        ),
        "is_archived": project.archived_at is not None,
    }


def apply_audit_list_row_filters(
    rows: list[dict[str, Any]],
    *,
    list_state: str | None = None,
    requires_attention: bool | None = None,
    export_ready: bool | None = None,
    has_errors: bool | None = None,
) -> list[dict[str, Any]]:
    result = rows
    if list_state:
        result = [r for r in result if r.get("list_state") == list_state]
    if requires_attention is True:
        result = [r for r in result if r.get("requires_attention")]
    if export_ready is True:
        result = [r for r in result if r.get("export_allowed")]
    if has_errors is True:
        result = [
            r for r in result
            if r.get("list_state") == "ANALYSIS_FAILED" or r.get("status") == "failed"
        ]
    return result


def sort_audit_list_rows(rows: list[dict[str, Any]], sort: str | None) -> list[dict[str, Any]]:
    field = (sort or "-created_at").lstrip("-")
    reverse = (sort or "-created_at").startswith("-")

    def sort_key(row: dict[str, Any]) -> Any:
        if field == "client_name":
            return (row.get("client_name") or "").lower()
        if field == "findings_count":
            return int(row.get("findings_count") or 0)
        if field == "status":
            return (row.get("list_state") or row.get("status") or "").lower()
        created = row.get("created_at")
        if created is None:
            return datetime.min.replace(tzinfo=timezone.utc)
        if getattr(created, "tzinfo", None) is None:
            return created.replace(tzinfo=timezone.utc)
        return created

    return sorted(rows, key=sort_key, reverse=reverse)
