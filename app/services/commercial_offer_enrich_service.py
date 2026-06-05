"""Post-process commercial_offer: audit-specific plan, not generic PPC boilerplate."""
from __future__ import annotations

import json
import re
from typing import Any

from app.services.audit_summary_enrich_service import (
    _first_action_from_findings,
    _first_action_from_health,
    _format_rub,
    humanize_main_risk,
)

_ANALYTICS_DISCLAIMER = (
    "Прогноз актуален при корректной сквозной аналитике (CRM, e-commerce, атрибуция). "
    "Без них цифры — ориентир для согласования, а не гарантия."
)

_GENERIC_TITLE_PHRASES = (
    "оптимизация рекламных кампаний",
    "аудит и оптимизация яндекс директа",
    "оптимизация яндекс директа",
)

_GENERIC_SERVICE_PHRASES = (
    "анализ семантики и условий показа",
    "оптимизация бюджета и ставок",
    "создание минус-слов",
    "анализ креативов и посадочных",
    "проверка целей и аналитики",
    "подготовка плана оптимизации кампаний",
)

_GENERIC_SALES_PHRASES = (
    "увеличение эффективности рекламных кампаний",
    "снижение стоимости лидов",
    "понять, где теряется бюджет",
)

_GENERIC_NEXT_STEP_PHRASES = (
    "обсудить детали",
    "утвердить план действий",
    "созвон-разбор",
    "согласовать план",
)

_GENERIC_FORECAST_HEADLINES = (
    "увеличение лидов на 20",
    "снижение cpl на 30",
    "стабилизация дрр",
    "рост валовой прибыли с контекста",
)


def _norm(text: str) -> str:
    return " ".join(str(text or "").lower().split())


def _services_from_health(health: dict[str, Any]) -> list[str]:
    plan = health.get("action_plan") or {}
    out: list[str] = []
    seen: set[str] = set()
    for item in plan.get("prioritized") or []:
        action = str(item.get("action") or "").strip()
        title = str(item.get("title") or "").strip()
        line = action or humanize_main_risk(title) or title
        if not line or len(line) < 8:
            continue
        key = _norm(line)
        if key in seen:
            continue
        seen.add(key)
        out.append(line[:160])
        if len(out) >= 6:
            break
    if out:
        return out

    for rule in (health.get("performance_issues") or health.get("top_issues") or [])[:5]:
        action = str(rule.get("action") or "").strip()
        title = str(rule.get("title") or "").strip()
        line = action or humanize_main_risk(title)
        if line and _norm(line) not in seen:
            seen.add(_norm(line))
            out.append(line[:160])
    return out[:6]


def _services_from_findings(findings: list[dict[str, Any]]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    ordered = sorted(
        findings,
        key=lambda f: {"high": 0, "medium": 1, "low": 2}.get(str(f.get("severity") or "").lower(), 3),
    )
    for finding in ordered:
        if finding.get("finding_kind") == "needs_data":
            continue
        for key in ("recommended_action", "recommendation"):
            text = str(finding.get(key) or "").strip()
            if len(text) < 12:
                continue
            nk = _norm(text)
            if nk in seen:
                continue
            seen.add(nk)
            out.append(text[:160])
            break
        if len(out) >= 6:
            break
    return out[:6]


def _is_generic_title(title: str) -> bool:
    t = _norm(title)
    if not t:
        return True
    return any(p in t for p in _GENERIC_TITLE_PHRASES)


def _is_generic_services(services: list[str]) -> bool:
    if not services:
        return True
    hits = sum(
        1 for s in services if any(p in _norm(s) for p in _GENERIC_SERVICE_PHRASES)
    )
    return hits >= min(3, len(services))


def _is_generic_sales(text: str) -> bool:
    t = _norm(text)
    if len(t) < 25:
        return True
    return any(p in t for p in _GENERIC_SALES_PHRASES) and not re.search(r"\d", t)


def _is_generic_next_step(text: str) -> bool:
    t = _norm(text)
    if len(t) < 12:
        return True
    return any(p in t for p in _GENERIC_NEXT_STEP_PHRASES) and len(t) < 80


def _is_generic_forecast(scenarios: dict[str, Any]) -> bool:
    if not scenarios:
        return True
    headlines = []
    for key in ("conservative", "target"):
        block = scenarios.get(key) or {}
        headlines.append(_norm(block.get("headline") or ""))
    joined = " ".join(headlines)
    if not joined.strip():
        return True
    return any(p in joined for p in _GENERIC_FORECAST_HEADLINES) and not re.search(
        r"cpl\s*\d|заявок\s*\d|%\s*при\s*budget|₽",
        joined,
        re.I,
    )


def is_generic_commercial_offer(offer: dict[str, Any] | None) -> bool:
    o = offer or {}
    return (
        _is_generic_title(str(o.get("proposal_title") or ""))
        or _is_generic_services(list(o.get("recommended_services") or []))
        or _is_generic_sales(str(o.get("sales_argument") or ""))
        or _is_generic_next_step(str(o.get("next_step") or ""))
        or _is_generic_forecast(o.get("forecast_scenarios") or {})
    )


def _build_proposal_title(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None,
) -> str:
    metrics = ai_data.get("metrics") or {}
    niche = str((input_data or {}).get("niche") or "").strip()
    cpl = metrics.get("cpl")
    leads = metrics.get("leads")
    if cpl and leads:
        base = f"Снижение CPL и рост заявок в Директе (сейчас CPL {int(float(cpl)):,} ₽)".replace(",", " ")
        return base
    if niche:
        return f"План оптимизации Яндекс Директа — {niche[:80]}"
    summary = ai_data.get("audit_summary") or {}
    problem = str(summary.get("client_problem") or "").strip()
    if problem and len(problem) > 20:
        return problem[:100] + ("…" if len(problem) > 100 else "")
    return "План работ по аудиту рекламного кабинета"


def _build_sales_argument(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None,
) -> str:
    metrics = ai_data.get("metrics") or {}
    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    parts: list[str] = []
    budget = metrics.get("budget")
    leads = metrics.get("leads")
    cpl = metrics.get("cpl")
    if budget is not None and leads is not None:
        cpl_bit = f" (сейчас CPL {int(float(cpl)):,} ₽)".replace(",", " ") if cpl else ""
        parts.append(
            f"При бюджете {_format_rub(budget)} и {int(float(leads))} заявках "
            f"фокус — убрать неэффективный расход и снизить стоимость заявки{cpl_bit}."
        )
    perf = (health.get("performance_issues") or health.get("top_issues") or [])[:1]
    if perf:
        title = str(perf[0].get("title") or "").strip()
        risk = humanize_main_risk(title)
        if risk and risk not in parts:
            parts.append(risk)
    if parts:
        return " ".join(parts)[:400]
    return (
        "Работы привязаны к выводам аудита: семантика, бюджет и качество заявок — "
        "без шаблонного перечня «для галочки»."
    )


def _build_next_step(ai_data: dict[str, Any], input_data: dict[str, Any] | None) -> str:
    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    action = _first_action_from_health(health)
    if action:
        return f"Первый шаг ({action[:120]}): согласуем сроки и ответственных."
    action = _first_action_from_findings(ai_data.get("findings") or [])
    if action:
        return f"Начинаем с: {action[:160]}"
    return "Согласуем приоритеты из плана работ и фиксируем KPI на контрольный период."


def _estimate_work_days(services: list[str]) -> int:
    n = len(services) or 4
    if n <= 3:
        return 7
    if n <= 5:
        return 10
    return 14


def _build_forecast_scenarios(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None,
) -> dict[str, Any]:
    metrics = ai_data.get("metrics") or {}
    cpl = metrics.get("cpl")
    leads = metrics.get("leads")
    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    score = health.get("health_score")

    conservative_headline = "Стабилизация CPL и отбор заявок без роста бюджета"
    conservative_assumption = "После чистки семантики и минус-слов в первые 2–4 недели."
    target_headline = "Снижение CPL на 20–30% при сохранении объёма заявок"
    target_assumption = "При внедрении рекомендаций из плана и контроле по неделям."

    if cpl:
        cpl_i = int(float(cpl))
        conservative_headline = f"Снижение CPL на 10–15% от текущих {cpl_i:,} ₽".replace(",", " ")
        target_headline = f"Целевой CPL на 20–30% ниже {cpl_i:,} ₽".replace(",", " ")
    if leads:
        conservative_assumption = (
            f"Опора на {int(float(leads))} заявок за базовый период; без гарантий при смене сезона."
        )
    if score is not None and int(score) < 55:
        target_assumption = (
            "При низкой оценке кабинета сначала закрываем критичные риски из Excel, затем масштабируем."
        )

    perf = (health.get("performance_issues") or health.get("top_issues") or [])[:1]
    if perf:
        action = str(perf[0].get("action") or "").strip()
        if action:
            conservative_assumption = f"После шага: {action[:140]}."

    return {
        "horizon_months": 3,
        "analytics_disclaimer": _ANALYTICS_DISCLAIMER,
        "conservative": {
            "headline": conservative_headline,
            "assumption": conservative_assumption,
        },
        "target": {
            "headline": target_headline,
            "assumption": target_assumption,
        },
    }


def _build_commercial_offer_from_sources(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None,
) -> dict[str, Any]:
    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    services = _services_from_health(health)
    if len(services) < 3:
        services = _services_from_findings(ai_data.get("findings") or []) or services
    if len(services) < 2:
        services = [
            "Аудит условий показа и минус-слов по данным Excel",
            "Перераспределение бюджета между кампаниями",
            "Контроль CPL и заявок по неделям",
        ]

    return {
        "proposal_title": _build_proposal_title(ai_data, input_data),
        "recommended_services": services,
        "estimated_work_days": _estimate_work_days(services),
        "sales_argument": _build_sales_argument(ai_data, input_data),
        "next_step": _build_next_step(ai_data, input_data),
        "forecast_scenarios": _build_forecast_scenarios(ai_data, input_data),
    }


def _offer_snapshot(offer: dict[str, Any]) -> str:
    return json.dumps(offer, ensure_ascii=False, sort_keys=True)


def enrich_commercial_offer(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None = None,
    *,
    force_refresh: bool = False,
) -> tuple[dict[str, Any], bool]:
    """Улучшает commercial_offer из данных аудита. Возвращает (ai_data, changed)."""
    if ai_data.get("is_preliminary"):
        return ai_data, False

    old = dict(ai_data.get("commercial_offer") or {})
    before = _offer_snapshot(old)

    if force_refresh or not old or is_generic_commercial_offer(old):
        built = _build_commercial_offer_from_sources(ai_data, input_data)
        if force_refresh or not old:
            merged = built
        else:
            merged = {**old}
            if force_refresh or _is_generic_title(str(old.get("proposal_title") or "")):
                merged["proposal_title"] = built["proposal_title"]
            if force_refresh or _is_generic_services(list(old.get("recommended_services") or [])):
                merged["recommended_services"] = built["recommended_services"]
            if force_refresh or _is_generic_sales(str(old.get("sales_argument") or "")):
                merged["sales_argument"] = built["sales_argument"]
            if force_refresh or _is_generic_next_step(str(old.get("next_step") or "")):
                merged["next_step"] = built["next_step"]
            if old.get("estimated_work_days") in (None, 0, 10, 14) or force_refresh:
                merged["estimated_work_days"] = built["estimated_work_days"]
            if force_refresh or _is_generic_forecast(old.get("forecast_scenarios") or {}):
                merged["forecast_scenarios"] = built["forecast_scenarios"]
        ai_data["commercial_offer"] = merged
    else:
        ai_data["commercial_offer"] = old

    changed = _offer_snapshot(ai_data.get("commercial_offer") or {}) != before
    return ai_data, changed
