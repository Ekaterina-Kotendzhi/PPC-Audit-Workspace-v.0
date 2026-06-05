"""Rule-based hints after AI analysis for marketer modal (M2.17.2)."""
from __future__ import annotations

from typing import Any

from app.models import AuditProject
from app.services.audit_run_helpers import latest_run
from app.services.data_coverage_service import assess_data_coverage
from app.services.material_helpers import find_screenshot_ocr_sibling


def build_post_analysis_hints(project: AuditProject) -> list[dict[str, str]]:
    hints: list[dict[str, str]] = []
    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    summary = {}
    if run and run.output_json:
        import json

        try:
            data = json.loads(run.output_json)
            if isinstance(data, dict):
                summary = data.get("audit_summary") or {}
        except json.JSONDecodeError:
            summary = {}

    main_risk = (summary.get("main_risk") or "").strip()
    if main_risk:
        hints.append({
            "id": "main_risk",
            "title": "Главный риск",
            "text": main_risk[:400],
        })

    pending = [
        f for f in (project.findings or [])
        if (f.status or "ai_generated") not in ("human_confirmed", "human_edited", "human_rejected")
    ]
    if pending:
        first = pending[0]
        title = getattr(first, "title", None) or first.problem or f"Вывод #{first.id}"
        hints.append({
            "id": "first_review",
            "title": "С чего начать проверку",
            "text": f"«{(title or '')[:120]}» — и ещё {max(0, len(pending) - 1)} в очереди.",
        })
    else:
        hints.append({
            "id": "first_review",
            "title": "Проверка выводов",
            "text": "Все выводы уже проверены — можно перейти к отчёту и PDF.",
        })

    coverage = assess_data_coverage(project)
    missing = [
        str(i.get("label") or "").strip()
        for i in (coverage.get("missing_items") or [])
        if i.get("label")
    ]
    if missing:
        hints.append({
            "id": "more_data",
            "title": "Нужны ли ещё данные",
            "text": f"Для полноты: {', '.join(missing[:3])}{'…' if len(missing) > 3 else ''}.",
        })
    else:
        hints.append({
            "id": "more_data",
            "title": "Нужны ли ещё данные",
            "text": "Базовый набор для аудита загружен.",
        })

    bare_screenshots: list[str] = []
    for mat in project.materials or []:
        if (mat.type or "") != "screenshot" or getattr(mat, "excluded_from_analysis", False):
            continue
        ocr = find_screenshot_ocr_sibling(project, mat)
        ocr_text = ""
        if ocr and not getattr(ocr, "excluded_from_analysis", False):
            ocr_text = (ocr.extracted_text or ocr.raw_content or "").strip()
        if not ocr_text:
            bare_screenshots.append(mat.title or f"скрин #{mat.id}")
    if bare_screenshots:
        sample = ", ".join(bare_screenshots[:2])
        extra = f" и ещё {len(bare_screenshots) - 2}" if len(bare_screenshots) > 2 else ""
        hints.append({
            "id": "screenshots_no_ocr",
            "title": "Скриншоты без текста для AI",
            "text": (
                f"{sample}{extra}: нет OCR/описания — AI не видит картинку, только Excel и KPI. "
                "При загрузке заполните поле «Текст со скрина» или включите Tesseract в .env (OCR_PROVIDER=tesseract_cli)."
            ),
        })

    return hints[:4]
