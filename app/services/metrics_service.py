"""Validation and safe calculation of manual PPC metrics."""
from __future__ import annotations

from typing import Any

from app.services.period_service import is_valid_period, parse_period

MINIMUM_FOR_AUDIT = ("period", "budget", "clicks", "leads")

MIN_BUDGET_FOR_DERIVED = 100.0
NOT_CALCULATED = "Не рассчитано"

MIN_CPC = 1.0
MIN_CPL = 30.0
MIN_CPA = 50.0
MAX_ROMI = 1000.0
MAX_CLICKS_PER_RUB = 25.0


def minimum_metrics_ready(metrics: dict[str, Any] | None) -> bool:
    """True when period, budget, clicks and leads are filled (audit minimum)."""
    data = metrics or {}
    if not is_valid_period(data.get("period")):
        return False
    for field in ("budget", "clicks", "leads"):
        value = data.get(field)
        if value is None:
            return False
        if isinstance(value, str) and not value.strip():
            return False
    return True


def _num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def collect_metric_anomalies(metrics: dict[str, Any]) -> list[str]:
    """Return human-readable sanity-check warnings for suspicious PPC numbers."""
    reasons: list[str] = []
    budget = _num(metrics.get("budget"))
    clicks = _num(metrics.get("clicks"))
    leads = _num(metrics.get("leads"))
    sales = _num(metrics.get("sales"))
    cpl = _num(metrics.get("cpl"))
    cpa = _num(metrics.get("cpa"))
    romi = _num(metrics.get("romi"))

    if budget and budget >= MIN_BUDGET_FOR_DERIVED and clicks and clicks > 0:
        cpc = budget / clicks
        if cpc < MIN_CPC:
            reasons.append(f"CPC слишком низкий ({cpc:.2f} ₽) — проверьте бюджет и клики")
        if clicks / budget > MAX_CLICKS_PER_RUB:
            reasons.append("Слишком много кликов при маленьком бюджете")

    if cpl is not None and cpl < MIN_CPL:
        reasons.append(f"CPL слишком низкий ({cpl:.0f} ₽) — проверьте заявки и расход")
    if cpa is not None and cpa < MIN_CPA:
        reasons.append(f"CPA слишком низкий ({cpa:.0f} ₽) — проверьте продажи и расход")
    if romi is not None and romi > MAX_ROMI:
        reasons.append(f"ROMI слишком высокий ({romi:.1f}%) — проверьте выручку и бюджет")

    if budget and budget >= MIN_BUDGET_FOR_DERIVED and leads and leads > 0:
        actual_cpl = budget / leads
        if actual_cpl < MIN_CPL:
            reasons.append("Заявки выглядят несоразмерно дешёвыми относительно расхода")
    if budget and budget >= MIN_BUDGET_FOR_DERIVED and sales and sales > 0:
        actual_cpa = budget / sales
        if actual_cpa < MIN_CPA:
            reasons.append("Продажи выглядят несоразмерно дешёвыми относительно расхода")

    return list(dict.fromkeys(reasons))


def validate_metrics_payload(data: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Validate metrics input. Returns normalized payload and review reasons."""
    reasons: list[str] = []
    normalized: dict[str, Any] = {}

    period_raw = (data.get("period") or "").strip()
    if period_raw:
        parsed = parse_period(period_raw)
        normalized["period"] = parsed["display"]
        normalized["period_kind"] = parsed["kind"]
        normalized["period_start"] = parsed["start"]
        normalized["period_end"] = parsed["end"]

    for field in ("budget", "revenue", "gross_profit", "margin_percent"):
        raw = data.get(field)
        if raw is None or raw == "":
            continue
        value = _num(raw)
        if value is None:
            raise ValueError(f"Поле «{field}» должно быть числом")
        if value < 0:
            raise ValueError(f"Поле «{field}» не может быть отрицательным")
        if field == "margin_percent" and value > 100:
            raise ValueError("Маржинальность не может быть больше 100%")
        normalized[field] = value
        if field == "budget" and 0 < value < MIN_BUDGET_FOR_DERIVED:
            reasons.append("Бюджет выглядит подозрительно маленьким")

    for field in ("clicks", "leads", "sales", "leads_forms", "leads_messenger", "impressions"):
        raw = data.get(field)
        if raw is None or raw == "":
            continue
        if isinstance(raw, bool):
            raise ValueError(f"Поле «{field}» должно быть целым числом")
        if isinstance(raw, float) and not raw.is_integer():
            raise ValueError(f"Поле «{field}» должно быть целым числом")
        try:
            value = int(raw)
        except (TypeError, ValueError):
            raise ValueError(f"Поле «{field}» должно быть целым числом") from None
        if value < 0:
            raise ValueError(f"Поле «{field}» не может быть отрицательным")
        normalized[field] = value

    if normalized.get("leads") is None:
        forms = normalized.get("leads_forms")
        messenger = normalized.get("leads_messenger")
        if forms is not None or messenger is not None:
            normalized["leads"] = int(forms or 0) + int(messenger or 0)

    if not period_raw:
        reasons.append("Не указан период")

    clicks = normalized.get("clicks")
    leads = normalized.get("leads")
    sales = normalized.get("sales")
    if clicks is not None and leads is not None and leads > clicks:
        reasons.append("Заявок больше, чем кликов — проверьте данные")
    if leads is not None and sales is not None and sales > leads:
        reasons.append("Продаж больше, чем заявок — проверьте данные")

    derived = calculate_derived_metrics(normalized)
    if derived.get("review_reason"):
        for part in str(derived["review_reason"]).split("; "):
            if part and part not in reasons:
                reasons.append(part)

    return normalized, reasons


def calculate_derived_metrics(raw: dict[str, Any]) -> dict[str, Any]:
    """Calculate CPL/CPA/ROMI with budget >= 100 guard."""
    budget = _num(raw.get("budget"))
    clicks = _num(raw.get("clicks"))
    leads = _num(raw.get("leads"))
    sales = _num(raw.get("sales"))
    revenue = _num(raw.get("revenue"))
    gross_profit = _num(raw.get("gross_profit"))
    margin_percent = _num(raw.get("margin_percent"))
    budget_ok = budget is not None and budget >= MIN_BUDGET_FOR_DERIVED

    if gross_profit is None and revenue is not None and margin_percent is not None:
        gross_profit = round(revenue * (margin_percent / 100.0), 2)

    drr = None
    if budget_ok and revenue is not None and revenue > 0:
        drr = round((budget / revenue) * 100, 1)

    leads_forms = _num(raw.get("leads_forms"))
    leads_messenger = _num(raw.get("leads_messenger"))
    impressions = _num(raw.get("impressions"))

    metrics: dict[str, Any] = {
        "period": raw.get("period"),
        "budget": budget,
        "clicks": int(clicks) if clicks is not None else None,
        "leads": int(leads) if leads is not None else None,
        "leads_forms": int(leads_forms) if leads_forms is not None else None,
        "leads_messenger": int(leads_messenger) if leads_messenger is not None else None,
        "impressions": int(impressions) if impressions is not None else None,
        "sales": int(sales) if sales is not None else None,
        "revenue": revenue,
        "gross_profit": gross_profit,
        "margin_percent": margin_percent,
        "drr": drr,
        "cpl": round(budget / leads, 2) if budget_ok and leads and leads > 0 else None,
        "cpa": round(budget / sales, 2) if budget_ok and sales and sales > 0 else None,
        "romi": round(((revenue - budget) / budget) * 100, 1) if budget_ok and revenue is not None else None,
        "cpl_display": NOT_CALCULATED,
        "cpa_display": NOT_CALCULATED,
        "romi_display": NOT_CALCULATED,
        "drr_display": NOT_CALCULATED,
        "needs_review": False,
        "review_reason": None,
    }

    if metrics["cpl"] is not None:
        metrics["cpl_display"] = metrics["cpl"]
    if metrics["cpa"] is not None:
        metrics["cpa_display"] = metrics["cpa"]
    if metrics["romi"] is not None:
        metrics["romi_display"] = f"{metrics['romi']}%"
    if metrics["drr"] is not None:
        metrics["drr_display"] = f"{metrics['drr']}%"

    reasons: list[str] = []
    if not metrics["period"]:
        reasons.append("Не указан период")
    if budget is None:
        reasons.append("Не указан бюджет")
    elif not budget_ok and budget > 0:
        reasons.append("Бюджет меньше 100 ₽ — CPL/CPA/ROMI не рассчитываются")
    if leads is None:
        reasons.append("Не указаны заявки")
    if sales is None:
        reasons.append("Нет продаж — CPA требует проверки")
    if revenue is None:
        reasons.append("Нет выручки — ROMI требует проверки")

    reasons.extend(collect_metric_anomalies(metrics))

    if reasons:
        metrics["needs_review"] = True
        metrics["review_reason"] = "; ".join(dict.fromkeys(reasons))
    return metrics
