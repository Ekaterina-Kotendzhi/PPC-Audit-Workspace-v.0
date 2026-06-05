"""Analysis readiness gate — block AI until material review queue is cleared."""
from __future__ import annotations

from app.models import AuditProject
from app.services.material_helpers import count_ai_ready_materials


def count_materials_needs_review(project: AuditProject) -> int:
    return sum(
        1 for m in project.materials
        if m.needs_review and not getattr(m, "excluded_from_analysis", False)
    )


def build_analysis_readiness(project: AuditProject) -> dict:
    """Return readiness summary for UI and API gate."""
    review_count = count_materials_needs_review(project)
    ai_ready = count_ai_ready_materials(project)
    total_materials = len(project.materials or [])

    block_reasons: list[str] = []
    warnings: list[str] = []

    if total_materials == 0:
        # Анализ на пустом аудите разрешён (needs_review), но пользователю нужна подсказка.
        warnings.append("Добавьте хотя бы один материал для анализа")

    if review_count > 0:
        warnings.append(f"Материалов с пометкой «можно уточнить»: {review_count}")

    if total_materials > 0 and ai_ready == 0:
        block_reasons.append("Все материалы исключены из анализа")

    can_run = len(block_reasons) == 0

    return {
        "can_run_analysis": can_run,
        "needs_review_count": review_count,
        "ai_ready_materials": ai_ready,
        "total_materials": total_materials,
        "block_reasons": block_reasons,
        "warnings": warnings,
        "force_draft_allowed": True,
        "is_draft_if_forced": review_count > 0 or ai_ready == 0,
    }


def assert_analysis_allowed(project: AuditProject, *, force_draft: bool = False) -> dict:
    """Raise ValueError if analysis must not run; return readiness dict otherwise."""
    readiness = build_analysis_readiness(project)
    if readiness["can_run_analysis"]:
        return readiness
    if force_draft:
        readiness["forced_draft"] = True
        return readiness
    reasons = readiness.get("block_reasons") or ["Анализ заблокирован"]
    raise ValueError("; ".join(reasons))
