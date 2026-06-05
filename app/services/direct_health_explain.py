"""Deterministic health score explanation (computed -> text, no invented metrics)."""
from __future__ import annotations

from typing import Any

ZONE_LABELS = {
    "semantics": "семантика",
    "campaigns": "кампании",
    "dynamics": "динамика",
    "coverage": "покрытие данных",
    "data_quality": "качество данных",
}


def build_health_summary_explain(
    health: dict[str, Any],
    *,
    comparison: dict[str, Any] | None = None,
) -> str:
    if not health:
        return ""
    score = health.get("health_score")
    grade = health.get("grade")
    parts = [f"Оценка кабинета: {score}/100 ({grade})."]

    breakdown = health.get("score_breakdown") or {}
    zone = breakdown.get("zone_breakdown") or []
    top_zones = sorted(zone, key=lambda z: -(z.get("penalty") or 0))[:2]
    if top_zones:
        labels = [f"{z.get('label', z.get('zone'))} (−{z.get('penalty', 0)})" for z in top_zones if z.get("penalty")]
        if labels:
            parts.append("Основные зоны риска: " + ", ".join(labels) + ".")

    perf = health.get("performance_issues") or []
    if perf:
        parts.append(
            "Ключевой риск: "
            + (perf[0].get("title") or "")
            + " — "
            + (perf[0].get("detail") or "")
            + "."
        )

    links = health.get("data_links") or {}
    missing = []
    if links.get("semantics_conditions", {}).get("status") != "present":
        missing.append("семантика из Excel")
    if links.get("direct_setup", {}).get("status") != "present":
        missing.append("скрины настроек")
    if missing:
        parts.append("Для полноты оценки добавьте: " + ", ".join(missing) + ".")

    ml = health.get("ml_signals") or {}
    anomalies = ml.get("anomalies") or []
    if anomalies:
        a = anomalies[0]
        parts.append(
            f"Аномалия по {a.get('label', 'метрике')}: {a.get('month')} "
            f"({a.get('value')}) вне типичного диапазона."
        )
    clusters = (ml.get("campaign_clusters") or {}).get("clusters") or []
    under = next((c for c in clusters if c.get("name") == "underperformers"), None)
    if under and under.get("count"):
        parts.append(f"Аутсайдеров по эффективности среди кампаний: {under.get('count')}.")

    if comparison and comparison.get("available"):
        d = comparison.get("deltas") or {}
        before = comparison.get("before") or {}
        after = comparison.get("after") or {}
        leads_d = d.get("leads") or {}
        cpl_d = d.get("cpl") or {}
        if leads_d.get("percent") is not None:
            parts.append(
                f"Динамика лидов: {before.get('period')} → {after.get('period')}: "
                f"{leads_d.get('percent'):+}%."
            )
        if cpl_d.get("percent") is not None:
            parts.append(
                f"CPL: {before.get('period')} → {after.get('period')}: "
                f"{cpl_d.get('percent'):+}%."
            )

    plan = health.get("action_plan") or {}
    prioritized = plan.get("prioritized") or []
    if prioritized:
        parts.append(
            "Первый шаг: "
            + (prioritized[0].get("action") or prioritized[0].get("title") or "см. план действий")
            + f" (горизонт {prioritized[0].get('horizon', '7 дней')})."
        )

    return " ".join(parts)


def build_j15_template_findings(cond: dict[str, Any], campaigns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Structured templates for UI / optional findings sync."""
    out: list[dict[str, Any]] = []
    top = cond.get("top_by_spend") or []
    if len(top) >= 3:
        share = sum(float(r.get("share_cost_pct") or 0) for r in top[:3])
        out.append({
            "template_id": "top3_budget_share",
            "severity": "high" if share >= 75 else "medium",
            "title": "Концентрация бюджета в топ-3 условиях",
            "detail": f"Топ-3 условия = {round(share, 1)}% расхода за период файла.",
            "recommended_action": "Перераспределить бюджет и расширить семантику.",
        })
    waste = cond.get("high_spend_zero_leads") or []
    if waste:
        total_waste = sum(float(r.get("cost") or 0) for r in waste)
        out.append({
            "template_id": "conditions_zero_leads",
            "severity": "high" if len(waste) >= 5 else "medium",
            "title": "Расход без лидов по условиям показа",
            "detail": f"{len(waste)} условий с расходом ≥500 ₽ без лидов (сумма {round(total_waste, 0)} ₽).",
            "recommended_action": "Добавить минус-слова и снизить ставки по неэффективным условиям.",
        })
    best = (cond.get("top_best_cpl") or [])[:1]
    worst = (cond.get("top_worst_cpl") or [])[:1]
    if best and worst:
        out.append({
            "template_id": "cpl_spread_conditions",
            "severity": "medium",
            "title": "Разброс CPL по условиям",
            "detail": (
                f"Лучшее CPL: {round(float(best[0].get('cpl') or 0), 0)} ₽ "
                f"({best[0].get('condition', '')[:40]}…); "
                f"худшее: {round(float(worst[0].get('cpl') or 0), 0)} ₽."
            ),
            "recommended_action": "Масштабировать условия с лучшим CPL.",
        })
    if campaigns:
        with_cpl = [c for c in campaigns if c.get("cpl")]
        if len(with_cpl) >= 2:
            b = min(with_cpl, key=lambda c: float(c["cpl"]))
            w = max(with_cpl, key=lambda c: float(c["cpl"]))
            out.append({
                "template_id": "cpl_spread_campaigns",
                "severity": "medium",
                "title": "Лучший и худший CPL по кампаниям",
                "detail": (
                    f"Лучшая кампания: {(b.get('campaign_name') or '')[:35]} — "
                    f"{round(float(b['cpl']), 0)} ₽; худшая: {(w.get('campaign_name') or '')[:35]} — "
                    f"{round(float(w['cpl']), 0)} ₽."
                ),
                "recommended_action": "Перераспределить бюджет в эффективные кампании.",
            })
    return out
