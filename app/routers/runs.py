from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditRun
from app.schemas import AuditRunResponse
from app.services.privacy_service import mask_for_log

router = APIRouter(prefix="/api/audit-runs", tags=["runs"])

@router.get("/", response_model=List[AuditRunResponse])
def list_runs(db: Session = Depends(get_db)):
    """История всех запусков"""
    runs = db.query(AuditRun).order_by(AuditRun.created_at.desc()).limit(50).all()
    
    return [
        AuditRunResponse(
            id=r.id,
            audit_project_id=r.audit_project_id,
            action=r.action,
            actor=r.actor,
            status=r.status,
            error=mask_for_log(r.error) if r.error else r.error,
            duration_ms=r.duration_ms,
            created_at=r.created_at,
            input_json=mask_for_log(r.input_json) if r.input_json else r.input_json,
            output_json=mask_for_log(r.output_json) if r.output_json else r.output_json
        )
        for r in runs
    ]

@router.get("/{audit_id}", response_model=List[AuditRunResponse])
def get_project_runs(audit_id: int, db: Session = Depends(get_db)):
    """История запусков для конкретного аудита"""
    runs = db.query(AuditRun).filter(
        AuditRun.audit_project_id == audit_id
    ).order_by(AuditRun.created_at.desc()).all()
    
    return [
        AuditRunResponse(
            id=r.id,
            audit_project_id=r.audit_project_id,
            action=r.action,
            actor=r.actor,
            status=r.status,
            error=mask_for_log(r.error) if r.error else r.error,
            duration_ms=r.duration_ms,
            created_at=r.created_at,
            input_json=mask_for_log(r.input_json) if r.input_json else r.input_json,
            output_json=mask_for_log(r.output_json) if r.output_json else r.output_json
        )
        for r in runs
    ]