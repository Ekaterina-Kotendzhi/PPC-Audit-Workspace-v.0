"""Attach screenshot illustrations to findings (R1.15)."""
from __future__ import annotations

import base64
import mimetypes
from typing import Any

from app.models import AuditFinding, AuditMaterial, AuditProject
from app.services.file_service import file_url_to_path, material_file_download_url

MIN_CAPTION_LEN = 10
MAX_CAPTION_LEN = 500


class FindingIllustrationError(ValueError):
    """User-facing validation error."""


def material_ids_linked_to_findings(project: AuditProject) -> set[int]:
    return {
        int(material_id)
        for finding in (project.findings or [])
        if (material_id := getattr(finding, "illustration_material_id", None))
    }


def validate_illustration_caption(caption: str | None, *, required: bool = False) -> str | None:
    value = str(caption or "").strip()
    if not value:
        if required:
            raise FindingIllustrationError(f"Подпись должна быть не короче {MIN_CAPTION_LEN} символов")
        return None
    if len(value) < MIN_CAPTION_LEN:
        raise FindingIllustrationError(f"Подпись должна быть не короче {MIN_CAPTION_LEN} символов")
    if len(value) > MAX_CAPTION_LEN:
        raise FindingIllustrationError(f"Подпись не длиннее {MAX_CAPTION_LEN} символов")
    return value


def caption_ready_for_pdf(caption: str | None) -> bool:
    value = str(caption or "").strip()
    return MIN_CAPTION_LEN <= len(value) <= MAX_CAPTION_LEN


def _material_by_id(project: AuditProject, material_id: int) -> AuditMaterial | None:
    return next((m for m in (project.materials or []) if m.id == material_id), None)


def validate_finding_illustration(project: AuditProject, material_id: int) -> AuditMaterial:
    material = _material_by_id(project, material_id)
    if material is None:
        raise FindingIllustrationError("Материал не найден в этом аудите")
    if material.type != "screenshot":
        raise FindingIllustrationError("К выводу можно прикрепить только скриншот")
    if not material.file_url:
        raise FindingIllustrationError("У скриншота нет файла изображения")
    if bool(getattr(material, "excluded_from_report", False)):
        raise FindingIllustrationError("Скриншот исключён из отчёта — сначала верните его")
    return material


def set_finding_illustration(
    finding: AuditFinding,
    project: AuditProject,
    material_id: int | None,
    *,
    caption: str | None = None,
    caption_provided: bool = False,
) -> AuditMaterial | None:
    if material_id is None:
        finding.illustration_material_id = None
        finding.illustration_caption = None
        return None

    material = validate_finding_illustration(project, material_id)
    finding.illustration_material_id = material.id
    if caption_provided:
        finding.illustration_caption = validate_illustration_caption(caption, required=False)
    return material


def update_finding_illustration_caption(finding: AuditFinding, caption: str | None) -> None:
    if not getattr(finding, "illustration_material_id", None):
        raise FindingIllustrationError("Сначала прикрепите скриншот к выводу")
    finding.illustration_caption = validate_illustration_caption(caption, required=False)


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


def enrich_finding_illustration(
    finding: AuditFinding,
    project: AuditProject,
    *,
    audit_id: int,
    include_data_uri: bool = False,
) -> dict[str, Any]:
    material_id = getattr(finding, "illustration_material_id", None)
    caption = str(getattr(finding, "illustration_caption", None) or "").strip() or None
    if not material_id:
        return {
            "illustration_material_id": None,
            "illustration_file_url": None,
            "illustration_title": None,
            "illustration_caption": None,
            "illustration_caption_ready": False,
        }
    material = _material_by_id(project, int(material_id))
    if material is None or material.type != "screenshot":
        return {
            "illustration_material_id": None,
            "illustration_file_url": None,
            "illustration_title": None,
            "illustration_caption": None,
            "illustration_caption_ready": False,
        }
    payload = {
        "illustration_material_id": material.id,
        "illustration_file_url": material_file_download_url(audit_id, material.id) if material.file_url else None,
        "illustration_title": material.title,
        "illustration_caption": caption,
        "illustration_caption_ready": caption_ready_for_pdf(caption),
        "illustration_needs_review": bool(material.needs_review),
    }
    if include_data_uri and material.file_url and caption_ready_for_pdf(caption):
        payload["illustration_image_data_uri"] = _image_data_uri(material.file_url)
    return payload


def build_report_illustrations_summary(project: AuditProject) -> dict[str, Any]:
    confirmed = [
        finding
        for finding in (project.findings or [])
        if (finding.status or "ai_generated") in ("human_confirmed", "human_edited")
    ]
    with_illustration = [f for f in confirmed if getattr(f, "illustration_material_id", None)]
    missing_caption = [
        f
        for f in with_illustration
        if not caption_ready_for_pdf(getattr(f, "illustration_caption", None))
    ]
    return {
        "confirmed_findings": len(confirmed),
        "findings_with_illustration": len(with_illustration),
        "findings_missing_caption": len(missing_caption),
    }
