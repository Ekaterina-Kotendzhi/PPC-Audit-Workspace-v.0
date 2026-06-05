"""Audit plan: baseline, targets, forecast scenarios (Jam-style J1/J2)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.models import AuditProject
from app.services.metrics_periods_service import load_active_manual_metrics_dict
from app.services.metrics_service import calculate_derived_metrics
from app.services.note_metrics_service import effective_metrics, effective_metrics_raw
from app.services.period_service import next_calendar_month_period, parse_direct_month_label, parse_period


def empty_audit_plan() -> dict[str, Any]:
    return {
        "baseline": {
            "captured_at": None,
            "reference_period": None,
            "note": "",
            "metrics": {},
        },
        "targets": {
            "horizon_months": 3,
            "reference_period": None,
            "note": "",
            "metrics": {},
        },
        "forecast": {
            "horizon_months": 3,
            "reference_period": None,
            "forecast_start_period": None,
            "source": None,
            "marketer_saved": False,
            "analytics_disclaimer": (
                "Прогноз актуален при корректной сквозной аналитике (CRM, e-commerce, атрибуция). "
                "Без них цифры — ориентир для согласования, а не гарантия."
            ),
            "conservative": {"headline": "", "assumption": ""},
            "target": {"headline": "", "assumption": ""},
        },
    }


def load_audit_plan(project: AuditProject) -> dict[str, Any]:
    raw = getattr(project, "audit_plan_json", None)
    if not raw:
        return empty_audit_plan()
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return empty_audit_plan()
    if not isinstance(data, dict):
        return empty_audit_plan()
    base = empty_audit_plan()
    for key in ("baseline", "targets", "forecast"):
        section = data.get(key)
        if isinstance(section, dict):
            base[key] = {**base[key], **section}
    baseline = data.get("baseline")
    if isinstance(baseline, dict) and isinstance(baseline.get("metrics"), dict):
        base["baseline"]["metrics"] = baseline["metrics"]
    targets = data.get("targets")
    if isinstance(targets, dict) and isinstance(targets.get("metrics"), dict):
        base["targets"]["metrics"] = {**base["targets"].get("metrics", {}), **targets["metrics"]}
    forecast = data.get("forecast")
    if isinstance(forecast, dict):
        for scenario in ("conservative", "target"):
            if isinstance(forecast.get(scenario), dict):
                base["forecast"][scenario] = {
                    **base["forecast"][scenario],
                    **forecast[scenario],
                }
    return base


def save_audit_plan(project: AuditProject, payload: dict[str, Any]) -> dict[str, Any]:
    current = load_audit_plan(project)
    for key in ("baseline", "targets", "forecast"):
        section = payload.get(key)
        if not isinstance(section, dict):
            continue
        merged = {**current.get(key, {}), **section}
        if key == "baseline" and isinstance(section.get("metrics"), dict):
            merged["metrics"] = {**current.get("baseline", {}).get("metrics", {}), **section["metrics"]}
        if key == "targets" and isinstance(section.get("metrics"), dict):
            merged["metrics"] = {**current.get("targets", {}).get("metrics", {}), **section["metrics"]}
        for scenario in ("conservative", "target"):
            if key == "forecast" and isinstance(section.get(scenario), dict):
                merged[scenario] = {
                    **current.get("forecast", {}).get(scenario, {}),
                    **section[scenario],
                }
        current[key] = merged
    if isinstance(payload.get("forecast"), dict):
        fc = current.get("forecast") or {}
        fc["marketer_saved"] = True
        fc["source"] = "marketer"
        current["forecast"] = fc
    project.audit_plan_json = json.dumps(current, ensure_ascii=False)
    return current


def _normalize_period_label(raw: str | None) -> str | None:
    text = (raw or "").strip()
    if not text:
        return None
    try:
        parsed = parse_period(text)
        if parsed.get("valid") and parsed.get("display"):
            return str(parsed["display"])
    except ValueError:
        pass
    return text


def resolve_assessment_reference_period(project: AuditProject) -> str | None:
    """
    Опорный месяц для базовой линии и прогноза — как в отчёте/KPI и оценке кабинета.
    Приоритет: активный период KPI → последний месяц Excel → сводный effective_metrics.
    """
    active_raw = load_active_manual_metrics_dict(project).get("period")
    active = _normalize_period_label(str(active_raw) if active_raw else None)
    if active:
        return active

    try:
        from app.services.direct_slice_service import build_direct_analytics

        da = build_direct_analytics(project) or {}
        monthly = da.get("monthly") or []
        if monthly:
            last_month = monthly[-1].get("month")
            if last_month:
                label = parse_direct_month_label(str(last_month))
                normalized = _normalize_period_label(label)
                if normalized:
                    return normalized
        da_period = _normalize_period_label(da.get("period"))
        if da_period:
            return da_period
    except Exception:
        pass

    return _normalize_period_label(str(effective_metrics(project).get("period") or "") or None)


def sync_audit_plan_reference_period(project: AuditProject, plan: dict[str, Any]) -> dict[str, Any]:
    """Базовая линия = опорный месяц оценки (май); прогноз стартует со следующего (июнь)."""
    ref = resolve_assessment_reference_period(project)
    if not ref:
        return plan
    forecast_start = next_calendar_month_period(ref)
    out = dict(plan)
    baseline = dict(out.get("baseline") or {})
    baseline["reference_period"] = ref
    out["baseline"] = baseline
    for key in ("targets", "forecast"):
        section = dict(out.get(key) or {})
        section["reference_period"] = ref
        if key == "forecast" and forecast_start:
            section["forecast_start_period"] = forecast_start
        out[key] = section
    return out


def capture_baseline_from_current(project: AuditProject, *, note: str = "") -> dict[str, Any]:
    raw = load_active_manual_metrics_dict(project)
    has_kpi_core = any(raw.get(k) not in (None, "") for k in ("budget", "clicks", "leads"))
    metrics = calculate_derived_metrics(dict(raw if has_kpi_core else effective_metrics_raw(project)))
    ref = resolve_assessment_reference_period(project)
    if ref:
        metrics["period"] = ref
    keys = (
        "period", "budget", "clicks", "leads", "sales", "revenue",
        "gross_profit", "margin_percent", "drr", "cpl", "cpa", "romi",
    )
    snapshot = {k: metrics.get(k) for k in keys if metrics.get(k) is not None}
    plan = load_audit_plan(project)
    plan["baseline"] = {
        "captured_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "reference_period": ref,
        "note": (note or "").strip(),
        "metrics": snapshot,
    }
    plan = sync_audit_plan_reference_period(project, plan)
    project.audit_plan_json = json.dumps(plan, ensure_ascii=False)
    return plan


def _apply_forecast_scenarios(forecast: dict[str, Any], scenarios: dict[str, Any], *, force: bool) -> dict[str, Any]:
    out = dict(forecast)
    if scenarios.get("horizon_months") is not None and (force or out.get("horizon_months") in (None, 3)):
        out["horizon_months"] = scenarios.get("horizon_months")
    disclaimer = (scenarios.get("analytics_disclaimer") or "").strip()
    if disclaimer and (force or not (out.get("analytics_disclaimer") or "").strip()):
        out["analytics_disclaimer"] = disclaimer
    for key in ("conservative", "target"):
        block = dict(out.get(key) or {})
        src = scenarios.get(key) or {}
        if isinstance(src, dict):
            if force or not (block.get("headline") or "").strip():
                if src.get("headline"):
                    block["headline"] = src.get("headline")
            if force or not (block.get("assumption") or "").strip():
                if src.get("assumption"):
                    block["assumption"] = src.get("assumption")
        out[key] = block
    return out


def merge_forecast_from_offer(
    plan: dict[str, Any],
    commercial_offer: dict[str, Any] | None,
    *,
    force: bool = False,
    override_marketer_saved: bool = False,
) -> dict[str, Any]:
    """Подставить forecast_scenarios из AI (пустые поля или force после анализа)."""
    offer = commercial_offer or {}
    scenarios = offer.get("forecast_scenarios") or {}
    if not isinstance(scenarios, dict):
        return plan
    forecast = dict(plan.get("forecast") or {})
    if forecast.get("marketer_saved") and not force and not override_marketer_saved:
        return plan
    forecast = _apply_forecast_scenarios(forecast, scenarios, force=force)
    if force or forecast_has_content(forecast):
        forecast["source"] = "ai_draft"
    plan["forecast"] = forecast
    return plan


def seed_ai_forecast_into_audit_plan(
    project: AuditProject,
    commercial_offer: dict[str, Any] | None,
) -> dict[str, Any] | None:
    """После AI-анализа: черновик прогноза в audit_plan для правки маркетологом."""
    offer = commercial_offer or {}
    scenarios = offer.get("forecast_scenarios") or {}
    if not isinstance(scenarios, dict):
        return None
    preview = {
        "conservative": scenarios.get("conservative") if isinstance(scenarios.get("conservative"), dict) else {},
        "target": scenarios.get("target") if isinstance(scenarios.get("target"), dict) else {},
    }
    if not forecast_has_content(preview):
        return None
    plan = load_audit_plan(project)
    if plan.get("forecast", {}).get("marketer_saved"):
        return None
    plan = merge_forecast_from_offer(plan, offer, force=not forecast_has_content(plan.get("forecast")))
    plan = sync_audit_plan_reference_period(project, plan)
    project.audit_plan_json = json.dumps(plan, ensure_ascii=False)
    return plan


def forecast_has_content(forecast: dict[str, Any] | None) -> bool:
    if not forecast:
        return False
    for key in ("conservative", "target"):
        block = forecast.get(key) or {}
        if (block.get("headline") or "").strip() or (block.get("assumption") or "").strip():
            return True
    return False


def baseline_has_content(baseline: dict[str, Any] | None) -> bool:
    if not baseline:
        return False
    metrics = baseline.get("metrics") or {}
    return bool(metrics) or bool((baseline.get("note") or "").strip())


def targets_has_content(targets: dict[str, Any] | None) -> bool:
    if not targets:
        return False
    metrics = targets.get("metrics") or {}
    return any(v is not None and v != "" for v in metrics.values()) or bool((targets.get("note") or "").strip())
