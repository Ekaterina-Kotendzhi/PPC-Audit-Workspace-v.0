"""M2.3 — AI draft text for client snapshot (R1) blocks."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from app.config import is_force_demo_ai
from app.models import AuditProject
from app.services.ai_service import extract_json_from_response, metrics_from_project
from app.services.audit_run_helpers import latest_run
from app.services.client_snapshot_service import build_client_snapshot, report_priority_label
from app.services.data_coverage_service import assess_data_coverage
from app.services.model_router import ModelRouter, ModelRouterError

logger = logging.getLogger(__name__)

AI_SNAPSHOT_DEFAULT_MODEL = "gpt-4o-mini"

SNAPSHOT_JSON_SCHEMA = """
{
  "audit_summary": {
    "client_problem": "суть для ЛПР, 2-4 предложения, plain language",
    "main_risk": "что будет если не исправить, 1-3 предложения",
    "priority": "low | medium | high",
    "short_conclusion": "следующий шаг для клиента, 1-2 предложения"
  },
  "zone_priority_phrase": "одна фраза: в первую очередь … (или пустая строка)",
  "limitations_text": "один короткий абзац об ограничениях данных без жаргона (или пустая строка)"
}
""".strip()

SYSTEM_PROMPT = f"""Ты помогаешь маркетологу агентства подготовить текст для клиентского PDF (PPC-аудит).
Пиши по-русски, деловой тон, без markdown, без выдуманных цифр — только из контекста.
Не упоминай внутренние процессы (AI, очередь проверки, API).
Верни только JSON без обёртки.

Схема:
{SNAPSHOT_JSON_SCHEMA}"""


@dataclass
class ClientSnapshotDraftResult:
    draft: dict[str, Any]
    method: str
    model_id: str | None = None
    model_label: str | None = None
    usage: dict[str, Any] | None = None
    cost_rub: Any = None
    cost_usd: Any = None
    can_apply: bool = True
    apply_blocked_reason: str | None = None
    review_notes: list[str] = field(default_factory=list)


def _json_loads_safe(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def _last_ai_output(project: AuditProject) -> dict[str, Any]:
    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run or not run.output_json:
        return {}
    data = _json_loads_safe(run.output_json, {})
    return data if isinstance(data, dict) else {}


def _confirmed_findings_brief(project: AuditProject, *, limit: int = 6) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for finding in project.findings or []:
        status = finding.status or "ai_generated"
        if status not in ("human_confirmed", "human_edited"):
            continue
        items.append(
            {
                "area": str(finding.area or ""),
                "problem": str(finding.problem or "")[:400],
                "recommendation": str(finding.recommendation or "")[:400],
            }
        )
        if len(items) >= limit:
            break
    return items


def _build_context(project: AuditProject) -> dict[str, Any]:
    coverage = assess_data_coverage(project)
    snap = build_client_snapshot(project)
    last_out = _last_ai_output(project)
    metrics = metrics_from_project(project) if project.materials else (last_out.get("metrics") or {})
    return {
        "client_name": project.client.name,
        "niche": project.client.niche or "",
        "website": project.client.website or "",
        "goal": (project.goal or "").strip(),
        "is_preliminary": coverage.get("is_preliminary"),
        "metrics": metrics,
        "existing_summary": last_out.get("audit_summary") or snap.get("audit_summary") or {},
        "commercial_offer": last_out.get("commercial_offer") or snap.get("commercial_offer") or {},
        "zone_charts": snap.get("zone_charts") or [],
        "confirmed_findings": _confirmed_findings_brief(project),
        "limitations_hint": snap.get("limitations_text") or "",
        "missing_items": [
            str(i.get("label") or "")
            for i in (coverage.get("missing_items") or [])
            if i.get("label")
        ][:5],
    }


def _build_user_prompt(ctx: dict[str, Any]) -> str:
    lines = [
        f"Клиент: {ctx.get('client_name')}",
        f"Ниша: {ctx.get('niche') or '—'}",
        f"Сайт: {ctx.get('website') or '—'}",
        f"Цель аудита: {ctx.get('goal') or '—'}",
        f"Предварительный режим: {'да' if ctx.get('is_preliminary') else 'нет'}",
    ]
    metrics = ctx.get("metrics") or {}
    if metrics:
        lines.append(
            "KPI: "
            + ", ".join(
                f"{k}={metrics[k]}"
                for k in ("period", "budget", "clicks", "leads", "sales", "revenue", "romi")
                if metrics.get(k) is not None
            )
        )
    existing = ctx.get("existing_summary") or {}
    if existing:
        lines.append("Текущий черновик резюме (можно улучшить, не копировать дословно):")
        for key in ("client_problem", "main_risk", "short_conclusion"):
            val = str(existing.get(key) or "").strip()
            if val:
                lines.append(f"  {key}: {val[:500]}")
    offer = ctx.get("commercial_offer") or {}
    if offer.get("proposal_title"):
        lines.append(f"КП: {offer.get('proposal_title')}")
    findings = ctx.get("confirmed_findings") or []
    if findings:
        lines.append("Подтверждённые наблюдения маркетолога:")
        for idx, row in enumerate(findings, 1):
            lines.append(f"  {idx}. [{row.get('area')}] {row.get('problem')[:200]}")
    charts = ctx.get("zone_charts") or []
    for chart in charts[:2]:
        insight = str(chart.get("insight") or "").strip()
        if insight:
            lines.append(f"Инсайт по зонам: {insight[:300]}")
    if ctx.get("limitations_hint"):
        lines.append(f"Ограничения (ориентир): {ctx['limitations_hint'][:400]}")
    if ctx.get("missing_items"):
        lines.append("Не хватает данных: " + ", ".join(ctx["missing_items"]))
    lines.append(
        "\nСформируй client snapshot: резюме для ЛПР, фразу приоритета зон, краткие ограничения."
    )
    return "\n".join(lines)


def _heuristic_draft(ctx: dict[str, Any]) -> dict[str, Any]:
    existing = dict(ctx.get("existing_summary") or {})
    client = ctx.get("client_name") or "клиент"
    goal = ctx.get("goal") or "улучшение эффективности рекламы"
    priority = str(existing.get("priority") or "medium").lower()
    if priority not in ("low", "medium", "high"):
        priority = "medium"
    problem = str(existing.get("client_problem") or "").strip()
    if not problem:
        problem = (
            f"По загруженным материалам для {client} выявлены зоны роста в контекстной рекламе. "
            f"Цель: {goal}."
        )
    risk = str(existing.get("main_risk") or "").strip()
    if not risk:
        risk = "Без системных правок по приоритетным зонам бюджет может уходить на неэффективные сегменты."
    conclusion = str(existing.get("short_conclusion") or "").strip()
    if not conclusion:
        conclusion = "Рекомендуем согласовать план работ и приоритетные зоны, затем перейти к внедрению."
    zone_phrase = ""
    charts = ctx.get("zone_charts") or []
    if charts:
        insight = str(charts[0].get("insight") or "").strip()
        if insight:
            zone_phrase = insight if insight.lower().startswith("в первую") else f"В первую очередь: {insight}"
    limitations = str(ctx.get("limitations_hint") or "").strip()
    if not limitations:
        limitations = (
            "Оценка выполнена по загруженным материалам без прямого подключения API Яндекс Директа и Метрики."
        )
    return {
        "audit_summary": {
            "client_problem": problem,
            "main_risk": risk,
            "priority": priority,
            "short_conclusion": conclusion,
        },
        "zone_priority_phrase": zone_phrase,
        "limitations_text": limitations,
    }


def _parse_draft_payload(content: str) -> dict[str, Any]:
    raw = json.loads(extract_json_from_response(content))
    if not isinstance(raw, dict):
        raise ValueError("AI вернул не объект JSON")
    summary = raw.get("audit_summary")
    if not isinstance(summary, dict):
        raise ValueError("В ответе нет audit_summary")
    priority = str(summary.get("priority") or "medium").lower()
    if priority not in ("low", "medium", "high"):
        priority = "medium"
    cleaned_summary = {
        "client_problem": str(summary.get("client_problem") or "").strip(),
        "main_risk": str(summary.get("main_risk") or "").strip(),
        "priority": priority,
        "short_conclusion": str(summary.get("short_conclusion") or "").strip(),
    }
    if not cleaned_summary["client_problem"]:
        raise ValueError("Пустое поле client_problem")
    return {
        "audit_summary": cleaned_summary,
        "zone_priority_phrase": str(raw.get("zone_priority_phrase") or "").strip(),
        "limitations_text": str(raw.get("limitations_text") or "").strip(),
        "priority_label": report_priority_label(priority),
    }


def _usage_dict(result) -> dict[str, Any] | None:
    usage = getattr(result, "usage", None)
    if usage is None:
        return None
    return {
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens,
    }


def _apply_blocked(project: AuditProject) -> str | None:
    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run:
        return "Сначала выполните успешный AI-анализ аудита."
    return None


def generate_client_snapshot_draft(
    project: AuditProject,
    *,
    model_id: str | None = None,
    router: ModelRouter | None = None,
) -> ClientSnapshotDraftResult:
    ctx = _build_context(project)
    blocked = _apply_blocked(project)
    review_notes: list[str] = ["Проверьте формулировки перед отправкой PDF клиенту."]

    if blocked:
        return ClientSnapshotDraftResult(
            draft=_heuristic_draft(ctx),
            method="heuristic_no_analysis",
            can_apply=False,
            apply_blocked_reason=blocked,
            review_notes=review_notes,
        )

    if is_force_demo_ai():
        return ClientSnapshotDraftResult(
            draft=_heuristic_draft(ctx),
            method="demo",
            model_id="demo",
            model_label="Демо-режим",
            review_notes=review_notes,
        )

    router = router or ModelRouter()
    resolved_model = (model_id or AI_SNAPSHOT_DEFAULT_MODEL).strip()

    if not router.has_any_configured_provider():
        return ClientSnapshotDraftResult(
            draft=_heuristic_draft(ctx),
            method="heuristic_no_ai",
            review_notes=[*review_notes, "AI не настроен — показан локальный черновик."],
        )

    try:
        result = router.call_for_model(
            model_id=resolved_model,
            system_prompt=SYSTEM_PROMPT,
            user_prompt=_build_user_prompt(ctx),
            temperature=0.35,
            max_tokens=1200,
            json_mode=True,
        )
        draft = _parse_draft_payload(result.content)
    except (ModelRouterError, ValueError, json.JSONDecodeError) as exc:
        logger.warning("client snapshot draft AI failed: %s", exc)
        return ClientSnapshotDraftResult(
            draft=_heuristic_draft(ctx),
            method="heuristic_fallback",
            review_notes=[*review_notes, f"AI недоступен: {exc}"],
        )

    return ClientSnapshotDraftResult(
        draft=draft,
        method="ai",
        model_id=result.model_id or resolved_model,
        model_label=result.display_model or resolved_model,
        usage=_usage_dict(result),
        cost_rub=result.cost_rub,
        cost_usd=result.cost_usd,
        review_notes=review_notes,
    )


def apply_client_snapshot_draft(project: AuditProject, draft: dict[str, Any]) -> dict[str, Any]:
    """Merge draft into latest successful ai_analysis output_json."""
    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run or not run.output_json:
        raise ValueError("Нет успешного AI-анализа для обновления")

    data = _json_loads_safe(run.output_json, {})
    if not isinstance(data, dict):
        raise ValueError("Некорректный output_json последнего анализа")

    summary_patch = draft.get("audit_summary")
    if isinstance(summary_patch, dict) and summary_patch:
        merged = {**(data.get("audit_summary") or {}), **summary_patch}
        data["audit_summary"] = merged

    zone_phrase = str(draft.get("zone_priority_phrase") or "").strip()
    if zone_phrase:
        charts = list(data.get("charts") or [])
        updated = False
        for chart in charts:
            title = str(chart.get("title") or "").lower()
            if "зон" in title or "оценка по зонам" in title:
                chart["insight"] = zone_phrase
                updated = True
                break
        if not updated and charts:
            charts[0]["insight"] = zone_phrase
        data["charts"] = charts

    run.output_json = json.dumps(data, ensure_ascii=False)
    return {
        "audit_summary": data.get("audit_summary"),
        "charts": data.get("charts"),
        "limitations_text": draft.get("limitations_text") or "",
    }


def result_to_preview_dict(result: ClientSnapshotDraftResult) -> dict[str, Any]:
    summary = (result.draft or {}).get("audit_summary") or {}
    preview_lines = [
        f"Суть: {(summary.get('client_problem') or '')[:120]}",
        f"Риск: {(summary.get('main_risk') or '')[:100]}",
        f"Приоритет: {report_priority_label(summary.get('priority'))}",
        f"Шаг: {(summary.get('short_conclusion') or '')[:100]}",
    ]
    zone = str((result.draft or {}).get("zone_priority_phrase") or "").strip()
    if zone:
        preview_lines.append(f"Зоны: {zone[:100]}")
    lim = str((result.draft or {}).get("limitations_text") or "").strip()
    if lim:
        preview_lines.append(f"Ограничения: {lim[:100]}")
    # Normalize Decimal/float money fields for API schema (Optional[str]).
    cost_rub = None if result.cost_rub is None else str(result.cost_rub)
    cost_usd = None if result.cost_usd is None else str(result.cost_usd)
    return {
        "can_generate": bool(result.draft),
        "draft": result.draft,
        "preview_lines": [line for line in preview_lines if line.strip() and not line.endswith(": ")],
        "method": result.method,
        "model_id": result.model_id,
        "model_label": result.model_label,
        "usage": result.usage,
        "cost_rub": cost_rub,
        "cost_usd": cost_usd,
        "can_apply": result.can_apply and bool(result.draft),
        "apply_blocked_reason": result.apply_blocked_reason,
        "review_notes": result.review_notes,
    }
