"""On-demand LLM explanation for Direct Health Score."""
from __future__ import annotations

import json
import re
from typing import Any

from app.config import is_force_demo_ai, settings
from app.models import AuditProject
from app.services.comparison_service import build_before_after_comparison
from app.services.direct_health_explain import build_health_summary_explain
from app.services.direct_slice_service import build_direct_analytics
from app.services.direct_user_copy import HEALTH_SCORE_TITLE, health_fact_line, health_missing
from app.services.model_router import ModelRouter, ModelRouterError

HEALTH_EXPLAIN_SYSTEM = f"""Ты PPC-аудитор. Объясни {HEALTH_SCORE_TITLE.lower()} (J16) маркетологу на русском языке.
Правила:
- Используй ТОЛЬКО цифры из переданного JSON (health, comparison, template_findings).
- Не придумывай метрики, кампании и периоды.
- Структура: 1) итог score/grade; 2) 2–3 главные причины; 3) план из action_plan (горизонты).
- Объём: 120–220 слов, без markdown-заголовков."""


def _slim_health_for_llm(health: dict[str, Any]) -> dict[str, Any]:
    return {
        "health_score": health.get("health_score"),
        "grade": health.get("grade"),
        "score_breakdown": health.get("score_breakdown"),
        "summary_explain": health.get("summary_explain"),
        "top_issues": (health.get("top_issues") or [])[:5],
        "template_findings": (health.get("template_findings") or [])[:5],
        "action_plan": health.get("action_plan"),
        "data_links": health.get("data_links"),
        "ml_signals": {
            "anomalies": (health.get("ml_signals") or {}).get("anomalies"),
            "cpl_cv": (health.get("ml_signals") or {}).get("cpl_cv"),
        },
    }


def _fact_lead(health: dict[str, Any]) -> str:
    return health_fact_line(health.get("health_score"), health.get("grade"))


def _is_explain_consistent(text: str, health: dict[str, Any]) -> bool:
    src_score = health.get("health_score")
    src_grade = str(health.get("grade") or "").strip().upper()
    body = str(text or "")

    if src_score is not None:
        # Guard against conflicting explicit score mentions.
        score_hits = re.findall(r"(?:score|балл)[^\d]{0,8}(\d{1,3})", body, flags=re.IGNORECASE)
        if score_hits:
            first = int(score_hits[0])
            if first != int(src_score):
                return False
    if src_grade:
        grade_hits = re.findall(r"(?:оценка|grade)[^A-F]{0,8}\b([A-F])\b", body, flags=re.IGNORECASE)
        if grade_hits:
            if grade_hits[0].upper() != src_grade:
                return False
    return True


def explain_direct_health(
    project: AuditProject,
    *,
    model_id: str | None = None,
) -> dict[str, Any]:
    direct_analytics = build_direct_analytics(project)
    health = (direct_analytics or {}).get("health")
    if not health:
        raise ValueError(health_missing())

    comparison = build_before_after_comparison(project)
    summary = build_health_summary_explain(
        health,
        comparison=comparison if comparison.get("available") else None,
    )

    router = ModelRouter()
    if is_force_demo_ai() or not router.has_any_configured_provider():
        lead = _fact_lead(health)
        text = summary if not lead else f"{lead} {summary}".strip()
        return {
            "explain": text,
            "source": "deterministic",
            "summary_explain": summary,
            "model_used": "local",
            "model_label": "Локальный режим",
        }

    payload = {
        "health": _slim_health_for_llm(health),
        "comparison": {
            "available": comparison.get("available"),
            "before": comparison.get("before"),
            "after": comparison.get("after"),
            "deltas": comparison.get("deltas"),
        } if comparison.get("available") else None,
    }
    user_prompt = f"""Данные для объяснения (JSON):
{json.dumps(payload, ensure_ascii=False, indent=2)}

Напиши объяснение score для маркетолога."""

    try:
        result = router.call_text(
            system_prompt=HEALTH_EXPLAIN_SYSTEM,
            user_prompt=user_prompt,
            temperature=min(0.35, settings.AI_TEMPERATURE_ANALYSIS),
            max_tokens=900,
            model_id=model_id,
        )
    except ModelRouterError as exc:
        lead = _fact_lead(health)
        text = summary if not lead else f"{lead} {summary}".strip()
        return {
            "explain": text,
            "source": "deterministic",
            "summary_explain": summary,
            "model_used": "fallback",
            "model_label": "Ошибка AI — показан расчётный текст",
            "error": str(exc),
        }

    text = (result.text or "").strip()
    if not text:
        text = summary
    if not _is_explain_consistent(text, health):
        lead = _fact_lead(health)
        text = summary if not lead else f"{lead} {summary}".strip()
        return {
            "explain": text,
            "source": "deterministic_guard",
            "summary_explain": summary,
            "model_used": result.model or model_id,
            "model_label": result.model_label or result.model,
            "fallback_used": bool(getattr(result, "fallback_used", False)),
        }
    lead = _fact_lead(health)
    if lead and lead.lower() not in text.lower():
        text = f"{lead} {text}".strip()
    return {
        "explain": text,
        "source": "llm",
        "summary_explain": summary,
        "model_used": result.model or model_id,
        "model_label": result.model_label or result.model,
        "fallback_used": bool(getattr(result, "fallback_used", False)),
    }
