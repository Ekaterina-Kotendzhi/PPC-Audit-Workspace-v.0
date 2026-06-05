"""Report appendix: curated screenshots with marketer captions (R1.12)."""
from __future__ import annotations

import base64
import json
import mimetypes
from datetime import datetime, timezone
from typing import Any

from app.models import AuditMaterial, AuditProject
from app.services.file_service import file_url_to_path, material_file_download_url

MAX_APPENDIX_ITEMS = 3
MIN_CAPTION_LEN = 10
MAX_CAPTION_LEN = 500
ALLOWED_MATERIAL_TYPES = frozenset({"screenshot"})


class ReportAppendixValidationError(ValueError):
    """User-facing validation error for appendix payload."""


def _json_loads_safe(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def load_report_appendix_items(project: AuditProject) -> list[dict[str, Any]]:
    raw = _json_loads_safe(getattr(project, "report_appendix_json", None), {})
    if not isinstance(raw, dict):
        return []
    items = raw.get("items")
    if not isinstance(items, list):
        return []
    return [item for item in items if isinstance(item, dict)]


def _material_by_id(project: AuditProject, material_id: int) -> AuditMaterial | None:
    return next((m for m in (project.materials or []) if m.id == material_id), None)


def _screenshot_ocr_text(project: AuditProject, screenshot: AuditMaterial) -> str:
    title = (screenshot.title or "").strip()
    for material in project.materials or []:
        if material.type != "screenshot_ocr":
            continue
        ocr_title = (material.title or "").strip()
        if title and title in ocr_title:
            return (material.extracted_text or material.raw_content or "").strip()
    return ""


def _image_data_uri(file_url: str | None) -> str | None:
    if not file_url:
        return None
    path = file_url_to_path(file_url)
    if not path or not path.exists() or not path.is_file():
        return None
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if not mime.startswith("image/"):
        return None
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _image_file_path(file_url: str | None):
    if not file_url:
        return None
    path = file_url_to_path(file_url)
    if path and path.exists() and path.is_file():
        return path
    return None


def _format_source_date(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).strftime("%d.%m.%Y")


def validate_appendix_payload(project: AuditProject, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    from app.services.finding_illustration_service import material_ids_linked_to_findings

    linked_material_ids = material_ids_linked_to_findings(project)
    if len(items) > MAX_APPENDIX_ITEMS:
        raise ReportAppendixValidationError(f"Максимум {MAX_APPENDIX_ITEMS} иллюстраций в приложении")

    normalized: list[dict[str, Any]] = []
    seen_ids: set[int] = set()

    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise ReportAppendixValidationError("Некорректный формат элемента приложения")
        try:
            material_id = int(item.get("material_id"))
        except (TypeError, ValueError) as exc:
            raise ReportAppendixValidationError("Не указан material_id") from exc

        if material_id in seen_ids:
            raise ReportAppendixValidationError("Один и тот же материал нельзя добавить дважды")
        seen_ids.add(material_id)

        material = _material_by_id(project, material_id)
        if material is None:
            raise ReportAppendixValidationError(f"Материал {material_id} не найден в аудите")
        if material.type not in ALLOWED_MATERIAL_TYPES:
            raise ReportAppendixValidationError(
                f"В приложение можно добавить только скриншоты (тип «{material.type}» не поддерживается)"
            )
        if bool(getattr(material, "excluded_from_report", False)):
            raise ReportAppendixValidationError(
                "Материал исключён из отчёта — сначала верните его через «Включить в отчёт»"
            )
        if not material.file_url:
            raise ReportAppendixValidationError("У скриншота нет файла изображения")
        if material_id in linked_material_ids:
            raise ReportAppendixValidationError(
                "Скрин уже прикреплён к выводу — отредактируйте подпись на вкладке «Результаты» "
                "или снимите привязку"
            )

        caption = str(item.get("caption") or "").strip()
        if len(caption) < MIN_CAPTION_LEN:
            raise ReportAppendixValidationError(f"Подпись должна быть не короче {MIN_CAPTION_LEN} символов")
        if len(caption) > MAX_CAPTION_LEN:
            raise ReportAppendixValidationError(f"Подпись не длиннее {MAX_CAPTION_LEN} символов")

        normalized.append(
            {
                "material_id": material_id,
                "sort_order": index,
                "caption": caption,
            }
        )

    return normalized


def save_report_appendix(project: AuditProject, items: list[dict[str, Any]]) -> dict[str, Any]:
    normalized = validate_appendix_payload(project, items)
    payload = {
        "items": normalized,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    project.report_appendix_json = json.dumps(payload, ensure_ascii=False)
    return payload


def build_report_appendix_response(project: AuditProject) -> dict[str, Any]:
    stored_items = load_report_appendix_items(project)
    enriched: list[dict[str, Any]] = []

    for item in sorted(stored_items, key=lambda row: int(row.get("sort_order") or 0)):
        material_id = int(item.get("material_id"))
        material = _material_by_id(project, material_id)
        if material is None:
            continue
        enriched.append(
            {
                "material_id": material_id,
                "sort_order": int(item.get("sort_order") or 0),
                "caption": str(item.get("caption") or ""),
                "material_title": material.title,
                "material_type": material.type,
                "file_url": material_file_download_url(project.id, material.id) if material.file_url else None,
                "needs_review": bool(material.needs_review),
                "review_reason": material.review_reason,
                "ocr_hint": _screenshot_ocr_text(project, material),
                "source_date": _format_source_date(getattr(material, "created_at", None)),
            }
        )

    return {
        "items": enriched,
        "count": len(enriched),
        "max_items": MAX_APPENDIX_ITEMS,
        "updated_at": _json_loads_safe(getattr(project, "report_appendix_json", None), {}).get("updated_at"),
    }


def build_snapshot_appendix(project: AuditProject) -> list[dict[str, Any]]:
    stored_items = load_report_appendix_items(project)
    result: list[dict[str, Any]] = []

    for figure_index, item in enumerate(sorted(stored_items, key=lambda row: int(row.get("sort_order") or 0)), start=1):
        material_id = int(item.get("material_id"))
        material = _material_by_id(project, material_id)
        if material is None or material.type not in ALLOWED_MATERIAL_TYPES:
            continue
        image_uri = _image_data_uri(material.file_url)
        if not image_uri:
            continue
        result.append(
            {
                "figure_label": f"Рис. {figure_index}",
                "caption": str(item.get("caption") or "").strip(),
                "image_data_uri": image_uri,
                "image_path": str(_image_file_path(material.file_url) or ""),
                "material_title": material.title,
                "material_id": material_id,
                "needs_review": bool(material.needs_review),
                "review_reason": material.review_reason,
                "source_line": f"Источник: скриншот от {_format_source_date(getattr(material, 'created_at', None))}",
            }
        )

    return result


def remap_appendix_material_ids(
    source_items: list[dict[str, Any]],
    id_map: dict[int, int],
) -> list[dict[str, Any]]:
    remapped: list[dict[str, Any]] = []
    for item in sorted(source_items, key=lambda row: int(row.get("sort_order") or 0)):
        old_id = int(item.get("material_id"))
        new_id = id_map.get(old_id)
        if new_id is None:
            continue
        remapped.append(
            {
                "material_id": new_id,
                "caption": str(item.get("caption") or ""),
            }
        )
    return remapped[:MAX_APPENDIX_ITEMS]
