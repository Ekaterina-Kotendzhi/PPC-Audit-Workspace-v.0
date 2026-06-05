"""Q&A chat endpoints for audit context."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditProject
from app.schemas import AskAuditRequest, AskAuditResponse, ChatMessageResponse
from app.services.ai_model_service import default_model_id, validate_model_id
from app.services.model_router import ModelRouter
from app.services.chat_telemetry_service import chat_telemetry, save_chat_telemetry_event
from app.services.chat_rate_limit_service import chat_rate_limiter
from app.services.qa_service import ask_audit_question, list_chat_history

router = APIRouter(prefix="/api/audits/{audit_id}/chat", tags=["chat"])


def _get_project(audit_id: int, db: Session) -> AuditProject:
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    return project


@router.get("", response_model=list[ChatMessageResponse])
@router.get("/", response_model=list[ChatMessageResponse])
def get_chat_history(audit_id: int, db: Session = Depends(get_db)):
    """История вопросов и ответов по аудиту."""
    project = _get_project(audit_id, db)
    return list_chat_history(project, db)


@router.post("/ask", response_model=AskAuditResponse)
def ask_about_audit(audit_id: int, data: AskAuditRequest, request: Request, db: Session = Depends(get_db)):
    """Задать вопрос по материалам, метрикам и выводам аудита."""
    project = _get_project(audit_id, db)
    client_ip = request.client.host if request.client else "unknown"
    allowed, retry_after = chat_rate_limiter.allow(f"audit:{audit_id}:ip:{client_ip}")
    if not allowed:
        chat_telemetry.record(
            duration_ms=None,
            fallback_used=False,
            confidence_level="low",
            include_unverified=data.include_unverified,
            errored=True,
            error_type="rate_limit",
        )
        save_chat_telemetry_event(
            db,
            audit_project_id=project.id,
            provider="local",
            model_name=None,
            duration_ms=None,
            fallback_used=False,
            sources_count=0,
            include_unverified=data.include_unverified,
            confidence_level="low",
            errored=True,
            error_type="rate_limit",
        )
        db.commit()
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMIT",
                "message": f"Слишком много запросов к чату. Повторите через {retry_after} сек.",
                "retryable": True,
                "retry_after_seconds": retry_after,
            },
        )
    try:
        model_id = data.model_id or default_model_id()
        if ModelRouter().has_any_configured_provider():
            validate_model_id(model_id, require_available=True)
        anchor = data.context_anchor.model_dump() if data.context_anchor else None
        result = ask_audit_question(
            project,
            data.question,
            db,
            include_unverified=data.include_unverified,
            model_id=model_id if ModelRouter().has_any_configured_provider() else None,
            context_anchor=anchor,
            audience_mode=data.audience_mode,
            response_style=data.response_style,
            temperature=data.temperature,
        )
    except ValueError as exc:
        message = str(exc)
        status = 400 if "Неизвестная" in message else 409
        chat_telemetry.record(
            duration_ms=None,
            fallback_used=False,
            confidence_level="low",
            include_unverified=data.include_unverified,
            errored=True,
            error_type="validation",
        )
        save_chat_telemetry_event(
            db,
            audit_project_id=project.id,
            provider="local",
            model_name=None,
            duration_ms=None,
            fallback_used=False,
            sources_count=0,
            include_unverified=data.include_unverified,
            confidence_level="low",
            errored=True,
            error_type="validation",
        )
        db.commit()
        raise HTTPException(
            status_code=status,
            detail={"code": "VALIDATION_ERROR", "message": message, "retryable": False},
        ) from exc
    except Exception as exc:
        import logging

        logging.getLogger(__name__).exception("chat.ask_failed audit_id=%s", audit_id)
        chat_telemetry.record(
            duration_ms=None,
            fallback_used=False,
            confidence_level="low",
            include_unverified=data.include_unverified,
            errored=True,
            error_type="server",
        )
        save_chat_telemetry_event(
            db,
            audit_project_id=project.id,
            provider="local",
            model_name=None,
            duration_ms=None,
            fallback_used=False,
            sources_count=0,
            include_unverified=data.include_unverified,
            confidence_level="low",
            errored=True,
            error_type="server",
        )
        db.commit()
        raise HTTPException(
            status_code=500,
            detail={
                "code": "CHAT_ERROR",
                "message": "Не удалось получить ответ чата. Повторите вопрос или обновите страницу (Ctrl+F5).",
                "retryable": True,
            },
        ) from exc
    return AskAuditResponse(**result)
