"""AI-assisted KPI extraction from notes, documents, and screenshots."""
from __future__ import annotations

import base64
import json
import logging
import mimetypes
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models import AuditMaterial, AuditProject
from app.services.ai_service import extract_json_from_response
from app.services.file_service import IMAGE_EXTENSIONS, file_url_to_path
from app.services.metrics_extract_service import (
    KPI_FIELDS,
    collect_metrics_extract_payload,
    metrics_extract_preview_lines,
)
from app.services.metrics_service import validate_metrics_payload
from app.services.model_router import ModelCallResult, ModelRouter, ModelRouterError

logger = logging.getLogger(__name__)

AI_METRICS_DEFAULT_MODEL = "gpt-4o-mini"
AI_REVIEW_REASON = "KPI извлечены AI — проверьте цифры перед отчётом"
MAX_VISION_BYTES = 4 * 1024 * 1024

KPI_JSON_SCHEMA = """
{
  "period": "строка периода, напр. 01.05.2026 — 31.05.2026 или май 2026",
  "budget": число расхода в рублях без валютного символа,
  "clicks": целое число кликов,
  "leads": целое число заявок/лидов,
  "sales": целое число продаж или null,
  "revenue": число выручки в рублях или null,
  "gross_profit": число валовой прибыли или null,
  "margin_percent": маржинальность 0–100 или null,
  "confidence": 0.0–1.0,
  "extraction_notes": "кратко: откуда взяты цифры"
}
""".strip()

SYSTEM_PROMPT = f"""Ты извлекаешь KPI контекстной рекламы (PPC) из материалов аудита маркетолога.
Верни только JSON без markdown. Не выдумывай цифры — если поля нет в тексте/на скрине, используй null.
Период: даты ДД.ММ.ГГГГ — ДД.ММ.ГГГГ или «месяц год» на русском.
Бюджет/выручка — числа в рублях (убери пробелы-разделители и символ ₽).
Клики, заявки, продажи — целые числа.

Схема ответа:
{KPI_JSON_SCHEMA}"""


@dataclass
class ExtractSource:
    material_id: int
    material_type: str
    title: str
    text: str = ""
    uses_vision: bool = False


@dataclass
class AiMetricsExtractResult:
    payload: dict[str, Any]
    preview_lines: list[str]
    sources: list[dict[str, Any]]
    method: str
    model_id: str | None = None
    model_label: str | None = None
    usage: dict[str, Any] | None = None
    cost_rub: Any = None
    cost_usd: Any = None
    ai_notes: str | None = None
    confidence: float | None = None
    needs_review: bool = True
    review_reasons: list[str] = field(default_factory=list)


def _normalize_ts(value: datetime | None) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _active_materials(project: AuditProject) -> list[AuditMaterial]:
    return [
        m
        for m in (project.materials or [])
        if not bool(getattr(m, "excluded_from_analysis", False))
    ]


def _material_text(material: AuditMaterial) -> str:
    return (material.extracted_text or material.raw_content or "").strip()


def _image_data_url(path: Path) -> str | None:
    if not path.is_file():
        return None
    if path.suffix.lower() not in IMAGE_EXTENSIONS:
        return None
    size = path.stat().st_size
    if size > MAX_VISION_BYTES:
        logger.warning("Screenshot too large for vision: %s bytes", size)
        return None
    mime, _ = mimetypes.guess_type(str(path))
    if not mime or not mime.startswith("image/"):
        mime = "image/png"
    encoded = base64.standard_b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _screenshot_ocr_for(project: AuditProject, screenshot: AuditMaterial) -> str:
    title = (screenshot.title or "").strip()
    for material in _active_materials(project):
        if material.type != "screenshot_ocr":
            continue
        ocr_title = (material.title or "").strip()
        if title and title in ocr_title:
            return _material_text(material)
    return ""


def _source_from_material(project: AuditProject, material: AuditMaterial) -> ExtractSource | None:
    if material.type == "screenshot":
        ocr_text = _screenshot_ocr_for(project, material)
        file_url = getattr(material, "file_url", None)
        data_url = None
        if file_url:
            local_path = file_url_to_path(file_url)
            if local_path:
                data_url = _image_data_url(Path(local_path))
        text_parts = [p for p in (ocr_text, _material_text(material)) if p]
        return ExtractSource(
            material_id=material.id,
            material_type=material.type,
            title=material.title or "Скриншот",
            text="\n\n".join(text_parts),
            uses_vision=bool(data_url),
        )

    if material.type in {"text_note", "document", "screenshot_ocr"}:
        text = _material_text(material)
        if not text:
            return None
        return ExtractSource(
            material_id=material.id,
            material_type=material.type,
            title=material.title or material.type,
            text=text,
        )
    return None


def gather_extraction_sources(
    project: AuditProject,
    *,
    note_id: int | None = None,
    material_id: int | None = None,
    include_documents: bool = True,
) -> list[ExtractSource]:
    materials = _active_materials(project)

    if material_id is not None:
        target = next((m for m in materials if m.id == material_id), None)
        if not target:
            return []
        source = _source_from_material(project, target)
        return [source] if source else []

    if note_id is not None:
        note = next((m for m in materials if m.id == note_id and m.type == "text_note"), None)
        if not note:
            return []
        source = _source_from_material(project, note)
        return [source] if source else []

    sources: list[ExtractSource] = []
    type_order = {"text_note": 0, "document": 1, "screenshot_ocr": 2, "screenshot": 3}
    candidates = [
        m
        for m in materials
        if m.type in type_order
        and (include_documents or m.type != "document")
    ]
    candidates.sort(
        key=lambda item: (
            type_order.get(item.type, 99),
            -_normalize_ts(getattr(item, "updated_at", None) or getattr(item, "created_at", None)).timestamp(),
        ),
    )
    seen_types: set[str] = set()
    for material in candidates:
        if material.type == "screenshot" and "screenshot" in seen_types:
            continue
        source = _source_from_material(project, material)
        if not source:
            continue
        if not source.text and not source.uses_vision:
            continue
        sources.append(source)
        seen_types.add(material.type)
    return sources


def _build_user_prompt(sources: list[ExtractSource]) -> str:
    blocks: list[str] = []
    for idx, source in enumerate(sources, start=1):
        header = f"--- Материал {idx}: {source.title} ({source.material_type}, id={source.material_id}) ---"
        if source.uses_vision:
            header += "\n(К этому материалу приложено изображение скриншота — прочитай KPI с картинки.)"
        body = source.text or "(текст отсутствует — смотри изображение)"
        blocks.append(f"{header}\n{body}")
    return (
        "Извлеки KPI для одного отчётного периода. Если в материалах несколько периодов — "
        "выбери самый свежий/актуальный по контексту.\n\n"
        + "\n\n".join(blocks)
    )


def _vision_urls(sources: list[ExtractSource], project: AuditProject) -> list[str]:
    urls: list[str] = []
    for source in sources:
        if not source.uses_vision:
            continue
        material = next((m for m in _active_materials(project) if m.id == source.material_id), None)
        if not material or not getattr(material, "file_url", None):
            continue
        local_path = file_url_to_path(material.file_url)
        if not local_path:
            continue
        data_url = _image_data_url(Path(local_path))
        if data_url:
            urls.append(data_url)
    return urls[:1]


def _parse_ai_payload(content: str) -> tuple[dict[str, Any], float | None, str | None]:
    raw = json.loads(extract_json_from_response(content))
    if not isinstance(raw, dict):
        raise ValueError("AI вернул не объект JSON")
    confidence = raw.pop("confidence", None)
    notes = raw.pop("extraction_notes", None)
    conf_val = float(confidence) if confidence is not None else None
    notes_str = str(notes).strip() if notes else None

    payload: dict[str, Any] = {}
    for key in (*KPI_FIELDS, "gross_profit", "margin_percent"):
        if key not in raw:
            continue
        value = raw[key]
        if value is None or value == "":
            continue
        payload[key] = value
    return payload, conf_val, notes_str


def _usage_dict(result: ModelCallResult) -> dict[str, Any] | None:
    usage = result.usage
    if usage is None:
        return None
    return {
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens,
    }


def _heuristic_result(project: AuditProject, *, note_id: int | None, material_id: int | None) -> AiMetricsExtractResult | None:
    if material_id is not None:
        return None
    payload = collect_metrics_extract_payload(
        project,
        note_id=note_id,
        include_documents=note_id is None,
    )
    if not payload:
        return None
    normalized, reasons = validate_metrics_payload(payload)
    review_reasons = list(dict.fromkeys([*reasons, AI_REVIEW_REASON]))
    return AiMetricsExtractResult(
        payload=normalized,
        preview_lines=metrics_extract_preview_lines(normalized),
        sources=[],
        method="heuristic_fallback",
        needs_review=True,
        review_reasons=review_reasons,
    )


def extract_metrics_with_ai(
    project: AuditProject,
    *,
    note_id: int | None = None,
    material_id: int | None = None,
    model_id: str | None = None,
    router: ModelRouter | None = None,
) -> AiMetricsExtractResult:
    router = router or ModelRouter()
    resolved_model = (model_id or AI_METRICS_DEFAULT_MODEL).strip()

    sources = gather_extraction_sources(
        project,
        note_id=note_id,
        material_id=material_id,
        include_documents=note_id is None and material_id is None,
    )
    if not sources:
        fallback = _heuristic_result(project, note_id=note_id, material_id=material_id)
        if fallback:
            return fallback
        raise ValueError("Нет материалов для извлечения KPI")

    if not router.has_any_configured_provider():
        fallback = _heuristic_result(project, note_id=note_id, material_id=material_id)
        if fallback:
            return fallback
        raise ModelRouterError("AI не настроен, а эвристика не нашла KPI")

    user_prompt = _build_user_prompt(sources)
    image_urls = _vision_urls(sources, project)

    try:
        result = router.call_for_model(
            model_id=resolved_model,
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.1,
            max_tokens=800,
            json_mode=True,
            image_data_urls=image_urls or None,
        )
    except ModelRouterError:
        fallback = _heuristic_result(project, note_id=note_id, material_id=material_id)
        if fallback:
            fallback.method = "heuristic_fallback_after_ai_error"
            return fallback
        raise

    payload, confidence, ai_notes = _parse_ai_payload(result.content)
    if not payload:
        fallback = _heuristic_result(project, note_id=note_id, material_id=material_id)
        if fallback:
            fallback.method = "heuristic_fallback_empty_ai"
            return fallback
        raise ValueError("AI не смог извлечь KPI из материалов")

    normalized, reasons = validate_metrics_payload(payload)
    review_reasons = list(dict.fromkeys([*reasons, AI_REVIEW_REASON]))
    if confidence is not None and confidence < 0.6:
        review_reasons.append("AI низкая уверенность в извлечении — проверьте вручную")

    source_meta = [
        {
            "material_id": s.material_id,
            "type": s.material_type,
            "title": s.title,
            "uses_vision": s.uses_vision,
        }
        for s in sources
    ]

    return AiMetricsExtractResult(
        payload=normalized,
        preview_lines=metrics_extract_preview_lines(normalized),
        sources=source_meta,
        method="ai",
        model_id=result.model_id or resolved_model,
        model_label=result.display_model or resolved_model,
        usage=_usage_dict(result),
        cost_rub=result.cost_rub,
        cost_usd=result.cost_usd,
        ai_notes=ai_notes,
        confidence=confidence,
        needs_review=True,
        review_reasons=review_reasons,
    )


def result_to_preview_dict(result: AiMetricsExtractResult) -> dict[str, Any]:
    return {
        "can_extract": bool(result.payload),
        "payload": result.payload,
        "preview_lines": result.preview_lines,
        "sources": result.sources,
        "method": result.method,
        "model_id": result.model_id,
        "model_label": result.model_label,
        "usage": result.usage,
        "cost_rub": result.cost_rub,
        "cost_usd": result.cost_usd,
        "ai_notes": result.ai_notes,
        "confidence": result.confidence,
        "needs_review": result.needs_review,
        "review_reasons": result.review_reasons,
        "note_id": None,
    }
