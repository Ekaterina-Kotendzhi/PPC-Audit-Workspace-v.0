"""J16: Direct Health Score — rule catalog, zone weights, action plan."""
from __future__ import annotations

from typing import Any

from app.models import AuditProject
from app.services.audit_plan_service import load_audit_plan
from app.services.comparison_service import build_before_after_comparison
from app.services.data_coverage_service import assess_data_coverage
from app.services.direct_health_explain import build_health_summary_explain, build_j15_template_findings
from app.services.direct_health_ml import build_ml_signals
from app.services.direct_health_rules_catalog import get_rule_catalog
from app.services.direct_setup_helpers import collect_direct_setup_kinds
from app.services.metrics_periods_service import comparison_period_rows

ML_PENALTY_CAP = 15


def _is_ml_rule(rule: dict[str, Any]) -> bool:
    rid = str(rule.get("id") or "")
    return rid.startswith("ml_") or rid.startswith("anomaly_")


ZONE_LABELS = {
    "semantics": "Семантика",
    "campaigns": "Кампании",
    "dynamics": "Динамика",
    "coverage": "Покрытие данных",
    "data_quality": "Качество данных",
}

ZONE_WEIGHT_CAP = {
    "semantics": 35,
    "campaigns": 25,
    "dynamics": 20,
    "coverage": 40,
    "data_quality": 15,
}

_SEVERITY_WEIGHT = {
    "critical": 20,
    "high": 12,
    "medium": 7,
    "low": 3,
    "info": 0,
}

_HORIZON_BY_SEVERITY = {
    "critical": "Сегодня",
    "high": "1–3 дня",
    "medium": "7 дней",
    "low": "14 дней",
    "info": "14 дней",
}

_HORIZON_BY_ZONE = {
    "coverage": "1–3 дня",
    "semantics": "7 дней",
    "campaigns": "7 дней",
    "dynamics": "7 дней",
    "data_quality": "3 дня",
}


def _grade(score: int) -> str:
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    if score >= 55:
        return "C"
    if score >= 40:
        return "D"
    return "F"


def _horizon(severity: str, zone: str) -> str:
    if severity in ("critical", "high"):
        return _HORIZON_BY_SEVERITY.get(severity, "7 дней")
    return _HORIZON_BY_ZONE.get(zone, "7 дней")


def _mk_rule(
    *,
    rule_id: str,
    zone: str,
    severity: str,
    title: str,
    detail: str,
    action: str,
    value: float | int | None = None,
) -> dict[str, Any]:
    weight = _SEVERITY_WEIGHT.get(severity, 0)
    return {
        "id": rule_id,
        "zone": zone,
        "severity": severity,
        "weight": weight,
        "title": title,
        "detail": detail,
        "action": action,
        "value": value,
        "penalty": weight,
        "horizon": _horizon(severity, zone),
    }


def _bonus_from_improvement(project: AuditProject) -> int:
    rows = comparison_period_rows(project)
    if len(rows) < 2:
        return 0
    before, after = rows[0], rows[-1]
    bonus = 0
    b_leads, a_leads = before.get("leads"), after.get("leads")
    b_cpl, a_cpl = before.get("cpl"), after.get("cpl")
    if isinstance(b_leads, (int, float)) and isinstance(a_leads, (int, float)) and a_leads > b_leads:
        bonus += 3
    if isinstance(b_cpl, (int, float)) and isinstance(a_cpl, (int, float)) and a_cpl < b_cpl:
        bonus += 3
    baseline_metrics = (load_audit_plan(project).get("baseline") or {}).get("metrics") or {}
    if baseline_metrics:
        bonus += 1
    return min(7, bonus)


def _run_semantics_rules(rules: list[dict[str, Any]], cond: dict[str, Any], totals: dict[str, Any]) -> None:
    top_spend = cond.get("top_by_spend") or []
    if len(top_spend) >= 3:
        top3_share = sum(float(r.get("share_cost_pct") or 0) for r in top_spend[:3])
        if top3_share >= 75:
            rules.append(
                _mk_rule(
                    rule_id="semantics_top3_concentration",
                    zone="semantics",
                    severity="high",
                    title="Высокая концентрация расхода в топ-3 условиях",
                    detail=f"Топ-3 условий = {round(top3_share, 1)}% расхода.",
                    action="Расширить семантику и добавить минус-слова.",
                    value=round(top3_share, 1),
                )
            )
        elif top3_share >= 60:
            rules.append(
                _mk_rule(
                    rule_id="semantics_top3_concentration_warn",
                    zone="semantics",
                    severity="medium",
                    title="Заметная концентрация в топ-3 условиях",
                    detail=f"Топ-3 условий = {round(top3_share, 1)}% расхода.",
                    action="Проверить минус-слова и добавить целевые формулировки.",
                    value=round(top3_share, 1),
                )
            )

    waste = cond.get("high_spend_zero_leads") or []
    if waste:
        total_waste = sum(float(r.get("cost") or 0) for r in waste)
        severity = "high" if len(waste) >= 5 or total_waste >= 30000 else "medium"
        rules.append(
            _mk_rule(
                rule_id="semantics_high_spend_zero_leads",
                zone="semantics",
                severity=severity,
                title="Расход без лидов в условиях показа",
                detail=f"{len(waste)} условий ≥500 ₽ без лидов, сумма {round(total_waste, 0)} ₽.",
                action="Добавить минус-слова и снизить ставки по неэффективным условиям.",
                value=round(total_waste, 0),
            )
        )
        total_cost = float(totals.get("cost") or 0)
        if total_cost > 0 and total_waste / total_cost >= 0.15:
            rules.append(
                _mk_rule(
                    rule_id="semantics_waste_share",
                    zone="semantics",
                    severity="medium",
                    title="Доля слива в условиях без лидов",
                    detail=f"{round(100 * total_waste / total_cost, 1)}% расхода без конверсий.",
                    action="Сократить неэффективные условия и расширить минус-слова.",
                    value=round(100 * total_waste / total_cost, 1),
                )
            )

    best = (cond.get("top_best_cpl") or [])[:1]
    worst = (cond.get("top_worst_cpl") or [])[:1]
    if best and worst:
        best_cpl = float(best[0].get("cpl") or 0)
        worst_cpl = float(worst[0].get("cpl") or 0)
        if best_cpl > 0 and worst_cpl / best_cpl >= 4:
            rules.append(
                _mk_rule(
                    rule_id="semantics_cpl_dispersion",
                    zone="semantics",
                    severity="medium",
                    title="Сильный разброс CPL между условиями",
                    detail=f"Худший CPL в {round(worst_cpl / best_cpl, 1)}× выше лучшего.",
                    action="Перенести бюджет в условия с лучшим CPL.",
                    value=round(worst_cpl / best_cpl, 1),
                )
            )

    by_kind = cond.get("by_condition_kind") or {}
    keyword = by_kind.get("keyword") or {}
    kw_share = float(keyword.get("share_cost_pct") or 0)
    if kw_share >= 55 and float(totals.get("cost") or 0) > 0:
        rules.append(
            _mk_rule(
                rule_id="semantics_keyword_concentration",
                zone="semantics",
                severity="medium",
                title="Концентрация расхода на ключевых фразах",
                detail=f"Ключевые фразы: {round(kw_share, 1)}% расхода.",
                action="Диверсифицировать семантику и проверить автотаргетинг.",
                value=round(kw_share, 1),
            )
        )
    auto = by_kind.get("autotarget") or {}
    auto_share = float(auto.get("share_cost_pct") or 0)
    if auto_share >= 45 and float(totals.get("cost") or 0) > 0:
        auto_leads = int(auto.get("leads") or 0)
        total_leads = int(totals.get("leads") or 0)
        severity = "high" if auto_share >= 60 and (total_leads == 0 or auto_leads / max(total_leads, 1) < 0.15) else "medium"
        rules.append(
            _mk_rule(
                rule_id="semantics_autotarget_share",
                zone="semantics",
                severity=severity,
                title="Высокая доля автотаргетинга",
                detail=f"Автотаргетинг: {round(auto_share, 1)}% расхода, {auto_leads} лидов.",
                action="Сузить автотаргетинг и усилить ручную семантику.",
                value=round(auto_share, 1),
            )
        )

    unique = int(cond.get("unique_conditions") or 0)
    total_cost = float(totals.get("cost") or 0)
    if unique > 0 and unique < 30 and total_cost >= 50000:
        rules.append(
            _mk_rule(
                rule_id="semantics_narrow_base",
                zone="semantics",
                severity="low",
                title="Узкая база условий при заметном расходе",
                detail=f"Всего {unique} уникальных условий при расходе {round(total_cost, 0)} ₽.",
                action="Расширить семантику и проверить охват.",
                value=unique,
            )
        )


def _run_campaign_rules(rules: list[dict[str, Any]], campaigns: list[dict[str, Any]]) -> None:
    if not campaigns:
        return
    total_cost = sum(float(c.get("cost") or 0) for c in campaigns)
    total_leads = sum(int(c.get("leads") or 0) for c in campaigns)
    if total_cost <= 0:
        return

    sorted_cost = sorted(campaigns, key=lambda c: -(float(c.get("cost") or 0)))
    top = sorted_cost[0]
    top_share = 100 * float(top.get("cost") or 0) / total_cost
    if top_share >= 55:
        rules.append(
            _mk_rule(
                rule_id="campaigns_budget_concentration",
                zone="campaigns",
                severity="medium",
                title="Бюджет сосредоточен в одной кампании",
                detail=f"«{(top.get('campaign_name') or '')[:40]}» — {round(top_share, 1)}% расхода.",
                action="Перераспределить бюджет или проверить эффективность лидеров.",
                value=round(top_share, 1),
            )
        )

    zero_lead_camps = [
        c for c in campaigns
        if float(c.get("cost") or 0) >= 5000 and int(c.get("leads") or 0) == 0
    ]
    if zero_lead_camps:
        rules.append(
            _mk_rule(
                rule_id="campaigns_spend_no_leads",
                zone="campaigns",
                severity="high",
                title="Кампании с расходом без лидов",
                detail=f"{len(zero_lead_camps)} кампаний с расходом ≥5000 ₽ и 0 лидов.",
                action="Поставить на паузу или пересмотреть настройки и посадочные.",
                value=len(zero_lead_camps),
            )
        )

    with_cpl = [c for c in campaigns if isinstance(c.get("cpl"), (int, float)) and float(c["cpl"]) > 0]
    if len(with_cpl) >= 2:
        best = min(with_cpl, key=lambda c: float(c["cpl"]))
        worst = max(with_cpl, key=lambda c: float(c["cpl"]))
        ratio = float(worst["cpl"]) / float(best["cpl"])
        if ratio >= 3:
            rules.append(
                _mk_rule(
                    rule_id="campaigns_cpl_spread",
                    zone="campaigns",
                    severity="medium",
                    title="Разброс CPL между кампаниями",
                    detail=f"Лучший CPL {round(float(best['cpl']), 0)} ₽ vs худший {round(float(worst['cpl']), 0)} ₽.",
                    action="Масштабировать эффективные кампании, ограничить слабые.",
                    value=round(ratio, 1),
                )
            )

    if total_leads > 0:
        top_leads = max(campaigns, key=lambda c: int(c.get("leads") or 0))
        leads_share = 100 * int(top_leads.get("leads") or 0) / total_leads
        if leads_share >= 75:
            rules.append(
                _mk_rule(
                    rule_id="campaigns_leads_concentration",
                    zone="campaigns",
                    severity="low",
                    title="Лиды сосредоточены в одной кампании",
                    detail=f"{round(leads_share, 1)}% лидов из одной кампании.",
                    action="Проверить потенциал остальных кампаний.",
                    value=round(leads_share, 1),
                )
            )

    for camp in campaigns:
        clicks = int(camp.get("clicks") or 0)
        camp_leads = int(camp.get("leads") or 0)
        if clicks >= 100 and camp_leads == 0 and float(camp.get("cost") or 0) >= 3000:
            rules.append(
                _mk_rule(
                    rule_id="campaigns_low_conversion",
                    zone="campaigns",
                    severity="high",
                    title="Клики без конверсий в кампании",
                    detail=(
                        f"«{(camp.get('campaign_name') or '')[:40]}»: "
                        f"{clicks} кликов, 0 лидов, расход {round(float(camp.get('cost') or 0), 0)} ₽."
                    ),
                    action="Проверить посадочные, цели Метрики и релевантность объявлений.",
                    value=clicks,
                )
            )
            break


def _run_dynamics_rules(rules: list[dict[str, Any]], monthly: list[dict[str, Any]]) -> None:
    if len(monthly) < 2:
        rules.append(
            _mk_rule(
                rule_id="dynamics_short_history",
                zone="dynamics",
                severity="low",
                title="Короткая история по месяцам",
                detail="Меньше 2 месяцев в срезе — динамику оценивать осторожно.",
                action="Загрузить отчёт за более длинный период.",
                value=len(monthly),
            )
        )
        return

    cpl_values = [
        float(m["cpl"]) for m in monthly
        if isinstance(m.get("cpl"), (int, float)) and float(m["cpl"]) > 0
    ]
    if len(cpl_values) >= 3:
        mean_cpl = sum(cpl_values) / len(cpl_values)
        std = (sum((x - mean_cpl) ** 2 for x in cpl_values) / len(cpl_values)) ** 0.5
        cv = std / mean_cpl if mean_cpl else 0
        if cv >= 0.45:
            rules.append(
                _mk_rule(
                    rule_id="dynamics_cpl_volatility",
                    zone="dynamics",
                    severity="medium",
                    title="Нестабильный CPL по месяцам",
                    detail=f"CV CPL = {round(cv, 2)}.",
                    action="Проверить сезонность и ставки.",
                    value=round(cv, 2),
                )
            )

    if len(monthly) >= 2:
        prev_m, last_m = monthly[-2], monthly[-1]
        p_leads, l_leads = int(prev_m.get("leads") or 0), int(last_m.get("leads") or 0)
        if p_leads > 0 and l_leads < p_leads * 0.7:
            drop_pct = round(100 * (p_leads - l_leads) / p_leads, 1)
            rules.append(
                _mk_rule(
                    rule_id="dynamics_leads_drop",
                    zone="dynamics",
                    severity="medium",
                    title="Падение лидов в последнем месяце",
                    detail=f"{prev_m.get('month')} → {last_m.get('month')}: −{drop_pct}% лидов.",
                    action="Разобрать причины: ставки, семантика, сезонность.",
                    value=drop_pct,
                )
            )

        p_cpl, l_cpl = prev_m.get("cpl"), last_m.get("cpl")
        if isinstance(p_cpl, (int, float)) and isinstance(l_cpl, (int, float)) and float(p_cpl) > 0:
            if float(l_cpl) > float(p_cpl) * 1.25:
                rules.append(
                    _mk_rule(
                        rule_id="dynamics_cpl_rise",
                        zone="dynamics",
                        severity="medium",
                        title="Рост CPL в последнем месяце",
                        detail=f"CPL {round(float(p_cpl), 0)} → {round(float(l_cpl), 0)} ₽.",
                        action="Оптимизировать ставки и минус-слова.",
                        value=round(float(l_cpl) - float(p_cpl), 0),
                    )
                )

    if len(monthly) >= 3:
        by_leads = sorted(monthly, key=lambda m: int(m.get("leads") or 0))
        worst, best = by_leads[0], by_leads[-1]
        if int(best.get("leads") or 0) > 0:
            gap = int(best.get("leads") or 0) - int(worst.get("leads") or 0)
            if gap >= 10:
                rules.append(
                    _mk_rule(
                        rule_id="dynamics_month_leads_gap",
                        zone="dynamics",
                        severity="low",
                        title="Сильная разница лидов между месяцами",
                        detail=f"От {worst.get('month')} ({worst.get('leads')}) до {best.get('month')} ({best.get('leads')}).",
                        action="Закрепить практики лучшего месяца.",
                        value=gap,
                    )
                )

    if len(monthly) >= 2:
        prev_m, last_m = monthly[-2], monthly[-1]
        p_cost, l_cost = float(prev_m.get("cost") or 0), float(last_m.get("cost") or 0)
        if p_cost > 0 and l_cost > p_cost * 1.4:
            rules.append(
                _mk_rule(
                    rule_id="dynamics_cost_spike",
                    zone="dynamics",
                    severity="medium",
                    title="Скачок расхода в последнем месяце",
                    detail=f"{prev_m.get('month')} → {last_m.get('month')}: +{round(100 * (l_cost - p_cost) / p_cost, 1)}% расхода.",
                    action="Проверить ставки, бюджеты и новые кампании.",
                    value=round(l_cost - p_cost, 0),
                )
            )

    for row in monthly:
        m_cost = float(row.get("cost") or 0)
        m_leads = int(row.get("leads") or 0)
        if m_cost >= 5000 and m_leads == 0:
            rules.append(
                _mk_rule(
                    rule_id="dynamics_zero_leads_month",
                    zone="dynamics",
                    severity="high",
                    title="Месяц с расходом без лидов",
                    detail=f"{row.get('month')}: расход {round(m_cost, 0)} ₽, лидов 0.",
                    action="Проверить цели, формы и трекинг конверсий.",
                    value=round(m_cost, 0),
                )
            )
            break


def _run_ml_signal_rules(rules: list[dict[str, Any]], ml_signals: dict[str, Any]) -> None:
    """ML anomaly/cluster rules (penalty counted in penalty_ml, not penalty_rules)."""
    if ml_signals.get("insufficient_data"):
        return
    for anomaly in (ml_signals.get("anomalies") or [])[:2]:
        rules.append(
            _mk_rule(
                rule_id=anomaly.get("id") or "ml_monthly_anomaly",
                zone="dynamics",
                severity="medium",
                title=f"Аномалия {anomaly.get('label', 'метрики')} ({anomaly.get('month')})",
                detail=(
                    f"Значение {anomaly.get('value')} вне типичного диапазона "
                    f"{anomaly.get('expected_range', {})}."
                ),
                action="Проверить сезонность, ставки и всплески расхода.",
                value=anomaly.get("value"),
            )
        )
    clusters = ml_signals.get("campaign_clusters") or {}
    if clusters.get("available"):
        under = next((c for c in clusters.get("clusters") or [] if c.get("name") == "underperformers"), None)
        if under and int(under.get("count") or 0) >= 2:
            names = ", ".join(
                (m.get("campaign_name") or "")[:28]
                for m in (under.get("members") or [])[:3]
            )
            rules.append(
                _mk_rule(
                    rule_id="ml_campaign_underperformers",
                    zone="campaigns",
                    severity="medium",
                    title="Кампании-аутсайдеры по эффективности",
                    detail=f"{under.get('count')} кампаний в нижней трети: {names}.",
                    action="Снизить ставки или перераспределить бюджет.",
                    value=int(under.get("count") or 0),
                )
            )
    cv = ml_signals.get("cpl_cv")
    if cv is not None and cv >= 0.5 and not any(r.get("id") == "dynamics_cpl_volatility" for r in rules):
        rules.append(
            _mk_rule(
                rule_id="ml_cpl_high_cv",
                zone="dynamics",
                severity="medium",
                title="Высокая волатильность CPL (ML)",
                detail=f"Коэффициент вариации CPL = {cv}.",
                action="Стабилизировать ставки и семантику.",
                value=cv,
            )
        )


def _run_data_quality_rules(
    rules: list[dict[str, Any]], totals: dict[str, Any], monthly: list[dict[str, Any]]
) -> None:
    cost = float(totals.get("cost") or 0)
    leads = int(totals.get("leads") or 0)
    if cost >= 10000 and leads == 0:
        rules.append(
            _mk_rule(
                rule_id="data_quality_spend_no_leads",
                zone="data_quality",
                severity="critical",
                title="Расход без лидов за период",
                detail=f"Расход {round(cost, 0)} ₽, лидов 0.",
                action="Проверить цели Метрики, формы и разметку конверсий.",
                value=cost,
            )
        )

    cpl = totals.get("cpl")
    if isinstance(cpl, (int, float)) and float(cpl) > 0 and monthly:
        month_cpls = [float(m["cpl"]) for m in monthly if m.get("cpl")]
        if month_cpls:
            avg = sum(month_cpls) / len(month_cpls)
            if float(cpl) > avg * 1.35:
                rules.append(
                    _mk_rule(
                        rule_id="data_quality_high_account_cpl",
                        zone="data_quality",
                        severity="medium",
                        title="CPL выше среднего по месяцам",
                        detail=f"Итоговый CPL {round(float(cpl), 0)} ₽ vs средний {round(avg, 0)} ₽.",
                        action="Снизить CPL через семантику и ставки.",
                        value=round(float(cpl), 0),
                    )
                )

    forms = int(totals.get("forms") or 0)
    messengers = int(totals.get("messengers") or 0)
    channel_total = forms + messengers
    if channel_total >= 10:
        ratio = max(forms, messengers) / max(min(forms, messengers), 1)
        if ratio >= 5:
            dominant = "формы" if forms > messengers else "мессенджеры"
            rules.append(
                _mk_rule(
                    rule_id="data_quality_channel_imbalance",
                    zone="data_quality",
                    severity="low",
                    title="Дисбаланс каналов лидов",
                    detail=f"Доминируют {dominant}: {forms} форм / {messengers} мессенджеров.",
                    action="Проверить креативы и посадочные для слабого канала.",
                    value=round(ratio, 1),
                )
            )


def _coverage_rules(
    coverage: dict[str, Any],
    metrics: dict[str, Any] | None = None,
) -> tuple[int, list[dict[str, Any]]]:
    from app.services.data_coverage_service import _metric_present

    checklist = coverage.get("checklist") or []
    by_id = {row.get("id"): row for row in checklist}
    penalties = 0
    issues: list[dict[str, Any]] = []
    critical_labels = {
        "period": "Период",
        "budget": "Бюджет",
        "clicks": "Клики",
        "leads": "Заявки",
    }
    critical_ids = ("period", "budget", "clicks", "leads")
    for key in critical_ids:
        if metrics is not None:
            present = _metric_present(metrics, key)
        else:
            row = by_id.get(key) or {}
            present = row.get("status") == "present"
        if present:
            continue
        penalties += 8
        issues.append(
            _mk_rule(
                rule_id=f"coverage_{key}",
                zone="coverage",
                severity="high",
                title=f"Не хватает KPI: {critical_labels.get(key, key)}",
                detail="Нет обязательных данных в активном периоде метрик.",
                action="Добавить метрики",
            )
        )
    optional = (
        ("search_queries", "medium"),
        ("semantics_conditions", "medium"),
        ("monthly_dynamics", "low"),
        ("direct_setup", "low"),
        ("metrika", "low"),
        ("crm", "low"),
    )
    for key, sev in optional:
        row = by_id.get(key) or {}
        if row.get("status") != "present":
            penalties += 3 if sev != "low" else 2
            issues.append(
                _mk_rule(
                    rule_id=f"coverage_{key}",
                    zone="coverage",
                    severity=sev,
                    title=f"Неполное покрытие: {row.get('label') or key}",
                    detail=row.get("reason") or "Не хватает данных.",
                    action=row.get("action") or "Добавить данные",
                )
            )
    return penalties, issues


def _zone_breakdown(rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_zone: dict[str, int] = {z: 0 for z in ZONE_LABELS}
    for rule in rules:
        zone = rule.get("zone") or "semantics"
        by_zone[zone] = by_zone.get(zone, 0) + int(rule.get("penalty") or 0)
    out = []
    for zone, label in ZONE_LABELS.items():
        penalty = by_zone.get(zone, 0)
        cap = ZONE_WEIGHT_CAP.get(zone, 20)
        out.append({
            "zone": zone,
            "label": label,
            "penalty": penalty,
            "cap": cap,
            "pct_of_cap": round(100 * penalty / cap, 1) if cap else 0,
        })
    return out


def _build_action_plan(rules: list[dict[str, Any]]) -> dict[str, Any]:
    buckets: dict[str, list[dict[str, Any]]] = {
        "Сегодня": [],
        "1–3 дня": [],
        "3 дня": [],
        "7 дней": [],
        "14 дней": [],
    }
    for rule in sorted(rules, key=lambda r: -int(r.get("penalty") or 0)):
        horizon = rule.get("horizon") or "7 дней"
        buckets.setdefault(horizon, []).append({
            "id": rule.get("id"),
            "title": rule.get("title"),
            "action": rule.get("action"),
            "severity": rule.get("severity"),
        })
    prioritized = []
    for horizon in ("Сегодня", "1–3 дня", "3 дня", "7 дней", "14 дней"):
        for item in buckets.get(horizon, [])[:3]:
            prioritized.append({**item, "horizon": horizon})
        if len(prioritized) >= 8:
            break
    summary_parts = [f"{h}: {len(v)}" for h, v in buckets.items() if v]
    return {
        "summary": " · ".join(summary_parts) if summary_parts else "Критичных задач нет",
        "buckets": {k: v for k, v in buckets.items() if v},
        "prioritized": prioritized[:8],
    }


def build_direct_health_score(
    project: AuditProject,
    direct_analytics: dict[str, Any] | None,
    *,
    coverage: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    if not direct_analytics:
        return None

    cond = direct_analytics.get("conditions") or {}
    totals = direct_analytics.get("totals") or {}
    monthly = direct_analytics.get("monthly") or []
    campaigns = direct_analytics.get("campaigns") or []

    rules: list[dict[str, Any]] = []
    _run_semantics_rules(rules, cond, totals)
    _run_campaign_rules(rules, campaigns)
    _run_dynamics_rules(rules, monthly)
    _run_data_quality_rules(rules, totals, monthly)

    comparison = build_before_after_comparison(project)
    ml_signals = build_ml_signals(
        direct_analytics,
        comparison=comparison if comparison.get("available") else None,
    )
    _run_ml_signal_rules(rules, ml_signals)

    from app.services.ai_service import metrics_from_project

    cov = coverage or assess_data_coverage(project)
    metrics = metrics_from_project(project) or {}
    penalty_coverage, coverage_issues = _coverage_rules(cov, metrics)
    rules.extend(coverage_issues)

    penalty_ml = min(
        ML_PENALTY_CAP,
        sum(int(r.get("penalty") or 0) for r in rules if _is_ml_rule(r)),
    )
    penalty_rules = sum(
        int(r.get("penalty") or 0)
        for r in rules
        if r.get("zone") != "coverage" and not _is_ml_rule(r)
    )
    bonus = _bonus_from_improvement(project)
    base = 100
    raw = base - penalty_rules - penalty_coverage - penalty_ml + bonus
    score = max(0, min(100, int(round(raw))))

    performance_issues = [r for r in rules if r.get("zone") != "coverage"]
    coverage_gaps = [r for r in rules if r.get("zone") == "coverage"]
    top_issues = sorted(performance_issues, key=lambda r: -int(r.get("penalty") or 0))[:6]
    top_issues.extend(sorted(coverage_gaps, key=lambda r: -int(r.get("penalty") or 0))[:4])
    actions = list(dict.fromkeys(i.get("action") for i in top_issues if i.get("action")))[:6]
    action_plan = _build_action_plan(rules)

    setup_info = collect_direct_setup_kinds(project)
    cond_present = len(cond.get("top_by_spend") or []) >= 5
    data_links = {
        "semantics_conditions": {
            "status": "present" if cond_present else "missing",
            "source": "excel_conditions" if cond_present else None,
            "hint": (
                "Семантика учтена из Мастер отчёта (колонка «Условие показа»)."
                if cond_present
                else "Загрузите Excel с колонкой «Условие показа» или перезагрузите файл после обновления."
            ),
        },
        "direct_setup": {
            "status": "present" if setup_info.get("sufficient") else "missing",
            "kinds": setup_info.get("kinds") or [],
            "screenshots_count": setup_info.get("screenshots_count") or 0,
            "hint": (
                f"Скрины настроек: {', '.join(setup_info.get('kinds') or [])}."
                if setup_info.get("sufficient")
                else "При загрузке скрина выберите тип (структура, стратегия, корректировки, креатив) — минимум 2 разных."
            ),
        },
    }

    template_findings = build_j15_template_findings(cond, campaigns)
    performance_for_risks = [
        r for r in performance_issues
        if r.get("severity") in ("critical", "high")
    ]
    risks_for_report = len(template_findings) + len(performance_for_risks)
    health: dict[str, Any] = {
        "health_score": score,
        "grade": _grade(score),
        "rules_total": len(rules),
        "rules_triggered": len(rules),
        "checks_triggered_count": len(rules),
        "risks_for_report_count": risks_for_report,
        "score_breakdown": {
            "base": base,
            "penalty_rules": penalty_rules,
            "penalty_coverage": penalty_coverage,
            "penalty_ml": penalty_ml,
            "bonus_improvement": bonus,
            "totals_cost": float(totals.get("cost") or 0),
            "totals_leads": float(totals.get("leads") or 0),
            "zone_breakdown": _zone_breakdown(rules),
        },
        "top_issues": top_issues,
        "performance_issues": performance_issues[:8],
        "coverage_gaps": coverage_gaps,
        "data_links": data_links,
        "actions": actions,
        "action_plan": action_plan,
        "ml_signals": ml_signals,
        "template_findings": template_findings,
        "rule_catalog": get_rule_catalog(),
        "rules_triggered_ids": [r.get("id") for r in rules if r.get("id")],
    }
    health["summary_explain"] = build_health_summary_explain(
        health,
        comparison=comparison if comparison.get("available") else None,
    )
    return health
