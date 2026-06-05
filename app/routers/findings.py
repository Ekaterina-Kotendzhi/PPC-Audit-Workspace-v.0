from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditFinding
from app.schemas import FindingEvidenceCheckResponse, FindingFeedbackRequest, FindingUpdateRequest
from app.services.finding_evidence_confirm_service import assess_finding_evidence_for_confirm
from app.services.finding_feedback_actions import (
    comment_finding_action,
    confirm_finding_action,
    confirm_finding_risk_pattern_action,
    reject_finding_action,
    unconfirm_finding_action,
    update_finding_action,
)

router = APIRouter(prefix="/api/findings", tags=["findings"])


def _get_finding(db: Session, finding_id: int) -> AuditFinding:
    finding = db.query(AuditFinding).filter(AuditFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Вывод не найден")
    return finding


@router.get("/{finding_id}/evidence-check", response_model=FindingEvidenceCheckResponse)
def get_finding_evidence_check(finding_id: int, db: Session = Depends(get_db)):
    """M2.4: preview evidence quality before G7 confirm."""
    return FindingEvidenceCheckResponse(**assess_finding_evidence_for_confirm(_get_finding(db, finding_id)))


@router.patch("/{finding_id}")
def update_finding(finding_id: int, data: FindingUpdateRequest, request: Request, db: Session = Depends(get_db)):
    """Исправить AI-вывод вручную."""
    return update_finding_action(_get_finding(db, finding_id), data, request, db)


@router.post("/{finding_id}/confirm")
def confirm_finding(
    finding_id: int,
    request: Request,
    data: FindingFeedbackRequest | None = None,
    db: Session = Depends(get_db),
):
    """Подтвердить AI-вывод как корректный."""
    return confirm_finding_action(_get_finding(db, finding_id), data, request, db)


@router.post("/{finding_id}/confirm-risk-pattern")
def confirm_finding_risk_pattern(
    finding_id: int,
    request: Request,
    data: FindingFeedbackRequest | None = None,
    db: Session = Depends(get_db),
):
    """Подтвердить вывод как ограничение данных (паттерн риска в БЗ)."""
    return confirm_finding_risk_pattern_action(_get_finding(db, finding_id), data, request, db)


@router.post("/{finding_id}/unconfirm")
def unconfirm_finding(
    finding_id: int,
    request: Request,
    data: FindingFeedbackRequest | None = None,
    db: Session = Depends(get_db),
):
    """Вернуть подтверждённый вывод на повторную проверку."""
    return unconfirm_finding_action(_get_finding(db, finding_id), data, request, db)


@router.post("/{finding_id}/reject")
def reject_finding(
    finding_id: int,
    data: FindingFeedbackRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Отклонить AI-вывод с причиной."""
    return reject_finding_action(_get_finding(db, finding_id), data, request, db)


@router.post("/{finding_id}/comment")
def comment_finding(
    finding_id: int,
    data: FindingFeedbackRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Добавить комментарий маркетолога к выводу."""
    return comment_finding_action(_get_finding(db, finding_id), data, request, db)
