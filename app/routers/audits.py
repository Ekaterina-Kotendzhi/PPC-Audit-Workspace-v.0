import json
import os
import time
from datetime import datetime, timezone
from typing import Any, List, Optional
from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, Request, Form, UploadFile, File, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload
from app.config import settings, is_force_demo_ai
from app.database import SessionLocal, get_db
from app.models import Client, ClientContact, AuditProject, AuditMaterial, AuditFinding, AuditRun
from app.schemas import (
    CreateAuditRequest, CreateAuditResponse, AuditListItem,
    AuditDetailResponse,
    UpdateAuditClientRequest, AuditClientInfoResponse,
    ClientContactResponse, CreateClientContactRequest, UpdateClientContactRequest,
    MaterialResponse,
    AnalyzeResponse,
    AnalysisCostEstimateResponse,
    AnalysisReadiness,
    AnalysisFreshness,
    MetricsKpiProvenance,
    DataCoverage,
    AuditWorkflowState, WorkflowUI, DataIssue,
    AcceptLimitationRequest, AcceptLimitationResponse,
    DuplicateAuditResponse, ArchiveAuditRequest, ArchiveAuditResponse,
    AuditPlan, AuditPlanUpdateRequest,
    MetricsPeriodsResponse, SetActiveMetricsPeriodRequest,
    ReportAppendixResponse, ReportAppendixUpdateRequest,
    ReportIllustrationsSummary,
    ClientSnapshotDraftPreviewResponse,
    ClientSnapshotDraftApplyRequest,
    ClientSnapshotDraftApplyResponse,
    ReportOutputPatchRequest,
    ReportOutputPatchResponse,
    PrePdfCheckResponse,
    PostAnalysisHintsResponse,
    DirectHealthExplainRequest,
    DirectHealthExplainResponse,
    DirectHealthSyncFindingsResponse,
    DirectEnrichmentCoverage,
)
from app.services.metrics_periods_service import (
    ensure_active_metrics_material_id,
    list_metrics_periods,
    set_active_metrics_period,
)
from app.services.audit_plan_service import (
    capture_baseline_from_current,
    load_audit_plan,
    merge_forecast_from_offer,
    save_audit_plan,
    sync_audit_plan_reference_period,
)


def _merge_direct_charts(ai_charts: list, direct_charts: list) -> list:
    """Keep AI charts and add Excel direct_slice charts (e.g. «Расход по месяцам») if missing."""
    if not direct_charts:
        return ai_charts or []
    if not ai_charts:
        return list(direct_charts)
    keys = {(c.get("title") or "", c.get("source") or "") for c in ai_charts}
    merged = list(ai_charts)
    for chart in direct_charts:
        key = (chart.get("title") or "", chart.get("source") or "")
        if key not in keys:
            merged.append(chart)
            keys.add(key)
    return merged


from app.services.data_limitation_service import accept_data_limitation, can_accept_limitation
from app.services.material_helpers import material_pipeline_status
from app.services.analysis_estimate_service import estimate_analysis_cost
from app.services.ai_service import metrics_from_project, run_analysis
from app.services.client_contacts_service import (
    apply_contact_fields,
    contact_log_summary,
    contact_to_dict,
    create_client_contact,
    get_contact_for_client,
    list_client_contacts,
    client_has_contacts,
)
from app.services.client_service import (
    apply_client_fields,
    client_info_dict,
    init_client_from_create,
)
from app.services.audit_gate_service import assert_analysis_allowed
from app.services.audit_duplicate_service import duplicate_audit_project
from app.services.audit_list_service import (
    apply_audit_list_row_filters,
    build_audit_list_row,
    sort_audit_list_rows,
)
from app.services.analysis_stale_service import build_analysis_freshness
from app.services.audit_run_helpers import latest_run
from app.services.note_metrics_service import build_metrics_kpi_provenance, effective_metrics
from app.services.audit_workflow_service import build_audit_workflow_context
from app.services.ai_model_service import default_model_id, validate_model_id
from app.services.model_router import ModelRouter
from app.services.export_service import generate_html_report
from app.services.pdf_service import PdfExportError, generate_pdf_report
from app.services.file_service import log_audit_action, material_file_download_url
from app.services.direct_slice_service import build_direct_analytics
from app.services.direct_health_explain_service import explain_direct_health
from app.services.direct_user_copy import health_missing
from app.services.direct_health_findings_service import (
    DIRECT_HEALTH_SOURCE,
    sync_direct_health_findings,
)
from app.services.finding_direct_link import get_direct_risk_ref
from app.services.material_helpers import document_slice_from_material, get_marketer_ai_hint, material_type_label
from app.services.progress_service import clear_progress, get_progress, set_progress
from app.services.review_service import count_needs_review
from app.services.report_appendix_service import (
    ReportAppendixValidationError,
    build_report_appendix_response,
    load_report_appendix_items,
    remap_appendix_material_ids,
    save_report_appendix,
)
from app.services.pre_pdf_check_service import build_pre_pdf_check
from app.services.post_analysis_hints_service import build_post_analysis_hints
from app.services.ai_client_snapshot_draft_service import (
    AI_SNAPSHOT_DEFAULT_MODEL,
    apply_client_snapshot_draft,
    generate_client_snapshot_draft,
    result_to_preview_dict,
)
from app.services.report_output_edit_service import patch_report_output
from app.services.finding_illustration_service import (
    build_report_illustrations_summary,
    enrich_finding_illustration,
)
from app.schemas import (
    FindingEvidenceCheckResponse,
    FindingFeedbackRequest,
    FindingIllustrationRequest,
    FindingUpdateRequest,
)
from app.services.finding_evidence_confirm_service import assess_finding_evidence_for_confirm
from app.services.finding_feedback_actions import (
    comment_finding_action,
    confirm_finding_action,
    confirm_finding_risk_pattern_action,
    get_finding_for_audit,
    reject_finding_action,
    set_finding_illustration_action,
    unconfirm_finding_action,
    update_finding_action,
)
from app.services.knowledge_base_service import (
    finding_kb_eligible,
    finding_kb_eligibility_reason,
    purge_kb_for_project_findings,
)

router = APIRouter(prefix="/api/audits", tags=["audits"])


def _finding_kb_eligible(finding: AuditFinding) -> bool:
    return finding_kb_eligible(finding)


def _finding_source_tag(finding: AuditFinding) -> str:
    if not finding.evidence_json:
        return "ai"
    try:
        evidence = json.loads(finding.evidence_json)
    except json.JSONDecodeError:
        return "ai"
    if isinstance(evidence, list) and any(
        isinstance(item, dict) and item.get("source") == DIRECT_HEALTH_SOURCE
        for item in evidence
    ):
        return DIRECT_HEALTH_SOURCE
    return "ai"


def _serialize_audit_findings(project: AuditProject, audit_id: int) -> list[dict]:
    findings: list[dict] = []
    for f in project.findings or []:
        source = _finding_source_tag(f)
        needs_review = f.needs_review
        review_reason = f.review_reason
        if source == DIRECT_HEALTH_SOURCE:
            needs_review = False
            review_reason = None
        findings.append({
            "id": f.id,
            "area": f.area,
            "finding_kind": getattr(f, "finding_kind", None) or "hypothesis",
            "finding_source": source,
            "direct_risk_ref": get_direct_risk_ref(f),
            "is_ai_interpretation": source == "ai" and bool(get_direct_risk_ref(f)),
            "title": getattr(f, "title", None) or f.problem,
            "severity": f.severity,
            "problem": f.problem,
            "evidence": json.loads(f.evidence_json) if f.evidence_json else [],
            "evidence_level": getattr(f, "evidence_level", None),
            "based_on": getattr(f, "based_on", None),
            "missing_data": getattr(f, "missing_data", None),
            "recommendation": f.recommendation,
            "recommended_action": f.recommendation,
            "expected_impact": f.expected_impact,
            "confidence": f.confidence,
            "needs_review": needs_review,
            "review_reason": review_reason,
            "approved_for_kb": bool(getattr(f, "approved_for_kb", False)),
            "kb_eligible": _finding_kb_eligible(f),
            "kb_eligibility_reason": finding_kb_eligibility_reason(f),
            "status": f.status or "ai_generated",
            "original_ai_output": f.original_ai_output,
            "edited_output": f.edited_output,
            "human_comment": f.human_comment,
            "edited_by": f.edited_by,
            "edited_at": f.edited_at.isoformat() if f.edited_at else None,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            **enrich_finding_illustration(f, project, audit_id=audit_id),
        })
    return findings


def _active_materials(project: AuditProject) -> list[AuditMaterial]:
    return [
        m for m in (project.materials or [])
        if not getattr(m, "excluded_from_analysis", False)
    ]


def _quick_issues_open_count(project: AuditProject) -> int:
    """Lightweight task count for audit list (no full workflow_ui build)."""
    count = sum(1 for m in _active_materials(project) if m.needs_review)
    count += sum(1 for f in project.findings if f.needs_review)
    if project.needs_review:
        count = max(count, 1)
    return count


def _list_needs_data_attention(project: AuditProject) -> bool:
    """Draft without minimum data or with open material review (list tab «Требует проверки»)."""
    materials = _active_materials(project)
    if not materials:
        return True
    if project.status != "draft":
        return False
    if any(m.needs_review for m in materials):
        return True
    metrics = effective_metrics(project)
    budget = metrics.get("budget")
    clicks = metrics.get("clicks")
    leads = metrics.get("leads") or metrics.get("conversions")
    return not (budget and clicks and leads)


def _external_ai_enabled() -> bool:
    if is_force_demo_ai():
        return False
    return ModelRouter().has_any_configured_provider()


def _normalize_privacy_options(payload: dict[str, Any] | None) -> dict[str, Any]:
    """Normalize AI privacy settings.

    Hard rules:
    - company name, contacts, people names and direct file URLs are hidden always;
    - business category and core metrics are kept because they are needed for useful PPC analysis;
    - revenue/sales are sent only when the user explicitly allows it.
    """
    payload = payload or {}
    privacy = payload.get("privacy_options") if isinstance(payload.get("privacy_options"), dict) else payload

    # New UI contract: send_revenue_sales=true means allow revenue and sales for CPA/ROMI.
    # Backward compatibility: exclude_revenue=true means hide them.
    if "send_revenue_sales" in privacy:
        hide_revenue = not bool(privacy.get("send_revenue_sales"))
    elif "hide_revenue" in privacy:
        hide_revenue = bool(privacy.get("hide_revenue"))
    else:
        hide_revenue = bool(privacy.get("exclude_revenue", settings.AI_DEFAULT_EXCLUDE_REVENUE))

    try:
        ai_temperature = float(privacy.get("ai_temperature", settings.AI_TEMPERATURE_ANALYSIS))
    except (TypeError, ValueError):
        ai_temperature = settings.AI_TEMPERATURE_ANALYSIS
    ai_temperature = max(settings.AI_TEMPERATURE_MIN, min(settings.AI_TEMPERATURE_MAX, ai_temperature))

    model_id = payload.get("model_id") or privacy.get("model_id")

    from app.services.ai_context_options import normalize_ai_context_options

    context_opts = normalize_ai_context_options(privacy)

    return {
        "ai_consent": bool(privacy.get("ai_consent") or privacy.get("consent")),
        "ai_temperature": ai_temperature,
        "force_demo": bool(privacy.get("force_demo", False)),
        "model_id": str(model_id).strip() if model_id else None,
        "send_metrics": True,
        "send_business_category": True,
        "send_revenue_sales": not hide_revenue,
        "hide_revenue": hide_revenue,
        "hide_company_name": True,
        "hide_contacts": True,
        "hide_file_urls": True,
        **context_opts,
        # Legacy keys kept for older service calls/tests.
        "exclude_revenue": hide_revenue,
        "exclude_contacts": True,
        "exclude_client_name": True,
        "exclude_file_urls": True,
    }


def _assert_model_id(options: dict[str, Any]) -> None:
    if options.get("force_demo") or not _external_ai_enabled():
        return
    model_id = options.get("model_id") or default_model_id()
    options["model_id"] = model_id
    try:
        validate_model_id(model_id, require_available=True)
    except ValueError as exc:
        message = str(exc)
        status = 400 if "Неизвестная" in message else 409
        raise HTTPException(status_code=status, detail=message) from exc


def _assert_ai_consent(options: dict[str, Any]) -> None:
    if _external_ai_enabled() and settings.REQUIRE_AI_CONSENT and not options.get("ai_consent"):
        raise HTTPException(
            status_code=400,
            detail=f"Перед отправкой материалов во внешний AI-сервис ({settings.AI_PROVIDER_NAME}) нужно подтвердить согласие в интерфейсе.",
        )


def _finalize_analysis_status(db: Session, project: AuditProject, audit_id: int, final_status: str) -> None:
    """Гарантирует, что проект не останется в in_progress после анализа."""
    from app.services.review_service import count_needs_review

    project.status = final_status
    if final_status not in {"in_progress", "failed"}:
        project.needs_review = count_needs_review(project) > 0
        if project.needs_review and final_status == "completed":
            project.status = "needs_review"
    db.commit()


def _run_analysis_background(audit_id: int, privacy_options: dict[str, Any] | None = None) -> None:
    """Фоновый запуск анализа для live-прогресса через WebSocket."""
    db = SessionLocal()
    try:
        project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
        if not project:
            set_progress(audit_id, "failed", 0, "Аудит не найден", status="failed")
            return
        # Пустой аудит анализируется безопасно: run_analysis вернёт needs_review,
        # а не ошибку. Это важно для одинакового поведения sync/background API.
        project.status = "in_progress"
        db.commit()
        set_progress(audit_id, "start", 2, "Анализ поставлен в очередь", status="in_progress")

        def progress(step: str, percent: int, message: str) -> None:
            set_progress(audit_id, step, percent, message, status="in_progress")

        result = run_analysis(project, db, progress_callback=progress, privacy_options=privacy_options)
        db.refresh(project)
        final_status = result.get("status", project.status)
        failed = final_status == "failed"
        _finalize_analysis_status(db, project, audit_id, final_status)
        set_progress(
            audit_id,
            "done" if not failed else "failed",
            100 if not failed else 0,
            "Анализ завершён" if not failed else "Анализ завершился ошибкой",
            status=final_status,
            result=result,
        )
    except Exception as exc:  # noqa: BLE001
        try:
            project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
            if project and project.status == "in_progress":
                _finalize_analysis_status(db, project, audit_id, "failed")
        except Exception:
            db.rollback()
        set_progress(audit_id, "failed", 0, f"Ошибка фонового анализа: {exc}", status="failed")
    finally:
        db.close()


def _audit_list_query_options():
    return [
        joinedload(AuditProject.client).selectinload(Client.contacts),
        joinedload(AuditProject.materials),
        joinedload(AuditProject.findings),
        joinedload(AuditProject.runs),
    ]


@router.get("/", response_model=List[AuditListItem])
def list_audits(
    response: Response,
    limit: int = Query(100, ge=1, le=500, description="Сколько последних аудитов вернуть"),
    offset: int = Query(0, ge=0),
    q: Optional[str] = Query(None, description="Поиск по client_name, niche, goal"),
    status: Optional[str] = Query(None, description="draft, completed, …"),
    list_state: Optional[str] = Query(None, description="DRAFT_EMPTY, REPORT_READY, …"),
    requires_attention: Optional[bool] = Query(None),
    export_ready: Optional[bool] = Query(None),
    has_errors: Optional[bool] = Query(None, description="ANALYSIS_FAILED / status failed"),
    sort: str = Query("-created_at", description="created_at, -created_at, client_name, findings_count, status"),
    archived: bool = Query(False, description="true — только архивные, false — активные"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
):
    """Витрина аудитов (быстрый список без полного workflow_ui на каждую строку)."""
    query = db.query(AuditProject).join(AuditProject.client)

    if archived:
        query = query.filter(AuditProject.archived_at.isnot(None))
    else:
        query = query.filter(AuditProject.archived_at.is_(None))

    if status:
        query = query.filter(AuditProject.status == status)
    if date_from:
        query = query.filter(AuditProject.created_at >= date_from)
    if date_to:
        query = query.filter(AuditProject.created_at <= date_to)
    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(Client.name).like(term),
                func.lower(Client.niche).like(term),
                func.lower(AuditProject.goal).like(term),
            )
        )

    projects = (
        query.options(*_audit_list_query_options())
        .order_by(AuditProject.created_at.desc())
        .all()
    )

    rows = [build_audit_list_row(p) for p in projects]
    rows = apply_audit_list_row_filters(
        rows,
        list_state=list_state,
        requires_attention=requires_attention,
        export_ready=export_ready,
        has_errors=has_errors,
    )
    rows = sort_audit_list_rows(rows, sort)
    total = len(rows)
    page = rows[offset : offset + limit]

    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Limit"] = str(limit)
    response.headers["X-Offset"] = str(offset)

    return [AuditListItem(**row) for row in page]

@router.post("/", response_model=CreateAuditResponse, status_code=201)
def create_audit(data: CreateAuditRequest, db: Session = Depends(get_db)):
    """Создать аудит"""
    client = init_client_from_create(
        client_name=data.client_name,
        website=data.website,
        comment=data.comment,
        region=data.region,
        niche_category=data.niche_category,
        niche_subcategory=data.niche_subcategory,
        legacy_niche=data.niche,
    )
    db.add(client)
    db.flush()
    
    project = AuditProject(
        client_id=client.id,
        goal=data.goal,
        status="draft",
        needs_review=False
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return CreateAuditResponse(
        audit_id=project.id,
        client_id=client.id,
        status=project.status,
        needs_review=project.needs_review
    )


def _get_audit_with_client(audit_id: int, db: Session, *, load_contacts: bool = False) -> AuditProject:
    opts = [joinedload(AuditProject.client)]
    if load_contacts:
        opts.append(joinedload(AuditProject.client).selectinload(Client.contacts))
    project = (
        db.query(AuditProject)
        .options(*opts)
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    if not project.client:
        raise HTTPException(status_code=404, detail="Клиент не найден")
    return project


@router.get("/{audit_id}/client", response_model=AuditClientInfoResponse)
def get_audit_client(audit_id: int, db: Session = Depends(get_db)):
    """Данные клиента для формы редактирования."""
    project = _get_audit_with_client(audit_id, db)
    return AuditClientInfoResponse(**client_info_dict(project))


@router.patch("/{audit_id}/client", response_model=AuditClientInfoResponse)
def patch_audit_client(
    audit_id: int,
    data: UpdateAuditClientRequest,
    db: Session = Depends(get_db),
):
    """Обновить данные клиента и цель аудита."""
    project = _get_audit_with_client(audit_id, db)
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Нет полей для обновления")
    if "client_name" in payload and not str(payload["client_name"]).strip():
        raise HTTPException(status_code=422, detail="Название клиента не может быть пустым")

    apply_client_fields(project.client, payload)
    if "goal" in payload:
        project.goal = (payload["goal"] or "").strip() or None

    db.commit()
    db.refresh(project)
    return AuditClientInfoResponse(**client_info_dict(project))


@router.get("/{audit_id}/contacts", response_model=List[ClientContactResponse])
def list_audit_contacts(audit_id: int, db: Session = Depends(get_db)):
    """Список контактов клиента (не уходит в AI)."""
    project = _get_audit_with_client(audit_id, db, load_contacts=True)
    return [ClientContactResponse(**contact_to_dict(c)) for c in list_client_contacts(project.client)]


@router.post("/{audit_id}/contacts", response_model=ClientContactResponse, status_code=201)
def create_audit_contact(
    audit_id: int,
    data: CreateClientContactRequest,
    db: Session = Depends(get_db),
):
    project = _get_audit_with_client(audit_id, db, load_contacts=True)
    if not str(data.name).strip():
        raise HTTPException(status_code=422, detail="Имя контакта обязательно")
    contact = create_client_contact(project.client, data.model_dump())
    db.add(contact)
    db.flush()
    log_audit_action(
        db,
        audit_project_id=project.id,
        action="contact_created",
        input_json=contact_log_summary(contact, action="Добавлен контакт"),
    )
    db.commit()
    db.refresh(contact)
    return ClientContactResponse(**contact_to_dict(contact))


@router.patch("/{audit_id}/contacts/{contact_id}", response_model=ClientContactResponse)
def patch_audit_contact(
    audit_id: int,
    contact_id: int,
    data: UpdateClientContactRequest,
    db: Session = Depends(get_db),
):
    project = _get_audit_with_client(audit_id, db, load_contacts=True)
    contact = get_contact_for_client(project.client, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Контакт не найден")
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Нет полей для обновления")
    if "name" in payload and not str(payload["name"]).strip():
        raise HTTPException(status_code=422, detail="Имя контакта не может быть пустым")
    apply_contact_fields(contact, payload)
    log_audit_action(
        db,
        audit_project_id=project.id,
        action="contact_updated",
        input_json=contact_log_summary(contact, action="Обновлён контакт"),
    )
    db.commit()
    db.refresh(contact)
    return ClientContactResponse(**contact_to_dict(contact))


@router.delete("/{audit_id}/contacts/{contact_id}", status_code=204)
def delete_audit_contact(audit_id: int, contact_id: int, db: Session = Depends(get_db)):
    project = _get_audit_with_client(audit_id, db, load_contacts=True)
    contact = get_contact_for_client(project.client, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Контакт не найден")
    summary = contact_log_summary(contact, action="Удалён контакт")
    log_audit_action(
        db,
        audit_project_id=project.id,
        action="contact_deleted",
        input_json=summary,
    )
    db.delete(contact)
    db.commit()
    return Response(status_code=204)

@router.get("/{audit_id}", response_model=AuditDetailResponse)
def get_audit(audit_id: int, db: Session = Depends(get_db)):
    """Получить карточку аудита"""
    project = (
        db.query(AuditProject)
        .options(
            joinedload(AuditProject.materials),
            joinedload(AuditProject.findings),
            joinedload(AuditProject.runs),
            joinedload(AuditProject.client).selectinload(Client.contacts),
        )
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")

    prev_active = getattr(project, "active_metrics_material_id", None)
    ensure_active_metrics_material_id(project, db)
    if getattr(project, "active_metrics_material_id", None) != prev_active:
        db.commit()
        db.refresh(project)

    # KB reconcile/purge не на каждый GET — Chroma тормозит карточку на 30+ с.

    # Собираем материалы
    materials = []
    for m in project.materials:
        pipe_code, pipe_label = material_pipeline_status(m)
        materials.append(MaterialResponse(
            id=m.id,
            type=m.type,
            type_label=material_type_label(m.type),
            pipeline_status=pipe_code,
            pipeline_label=pipe_label,
            title=m.title,
            file_url=material_file_download_url(m.audit_project_id, m.id) if m.file_url else None,
            extracted_text=m.extracted_text,
            document_slice=document_slice_from_material(m),
            raw_content=m.raw_content,
            needs_review=m.needs_review,
            review_reason=m.review_reason,
            status=getattr(m, "status", None) or ("needs_review" if m.needs_review else "ready"),
            excluded_from_analysis=bool(getattr(m, "excluded_from_analysis", False)),
            excluded_from_report=bool(getattr(m, "excluded_from_report", False)),
            exclusion_reason=getattr(m, "exclusion_reason", None),
            marketer_ai_hint=get_marketer_ai_hint(m) or None,
            created_at=m.created_at,
            updated_at=getattr(m, "updated_at", None) or m.created_at,
        ))
    
    # Последний успешный запуск для графиков и схем
    charts = []
    schemes = []
    commercial_offer = None
    audit_summary = None
    metrics_summary = None
    global_needs_review = False
    global_review_reasons = []
    
    direct_enrichment = None
    last_ai_run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if last_ai_run and last_ai_run.output_json:
        try:
            data = json.loads(last_ai_run.output_json)
            charts = data.get("charts", [])
            schemes = data.get("schemes", [])
            commercial_offer = data.get("commercial_offer")
            audit_summary = data.get("audit_summary")
            metrics_summary = data.get("metrics")
            global_needs_review = data.get("global_needs_review", False)
            global_review_reasons = data.get("global_review_reasons", [])
            raw_coverage = data.get("enrichment_coverage") or data.get("direct_enrichment")
            if isinstance(raw_coverage, dict):
                direct_enrichment = DirectEnrichmentCoverage(**raw_coverage)
        except json.JSONDecodeError:
            pass

    metrics_summary = metrics_from_project(project) if project.materials else metrics_summary

    ctx = build_audit_workflow_context(project)
    readiness = ctx["readiness"]
    coverage = ctx["coverage"]
    workflow = ctx["workflow"]
    review_queue = ctx["review_queue"]
    data_issues = ctx["issues"]
    workflow_ui = ctx["workflow_ui"]
    needs_review_total = workflow_ui["issues_open_count"]

    direct_analytics = build_direct_analytics(project, coverage=coverage)
    da_charts = (direct_analytics or {}).get("charts") or []
    if da_charts:
        charts = _merge_direct_charts(charts, da_charts)

    findings = _serialize_audit_findings(project, audit_id)

    if coverage["is_preliminary"]:
        if not da_charts:
            charts = []
        schemes = []
        commercial_offer = None
        findings = []
        if audit_summary:
            audit_summary = {
                **audit_summary,
                "priority": "low",
                "client_problem": audit_summary.get("client_problem") or "Данных недостаточно для полноценного PPC-аудита.",
                "main_risk": audit_summary.get("main_risk") or "Без исходных материалов выводы останутся предварительными.",
                "short_conclusion": audit_summary.get("short_conclusion") or "Добавьте материалы и метрики, затем перезапустите анализ.",
            }

    if workflow["analysis_failed"]:
        findings = []
        charts = []
        schemes = []
        commercial_offer = None
        audit_summary = None
        global_needs_review = True
        global_review_reasons = ["AI-анализ не завершён — отчёт содержит только исходные данные"]

    freshness = build_analysis_freshness(project)
    kpi_provenance = build_metrics_kpi_provenance(project)
    contacts = [ClientContactResponse(**contact_to_dict(c)) for c in list_client_contacts(project.client)]

    return AuditDetailResponse(
        id=project.id,
        client_name=project.client.name,
        niche=project.client.niche,
        niche_display=project.client.niche,
        niche_category=project.client.niche_category,
        niche_subcategory=project.client.niche_subcategory,
        region=project.client.region,
        website=project.client.website,
        goal=project.goal,
        comment=project.client.comment,
        has_contacts=bool(contacts),
        contacts=contacts,
        status=project.status,
        needs_review=project.needs_review,
        created_at=project.created_at,
        updated_at=project.updated_at,
        materials=materials,
        findings=findings,
        charts=charts,
        schemes=schemes,
        commercial_offer=commercial_offer,
        audit_summary=audit_summary,
        metrics_summary=metrics_summary,
        global_needs_review=global_needs_review or needs_review_total > 0,
        global_review_reasons=global_review_reasons,
        review_queue=review_queue,
        needs_review_count=needs_review_total,
        analysis_readiness=AnalysisReadiness(**readiness),
        data_coverage=DataCoverage(**coverage),
        workflow_state=AuditWorkflowState(**workflow),
        workflow_ui=WorkflowUI(**workflow_ui),
        data_issues=[DataIssue(**issue) for issue in data_issues],
        analysis_freshness=AnalysisFreshness(**freshness),
        metrics_kpi_provenance=MetricsKpiProvenance(**kpi_provenance) if kpi_provenance.get("parts") or kpi_provenance.get("summary_line") else None,
        audit_plan=AuditPlan(**sync_audit_plan_reference_period(
            project,
            merge_forecast_from_offer(
                load_audit_plan(project),
                commercial_offer if not coverage["is_preliminary"] else None,
            ),
        )),
        direct_analytics=direct_analytics,
        direct_enrichment=direct_enrichment,
        metrics_periods=MetricsPeriodsResponse(
            active_material_id=getattr(project, "active_metrics_material_id", None),
            periods=list_metrics_periods(project),
        ),
        report_appendix=ReportAppendixResponse(**build_report_appendix_response(project)),
        report_illustrations=ReportIllustrationsSummary(
            **{
                **build_report_illustrations_summary(project),
                "appendix_count": len(load_report_appendix_items(project)),
            }
        ),
    )


@router.get("/{audit_id}/report/appendix", response_model=ReportAppendixResponse)
def get_report_appendix(audit_id: int, db: Session = Depends(get_db)):
    project = (
        db.query(AuditProject)
        .options(joinedload(AuditProject.materials))
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    return ReportAppendixResponse(**build_report_appendix_response(project))


@router.put("/{audit_id}/report/appendix", response_model=ReportAppendixResponse)
def update_report_appendix(
    audit_id: int,
    body: ReportAppendixUpdateRequest,
    db: Session = Depends(get_db),
):
    project = (
        db.query(AuditProject)
        .options(joinedload(AuditProject.materials))
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    payload_items = [item.model_dump() for item in body.items]
    try:
        save_report_appendix(project, payload_items)
    except ReportAppendixValidationError as exc:
        status = 409 if "исключён" in str(exc).lower() else 422
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="update_report_appendix",
        input_json=json.dumps({"count": len(payload_items)}, ensure_ascii=False),
    )
    db.commit()
    db.refresh(project)
    return ReportAppendixResponse(**build_report_appendix_response(project))


@router.get("/{audit_id}/metrics-periods", response_model=MetricsPeriodsResponse)
def get_metrics_periods(audit_id: int, db: Session = Depends(get_db)):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    ensure_active_metrics_material_id(project, db)
    db.commit()
    db.refresh(project)
    return MetricsPeriodsResponse(
        active_material_id=getattr(project, "active_metrics_material_id", None),
        periods=list_metrics_periods(project),
    )


@router.post("/{audit_id}/metrics-periods/active", response_model=MetricsPeriodsResponse)
def activate_metrics_period(
    audit_id: int,
    body: SetActiveMetricsPeriodRequest,
    db: Session = Depends(get_db),
):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    try:
        result = set_active_metrics_period(project, body.material_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    db.commit()
    return MetricsPeriodsResponse(
        active_material_id=result["active_material_id"],
        periods=result["periods"],
    )


@router.get("/{audit_id}/audit-plan", response_model=AuditPlan)
def get_audit_plan(audit_id: int, db: Session = Depends(get_db)):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    plan = sync_audit_plan_reference_period(project, load_audit_plan(project))
    return AuditPlan(**plan)


@router.patch("/{audit_id}/audit-plan", response_model=AuditPlan)
def patch_audit_plan(
    audit_id: int,
    body: AuditPlanUpdateRequest,
    db: Session = Depends(get_db),
):
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    if body.capture_baseline:
        note = ""
        if isinstance(body.baseline, dict):
            note = str(body.baseline.get("note") or "")
        plan = capture_baseline_from_current(project, note=note)
    else:
        payload = body.model_dump(exclude_unset=True, exclude={"capture_baseline"})
        plan = save_audit_plan(project, payload) if payload else load_audit_plan(project)
    db.commit()
    db.refresh(project)
    plan = sync_audit_plan_reference_period(project, plan)
    return AuditPlan(**plan)


def _resolve_snapshot_draft_model(model_id: str | None) -> str:
    if not model_id or not str(model_id).strip():
        return AI_SNAPSHOT_DEFAULT_MODEL
    try:
        validate_model_id(model_id, require_available=True)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return str(model_id).strip()


@router.get("/{audit_id}/client-snapshot/ai/preview", response_model=ClientSnapshotDraftPreviewResponse)
def preview_client_snapshot_draft(
    audit_id: int,
    model_id: str | None = None,
    db: Session = Depends(get_db),
):
    """M2.3: dry-run AI draft for client snapshot text (R1)."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    resolved_model = _resolve_snapshot_draft_model(model_id)
    result = generate_client_snapshot_draft(project, model_id=resolved_model)
    return ClientSnapshotDraftPreviewResponse(**result_to_preview_dict(result))


@router.post("/{audit_id}/client-snapshot/ai/apply", response_model=ClientSnapshotDraftApplyResponse)
def apply_client_snapshot_draft_endpoint(
    audit_id: int,
    body: ClientSnapshotDraftApplyRequest,
    db: Session = Depends(get_db),
):
    """M2.3: apply marketer-approved draft into last successful ai_analysis output."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    draft = body.draft if isinstance(body.draft, dict) else {}
    if not draft.get("audit_summary"):
        raise HTTPException(status_code=400, detail="В теле запроса нужен draft.audit_summary")
    try:
        applied = apply_client_snapshot_draft(project, draft)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    db.commit()
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="client_snapshot_draft_apply",
        input_json=json.dumps({"model_id": body.model_id}, ensure_ascii=False),
        output_json=json.dumps({"fields": list(draft.keys())}, ensure_ascii=False),
        status="success",
    )
    db.commit()
    return ClientSnapshotDraftApplyResponse(**applied)


@router.patch("/{audit_id}/report-output", response_model=ReportOutputPatchResponse)
def patch_report_output_endpoint(
    audit_id: int,
    body: ReportOutputPatchRequest,
    db: Session = Depends(get_db),
):
    """Сохранить правки маркетолога в краткий вывод и/или КП (последний AI-анализ)."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    summary_patch = (
        body.audit_summary.model_dump(exclude_unset=True) if body.audit_summary else None
    )
    offer_patch = (
        body.commercial_offer.model_dump(exclude_unset=True) if body.commercial_offer else None
    )
    if not summary_patch and not offer_patch:
        raise HTTPException(status_code=400, detail="Укажите audit_summary и/или commercial_offer")
    try:
        applied = patch_report_output(
            project,
            audit_summary=summary_patch,
            commercial_offer=offer_patch,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    db.commit()
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="report_output_patch",
        input_json=json.dumps(
            {"fields": [k for k, v in [("audit_summary", summary_patch), ("commercial_offer", offer_patch)] if v]},
            ensure_ascii=False,
        ),
        output_json=json.dumps({"ok": True}, ensure_ascii=False),
        status="success",
    )
    db.commit()
    return ReportOutputPatchResponse(**applied)


@router.post("/{audit_id}/report-output/refresh-offer", response_model=ReportOutputPatchResponse)
def refresh_report_offer_endpoint(
    audit_id: int,
    db: Session = Depends(get_db),
):
    """Обновить коммерческое предложение из данных аудита (без полного перезапуска AI)."""
    from app.services.report_output_edit_service import refresh_commercial_offer_from_audit_data

    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    try:
        applied = refresh_commercial_offer_from_audit_data(project, db)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    db.commit()
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="report_offer_refresh",
        status="success",
    )
    db.commit()
    return ReportOutputPatchResponse(**applied)


@router.post("/{audit_id}/report-output/refresh-summary", response_model=ReportOutputPatchResponse)
def refresh_report_summary_endpoint(
    audit_id: int,
    db: Session = Depends(get_db),
):
    """Обновить краткий вывод из данных аудита (без полного перезапуска AI)."""
    from app.services.report_output_edit_service import refresh_audit_summary_from_audit_data

    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    try:
        applied = refresh_audit_summary_from_audit_data(project, db)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    db.commit()
    log_audit_action(
        db,
        audit_project_id=audit_id,
        action="report_summary_refresh",
        status="success",
    )
    db.commit()
    return ReportOutputPatchResponse(**applied)


@router.get("/{audit_id}/report/pre-pdf-check", response_model=PrePdfCheckResponse)
def get_pre_pdf_check(audit_id: int, db: Session = Depends(get_db)):
    """M2.17: checklist before sending PDF to client."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    return PrePdfCheckResponse(**build_pre_pdf_check(project))


@router.get("/{audit_id}/post-analysis-hints", response_model=PostAnalysisHintsResponse)
def get_post_analysis_hints(audit_id: int, db: Session = Depends(get_db)):
    """M2.17.2: rule-based hints for analysis-complete modal."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    return PostAnalysisHintsResponse(hints=build_post_analysis_hints(project))


@router.post("/{audit_id}/health/sync-findings", response_model=DirectHealthSyncFindingsResponse)
def post_direct_health_sync_findings(audit_id: int, db: Session = Depends(get_db)):
    """Sync J15/J16 template findings into «Выводы» (on demand, does not touch AI findings)."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    direct_analytics = build_direct_analytics(project)
    if not direct_analytics or not direct_analytics.get("health"):
        raise HTTPException(
            status_code=409,
            detail=health_missing(with_conditions=True),
        )
    created = sync_direct_health_findings(project, direct_analytics, db)
    db.commit()
    db.expire(project, ["findings"])
    findings = [f for f in _serialize_audit_findings(project, audit_id) if f.get("finding_source") == DIRECT_HEALTH_SOURCE]
    return DirectHealthSyncFindingsResponse(created=created, findings=findings)


@router.post("/{audit_id}/health/explain", response_model=DirectHealthExplainResponse)
def post_direct_health_explain(
    audit_id: int,
    body: DirectHealthExplainRequest | None = Body(default=None),
    db: Session = Depends(get_db),
):
    """J16.4: on-demand LLM explanation of Direct Health Score."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    model_id = (body.model_id if body else None) or None
    if model_id:
        try:
            validate_model_id(model_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        result = explain_direct_health(project, model_id=model_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return DirectHealthExplainResponse(**result)


@router.post("/{audit_id}/accept-limitation", response_model=AcceptLimitationResponse)
def post_accept_limitation(
    audit_id: int,
    body: AcceptLimitationRequest,
    db: Session = Depends(get_db),
):
    """Accept a non-critical missing data item as a known report limitation."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    if not can_accept_limitation(body.item_id):
        raise HTTPException(
            status_code=400,
            detail="Период, бюджет, клики и заявки нельзя оставить как ограничение — добавьте метрики",
        )
    try:
        result = accept_data_limitation(project, body.item_id, note=body.note, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return AcceptLimitationResponse(
        item_id=result["id"],
        label=result["label"],
        accepted=True,
        already_accepted=bool(result.get("already_accepted")),
    )


@router.post("/{audit_id}/analyze", response_model=AnalyzeResponse)
def analyze_audit(audit_id: int, payload: dict[str, Any] | None = Body(default=None), db: Session = Depends(get_db)):
    """Запустить AI-анализ"""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")

    privacy_options = _normalize_privacy_options(payload)
    _assert_ai_consent(privacy_options)
    _assert_model_id(privacy_options)
    force_draft = bool((payload or {}).get("force_draft") or privacy_options.get("force_draft"))

    try:
        readiness = assert_analysis_allowed(project, force_draft=force_draft)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    project.status = "in_progress"
    db.commit()
    
    def progress(step: str, percent: int, message: str) -> None:
        set_progress(audit_id, step, percent, message, status="in_progress")

    result = run_analysis(project, db, progress_callback=progress, privacy_options=privacy_options)
    if readiness.get("forced_draft"):
        result["forced_draft"] = True
    failed = result.get("status") == "failed"
    set_progress(
        audit_id,
        "done" if not failed else "failed",
        100 if not failed else 0,
        "Анализ завершён" if not failed else "Анализ завершился ошибкой",
        status=result.get("status", "completed"),
        result=result,
    )
    
    return AnalyzeResponse(**result)

@router.post("/{audit_id}/analyze/estimate", response_model=AnalysisCostEstimateResponse)
def estimate_audit_analysis_cost(
    audit_id: int,
    payload: dict[str, Any] | None = Body(default=None),
    db: Session = Depends(get_db),
):
    """Оценка стоимости AI-анализа до запуска (M2.1)."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    privacy_options = _normalize_privacy_options(payload)
    if _external_ai_enabled() and not privacy_options.get("force_demo"):
        try:
            model_id = privacy_options.get("model_id") or default_model_id()
            privacy_options["model_id"] = model_id
            validate_model_id(model_id, require_available=False)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    result = estimate_analysis_cost(
        project,
        db,
        privacy_options=privacy_options,
        model_id=privacy_options.get("model_id"),
    )
    return AnalysisCostEstimateResponse(**result)

@router.post("/{audit_id}/analyze/start")
def start_audit_analysis(audit_id: int, background_tasks: BackgroundTasks, payload: dict[str, Any] | None = Body(default=None), db: Session = Depends(get_db)):
    """Запустить анализ в фоне и смотреть прогресс по WebSocket."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    # Даже если материалов ещё нет, фоновый анализ должен завершиться безопасным
    # needs_review-результатом, а не падать ошибкой.
    if project.status == "in_progress":
        return {"audit_id": audit_id, "status": "in_progress", "message": "Анализ уже выполняется"}

    privacy_options = _normalize_privacy_options(payload)
    _assert_ai_consent(privacy_options)
    _assert_model_id(privacy_options)
    force_draft = bool((payload or {}).get("force_draft") or privacy_options.get("force_draft"))
    try:
        assert_analysis_allowed(project, force_draft=force_draft)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    project.status = "in_progress"
    db.commit()
    set_progress(audit_id, "queued", 1, "Анализ поставлен в очередь", status="in_progress")
    background_tasks.add_task(_run_analysis_background, audit_id, privacy_options)
    return {"audit_id": audit_id, "status": "in_progress", "message": "Анализ запущен", "ws_url": f"/ws/audits/{audit_id}/status"}


@router.post("/{audit_id}/analyze/reset")
def reset_stuck_analysis(audit_id: int, db: Session = Depends(get_db)):
    """Сбросить зависший in_progress после перезапуска сервера или обрыва фоновой задачи."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")

    progress = get_progress(audit_id)
    if project.status != "in_progress":
        return {
            "audit_id": audit_id,
            "status": project.status,
            "reset": False,
            "message": "Анализ сейчас не выполняется",
            "progress": progress,
        }

    prog_status = str(progress.get("status") or "")
    if prog_status == "failed":
        new_status = "failed"
    elif count_needs_review(project) > 0:
        new_status = "needs_review"
    elif project.findings:
        new_status = "needs_review" if project.needs_review else "completed"
    else:
        new_status = "draft"

    project.status = new_status
    project.needs_review = count_needs_review(project) > 0
    db.commit()
    clear_progress(audit_id)
    set_progress(
        audit_id,
        "reset",
        0,
        "Анализ сброшен. Можно исправить данные и запустить снова.",
        status=new_status,
    )
    return {
        "audit_id": audit_id,
        "status": new_status,
        "reset": True,
        "message": "Статус анализа сброшен",
        "progress": get_progress(audit_id),
    }


@router.get("/{audit_id}/export/html", response_class=HTMLResponse)
def export_report_html(audit_id: int, db: Session = Depends(get_db)):
    """Предпросмотр отчёта в HTML."""
    project = (
        db.query(AuditProject)
        .options(joinedload(AuditProject.client))
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    db.expire(project)

    html = generate_html_report(project)
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@router.get("/{audit_id}/export", response_class=HTMLResponse)
def export_report_legacy(audit_id: int, db: Session = Depends(get_db)):
    """Обратная совместимость: старый HTML-экспорт."""
    return export_report_html(audit_id, db)


@router.get("/{audit_id}/export/pdf")
async def export_report_pdf(audit_id: int, db: Session = Depends(get_db)):
    """Сформировать и скачать полноценный PDF-отчёт."""
    project = (
        db.query(AuditProject)
        .options(joinedload(AuditProject.client))
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    db.expire(project)

    started = time.perf_counter()
    try:
        pdf_path = await generate_pdf_report(project)
        duration_ms = int((time.perf_counter() - started) * 1000)
        log_audit_action(
            db,
            audit_project_id=audit_id,
            action="pdf_export",
            input_json=json.dumps({"format": "pdf"}, ensure_ascii=False),
            output_json=json.dumps({"file": str(pdf_path.name), "size_bytes": pdf_path.stat().st_size}, ensure_ascii=False),
            status="success",
            duration_ms=duration_ms,
        )
        db.commit()
        return FileResponse(
            path=str(pdf_path),
            filename=f"ppc_audit_{audit_id}.pdf",
            media_type="application/pdf",
            headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
        )
    except PdfExportError as exc:
        duration_ms = int((time.perf_counter() - started) * 1000)
        log_audit_action(
            db,
            audit_project_id=audit_id,
            action="pdf_export",
            input_json=json.dumps({"format": "pdf"}, ensure_ascii=False),
            status="failed",
            error=str(exc),
            duration_ms=duration_ms,
        )
        db.commit()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{audit_id}/findings/{finding_id}/evidence-check", response_model=FindingEvidenceCheckResponse)
def get_audit_finding_evidence_check(
    audit_id: int,
    finding_id: int,
    db: Session = Depends(get_db),
):
    finding = get_finding_for_audit(db, audit_id, finding_id)
    return FindingEvidenceCheckResponse(**assess_finding_evidence_for_confirm(finding))


@router.post("/{audit_id}/findings/{finding_id}/confirm")
def confirm_audit_finding(
    audit_id: int,
    finding_id: int,
    request: Request,
    data: FindingFeedbackRequest | None = None,
    db: Session = Depends(get_db),
):
    finding = get_finding_for_audit(db, audit_id, finding_id)
    return confirm_finding_action(finding, data, request, db)


@router.post("/{audit_id}/findings/{finding_id}/confirm-risk-pattern")
def confirm_audit_finding_risk_pattern(
    audit_id: int,
    finding_id: int,
    request: Request,
    data: FindingFeedbackRequest | None = None,
    db: Session = Depends(get_db),
):
    finding = get_finding_for_audit(db, audit_id, finding_id)
    return confirm_finding_risk_pattern_action(finding, data, request, db)


@router.post("/{audit_id}/findings/{finding_id}/unconfirm")
def unconfirm_audit_finding(
    audit_id: int,
    finding_id: int,
    request: Request,
    data: FindingFeedbackRequest | None = None,
    db: Session = Depends(get_db),
):
    finding = get_finding_for_audit(db, audit_id, finding_id)
    return unconfirm_finding_action(finding, data, request, db)


@router.post("/{audit_id}/findings/{finding_id}/reject")
def reject_audit_finding(
    audit_id: int,
    finding_id: int,
    data: FindingFeedbackRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    finding = get_finding_for_audit(db, audit_id, finding_id)
    return reject_finding_action(finding, data, request, db)


@router.patch("/{audit_id}/findings/{finding_id}/illustration")
def patch_finding_illustration(
    audit_id: int,
    finding_id: int,
    data: FindingIllustrationRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    finding = get_finding_for_audit(db, audit_id, finding_id)
    payload = data.model_dump(exclude_unset=True)
    if not payload:
        raise HTTPException(status_code=400, detail="Укажите material_id или caption")
    return set_finding_illustration_action(
        finding,
        payload.get("material_id"),
        payload.get("caption") if "caption" in payload else None,
        request,
        db,
        material_provided="material_id" in payload,
        caption_provided="caption" in payload,
    )


@router.patch("/{audit_id}/findings/{finding_id}")
def patch_audit_finding(
    audit_id: int,
    finding_id: int,
    data: FindingUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    finding = get_finding_for_audit(db, audit_id, finding_id)
    return update_finding_action(finding, data, request, db)


@router.get("/{audit_id}/findings")
def list_audit_findings(audit_id: int, db: Session = Depends(get_db)):
    """Вернуть список AI-выводов конкретного аудита для тестов и API-клиентов."""
    project = (
        db.query(AuditProject)
        .options(joinedload(AuditProject.materials))
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")

    result = []
    for f in project.findings:
        result.append({
            "id": f.id,
            "audit_id": f.audit_project_id,
            "area": f.area,
            "severity": f.severity,
            "problem": f.problem,
            "evidence": json.loads(f.evidence_json) if f.evidence_json else [],
            "recommendation": f.recommendation,
            "expected_impact": f.expected_impact,
            "confidence": f.confidence,
            "needs_review": f.needs_review,
            "review_reason": f.review_reason,
            "approved_for_kb": bool(getattr(f, "approved_for_kb", False)),
            "kb_eligible": _finding_kb_eligible(f),
            "kb_eligibility_reason": finding_kb_eligibility_reason(f),
            "status": f.status or "ai_generated",
            "original_ai_output": f.original_ai_output,
            "edited_output": f.edited_output,
            "human_comment": f.human_comment,
            "edited_by": f.edited_by,
            "edited_at": f.edited_at.isoformat() if f.edited_at else None,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            **enrich_finding_illustration(f, project, audit_id=audit_id),
        })
    return result

@router.post("/{audit_id}/duplicate", response_model=DuplicateAuditResponse, status_code=201)
def duplicate_audit(audit_id: int, db: Session = Depends(get_db)):
    """Копия проекта и материалов без runs/findings/chat (G4)."""
    source = (
        db.query(AuditProject)
        .options(joinedload(AuditProject.materials))
        .filter(AuditProject.id == audit_id)
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Аудит не найден")

    clone = duplicate_audit_project(source, db)
    return DuplicateAuditResponse(
        audit_id=clone.id,
        source_audit_id=audit_id,
        status=clone.status,
    )


@router.post("/{audit_id}/archive", response_model=ArchiveAuditResponse)
def archive_audit(
    audit_id: int,
    body: ArchiveAuditRequest = Body(default_factory=ArchiveAuditRequest),
    db: Session = Depends(get_db),
):
    """Архивировать или вернуть из архива (G4)."""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")

    if body.archived:
        project.archived_at = datetime.now(timezone.utc)
    else:
        project.archived_at = None
    db.commit()
    db.refresh(project)

    return ArchiveAuditResponse(
        audit_id=project.id,
        is_archived=project.archived_at is not None,
        archived_at=project.archived_at,
    )


@router.delete("/{audit_id}")
def delete_audit(audit_id: int, db: Session = Depends(get_db)):
    """Удалить аудит"""
    project = db.query(AuditProject).filter(AuditProject.id == audit_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Аудит не найден")
    
    db.delete(project)
    db.commit()
    
    return {"message": "Аудит удалён"}