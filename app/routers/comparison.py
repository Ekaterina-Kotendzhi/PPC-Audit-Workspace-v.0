from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditProject
from app.services.comparison_service import build_before_after_comparison

router = APIRouter(prefix="/api/audits", tags=["comparison"])


@router.get("/{audit_id}/comparison")
def get_comparison(audit_id: int, db: Session = Depends(get_db)):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    return build_before_after_comparison(project)
