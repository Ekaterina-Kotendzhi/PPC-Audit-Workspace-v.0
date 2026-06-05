"""Pre-flight cost estimate for AI analysis (M2.1)."""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditProject
from app.services.ai_model_service import default_model_id, get_catalog_entry
from app.services.ai_context_options import context_included_summary
from app.services.ai_service import SYSTEM_PROMPT, prepare_analysis_prompt_context
from app.services.model_pricing_service import (
    UsageDTO,
    calculate_cost,
    format_cost_rub,
    format_cost_usd,
)
from app.services.model_router import ModelRouter

# Conservative heuristics for Russian/JSON mixed prompts (~3 chars/token).
CHARS_PER_TOKEN = 3

DISCLAIMER = (
    "Оценка: вход (контекст) + типичный JSON-ответ анализа; тарифы за 1M токенов (как в ProxyAPI). "
    "Фактическое списание может отличаться на ±10–20% из‑за токенизатора."
)


def estimate_tokens_from_chars(char_count: int) -> int:
    if char_count <= 0:
        return 0
    return max(1, (char_count + CHARS_PER_TOKEN - 1) // CHARS_PER_TOKEN)


def estimate_completion_token_range(
    prompt_tokens: int,
    *,
    materials_count: int = 0,
    feedback_examples_count: int = 0,
) -> tuple[int, int]:
    """Typical analysis JSON size — scales with context, not a flat 2–4.5K."""
    if prompt_tokens >= 12000:
        return (2200, 4500)
    if prompt_tokens >= 8000:
        return (1500, 3200)
    if prompt_tokens >= 4000:
        return (1000, 2400)
    if materials_count <= 1 and feedback_examples_count == 0:
        return (400, 1200)
    return (500, 1500)


def estimate_analysis_cost(
    project: AuditProject,
    db: Session,
    *,
    privacy_options: dict[str, Any] | None = None,
    model_id: str | None = None,
) -> dict[str, Any]:
    options = privacy_options or {}
    resolved_model_id = model_id or options.get("model_id") or default_model_id()
    entry = get_catalog_entry(resolved_model_id) or {}
    model_label = str(entry.get("label") or resolved_model_id)

    if options.get("force_demo") or not ModelRouter().has_any_configured_provider():
        return {
            "model_id": resolved_model_id,
            "model_label": "Локальный режим",
            "local_mode": True,
            "materials_count": len(prepare_analysis_prompt_context(project, db, options)["input_data"].get("materials") or []),
            "estimated_prompt_tokens": 0,
            "estimated_completion_tokens_min": 0,
            "estimated_completion_tokens_max": 0,
            "cost_rub_min": "0.00",
            "cost_rub_max": "0.00",
            "cost_usd_min": "0.0000",
            "cost_usd_max": "0.0000",
            "disclaimer": "Локальный режим — без списания с баланса ProxyAPI.",
        }

    ctx = prepare_analysis_prompt_context(project, db, options, skip_kb_search=True)
    context_opts = ctx.get("context_options") or {}
    prompt_chars = len(SYSTEM_PROMPT) + len(ctx["user_prompt"])
    prompt_tokens = estimate_tokens_from_chars(prompt_chars)
    materials = ctx["input_data"].get("materials") or []
    feedback_count = len(ctx.get("feedback_examples") or [])
    completion_min, completion_max = estimate_completion_token_range(
        prompt_tokens,
        materials_count=len(materials),
        feedback_examples_count=feedback_count,
    )

    usage_input = UsageDTO(
        prompt_tokens=prompt_tokens,
        completion_tokens=0,
        total_tokens=prompt_tokens,
    )
    usage_min = UsageDTO(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_min,
        total_tokens=prompt_tokens + completion_min,
    )
    usage_max = UsageDTO(
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_max,
        total_tokens=prompt_tokens + completion_max,
    )
    cost_input = calculate_cost(resolved_model_id, usage_input)
    cost_min = calculate_cost(resolved_model_id, usage_min)
    cost_max = calculate_cost(resolved_model_id, usage_max)
    output_rub_min = (cost_min.cost_rub - cost_input.cost_rub) if cost_min.cost_rub is not None and cost_input.cost_rub is not None else None
    output_rub_max = (cost_max.cost_rub - cost_input.cost_rub) if cost_max.cost_rub is not None and cost_input.cost_rub is not None else None
    output_usd_min = (cost_min.cost_usd - cost_input.cost_usd) if cost_min.cost_usd is not None and cost_input.cost_usd is not None else None
    output_usd_max = (cost_max.cost_usd - cost_input.cost_usd) if cost_max.cost_usd is not None and cost_input.cost_usd is not None else None

    return {
        "model_id": resolved_model_id,
        "model_label": model_label,
        "local_mode": False,
        "materials_count": len(materials),
        "feedback_examples_count": feedback_count,
        "estimated_prompt_tokens": prompt_tokens,
        "estimated_completion_tokens_min": completion_min,
        "estimated_completion_tokens_max": completion_max,
        "cost_input_rub": format_cost_rub(cost_input.cost_rub),
        "cost_input_usd": format_cost_usd(cost_input.cost_usd),
        "cost_output_rub_min": format_cost_rub(output_rub_min),
        "cost_output_rub_max": format_cost_rub(output_rub_max),
        "cost_output_usd_min": format_cost_usd(output_usd_min),
        "cost_output_usd_max": format_cost_usd(output_usd_max),
        "cost_rub_min": format_cost_rub(cost_min.cost_rub),
        "cost_rub_max": format_cost_rub(cost_max.cost_rub),
        "cost_usd_min": format_cost_usd(cost_min.cost_usd),
        "cost_usd_max": format_cost_usd(cost_max.cost_usd),
        "disclaimer": DISCLAIMER,
        "context_included": context_included_summary(context_opts),
    }
