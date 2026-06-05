import asyncio
import json
import logging
import mimetypes
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import AuditProject, AuditMaterial
from app.schemas import (
    AddTextNoteRequest,
    AddMetricsRequest,
    AiMetricsExtractPreviewResponse,
    ImportDirectPeriodsResponse,
    MaterialResponse,
    MaterialReviewRequest,
    UpdateMaterialRequest,
)
from app.services.direct_slice_service import import_monthly_periods_from_material
from app.services.transcript_quality import assess_transcript_quality
from app.services.content_quality_service import suggest_review_for_content
from app.services.metrics_service import validate_metrics_payload
from app.services.document_parser import parse_document
from app.services.material_helpers import (
    is_semantics_export_material,
    get_marketer_ai_hint,
    set_marketer_ai_hint,
    apply_new_material_ai_defaults,
    document_slice_from_material,
    material_pipeline_status,
    material_type_label,
    sync_material_status,
)
from app.services.file_service import (
    AUDIO_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    IMAGE_EXTENSIONS,
    file_url_to_path,
    log_audit_action,
    material_file_download_url,
    save_upload_file,
)
from app.services.screenshot_ocr_service import OCRUnavailable, extract_text_from_screenshot
from app.services.stt_service import STTUnavailable, transcribe_audio_file
from app.services.metrics_extract_service import (
    METRICS_EXTRACT_LABELS as _METRICS_EXTRACT_LABELS,
    collect_metrics_extract_payload as _collect_metrics_extract_payload,
    extract_metrics_from_xlsx as _extract_metrics_from_xlsx,
    extract_metrics_payload_from_text as _extract_metrics_payload_from_text,
    metrics_extract_preview_lines as _metrics_extract_preview_lines,
    parse_num as _parse_num,
)
from app.services.manual_metrics_service import touch_material as _touch_material, upsert_manual_metrics as _upsert_manual_metrics
from app.services.note_metrics_service import sync_manual_metrics_from_note
from app.services.ai_model_service import validate_model_id
from app.services.ai_metrics_extract_service import (
    AI_METRICS_DEFAULT_MODEL,
    extract_metrics_with_ai,
    result_to_preview_dict,
)
from app.services.model_router import ModelRouterError

logger = logging.getLogger(__name__)
DOCUMENT_PARSE_TIMEOUT_SEC = 120

router = APIRouter(prefix="/api/audits/{audit_id}/materials", tags=["materials"])

# Создаем папку для загрузок
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def _get_project_or_404(audit_id: int, db: Session) -> AuditProject:
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    return project


def _add_new_material(db: Session, material: AuditMaterial) -> AuditMaterial:
    apply_new_material_ai_defaults(material)
    db.add(material)
    return material


def _try_ocr_screenshot_file(material: AuditMaterial) -> tuple[str, dict[str, Any]]:
    """Run Tesseract on stored screenshot file (if configured)."""
    if not material.file_url:
        return "", {}
    local_path = file_url_to_path(material.file_url)
    if not local_path:
        return "", {}
    try:
        ocr_result = extract_text_from_screenshot(local_path)
        text = str(ocr_result.get("text") or "").strip()
        meta: dict[str, Any] = {
            "provider": ocr_result.get("provider"),
            "confidence": float(ocr_result.get("confidence") or 0.0),
            "source": "server_ocr",
        }
        return text, meta
    except OCRUnavailable as exc:
        return "", {"source": "server_ocr", "error": str(exc)}


def _merge_ocr_meta_into_screenshot(material: AuditMaterial, ocr_meta: dict[str, Any]) -> None:
    if not ocr_meta:
        return
    try:
        raw = json.loads(material.raw_content or "{}")
    except json.JSONDecodeError:
        raw = {}
    if not isinstance(raw, dict):
        raw = {}
    raw["ocr"] = ocr_meta
    material.raw_content = json.dumps(raw, ensure_ascii=False)


def _upsert_screenshot_ocr_sibling(
    db: Session,
    audit_id: int,
    screenshot: AuditMaterial,
    text: str,
    *,
    from_auto_ocr: bool = False,
) -> None:
    min_len = max(1, int(settings.OCR_MIN_TEXT_LENGTH))
    has_ocr_text = bool(text and len(text) >= min_len)
    sibling = db.query(AuditMaterial).filter(
        AuditMaterial.audit_project_id == audit_id,
        AuditMaterial.type == "screenshot_ocr",
        AuditMaterial.title == f"OCR/описание: {screenshot.title}",
    ).first()
    confidence = 0.85 if from_auto_ocr else 1.0
    if sibling:
        sibling.raw_content = text
        sibling.extracted_text = text
        sibling.needs_review = not has_ocr_text
        sibling.review_reason = None if has_ocr_text else "OCR слишком короткий, нужен ручной контекст"
        if from_auto_ocr:
            sibling.confidence = confidence
    else:
        _add_new_material(
            db,
            AuditMaterial(
                audit_project_id=audit_id,
                type="screenshot_ocr",
                title=f"OCR/описание: {screenshot.title}",
                raw_content=text,
                extracted_text=text,
                confidence=confidence,
                needs_review=not has_ocr_text,
                review_reason=None if has_ocr_text else "OCR слишком короткий, нужен ручной контекст",
            ),
        )
    screenshot.needs_review = not has_ocr_text
    screenshot.review_reason = (
        None
        if has_ocr_text
        else "На скриншоте нет OCR/описания достаточной длины; выводы по нему требуют проверки"
    )


def _document_kind_from_material(material: AuditMaterial) -> str | None:
    try:
        meta = json.loads(material.raw_content or "{}")
    except (TypeError, json.JSONDecodeError):
        return None
    if not isinstance(meta, dict):
        return None
    kind = meta.get("document_kind")
    if kind:
        return str(kind)
    parser = meta.get("parser")
    if isinstance(parser, dict) and parser.get("document_kind"):
        return str(parser["document_kind"])
    sl = meta.get("document_slice")
    if isinstance(sl, dict) and sl.get("format") == "direct_semantics_export":
        return "direct_semantics_export"
    return "direct_semantics_export" if is_semantics_export_material(material) else None


def _material_response(material: AuditMaterial) -> MaterialResponse:
    sync_material_status(material)
    pipe_code, pipe_label = material_pipeline_status(material)
    return MaterialResponse(
        id=material.id,
        type=material.type,
        type_label=material_type_label(material.type),
        pipeline_status=pipe_code,
        pipeline_label=pipe_label,
        title=material.title,
        file_url=material_file_download_url(material.audit_project_id, material.id) if material.file_url else None,
        extracted_text=material.extracted_text,
        document_slice=document_slice_from_material(material),
        document_kind=_document_kind_from_material(material),
        raw_content=material.raw_content,
        needs_review=material.needs_review,
        review_reason=material.review_reason,
        status=getattr(material, "status", None) or ("needs_review" if material.needs_review else "ready"),
        excluded_from_analysis=bool(getattr(material, "excluded_from_analysis", False)),
        excluded_from_report=bool(getattr(material, "excluded_from_report", False)),
        exclusion_reason=getattr(material, "exclusion_reason", None),
        marketer_ai_hint=get_marketer_ai_hint(material) or None,
        created_at=material.created_at,
        updated_at=getattr(material, "updated_at", None) or material.created_at,
    )


@router.get("", response_model=List[MaterialResponse])
def list_materials(audit_id: int, db: Session = Depends(get_db)):
    """Список материалов аудита.

    Нужен для веб-панели, внешних API-клиентов и pytest критического пути.
    """
    project = _get_project_or_404(audit_id, db)
    return [_material_response(material) for material in project.materials]


@router.get("/", response_model=List[MaterialResponse])
def list_materials_slash(audit_id: int, db: Session = Depends(get_db)):
    """То же самое с завершающим slash для совместимости."""
    return list_materials(audit_id, db)


@router.post("", response_model=MaterialResponse, status_code=201)
def add_material_compat(audit_id: int, payload: dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """Совместимый endpoint для тестов/интеграций.

    Поддерживает упрощённый формат:
    - {"material_type": "text", "content": "..."}
    - {"material_type": "metrics", "spend": 100000, "clicks": 1000, ...}
    Основной API по-прежнему остаётся /text, /metrics, /audio, /screenshot.
    """
    material_type = str(payload.get("material_type") or payload.get("type") or "").strip().lower()
    if material_type in {"text", "text_note", "note"}:
        content = str(payload.get("content") or "").strip()
        if not content:
            raise HTTPException(status_code=422, detail="content is required")
        data = AddTextNoteRequest(title=payload.get("title") or "Текстовая заметка", content=content)
        return add_text_note(audit_id, data, db)

    if material_type in {"metrics", "manual_metrics"}:
        data = AddMetricsRequest(
            period=payload.get("period") or "",
            budget=payload.get("budget", payload.get("spend")),
            clicks=payload.get("clicks"),
            leads=payload.get("leads"),
            sales=payload.get("sales"),
            revenue=payload.get("revenue"),
        )
        return add_metrics(audit_id, data, db)

    raise HTTPException(status_code=422, detail="Unsupported material_type. Use text or metrics.")


@router.post("/text", response_model=MaterialResponse, status_code=201)
def add_text_note(audit_id: int, data: AddTextNoteRequest, db: Session = Depends(get_db)):
    """Добавить текстовую заметку."""
    project = _get_project_or_404(audit_id, db)
    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Текст заметки не может быть пустым")

    material = AuditMaterial(
        audit_project_id=audit_id,
        type="text_note",
        title=(data.title or "Текстовая заметка").strip(),
        raw_content=content,
        extracted_text=content,
        confidence=1.0,
        needs_review=False,
    )
    quality_reason = suggest_review_for_content(content, "text_note")
    if quality_reason:
        material.needs_review = True
        material.review_reason = quality_reason
        material.status = "needs_review"
    _add_new_material(db, material)
    db.flush()
    db.refresh(project)
    sync_manual_metrics_from_note(project, db, material)
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="add_text_note",
        input_json=json.dumps({"title": material.title}, ensure_ascii=False),
        output_json=json.dumps({"material_id": material.id}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(material)
    return _material_response(material)


@router.post("/audio", response_model=MaterialResponse, status_code=201)
async def add_audio(
    audit_id: int,
    file: UploadFile | None = File(None),
    title: str = Form("Аудиозаметка"),
    manual_transcript: str = Form(""),
    transcript_source: str = Form("manual"),
    transcript_confidence: float | None = Form(None),
    transcript_confirmed: bool = Form(False),
    db: Session = Depends(get_db),
):
    """Загрузить аудиофайл и/или сохранить ручную расшифровку.

    Для легкого MVP автоматический Speech-to-Text не обязателен: расшифровку можно
    вставить вручную или продиктовать через браузерный Web Speech API на фронтенде.
    """
    _get_project_or_404(audit_id, db)
    clean_title = (title or "Аудиозаметка").strip()
    transcript = (manual_transcript or "").strip()
    transcript_source = (transcript_source or "manual").strip()
    if transcript_source not in {"manual", "web_speech", "external_stt", "server_stt"}:
        transcript_source = "manual"
    transcript_quality = assess_transcript_quality(
        transcript,
        source=transcript_source,
        client_confidence=transcript_confidence,
        confirmed=transcript_confirmed,
    ) if transcript else {"confidence": 0.0, "needs_review": True, "review_reason": "Расшифровка отсутствует"}

    if not file and not transcript:
        raise HTTPException(
            status_code=400,
            detail="Добавьте аудиофайл или текст расшифровки",
        )

    file_url = None
    file_size = None
    stt_meta = None
    if file and file.filename:
        file_url, file_size = await save_upload_file(
            file,
            subdir="audio",
            allowed_extensions=AUDIO_EXTENSIONS,
            default_ext=".webm",
        )
        # Optional local Whisper mode: audio stays on this server, no browser/cloud STT.
        if not transcript and settings.STT_PROVIDER == "local_whisper":
            try:
                local_path = file_url_to_path(file_url)
                if local_path:
                    stt_meta = transcribe_audio_file(local_path)
                    transcript = str(stt_meta.get("text") or "").strip()
                    transcript_source = "server_stt"
                    transcript_confidence = float(stt_meta.get("confidence") or 0)
                    transcript_quality = assess_transcript_quality(
                        transcript,
                        source=transcript_source,
                        client_confidence=transcript_confidence,
                        confirmed=False,
                    ) if transcript else {"confidence": 0.0, "needs_review": True, "review_reason": "Локальный Whisper не получил текст"}
            except STTUnavailable as exc:
                stt_meta = {"error": str(exc)}

    # Если пользователь добавил только расшифровку без файла — создаем материал transcript.
    if transcript and not file_url:
        material = AuditMaterial(
            audit_project_id=audit_id,
            type="audio_transcript",
            title=f"Расшифровка: {clean_title}",
            raw_content=json.dumps({"text": transcript, "source": transcript_source, "confirmed": transcript_confirmed}, ensure_ascii=False),
            extracted_text=transcript,
            confidence=float(transcript_quality["confidence"]),
            needs_review=bool(transcript_quality["needs_review"]),
            review_reason=transcript_quality.get("review_reason"),
        )
        _add_new_material(db, material)
        db.flush()
    else:
        material = AuditMaterial(
            audit_project_id=audit_id,
            type="audio",
            title=clean_title,
            file_url=file_url,
            raw_content=json.dumps({"file_size": file_size, "transcript_source": transcript_source, "server_stt": stt_meta}, ensure_ascii=False) if file_size else None,
            needs_review=(not transcript) or bool(transcript_quality["needs_review"]),
            review_reason=(("Аудиофайл загружен, но расшифровка отсутствует" + (f"; {stt_meta.get('error')}" if isinstance(stt_meta, dict) and stt_meta.get("error") else "")) if not transcript else transcript_quality.get("review_reason")),
        )
        _add_new_material(db, material)
        db.flush()

        if transcript:
            transcript_material = AuditMaterial(
                audit_project_id=audit_id,
                type="audio_transcript",
                title=f"Расшифровка: {clean_title}",
                raw_content=json.dumps({"text": transcript, "source": transcript_source, "confirmed": transcript_confirmed}, ensure_ascii=False),
                extracted_text=transcript,
                confidence=float(transcript_quality["confidence"]),
                needs_review=bool(transcript_quality["needs_review"]),
                review_reason=transcript_quality.get("review_reason"),
            )
            _add_new_material(db, transcript_material)

    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="add_audio",
        input_json=json.dumps(
            {"title": clean_title, "has_file": bool(file_url), "has_transcript": bool(transcript), "transcript_source": transcript_source, "transcript_confidence": transcript_quality.get("confidence")},
            ensure_ascii=False,
        ),
        output_json=json.dumps({"material_id": material.id}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(material)
    return _material_response(material)


@router.post("/screenshot", response_model=MaterialResponse, status_code=201)
async def add_screenshot(
    audit_id: int,
    file: UploadFile = File(...),
    title: str = Form("Скриншот"),
    manual_ocr_text: str = Form(""),
    direct_setup_kind: str = Form("other"),
    db: Session = Depends(get_db),
):
    """Загрузить скриншот с опциональным ручным OCR/описанием."""
    _get_project_or_404(audit_id, db)
    clean_title = (title or "Скриншот").strip()
    ocr_text = (manual_ocr_text or "").strip()
    ocr_meta: dict[str, Any] = {}

    file_url, file_size = await save_upload_file(
        file,
        subdir="screenshots",
        allowed_extensions=IMAGE_EXTENSIONS,
        default_ext=".png",
    )
    if not ocr_text:
        probe = AuditMaterial(audit_project_id=audit_id, type="screenshot", file_url=file_url)
        ocr_text, ocr_meta = _try_ocr_screenshot_file(probe)

    has_ocr_text = bool(ocr_text and len(ocr_text) >= max(1, int(settings.OCR_MIN_TEXT_LENGTH)))

    setup_kind = (direct_setup_kind or "other").strip().lower()
    if setup_kind not in {"structure", "strategy", "adjustments", "creative", "other"}:
        setup_kind = "other"

    material = AuditMaterial(
        audit_project_id=audit_id,
        type="screenshot",
        title=clean_title,
        file_url=file_url,
        raw_content=json.dumps(
            {"file_size": file_size, "ocr": ocr_meta, "direct_setup_kind": setup_kind},
            ensure_ascii=False,
        ),
        needs_review=not has_ocr_text,
        review_reason="На скриншоте нет OCR/описания достаточной длины; выводы по нему требуют проверки" if not has_ocr_text else None,
    )
    _add_new_material(db, material)
    db.flush()
    if ocr_meta:
        _merge_ocr_meta_into_screenshot(material, ocr_meta)
    if ocr_text:
        _upsert_screenshot_ocr_sibling(db, audit_id, material, ocr_text, from_auto_ocr=bool(ocr_meta))

    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="add_screenshot",
        input_json=json.dumps(
            {"title": clean_title, "has_description": bool(ocr_text)},
            ensure_ascii=False,
        ),
        output_json=json.dumps({"material_id": material.id}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(material)
    return _material_response(material)


@router.post("/metrics", response_model=MaterialResponse, status_code=201)
def add_metrics(audit_id: int, data: AddMetricsRequest, db: Session = Depends(get_db)):
    """Добавить период ручных метрик (новая строка; не перезаписывает другие периоды)."""
    project = _get_project_or_404(audit_id, db)

    payload = data.model_dump(exclude_none=True, exclude={"set_active"})
    if not payload:
        raise HTTPException(status_code=400, detail="Добавьте хотя бы один показатель")

    try:
        normalized, review_reasons = validate_metrics_payload(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    content = json.dumps(normalized, ensure_ascii=False)
    needs_review = bool(review_reasons)
    review_reason = "; ".join(dict.fromkeys(review_reasons)) if review_reasons else None

    material = AuditMaterial(
        audit_project_id=audit_id,
        type="manual_metrics",
        title=f"Метрики: {normalized.get('period') or 'без периода'}",
        raw_content=content,
        extracted_text=content,
        confidence=1.0,
        needs_review=needs_review,
        review_reason=review_reason,
        status="needs_review" if needs_review else "ready",
    )
    sync_material_status(material)
    _add_new_material(db, material)
    db.flush()
    from app.services.metrics_periods_service import ensure_active_metrics_material_id

    ensure_active_metrics_material_id(project, db)
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="add_metrics",
        input_json=content,
        output_json=json.dumps({"material_id": material.id, "set_active": data.set_active}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(material)
    return _material_response(material)


@router.get("/extract-metrics/preview")
def preview_extract_metrics(
    audit_id: int,
    note_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Dry-run for FR-7B: show KPI fields that would be written to manual_metrics."""
    project = _get_project_or_404(audit_id, db)
    payload = _collect_metrics_extract_payload(project, note_id=note_id)
    return {
        "can_extract": bool(payload),
        "payload": payload,
        "preview_lines": _metrics_extract_preview_lines(payload),
        "note_id": note_id,
    }


@router.post("/extract-metrics", response_model=MaterialResponse)
def extract_metrics_from_documents(
    audit_id: int,
    note_id: int | None = None,
    db: Session = Depends(get_db),
):
    """Extract period/budget/clicks/leads from notes (or one note) and optional documents."""
    project = _get_project_or_404(audit_id, db)
    payload = _collect_metrics_extract_payload(
        project,
        note_id=note_id,
        include_documents=note_id is None,
    )

    if not payload:
        raise HTTPException(
            status_code=409,
            detail="Не удалось извлечь метрики из заметки или документов",
        )

    try:
        target = _upsert_manual_metrics(audit_id, payload, db, project=project)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=f"Извлечённые данные невалидны: {exc}") from exc
    action = "extract_metrics_update"

    log_audit_action(
        db,
        audit_project_id=audit_id,
        action=action,
        input_json=json.dumps(
            {
                "source": "text_note" if note_id else "document/text",
                "note_id": note_id,
                "extracted_keys": sorted(list(payload.keys())),
            },
            ensure_ascii=False,
        ),
        output_json=json.dumps({"material_id": target.id}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(target)
    return _material_response(target)


def _resolve_ai_extract_model(model_id: str | None) -> str:
    if not model_id or not str(model_id).strip():
        return AI_METRICS_DEFAULT_MODEL
    try:
        validate_model_id(model_id, require_available=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return str(model_id).strip()


def _run_ai_metrics_extract(
    project: AuditProject,
    *,
    note_id: int | None,
    material_id: int | None,
    model_id: str | None,
):
    resolved_model = _resolve_ai_extract_model(model_id)
    try:
        return extract_metrics_with_ai(
            project,
            note_id=note_id,
            material_id=material_id,
            model_id=resolved_model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ModelRouterError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/extract-metrics/ai/preview", response_model=AiMetricsExtractPreviewResponse)
def preview_ai_extract_metrics(
    audit_id: int,
    note_id: int | None = None,
    material_id: int | None = None,
    model_id: str | None = None,
    db: Session = Depends(get_db),
):
    """Dry-run: AI extraction of KPI from notes, documents, or screenshots."""
    project = _get_project_or_404(audit_id, db)
    result = _run_ai_metrics_extract(project, note_id=note_id, material_id=material_id, model_id=model_id)
    preview = result_to_preview_dict(result)
    preview["note_id"] = note_id
    preview["material_id"] = material_id
    return preview


@router.post("/extract-metrics/ai", response_model=MaterialResponse)
def apply_ai_extract_metrics(
    audit_id: int,
    note_id: int | None = None,
    material_id: int | None = None,
    model_id: str | None = None,
    db: Session = Depends(get_db),
):
    """Extract KPI via AI and write to manual_metrics (always needs_review)."""
    project = _get_project_or_404(audit_id, db)
    result = _run_ai_metrics_extract(project, note_id=note_id, material_id=material_id, model_id=model_id)
    if not result.payload:
        raise HTTPException(status_code=409, detail="Не удалось извлечь KPI из материалов")

    try:
        target = _upsert_manual_metrics(audit_id, result.payload, db, project=project)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=f"Извлечённые данные невалидны: {exc}") from exc

    existing_reasons = [p.strip() for p in (target.review_reason or "").split("; ") if p.strip()]
    merged_reasons = list(dict.fromkeys([*(result.review_reasons or []), *existing_reasons]))
    merged_reasons = [r for r in merged_reasons if r]
    target.needs_review = True
    target.review_reason = "; ".join(merged_reasons) if merged_reasons else None
    sync_material_status(target)
    _touch_material(target)

    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="extract_metrics_ai",
        input_json=json.dumps(
            {
                "method": result.method,
                "model_id": result.model_id,
                "note_id": note_id,
                "material_id": material_id,
                "sources": result.sources,
                "extracted_keys": sorted(list(result.payload.keys())),
            },
            ensure_ascii=False,
        ),
        output_json=json.dumps(
            {
                "material_id": target.id,
                "usage": result.usage,
                "cost_rub": result.cost_rub,
                "cost_usd": result.cost_usd,
            },
            ensure_ascii=False,
        ),
    )
    db.commit()
    db.refresh(target)
    return _material_response(target)


@router.post("/cleanup-stale")
def cleanup_stale_materials(audit_id: int, db: Session = Depends(get_db)):
    """Remove old duplicate materials to keep audit card clean.

    Safe default: keep all manual_metrics periods; keep only latest uploaded document.
    """
    project = _get_project_or_404(audit_id, db)
    removable_types = {"document"}
    to_remove: list[AuditMaterial] = []

    for material_type in removable_types:
        items = sorted(
            [
                m
                for m in (project.materials or [])
                if m.type == material_type and not bool(getattr(m, "excluded_from_analysis", False))
            ],
            key=lambda item: (getattr(item, "updated_at", None) or item.created_at),
            reverse=True,
        )
        if len(items) > 1:
            to_remove.extend(items[1:])

    deleted_ids: list[int] = []
    deleted_files = 0
    for material in to_remove:
        local_path = file_url_to_path(material.file_url or "")
        if local_path and local_path.exists():
            try:
                local_path.unlink()
                deleted_files += 1
            except OSError:
                pass
        deleted_ids.append(material.id)
        db.delete(material)

    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="cleanup_stale_materials",
        input_json=json.dumps({"types": sorted(list(removable_types))}, ensure_ascii=False),
        output_json=json.dumps({"deleted_ids": deleted_ids, "deleted_files": deleted_files}, ensure_ascii=False),
    )
    db.commit()
    return {
        "ok": True,
        "deleted_count": len(deleted_ids),
        "deleted_files": deleted_files,
        "deleted_ids": deleted_ids,
    }


@router.post("/document", response_model=MaterialResponse, status_code=201)
async def add_document(
    audit_id: int,
    file: UploadFile = File(...),
    title: str = Form("Документ"),
    db: Session = Depends(get_db),
):
    """Загрузить текстовый документ (.txt, .md, .csv, .xlsx, .pdf, .docx)."""
    project = _get_project_or_404(audit_id, db)
    clean_title = (title or "Документ").strip()
    started = time.perf_counter()
    logger.info(
        "document_upload_start audit_id=%s title=%s filename=%s",
        audit_id,
        clean_title,
        file.filename,
    )

    try:
        file_url, file_size = await save_upload_file(
            file,
            subdir="documents",
            allowed_extensions=DOCUMENT_EXTENSIONS,
            default_ext=".txt",
        )
    except HTTPException:
        logger.warning(
            "document_upload_rejected audit_id=%s filename=%s",
            audit_id,
            file.filename,
            exc_info=True,
        )
        raise
    except Exception as exc:
        logger.exception(
            "document_upload_save_failed audit_id=%s filename=%s",
            audit_id,
            file.filename,
        )
        raise HTTPException(status_code=500, detail=f"Не удалось сохранить файл: {exc}") from exc

    logger.info(
        "document_upload_saved audit_id=%s bytes=%s elapsed_ms=%.0f",
        audit_id,
        file_size,
        (time.perf_counter() - started) * 1000,
    )

    local_path = file_url_to_path(file_url)
    extracted_text = ""
    parser_meta: dict[str, Any] = {}
    needs_review = False
    review_reason = None
    status = "ready"

    if local_path:
        parse_started = time.perf_counter()
        try:
            parsed = await asyncio.wait_for(
                asyncio.to_thread(parse_document, local_path, original_name=file.filename),
                timeout=DOCUMENT_PARSE_TIMEOUT_SEC,
            )
            extracted_text = (parsed.get("extracted_text") or "").strip()
            parser_meta = parsed
            logger.info(
                "document_parse_ok audit_id=%s chars=%s parser=%s elapsed_ms=%.0f",
                audit_id,
                len(extracted_text),
                parser_meta.get("parser"),
                (time.perf_counter() - parse_started) * 1000,
            )
        except asyncio.TimeoutError:
            needs_review = True
            review_reason = (
                "Разбор файла занял слишком много времени. "
                "Сократите файл, разбейте на части или вставьте выдержку в заметку."
            )
            status = "processing_error"
            logger.warning(
                "document_parse_timeout audit_id=%s filename=%s timeout_sec=%s",
                audit_id,
                file.filename,
                DOCUMENT_PARSE_TIMEOUT_SEC,
            )
        except ValueError as exc:
            needs_review = True
            review_reason = str(exc)
            status = "processing_error"
            logger.warning(
                "document_parse_value_error audit_id=%s filename=%s: %s",
                audit_id,
                file.filename,
                exc,
            )
        except Exception as exc:
            needs_review = True
            review_reason = f"Ошибка разбора документа: {exc}"
            status = "processing_error"
            logger.exception(
                "document_parse_failed audit_id=%s filename=%s",
                audit_id,
                file.filename,
            )
        if not extracted_text and status != "processing_error":
            needs_review = True
            review_reason = review_reason or "Не удалось извлечь текст из документа"

    material = AuditMaterial(
        audit_project_id=audit_id,
        type="document",
        title=clean_title,
        file_url=file_url,
        raw_content=json.dumps(
            {
                "file_size": file_size,
                "parser": parser_meta,
                **(
                    {"document_kind": parser_meta["document_kind"]}
                    if parser_meta.get("document_kind")
                    else {}
                ),
                **(
                    {"document_slice": parser_meta["document_slice"]}
                    if isinstance(parser_meta.get("document_slice"), dict)
                    else {}
                ),
            },
            ensure_ascii=False,
        ),
        extracted_text=extracted_text or None,
        confidence=1.0 if extracted_text else 0.0,
        needs_review=needs_review,
        review_reason=review_reason,
        status=status if status != "ready" else ("needs_review" if needs_review else "ready"),
    )
    sync_material_status(material)
    _add_new_material(db, material)
    db.flush()

    auto_metrics_material_id = None
    auto_metrics_keys: list[str] = []
    imported_periods_count = 0
    slice_data = parser_meta.get("document_slice") if isinstance(parser_meta.get("document_slice"), dict) else None
    if slice_data and slice_data.get("monthly"):
        try:
            imp = import_monthly_periods_from_material(project, material, db, set_active_last=True)
            imported_periods_count = int(imp.get("created_count") or 0)
            auto_metrics_material_id = imp.get("active_material_id")
            auto_metrics_keys = ["period", "budget", "clicks", "leads", "leads_forms", "leads_messenger"]
        except ValueError:
            imported_periods_count = 0
    elif extracted_text:
        auto_payload = _extract_metrics_payload_from_text(extracted_text)
        if local_path and str(local_path).lower().endswith(".xlsx"):
            xlsx_payload = _extract_metrics_from_xlsx(local_path)
            for key, value in xlsx_payload.items():
                if key not in auto_payload and value not in (None, ""):
                    auto_payload[key] = value
        if auto_payload:
            try:
                auto_metrics = _upsert_manual_metrics(audit_id, auto_payload, db)
                auto_metrics_material_id = auto_metrics.id
                auto_metrics_keys = sorted(list(auto_payload.keys()))
            except ValueError:
                auto_metrics_material_id = None

    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="add_document",
        input_json=json.dumps({"title": clean_title, "filename": file.filename}, ensure_ascii=False),
        output_json=json.dumps(
            {
                "material_id": material.id,
                "chars": len(extracted_text),
                "auto_metrics_material_id": auto_metrics_material_id,
                "auto_metrics_keys": auto_metrics_keys,
                "imported_periods_count": imported_periods_count,
            },
            ensure_ascii=False,
        ),
    )
    db.commit()
    db.refresh(material)
    logger.info(
        "document_upload_done audit_id=%s material_id=%s needs_review=%s periods=%s total_ms=%.0f",
        audit_id,
        material.id,
        material.needs_review,
        imported_periods_count,
        (time.perf_counter() - started) * 1000,
    )
    return _material_response(material)


@router.post("/{material_id}/import-direct-periods", response_model=ImportDirectPeriodsResponse)
def import_direct_periods(
    audit_id: int,
    material_id: int,
    db: Session = Depends(get_db),
):
    """Создать периоды manual_metrics из помесячного среза документа Директа."""
    project = _get_project_or_404(audit_id, db)
    material = (
        db.query(AuditMaterial)
        .filter(AuditMaterial.id == material_id, AuditMaterial.audit_project_id == audit_id)
        .first()
    )
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")
    if material.type != "document":
        raise HTTPException(status_code=400, detail="Импорт доступен только для документов Excel Директа")
    try:
        result = import_monthly_periods_from_material(project, material, db, set_active_last=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="import_direct_periods",
        input_json=json.dumps({"material_id": material_id}, ensure_ascii=False),
        output_json=json.dumps(result, ensure_ascii=False),
    )
    db.commit()
    return ImportDirectPeriodsResponse(**result)


def _apply_transcript_update(
    material: AuditMaterial,
    transcript: str,
    *,
    transcript_source: str = "manual",
    transcript_confirmed: bool = False,
) -> None:
    transcript = transcript.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Расшифровка не может быть пустой")
    quality = assess_transcript_quality(
        transcript,
        source=transcript_source,
        confirmed=transcript_confirmed,
    )
    material.raw_content = json.dumps(
        {"text": transcript, "source": transcript_source, "confirmed": transcript_confirmed},
        ensure_ascii=False,
    )
    material.extracted_text = transcript
    material.confidence = float(quality["confidence"])
    material.needs_review = bool(quality["needs_review"])
    material.review_reason = quality.get("review_reason")


@router.patch("/{material_id}", response_model=MaterialResponse)
def update_material(
    audit_id: int,
    material_id: int,
    data: UpdateMaterialRequest,
    db: Session = Depends(get_db),
):
    """Обновить материал: метрики, заметку, расшифровку, OCR."""
    project = _get_project_or_404(audit_id, db)
    material = db.query(AuditMaterial).filter(
        AuditMaterial.id == material_id,
        AuditMaterial.audit_project_id == audit_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")

    if data.title is not None:
        clean_title = data.title.strip()
        if clean_title:
            material.title = clean_title

    if material.type == "text_note":
        content = (data.content or "").strip()
        if not content:
            raise HTTPException(status_code=400, detail="Текст заметки не может быть пустым")
        material.raw_content = content
        material.extracted_text = content
        material.needs_review = False
        material.review_reason = None
        _touch_material(material)
        db.flush()
        db.refresh(project)
        sync_manual_metrics_from_note(project, db, material)

    elif material.type == "manual_metrics":
        existing = json.loads(material.raw_content or "{}")
        old_period = (existing.get("period") or "").strip()
        updates = data.model_dump(
            exclude_unset=True,
            exclude={"title", "content", "manual_transcript", "transcript_source", "transcript_confirmed"},
        )
        existing.update(updates)
        new_period = (existing.get("period") or "").strip()
        if old_period and new_period and old_period != new_period:
            # Period label changed — do not merge KPI fields from old period implicitly
            for key in ("budget", "clicks", "leads", "sales", "revenue", "gross_profit", "margin_percent"):
                if key not in updates:
                    existing.pop(key, None)
        try:
            normalized, review_reasons = validate_metrics_payload(existing)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        content = json.dumps(normalized, ensure_ascii=False)
        material.raw_content = content
        material.extracted_text = content
        material.title = f"Метрики: {normalized.get('period') or 'без периода'}"
        material.needs_review = bool(review_reasons)
        material.review_reason = "; ".join(dict.fromkeys(review_reasons)) if review_reasons else None
        project = db.query(AuditProject).filter(AuditProject.id == material.audit_project_id).first()
        if project is not None:
            project.active_metrics_material_id = material.id

    elif material.type == "audio_transcript":
        transcript = (data.manual_transcript or data.content or "").strip()
        source = (data.transcript_source or "manual").strip()
        if source not in {"manual", "web_speech", "external_stt", "server_stt"}:
            source = "manual"
        _apply_transcript_update(
            material,
            transcript,
            transcript_source=source,
            transcript_confirmed=bool(data.transcript_confirmed),
        )

    elif material.type == "audio":
        transcript = (data.manual_transcript or data.content or "").strip()
        if transcript:
            sibling = db.query(AuditMaterial).filter(
                AuditMaterial.audit_project_id == audit_id,
                AuditMaterial.type == "audio_transcript",
                AuditMaterial.title == f"Расшифровка: {material.title}",
            ).first()
            source = (data.transcript_source or "manual").strip()
            if source not in {"manual", "web_speech", "external_stt", "server_stt"}:
                source = "manual"
            confirmed = bool(data.transcript_confirmed)
            quality = assess_transcript_quality(
                transcript,
                source=source,
                confirmed=confirmed,
            )
            if sibling:
                _apply_transcript_update(
                    sibling,
                    transcript,
                    transcript_source=source,
                    transcript_confirmed=confirmed,
                )
            else:
                sibling = AuditMaterial(
                    audit_project_id=audit_id,
                    type="audio_transcript",
                    title=f"Расшифровка: {material.title}",
                    raw_content=json.dumps({"text": transcript, "source": source, "confirmed": confirmed}, ensure_ascii=False),
                    extracted_text=transcript,
                    confidence=float(quality["confidence"]),
                    needs_review=bool(quality["needs_review"]),
                    review_reason=quality.get("review_reason"),
                )
                _add_new_material(db, sibling)
            material.needs_review = bool(quality["needs_review"])
            material.review_reason = quality.get("review_reason") if quality["needs_review"] else None
        elif data.title is None:
            raise HTTPException(status_code=400, detail="Добавьте расшифровку или измените название")

    elif material.type == "screenshot_ocr":
        text = (data.content or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Описание скриншота не может быть пустым")
        material.raw_content = text
        material.extracted_text = text
        material.needs_review = False
        material.review_reason = None

    elif material.type == "screenshot":
        if data.direct_setup_kind is not None:
            from app.services.direct_setup_helpers import merge_setup_kind_into_raw

            kind = (data.direct_setup_kind or "other").strip().lower()
            material.raw_content = merge_setup_kind_into_raw(material.raw_content, kind)
        wants_description_update = data.content is not None
        text = (data.content or "").strip() if wants_description_update else ""
        if not text and wants_description_update:
            auto_text, ocr_meta = _try_ocr_screenshot_file(material)
            if auto_text:
                text = auto_text
                _merge_ocr_meta_into_screenshot(material, ocr_meta)
        if text:
            _upsert_screenshot_ocr_sibling(
                db,
                audit_id,
                material,
                text,
                from_auto_ocr=not (data.content or "").strip(),
            )
        elif data.marketer_ai_hint is not None or data.direct_setup_kind is not None:
            pass
        elif wants_description_update:
            raise HTTPException(
                status_code=400,
                detail="Не удалось распознать текст со скрина. Заполните поле «Что видно на скриншоте» вручную.",
            )
        elif data.title is None:
            raise HTTPException(status_code=400, detail="Добавьте описание скриншота или измените название")

    elif material.type == "document":
        if data.content is not None:
            text = data.content.strip()
            material.extracted_text = text or None
            material.needs_review = not text
            material.review_reason = None if text else "Не удалось извлечь текст из документа"
        elif data.title is None:
            raise HTTPException(status_code=400, detail="Нечего обновлять")

    else:
        raise HTTPException(status_code=400, detail=f"Редактирование типа «{material.type}» не поддерживается")

    if data.marketer_ai_hint is not None:
        set_marketer_ai_hint(material, data.marketer_ai_hint)

    sync_material_status(material)
    _touch_material(material)
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="update_material",
        input_json=json.dumps({"material_id": material_id, "type": material.type}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(material)
    return _material_response(material)


@router.post("/reocr-screenshots")
def reocr_all_screenshots(audit_id: int, db: Session = Depends(get_db)):
    """Повторно распознать все скриншоты аудита (после настройки Tesseract)."""
    _get_project_or_404(audit_id, db)
    shots = db.query(AuditMaterial).filter(
        AuditMaterial.audit_project_id == audit_id,
        AuditMaterial.type == "screenshot",
    ).all()
    ok: list[dict[str, Any]] = []
    failed: list[dict[str, Any]] = []
    for material in shots:
        if getattr(material, "excluded_from_analysis", False):
            continue
        text, ocr_meta = _try_ocr_screenshot_file(material)
        if not text:
            failed.append({
                "material_id": material.id,
                "title": material.title,
                "error": (ocr_meta or {}).get("error") or "пустой текст",
            })
            continue
        _merge_ocr_meta_into_screenshot(material, ocr_meta)
        _upsert_screenshot_ocr_sibling(db, audit_id, material, text, from_auto_ocr=True)
        sync_material_status(material)
        _touch_material(material)
        ok.append({"material_id": material.id, "title": material.title, "chars": len(text)})
    db.commit()
    return {
        "processed": len(ok) + len(failed),
        "success": len(ok),
        "failed_count": len(failed),
        "ok": ok,
        "failed": failed,
    }


@router.post("/{material_id}/ocr", response_model=MaterialResponse)
def rerun_screenshot_ocr(audit_id: int, material_id: int, db: Session = Depends(get_db)):
    """Повторно распознать текст со скриншота (Tesseract)."""
    _get_project_or_404(audit_id, db)
    material = db.query(AuditMaterial).filter(
        AuditMaterial.id == material_id,
        AuditMaterial.audit_project_id == audit_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")
    if material.type != "screenshot":
        raise HTTPException(status_code=400, detail="OCR доступен только для скриншотов")
    text, ocr_meta = _try_ocr_screenshot_file(material)
    min_len = max(1, int(settings.OCR_MIN_TEXT_LENGTH))
    if not text:
        err = (ocr_meta or {}).get("error") or "Текст не распознан"
        raise HTTPException(
            status_code=400,
            detail=f"OCR не удался: {err} Откройте «Редактировать» → поле «Что видно на скриншоте».",
        )
    if len(text) < min_len:
        ocr_meta["warning"] = f"short_text_{len(text)}"
    _merge_ocr_meta_into_screenshot(material, ocr_meta)
    _upsert_screenshot_ocr_sibling(db, audit_id, material, text, from_auto_ocr=True)
    sync_material_status(material)
    _touch_material(material)
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="screenshot_ocr",
        input_json=json.dumps({"material_id": material_id}, ensure_ascii=False),
        output_json=json.dumps({"text_length": len(text)}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(material)
    return _material_response(material)


@router.patch("/{material_id}/review", response_model=MaterialResponse)
def review_material(audit_id: int, material_id: int, data: MaterialReviewRequest, db: Session = Depends(get_db)):
    """Отметить материал проверенным или исключить из анализа/отчёта."""
    material = db.query(AuditMaterial).filter(
        AuditMaterial.id == material_id,
        AuditMaterial.audit_project_id == audit_id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")

    action = data.action.strip().lower()
    if action == "verify":
        material.needs_review = False
        material.review_reason = None
        material.excluded_from_analysis = False
        material.excluded_from_report = False
        material.exclusion_reason = None
    elif action == "exclude_analysis":
        material.excluded_from_analysis = True
        material.exclusion_reason = (data.reason or "Исключено из анализа").strip()
    elif action == "exclude_report":
        material.excluded_from_report = True
        material.exclusion_reason = (data.reason or "Исключено из отчёта").strip()
    elif action == "include":
        material.excluded_from_analysis = False
        material.excluded_from_report = False
        material.exclusion_reason = None
    else:
        raise HTTPException(status_code=400, detail="Неизвестное действие")

    sync_material_status(material)
    _touch_material(material)
    db.commit()
    db.refresh(material)
    return _material_response(material)


@router.get("/{material_id}/file")
def get_material_file(audit_id: int, material_id: int, db: Session = Depends(get_db)):
    """Safely return an uploaded file only when material belongs to audit_id."""
    material = db.query(AuditMaterial).filter(
        AuditMaterial.id == material_id,
        AuditMaterial.audit_project_id == audit_id,
    ).first()
    if not material or not material.file_url:
        raise HTTPException(status_code=404, detail="Файл не найден")
    local_path = file_url_to_path(material.file_url)
    if not local_path or not local_path.exists() or not local_path.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден на диске")
    media_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
    return FileResponse(
        path=str(local_path),
        filename=local_path.name,
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.delete("/{material_id}")
def delete_material(audit_id: int, material_id: int, db: Session = Depends(get_db)):
    """Удалить материал."""
    material = db.query(AuditMaterial).filter(
        AuditMaterial.id == material_id,
        AuditMaterial.audit_project_id == audit_id,
    ).first()

    if not material:
        raise HTTPException(status_code=404, detail="Материал не найден")

    if material.file_url:
        local_path = file_url_to_path(material.file_url)
        if local_path and local_path.exists():
            local_path.unlink()

    db.delete(material)
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="delete_material",
        input_json=json.dumps({"material_id": material_id}, ensure_ascii=False),
    )
    db.commit()
    return {"message": "Материал удалён"}
