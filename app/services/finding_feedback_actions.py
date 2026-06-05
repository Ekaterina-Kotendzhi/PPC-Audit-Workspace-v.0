"""Shared finding feedback actions for /api/findings and /api/audits/.../findings routes."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from app.models import AuditFinding, AuditProject
from app.schemas import FindingFeedbackRequest, FindingUpdateRequest
from app.services.feedback_service import (
    edited_payload_from_finding,
    ensure_original_ai_output,
    finding_to_dict,
    save_feedback_run,
)
from app.services.knowledge_base_service import (
    delete_finding_from_knowledge_base,
    finding_kb_eligible,
    finding_kb_eligibility_reason,
    normalize_data_limitation_finding,
    prepare_risk_pattern_confirm,
    save_finding_to_knowledge_base,
)
from app.services.finding_illustration_service import (
    FindingIllustrationError,
    enrich_finding_illustration,
    set_finding_illustration,
    update_finding_illustration_caption,
)
from app.security import current_actor
from app.services.direct_health_findings_service import is_direct_health_finding
from app.services.finding_evidence_confirm_service import assess_finding_evidence_for_confirm


def _load_project(db: Session, audit_project_id: int) -> AuditProject | None:
    return (
        db.query(AuditProject)
        .options(joinedload(AuditProject.materials))
        .filter(AuditProject.id == audit_project_id)
        .first()
    )


def _serialize(finding: AuditFinding, project: AuditProject | None = None) -> dict[str, Any]:
    data = finding_to_dict(finding)
    if project is not None:
        data.update(
            enrich_finding_illustration(
                finding,
                project,
                audit_id=finding.audit_project_id,
            )
        )
    data.update({
        "original_ai_output": finding.original_ai_output,
        "edited_output": finding.edited_output,
        "human_comment": finding.human_comment,
        "edited_by": finding.edited_by,
        "edited_at": finding.edited_at.isoformat() if finding.edited_at else None,
        "approved_for_kb": bool(getattr(finding, "approved_for_kb", False)),
        "kb_eligible": finding_kb_eligible(finding),
        "kb_eligibility_reason": finding_kb_eligibility_reason(finding),
        "created_at": finding.created_at.isoformat() if finding.created_at else None,
    })
    return data


def _enforce_evidence_ack(finding: AuditFinding, data: FindingFeedbackRequest | None) -> dict[str, Any]:
    check = assess_finding_evidence_for_confirm(finding)
    data = data or FindingFeedbackRequest()
    if not check["ok"] and check.get("requires_acknowledgement") and not data.acknowledge_weak_evidence:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "WEAK_EVIDENCE",
                "message": " ".join(check.get("warnings") or ["Проверьте доказательства перед подтверждением."]),
                "evidence_check": check,
                "retryable": True,
            },
        )
    return check


def touch_project_status(db: Session, audit_project_id: int) -> None:
    project = db.query(AuditProject).filter(AuditProject.id == audit_project_id).first()
    if not project:
        return
    has_review = db.query(AuditFinding).filter(
        AuditFinding.audit_project_id == audit_project_id,
        AuditFinding.needs_review.is_(True),
    ).count() > 0
    project.needs_review = has_review
    if project.status not in {"in_progress", "failed"}:
        project.status = "needs_review" if has_review else "completed"
    project.updated_at = datetime.now(timezone.utc)


def get_finding_for_audit(db: Session, audit_id: int, finding_id: int) -> AuditFinding:
    finding = (
        db.query(AuditFinding)
        .filter(AuditFinding.id == finding_id, AuditFinding.audit_project_id == audit_id)
        .first()
    )
    if not finding:
        raise HTTPException(status_code=404, detail="Вывод не найден в этом аудите")
    return finding


def update_finding_action(
    finding: AuditFinding,
    data: FindingUpdateRequest,
    request: Request,
    db: Session,
) -> dict[str, Any]:
    ensure_original_ai_output(finding)
    payload = data.model_dump(exclude_unset=True)
    if "evidence" in payload:
        finding.evidence_json = json.dumps(payload.pop("evidence") or [], ensure_ascii=False)

    for field in [
        "area",
        "severity",
        "problem",
        "recommendation",
        "expected_impact",
        "confidence",
        "needs_review",
        "review_reason",
        "approved_for_kb",
    ]:
        if field in payload:
            setattr(finding, field, payload[field])

    if "human_comment" in payload:
        finding.human_comment = payload["human_comment"]
    finding.edited_by = payload.get("edited_by") or current_actor(request)
    finding.edited_at = datetime.now(timezone.utc)
    finding.status = "human_edited"
    finding.edited_output = edited_payload_from_finding(finding)
    normalize_data_limitation_finding(finding)

    save_feedback_run(db, finding, "finding_edit", comment=finding.human_comment)
    save_finding_to_knowledge_base(finding)
    touch_project_status(db, finding.audit_project_id)
    db.commit()
    db.refresh(finding)
    project = _load_project(db, finding.audit_project_id)
    return _serialize(finding, project)


def set_finding_illustration_action(
    finding: AuditFinding,
    material_id: int | None,
    caption: str | None,
    request: Request,
    db: Session,
    *,
    material_provided: bool = False,
    caption_provided: bool = False,
) -> dict[str, Any]:
    project = _load_project(db, finding.audit_project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    if not material_provided and not caption_provided:
        raise HTTPException(status_code=400, detail="Укажите material_id или caption")
    try:
        if material_provided:
            if material_id is None:
                set_finding_illustration(finding, project, None)
            else:
                set_finding_illustration(
                    finding,
                    project,
                    material_id,
                    caption=caption,
                    caption_provided=caption_provided,
                )
        elif caption_provided:
            update_finding_illustration_caption(finding, caption)
    except FindingIllustrationError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    finding.edited_by = current_actor(request)
    finding.edited_at = datetime.now(timezone.utc)
    if finding.status == "ai_generated":
        finding.status = "human_edited"
    finding.edited_output = edited_payload_from_finding(finding)
    save_feedback_run(
        db,
        finding,
        "finding_illustration",
        comment=f"material_id={material_id}" if material_id else "cleared",
    )
    touch_project_status(db, finding.audit_project_id)
    db.commit()
    db.refresh(finding)
    return _serialize(finding, project)


def confirm_finding_risk_pattern_action(
    finding: AuditFinding,
    data: FindingFeedbackRequest | None,
    request: Request,
    db: Session,
) -> dict[str, Any]:
    """Confirm a data-gap finding as an accepted limitation and store as KB risk pattern."""
    if is_direct_health_finding(finding):
        raise HTTPException(
            status_code=400,
            detail="Риски Excel (direct_health) не подтверждаются — только просмотр на вкладке «Директ».",
        )
    ensure_original_ai_output(finding)
    data = data or FindingFeedbackRequest()
    if not prepare_risk_pattern_confirm(finding):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "NOT_RISK_PATTERN",
                "message": (
                    "Кнопка «В отчёт (шаблон)» — только для ограничений по данным "
                    "(нет выгрузки, не хватает CRM и т.п.). "
                    "Для обычного вывода нажмите зелёную «В отчёт» или сначала «Исправить»."
                ),
            },
        )
    evidence_check = _enforce_evidence_ack(finding, data)
    finding.finding_kind = "risk_pattern"
    finding.status = "human_confirmed"
    finding.needs_review = False
    finding.review_reason = data.comment or finding.review_reason or "Подтверждено как ограничение данных"
    finding.human_comment = data.comment or finding.human_comment
    finding.approved_for_kb = True
    finding.edited_by = data.edited_by or current_actor(request)
    finding.edited_at = datetime.now(timezone.utc)
    finding.edited_output = edited_payload_from_finding(finding)

    save_feedback_run(db, finding, "finding_confirm_risk_pattern", comment=finding.human_comment)
    save_finding_to_knowledge_base(finding)
    touch_project_status(db, finding.audit_project_id)
    db.commit()
    db.refresh(finding)
    result = _serialize(finding, _load_project(db, finding.audit_project_id))
    result["evidence_check"] = evidence_check
    return result


def confirm_finding_action(
    finding: AuditFinding,
    data: FindingFeedbackRequest | None,
    request: Request,
    db: Session,
) -> dict[str, Any]:
    if is_direct_health_finding(finding):
        raise HTTPException(
            status_code=400,
            detail="Риски Excel (direct_health) не подтверждаются — только просмотр на вкладке «Директ».",
        )
    ensure_original_ai_output(finding)
    data = data or FindingFeedbackRequest()
    evidence_check = _enforce_evidence_ack(finding, data)
    if getattr(finding, "finding_kind", None) != "risk_pattern":
        normalize_data_limitation_finding(finding)
    finding.status = "human_confirmed"
    finding.needs_review = False
    finding.review_reason = None
    finding.human_comment = data.comment or finding.human_comment
    if is_direct_health_finding(finding):
        finding.approved_for_kb = False
    else:
        finding.approved_for_kb = getattr(finding, "finding_kind", None) != "needs_data"
    finding.edited_by = data.edited_by or current_actor(request)
    finding.edited_at = datetime.now(timezone.utc)
    finding.edited_output = edited_payload_from_finding(finding)

    save_feedback_run(db, finding, "finding_confirm", comment=finding.human_comment)
    save_finding_to_knowledge_base(finding)
    touch_project_status(db, finding.audit_project_id)
    db.commit()
    db.refresh(finding)
    result = _serialize(finding, _load_project(db, finding.audit_project_id))
    result["evidence_check"] = evidence_check
    return result


def unconfirm_finding_action(
    finding: AuditFinding,
    data: FindingFeedbackRequest | None,
    request: Request,
    db: Session,
) -> dict[str, Any]:
    data = data or FindingFeedbackRequest()
    if finding.status == "human_rejected":
        original = ensure_original_ai_output(finding)
        finding.status = "ai_generated"
        finding.approved_for_kb = False
        finding.edited_output = None
        if data.comment:
            finding.human_comment = data.comment
        finding.edited_by = data.edited_by or current_actor(request)
        finding.edited_at = datetime.now(timezone.utc)
        if is_direct_health_finding(finding):
            finding.needs_review = False
            finding.review_reason = None
        else:
            finding.needs_review = True
            finding.review_reason = (
                (data.comment or "").strip()
                or original.get("review_reason")
                or "Возвращён в проверку после отклонения"
            )
        save_feedback_run(db, finding, "finding_restore_review", comment=finding.human_comment)
        delete_finding_from_knowledge_base(finding.id)
        touch_project_status(db, finding.audit_project_id)
        db.commit()
        db.refresh(finding)
        return _serialize(finding, _load_project(db, finding.audit_project_id))

    if finding.status not in {"human_confirmed", "human_edited"}:
        raise HTTPException(status_code=400, detail="Вывод не был подтверждён — отменять нечего")

    original = ensure_original_ai_output(finding)

    finding.status = "ai_generated"
    if is_direct_health_finding(finding):
        finding.needs_review = False
        finding.review_reason = None
    else:
        finding.needs_review = True
        finding.review_reason = (
            original.get("review_reason")
            or "Требуется повторная проверка после отмены подтверждения"
        )
    finding.approved_for_kb = False
    if data.comment:
        finding.human_comment = data.comment
    finding.edited_by = data.edited_by or current_actor(request)
    finding.edited_at = datetime.now(timezone.utc)
    finding.edited_output = None

    save_feedback_run(db, finding, "finding_unconfirm", comment=finding.human_comment)
    delete_finding_from_knowledge_base(finding.id)
    touch_project_status(db, finding.audit_project_id)
    db.commit()
    db.refresh(finding)
    return _serialize(finding, _load_project(db, finding.audit_project_id))


def reject_finding_action(
    finding: AuditFinding,
    data: FindingFeedbackRequest,
    request: Request,
    db: Session,
) -> dict[str, Any]:
    if is_direct_health_finding(finding):
        raise HTTPException(
            status_code=400,
            detail="Риски Excel (direct_health) не отклоняются на «Выводах» — только просмотр на вкладке «Директ».",
        )
    ensure_original_ai_output(finding)
    reason = (data.reason or data.comment or "").strip()
    if not reason and not is_direct_health_finding(finding):
        raise HTTPException(status_code=400, detail="Укажите причину отклонения")
    if not reason and is_direct_health_finding(finding):
        reason = "Не включать в отчёт для клиента"

    finding.status = "human_rejected"
    finding.needs_review = False
    finding.review_reason = reason
    finding.approved_for_kb = False
    finding.human_comment = data.comment or reason
    finding.edited_by = data.edited_by or current_actor(request)
    finding.edited_at = datetime.now(timezone.utc)
    finding.edited_output = edited_payload_from_finding(finding)

    save_feedback_run(db, finding, "finding_reject", comment=finding.human_comment)
    delete_finding_from_knowledge_base(finding.id)
    # Reject is audit history only — not fed into FEEDBACK_STATUSES / collect_feedback_examples.
    touch_project_status(db, finding.audit_project_id)
    db.commit()
    db.refresh(finding)
    return _serialize(finding, _load_project(db, finding.audit_project_id))


def comment_finding_action(
    finding: AuditFinding,
    data: FindingFeedbackRequest,
    request: Request,
    db: Session,
) -> dict[str, Any]:
    ensure_original_ai_output(finding)
    if not data.comment:
        raise HTTPException(status_code=400, detail="Комментарий не может быть пустым")

    finding.human_comment = data.comment
    finding.edited_by = data.edited_by or current_actor(request)
    finding.edited_at = datetime.now(timezone.utc)
    if finding.status == "ai_generated":
        finding.status = "human_edited"
    finding.edited_output = edited_payload_from_finding(finding)
    normalize_data_limitation_finding(finding)

    save_feedback_run(db, finding, "finding_comment", comment=finding.human_comment)
    save_finding_to_knowledge_base(finding)
    touch_project_status(db, finding.audit_project_id)
    db.commit()
    db.refresh(finding)
    return _serialize(finding, _load_project(db, finding.audit_project_id))
