from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditFinding
from app.services.knowledge_base_service import (
    cleanup_non_finding_kb_documents,
    knowledge_base_quality_report,
    knowledge_base_status,
    save_finding_to_knowledge_base,
)

router = APIRouter(prefix="/api/knowledge-base", tags=["knowledge-base"])


@router.get("/status")
def get_status():
    """Проверить состояние ChromaDB knowledge base и embeddings."""
    return knowledge_base_status()


@router.post("/sync-confirmed")
def sync_confirmed_findings(db: Session = Depends(get_db)):
    """Переиндексировать human_confirmed/human_edited выводы в ChromaDB.

    Только проверенные выводы с `approved_for_kb` проходят quality gate.
    Синтетические/устаревшие документы (не `finding:*`) удаляются из коллекции.
    """
    cleanup = cleanup_non_finding_kb_documents()
    findings = (
        db.query(AuditFinding)
        .filter(AuditFinding.status.in_(["human_confirmed", "human_edited"]))
        .all()
    )
    quality = knowledge_base_quality_report(findings)
    saved = 0
    failed = 0
    for finding in findings:
        if save_finding_to_knowledge_base(finding):
            saved += 1
        else:
            failed += 1
    return {
        "total": len(findings),
        "saved": saved,
        "failed": failed,
        "cleanup": cleanup,
        "quality": quality,
        "status": knowledge_base_status(),
    }


@router.post("/cleanup-non-findings")
def cleanup_non_findings():
    """Удалить из Chroma всё, что не является `finding:{id}` (legacy seed и пр.)."""
    return {
        "cleanup": cleanup_non_finding_kb_documents(),
        "status": knowledge_base_status(),
    }


@router.get("/quality")
def get_quality_report(db: Session = Depends(get_db)):
    findings = (
        db.query(AuditFinding)
        .filter(AuditFinding.status.in_(["human_confirmed", "human_edited"]))
        .all()
    )
    return {
        "quality": knowledge_base_quality_report(findings),
        "status": knowledge_base_status(),
    }


@router.get("/quality-status")
def get_quality_status(db: Session = Depends(get_db)):
    return get_quality_report(db)
