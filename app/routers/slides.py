from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditProject
from app.services.file_service import log_audit_action
from app.services.slides_service import generate_pptx_report, upload_pptx_to_google_slides

router = APIRouter(prefix="/api/audits", tags=["slides"])


@router.get("/{audit_id}/export/slides/pptx")
def export_pptx(audit_id: int, db: Session = Depends(get_db)):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    started = time.perf_counter()
    try:
        path = generate_pptx_report(project)
        log_audit_action(
            db,
            audit_project_id=audit_id,
            action="pptx_export",
            input_json=json.dumps({"format": "pptx"}, ensure_ascii=False),
            output_json=json.dumps({"file": path.name, "size_bytes": path.stat().st_size}, ensure_ascii=False),
            status="success",
            duration_ms=int((time.perf_counter() - started) * 1000),
        )
        db.commit()
        return FileResponse(
            path=str(path),
            filename=path.name,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as exc:  # noqa: BLE001
        log_audit_action(
            db,
            audit_project_id=audit_id,
            action="pptx_export",
            input_json=json.dumps({"format": "pptx"}, ensure_ascii=False),
            status="failed",
            error=str(exc),
            duration_ms=int((time.perf_counter() - started) * 1000),
        )
        db.commit()
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{audit_id}/export/google-slides")
def export_google_slides(audit_id: int, db: Session = Depends(get_db)):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    started = time.perf_counter()
    try:
        path = generate_pptx_report(project)
        result = upload_pptx_to_google_slides(path, f"PPC-аудит: {project.client.name}")
        log_audit_action(
            db,
            audit_project_id=audit_id,
            action="google_slides_export",
            input_json=json.dumps({"format": "google_slides"}, ensure_ascii=False),
            output_json=json.dumps(result, ensure_ascii=False),
            status="success",
            duration_ms=int((time.perf_counter() - started) * 1000),
        )
        db.commit()
        return JSONResponse({"status": "success", "presentation": result})
    except Exception as exc:  # noqa: BLE001
        log_audit_action(
            db,
            audit_project_id=audit_id,
            action="google_slides_export",
            input_json=json.dumps({"format": "google_slides"}, ensure_ascii=False),
            status="failed",
            error=str(exc),
            duration_ms=int((time.perf_counter() - started) * 1000),
        )
        db.commit()
        raise HTTPException(status_code=501, detail=str(exc))
