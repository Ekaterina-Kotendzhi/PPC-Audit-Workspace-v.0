"""Helpers for audit material status and human-readable labels."""
from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from app.models import AuditMaterial, AuditProject

# Маркетолог вручную отмечает «В AI»; новые материалы не уходят в анализ автоматически.
OPT_IN_AI_MATERIAL_TYPES = frozenset({
    "text_note",
    "audio",
    "audio_transcript",
    "screenshot",
    "screenshot_ocr",
    "document",
    "table",
})


def apply_new_material_ai_defaults(material: AuditMaterial) -> None:
    """Новый материал по умолчанию не в AI (ручной выбор на «Источники»)."""
    mtype = material.type or ""
    if mtype == "manual_metrics" or mtype in OPT_IN_AI_MATERIAL_TYPES:
        material.excluded_from_analysis = True
        if not material.exclusion_reason:
            material.exclusion_reason = "Не отмечено для AI"
    sync_material_status(material)


MATERIAL_TYPE_LABELS = {
    "text_note": "Заметка",
    "audio": "Аудиозаметка",
    "audio_transcript": "Расшифровка аудио",
    "screenshot": "Скриншот",
    "screenshot_ocr": "Описание скриншота",
    "manual_metrics": "Метрики",
    "table": "Таблица",
    "document": "Документ",
}


def material_type_label(material_type: str | None) -> str:
    return MATERIAL_TYPE_LABELS.get(material_type or "", material_type or "Материал")


def _parse_raw_meta(raw_content: str | None) -> dict[str, Any]:
    if not raw_content:
        return {}
    try:
        parsed = json.loads(raw_content)
        return parsed if isinstance(parsed, dict) else {}
    except (json.JSONDecodeError, TypeError):
        return {}


def get_marketer_ai_hint(material: AuditMaterial) -> str:
    """Optional marketer note for AI (stored in raw_content JSON)."""
    return str(_parse_raw_meta(getattr(material, "raw_content", None)).get("marketer_ai_hint") or "").strip()


def set_marketer_ai_hint(material: AuditMaterial, hint: str) -> None:
    hint = (hint or "").strip()
    meta = _parse_raw_meta(getattr(material, "raw_content", None))
    if material.type == "text_note":
        body = (material.extracted_text or material.raw_content or "").strip()
        if not meta.get("text") and body and not meta:
            meta = {}
        if body:
            meta["text"] = body
    if hint:
        meta["marketer_ai_hint"] = hint
    else:
        meta.pop("marketer_ai_hint", None)
    material.raw_content = json.dumps(meta, ensure_ascii=False) if meta else None


def find_screenshot_ocr_sibling(project: AuditProject, screenshot: AuditMaterial) -> AuditMaterial | None:
    if (screenshot.type or "") != "screenshot":
        return None
    label = f"OCR/описание: {screenshot.title or ''}"
    for mat in project.materials or []:
        if (mat.type or "") == "screenshot_ocr" and (mat.title or "") == label:
            return mat
    return None


def parser_meta_from_material(material: AuditMaterial) -> dict[str, Any]:
    meta = _parse_raw_meta(getattr(material, "raw_content", None))
    parser = meta.get("parser")
    return parser if isinstance(parser, dict) else {}


def is_semantics_export_material(material: AuditMaterial) -> bool:
    """Excel with phrases / minus-words / ad texts — not Yandex Direct master KPI report."""
    if (material.type or "") != "document":
        return False
    meta = _parse_raw_meta(getattr(material, "raw_content", None))
    if meta.get("document_kind") == "direct_semantics_export":
        return True
    parser = meta.get("parser")
    if isinstance(parser, dict) and parser.get("document_kind") == "direct_semantics_export":
        return True
    sl = meta.get("document_slice")
    if isinstance(sl, dict) and sl.get("format") == "direct_semantics_export":
        return True
    head = (material.extracted_text or "")[:400].lower()
    return "справочник фраз" in head or (
        "## тексты" in head and "мастер отчёт" not in head
    )


def semantics_export_card_label(material: AuditMaterial) -> str:
    root = _parse_raw_meta(getattr(material, "raw_content", None))
    sl = root.get("document_slice")
    if not isinstance(sl, dict):
        sl = parser_meta_from_material(material).get("document_slice")
    sheets = sl.get("sheets") if isinstance(sl, dict) else None
    if isinstance(sheets, list) and sheets:
        return f"Фразы и минус-слова · {', '.join(str(s) for s in sheets[:3])}"
    return "Фразы, минус-слова и тексты (Excel)"


def document_slice_from_material(material: AuditMaterial) -> dict[str, Any] | None:
    """Structured Yandex Direct (or similar) slice stored in raw_content JSON."""
    raw = getattr(material, "raw_content", None)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    slice_data = data.get("document_slice")
    return slice_data if isinstance(slice_data, dict) else None


def sync_material_status(material: AuditMaterial) -> None:
    """Keep status column aligned with review/exclusion flags."""
    if material.excluded_from_analysis or material.excluded_from_report:
        material.status = "excluded"
        return
    if material.needs_review:
        material.status = "needs_review"
        return
    if material.status == "processing_error":
        return
    material.status = "ready"


def _transcript_confirmed(material: AuditMaterial) -> bool:
    try:
        raw = json.loads(material.raw_content or "{}")
        return bool(raw.get("confirmed"))
    except (TypeError, json.JSONDecodeError):
        return False


def _material_text(material: AuditMaterial) -> str:
    return (material.extracted_text or material.raw_content or "").strip()


def material_pipeline_status(material: AuditMaterial) -> tuple[str, str]:
    """UI badge on «Данные»: how this material participates in AI / KPI."""
    if material.excluded_from_analysis:
        return "excluded", "Не в AI"
    mtype = material.type or ""
    if material.needs_review:
        if mtype == "audio_transcript":
            try:
                raw = json.loads(material.raw_content or "{}")
                if raw.get("source") == "web_speech" and not raw.get("confirmed"):
                    return "awaiting_confirm", "Подтвердите расшифровку"
            except (TypeError, json.JSONDecodeError):
                pass
        return "optional_review", "Можно уточнить"
    if mtype == "audio":
        return "awaiting_transcript", "Ждёт расшифровки"
    if mtype == "screenshot":
        return "in_ai", "В AI"
    if mtype == "audio_transcript":
        text = _material_text(material)
        if len(text) < 10:
            return "awaiting_text", "Мало текста для AI"
        try:
            raw = json.loads(material.raw_content or "{}")
            if raw.get("source") == "web_speech" and not raw.get("confirmed"):
                return "awaiting_confirm", "Подтвердите расшифровку"
        except (TypeError, json.JSONDecodeError):
            pass
    if material_for_ai(material):
        if mtype == "manual_metrics":
            return "in_ai_kpi", "В KPI и AI-анализе"
        return "in_ai", "В AI"
    return "not_in_ai", "Не в AI"


def material_for_ai(material: AuditMaterial) -> bool:
    """Materials allowed into AI analysis context (ручной выбор «В AI», без блокировки по needs_review)."""
    if material.excluded_from_analysis:
        return False

    mtype = material.type or ""

    if mtype == "audio":
        return False

    if mtype == "screenshot":
        return True

    if mtype == "screenshot_ocr":
        return True

    if mtype == "audio_transcript":
        return True

    if mtype in {"text_note", "document", "manual_metrics", "table"}:
        if mtype == "manual_metrics":
            return bool(material.raw_content)
        return bool(_material_text(material) or get_marketer_ai_hint(material))

    return bool(_material_text(material) or material.file_url or get_marketer_ai_hint(material))


def material_for_qa(material: AuditMaterial) -> bool:
    """Broader set for Q&A: includes needs_review with warning flag in context."""
    if material.excluded_from_analysis:
        return False
    if material.type == "audio":
        return bool(material.file_url)
    return bool(_material_text(material) or material.raw_content or material.file_url)


def count_ai_ready_materials(project: AuditProject) -> int:
    return sum(1 for m in project.materials if material_for_ai(m))


def _normalize_text_key(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", (text or "").strip().lower())
    return hashlib.sha256(cleaned.encode("utf-8")).hexdigest()[:16]


def dedupe_materials_for_display(materials: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Collapse duplicate transcripts and pair audio with transcript for reports/UI."""
    seen_text: set[str] = set()
    result: list[dict[str, Any]] = []
    transcripts_by_title: dict[str, dict[str, Any]] = {}

    for item in materials:
        mtype = item.get("type") or ""
        if mtype == "audio_transcript":
            content = str(item.get("content") or item.get("extracted_text") or "")
            key = _normalize_text_key(content)
            if key in seen_text:
                continue
            seen_text.add(key)
            title_base = (item.get("title") or "").replace("Расшифровка: ", "")
            transcripts_by_title[title_base] = item
            continue
        if mtype == "audio":
            title = item.get("title") or ""
            transcript = transcripts_by_title.get(title)
            merged = dict(item)
            merged["type_label"] = "Аудиозаметка"
            if transcript:
                merged["transcript"] = transcript.get("content") or transcript.get("extracted_text")
                merged["transcript_needs_review"] = transcript.get("needs_review")
            result.append(merged)
            continue
        if mtype == "screenshot_ocr":
            continue
        if mtype == "screenshot":
            title = item.get("title") or ""
            ocr = next(
                (m for m in materials if m.get("type") == "screenshot_ocr" and title in (m.get("title") or "")),
                None,
            )
            merged = dict(item)
            if ocr:
                merged["ocr_text"] = ocr.get("content") or ocr.get("extracted_text")
            result.append(merged)
            continue
        content = str(item.get("content") or "")
        if mtype in {"text_note", "document"} and content:
            key = _normalize_text_key(content[:500])
            if key in seen_text:
                continue
            seen_text.add(key)
        result.append(item)

    for item in materials:
        if item.get("type") == "audio_transcript":
            title_base = (item.get("title") or "").replace("Расшифровка: ", "")
            if not any(r.get("title") == title_base and r.get("type") == "audio" for r in result):
                content = str(item.get("content") or "")
                key = _normalize_text_key(content)
                if key not in seen_text:
                    seen_text.add(key)
                    result.append(item)

    return result


def material_for_report(material: AuditMaterial) -> bool:
    return not material.excluded_from_report
