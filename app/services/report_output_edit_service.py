"""Manual edits to audit_summary and commercial_offer in last AI analysis output."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditProject, AuditRun
from app.services.audit_run_helpers import latest_run


def _load_last_analysis_data(project: AuditProject) -> tuple[Any, dict[str, Any]]:
    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run or not run.output_json:
        raise ValueError("Нет успешного AI-анализа — сначала запустите анализ")
    data = json.loads(run.output_json)
    if not isinstance(data, dict):
        raise ValueError("Некорректный output_json последнего анализа")
    return run, data


def _merge_audit_summary(existing: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = {**(existing or {}), **patch}
    priority = str(merged.get("priority") or "medium").strip().lower()
    if priority not in {"low", "medium", "high"}:
        raise ValueError("priority: low, medium или high")
    merged["priority"] = priority
    for key in ("client_problem", "main_risk", "short_conclusion"):
        if key in merged and merged[key] is not None:
            merged[key] = str(merged[key]).strip()
    return merged


def _merge_commercial_offer(existing: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    merged = {**(existing or {}), **patch}
    if "proposal_title" in patch and patch["proposal_title"] is not None:
        merged["proposal_title"] = str(patch["proposal_title"]).strip()
    if "sales_argument" in patch and patch["sales_argument"] is not None:
        merged["sales_argument"] = str(patch["sales_argument"]).strip()
    if "next_step" in patch and patch["next_step"] is not None:
        merged["next_step"] = str(patch["next_step"]).strip()
    if "estimated_work_days" in patch:
        days = patch["estimated_work_days"]
        if days is None:
            merged["estimated_work_days"] = None
        else:
            merged["estimated_work_days"] = int(days)
    if "recommended_services" in patch and patch["recommended_services"] is not None:
        services = [str(s).strip() for s in patch["recommended_services"] if str(s).strip()]
        merged["recommended_services"] = services[:20]
    return merged


def patch_report_output(
    project: AuditProject,
    *,
    audit_summary: dict[str, Any] | None = None,
    commercial_offer: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not audit_summary and not commercial_offer:
        raise ValueError("Укажите audit_summary и/или commercial_offer")
    run, data = _load_last_analysis_data(project)
    if audit_summary:
        data["audit_summary"] = _merge_audit_summary(data.get("audit_summary") or {}, audit_summary)
    if commercial_offer:
        data["commercial_offer"] = _merge_commercial_offer(
            data.get("commercial_offer") or {},
            commercial_offer,
        )
    run.output_json = json.dumps(data, ensure_ascii=False)
    return {
        "audit_summary": data.get("audit_summary"),
        "commercial_offer": data.get("commercial_offer"),
    }


def refresh_audit_summary_from_audit_data(
    project: AuditProject,
    db: Session,
) -> dict[str, Any]:
    """Пересобрать краткий вывод из Excel/КП/выводов (без нового запроса к модели)."""
    from app.services.audit_summary_enrich_service import enrich_audit_summary
    from app.services.direct_slice_service import build_direct_analytics

    run_ref = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run_ref or not run_ref.id:
        raise ValueError("Нет успешного AI-анализа — сначала запустите анализ")

    run = db.query(AuditRun).filter(AuditRun.id == run_ref.id).first()
    if not run or not run.output_json:
        raise ValueError("Нет успешного AI-анализа — сначала запустите анализ")

    data = json.loads(run.output_json)
    if not isinstance(data, dict):
        raise ValueError("Некорректный output_json последнего анализа")

    input_data: dict[str, Any] = {}
    da = build_direct_analytics(project)
    if da:
        input_data["direct_statistics"] = da

    data, changed = enrich_audit_summary(data, input_data, force_refresh=True)
    run.output_json = json.dumps(data, ensure_ascii=False)
    db.add(run)
    return {
        "audit_summary": data.get("audit_summary"),
        "summary_changed": changed,
    }


def refresh_commercial_offer_from_audit_data(
    project: AuditProject,
    db: Session,
) -> dict[str, Any]:
    """Пересобрать КП из Excel/выводов (без нового запроса к модели)."""
    from app.services.commercial_offer_enrich_service import enrich_commercial_offer
    from app.services.direct_slice_service import build_direct_analytics

    run_ref = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run_ref or not run_ref.id:
        raise ValueError("Нет успешного AI-анализа — сначала запустите анализ")

    run = db.query(AuditRun).filter(AuditRun.id == run_ref.id).first()
    if not run or not run.output_json:
        raise ValueError("Нет успешного AI-анализа — сначала запустите анализ")

    data = json.loads(run.output_json)
    if not isinstance(data, dict):
        raise ValueError("Некорректный output_json последнего анализа")

    input_data: dict[str, Any] = {}
    da = build_direct_analytics(project)
    if da:
        input_data["direct_statistics"] = da
    client = project.client
    input_data["niche"] = (client.niche if client else None) or None

    data, changed = enrich_commercial_offer(data, input_data, force_refresh=True)
    run.output_json = json.dumps(data, ensure_ascii=False)
    db.add(run)

    from app.services.audit_plan_service import (
        load_audit_plan,
        merge_forecast_from_offer,
        sync_audit_plan_reference_period,
    )

    offer = data.get("commercial_offer") or {}
    plan = sync_audit_plan_reference_period(
        project,
        merge_forecast_from_offer(load_audit_plan(project), offer, force=True, override_marketer_saved=True),
    )
    project.audit_plan_json = json.dumps(plan, ensure_ascii=False)
    db.add(project)

    return {
        "commercial_offer": data.get("commercial_offer"),
        "offer_changed": changed,
        "audit_plan": plan if plan is not None else load_audit_plan(project),
    }
