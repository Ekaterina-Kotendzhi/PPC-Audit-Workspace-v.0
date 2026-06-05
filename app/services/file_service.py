"""Utilities for safe file uploads and lightweight audit logging."""
from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Iterable

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.models import AuditRun
from app.services.privacy_service import dumps_masked, mask_for_log, mask_text
from app.security import get_current_actor

AUDIO_EXTENSIONS = {".mp3", ".wav", ".webm", ".m4a", ".ogg"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
DOCUMENT_EXTENSIONS = {".txt", ".md", ".csv", ".xlsx", ".pdf", ".docx"}


def _clean_ext(filename: str | None, default_ext: str) -> str:
    ext = Path(filename or "").suffix.lower()
    if not ext:
        return default_ext
    return ext


async def save_upload_file(
    file: UploadFile,
    *,
    subdir: str,
    allowed_extensions: Iterable[str],
    default_ext: str,
) -> tuple[str, int]:
    """Validate and save an uploaded file.

    Returns a private relative storage key and the saved file size in bytes.
    """
    ext = _clean_ext(file.filename, default_ext)
    allowed = {item.lower() for item in allowed_extensions}
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый тип файла: {ext}. Разрешены: {', '.join(sorted(allowed))}",
        )

    upload_root = Path(settings.UPLOAD_DIR).resolve()
    target_dir = (upload_root / subdir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4().hex}{ext}"
    target_path = target_dir / filename

    max_size = int(settings.MAX_UPLOAD_SIZE)
    total = 0
    try:
        with target_path.open("wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_size:
                    buffer.close()
                    target_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Файл слишком большой. Максимум: {max_size // (1024 * 1024)} МБ",
                    )
                buffer.write(chunk)
    finally:
        await file.close()

    if total == 0:
        target_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Файл пустой")

    relative = target_path.relative_to(upload_root).as_posix()
    return relative, total


def file_url_to_path(file_url: str) -> Path | None:
    """Convert a stored upload key or legacy public URL to a local file path safely."""
    if not file_url:
        return None
    legacy_prefix = "/static/uploads/"
    value = file_url.replace(legacy_prefix, "", 1) if file_url.startswith(legacy_prefix) else file_url.lstrip("/")
    # Protected URLs are not storage keys. The caller should use the DB material row.
    if value.startswith("api/audits/"):
        return None
    upload_root = Path(settings.UPLOAD_DIR).resolve()
    candidate = (upload_root / value).resolve()
    try:
        candidate.relative_to(upload_root)
    except ValueError:
        return None
    return candidate


def material_file_download_url(audit_project_id: int, material_id: int) -> str:
    """Return protected download endpoint for UI rendering."""
    return f"/api/audits/{audit_project_id}/materials/{material_id}/file"


def log_audit_action(
    db: Session,
    *,
    audit_project_id: int,
    action: str,
    input_json: str | None = None,
    output_json: str | None = None,
    actor: str | None = None,
    status: str = "success",
    error: str | None = None,
    duration_ms: int | None = None,
) -> AuditRun:
    """Write a lightweight action record to audit_runs."""
    # Логи не должны хранить сырые телефоны, email, токены, секреты и названия клиентов.
    run = AuditRun(
        audit_project_id=audit_project_id,
        action=action,
        input_json=(mask_for_log(input_json) if isinstance(input_json, str) else (dumps_masked(input_json) if input_json is not None else None)),
        output_json=(mask_for_log(output_json) if isinstance(output_json, str) else (dumps_masked(output_json) if output_json is not None else None)),
        actor=actor or get_current_actor(),
        status=status,
        error=mask_text(error) if isinstance(error, str) else error,
        duration_ms=duration_ms,
    )
    db.add(run)
    return run
