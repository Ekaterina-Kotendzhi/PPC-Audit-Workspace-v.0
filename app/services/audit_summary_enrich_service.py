"""Post-process audit_summary for client PDF — plain language, filled next step."""
from __future__ import annotations

import re
from typing import Any

from app.services.direct_health_rules_catalog import RULE_CATALOG

# Заголовки автопроверок Excel → последствие для клиента (не копировать в main_risk).
_CLIENT_RISK_BY_RULE_TITLE: dict[str, str] = {
    "Расход без лидов в условиях показа": (
        "Часть рекламного бюджета уходит на показы без заявок — деньги расходуются без отдачи."
    ),
    "Концентрация расхода в топ-3 условиях": (
        "Большая доля бюджета сосредоточена на нескольких условиях показа — при сбое одного сегмента страдает весь результат."
    ),
    "Заметная концентрация в топ-3 условиях": (
        "Бюджет слишком завязан на узкий набор условий — сложнее масштабировать эффективные связки."
    ),
    "Разброс CPL между условиями": (
        "Стоимость заявки сильно различается по условиям — часть трафика заметно дороже эффективного."
    ),
    "Доля слива в условиях без лидов": (
        "Заметная часть расхода не приносит заявок — бюджет «утекает» в неэффективные показы."
    ),
}


def _build_risk_map() -> dict[str, str]:
    out = dict(_CLIENT_RISK_BY_RULE_TITLE)
    for rule in RULE_CATALOG:
        title = str(rule.get("title") or "").strip()
        if title and title not in out:
            rec = str(rule.get("recommendation") or "").strip()
            if rec:
                out[title] = f"Если не исправить: {rec[0].lower() + rec[1:] if len(rec) > 1 else rec}"
    return out


_RISK_MAP = _build_risk_map()


def _truncate(text: str, limit: int = 200) -> str:
    text = " ".join(str(text or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _format_rub(amount: float | int) -> str:
    n = int(round(float(amount)))
    return f"{n:,} ₽".replace(",", " ")


def humanize_performance_detail(detail: str, title: str = "") -> str:
    """Технический detail автопроверки → формулировка для клиента."""
    raw = " ".join(str(detail or "").split()).strip()
    if not raw:
        return humanize_main_risk(title)

    m = re.match(
        r"^(\d+)\s+условий\s*≥?\s*\d+\s*₽?\s*без лидов,\s*сумма\s*([\d.]+)\s*₽\.?$",
        raw,
        re.I,
    )
    if m:
        count, amount = int(m.group(1)), float(m.group(2))
        rub = _format_rub(amount)
        if count == 1:
            return f"Одно условие показа потратило {rub} без заявок."
        if count == 2:
            return f"Два условия показа съели {rub} без единой заявки."
        if count == 3:
            return f"Три условия показа съели {rub} без единой заявки."
        if count == 4:
            return f"Четыре условия показа съели {rub} без единой заявки."
        return f"Около {count} условий показа съели {rub} без единой заявки."

    m = re.match(r"^Топ-3 условий\s*=\s*([\d.]+)%\s*расхода\.?$", raw, re.I)
    if m:
        pct = m.group(1).rstrip("0").rstrip(".") if "." in m.group(1) else m.group(1)
        return (
            f"Три условия показа забирают {pct}% бюджета — "
            "при сбое одного сегмента страдает весь результат."
        )

    m = re.match(r"^([\d.]+)%\s*расхода без конверсий\.?$", raw, re.I)
    if m:
        pct = m.group(1).rstrip("0").rstrip(".") if "." in m.group(1) else m.group(1)
        return f"Примерно {pct}% бюджета уходит на показы без заявок."

    if "≥" in raw or re.search(r"\d+\s+условий", raw, re.I):
        ht = humanize_main_risk(title)
        if ht and ht != raw:
            return ht

    return _truncate(raw, 220)


def humanize_main_risk(text: str) -> str:
    raw = " ".join(str(text or "").split()).strip()
    if not raw:
        return ""
    if raw in _RISK_MAP:
        return _RISK_MAP[raw]
    lower = raw.lower()
    for title, client in _RISK_MAP.items():
        if title.lower() == lower or title.lower() in lower and len(raw) <= len(title) + 40:
            return client
    if re.search(r"условиях показа|автопровер|direct_health|оценка кабинета", lower):
        return (
            "Без оптимизации рекламы бюджет продолжит уходить на неэффективные сегменты, "
            "а стоимость заявки останется высокой."
        )
    return raw


def _first_action_from_health(health: dict[str, Any]) -> str:
    plan = health.get("action_plan") or {}
    for item in plan.get("prioritized") or []:
        action = str(item.get("action") or item.get("title") or "").strip()
        if action:
            return action
    perf = health.get("performance_issues") or health.get("top_issues") or []
    if perf:
        rec = str(perf[0].get("action") or perf[0].get("recommendation") or "").strip()
        if rec:
            return rec
    return ""


def _first_action_from_findings(findings: list[dict[str, Any]]) -> str:
    for finding in findings:
        if finding.get("finding_kind") == "needs_data":
            continue
        for key in ("recommended_action", "recommendation"):
            text = str(finding.get(key) or "").strip()
            if len(text) >= 12:
                return text
    return ""


def _build_client_problem(ai_data: dict[str, Any], input_data: dict[str, Any] | None) -> str:
    metrics = ai_data.get("metrics") or {}
    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    parts: list[str] = []
    if metrics.get("budget") is not None and metrics.get("leads") is not None:
        budget = int(float(metrics["budget"]))
        leads = int(float(metrics["leads"]))
        parts.append(f"бюджет {budget:,} ₽ и {leads} заявок".replace(",", " "))
    elif metrics.get("leads") is not None:
        parts.append(f"{int(float(metrics['leads']))} заявок за период")
    if metrics.get("cpl") is not None:
        parts.append(f"CPL {metrics.get('cpl')} ₽")
    score = health.get("health_score")
    if score is not None:
        parts.append(f"оценка кабинета {score}/100")
    if parts:
        return (
            "По данным рекламы: "
            + ", ".join(parts[:4])
            + ". Есть зоны для усиления эффективности и снижения стоимости лида."
        )
    return (
        "По загруженным материалам рекламный кабинет требует оптимизации: "
        "снизить стоимость лида и убрать неэффективный расход."
    )


def _build_main_risk_from_sources(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None,
) -> str:
    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    perf = health.get("performance_issues") or health.get("top_issues") or []
    if perf:
        detail = str(perf[0].get("detail") or "").strip()
        title = str(perf[0].get("title") or "").strip()
        if detail and len(detail) >= 12:
            client = humanize_performance_detail(detail, title)
            if client:
                return _truncate(client, 220)
        if title:
            return humanize_main_risk(title)
    for finding in ai_data.get("findings") or []:
        if finding.get("severity") == "high":
            text = str(finding.get("problem") or "").strip()
            if len(text) >= 20:
                return _truncate(text, 220)
    return (
        "Без изменений бюджет может продолжать расходоваться на слабые сегменты, "
        "а заявки останутся дорогими."
    )


def _suggest_priority(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None,
    fallback: str = "medium",
) -> str:
    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    score = health.get("health_score")
    if score is not None:
        if int(score) < 45:
            return "high"
        if int(score) <= 65:
            return "medium"
        return "low"
    for finding in ai_data.get("findings") or []:
        if str(finding.get("severity") or "").lower() == "high":
            return "high"
    fb = str(fallback or "medium").lower()
    return fb if fb in ("low", "medium", "high") else "medium"


def suggest_short_conclusion(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None = None,
    *,
    force: bool = False,
) -> str:
    existing = str((ai_data.get("audit_summary") or {}).get("short_conclusion") or "").strip()
    if not force and len(existing) >= 25 and "требует проверки" not in existing.lower():
        return existing

    health = ((input_data or {}).get("direct_statistics") or {}).get("health") or {}
    action = _first_action_from_health(health)
    if action:
        return f"Предлагаем начать с: {action}"

    action = _first_action_from_findings(ai_data.get("findings") or [])
    if action:
        return f"Предлагаем начать с: {action[:200]}"

    offer = ai_data.get("commercial_offer") or {}
    next_step = str(offer.get("next_step") or "").strip()
    if len(next_step) >= 15:
        return next_step

    services = offer.get("recommended_services") or []
    if services:
        first = str(services[0]).strip()
        return f"Следующий шаг: {first} и согласование плана работ по аудиту."

    return (
        "Согласуем приоритетные правки по семантике и бюджету, затем внедряем и замеряем CPL и заявки."
    )


def _summary_snapshot(summary: dict[str, Any]) -> dict[str, str]:
    return {
        "client_problem": str(summary.get("client_problem") or "").strip(),
        "main_risk": str(summary.get("main_risk") or "").strip(),
        "short_conclusion": str(summary.get("short_conclusion") or "").strip(),
        "priority": str(summary.get("priority") or "medium").strip().lower(),
    }


def enrich_audit_summary(
    ai_data: dict[str, Any],
    input_data: dict[str, Any] | None = None,
    *,
    force_refresh: bool = False,
) -> tuple[dict[str, Any], bool]:
    """Заполняет/улучшает audit_summary. Возвращает (ai_data, changed)."""
    if ai_data.get("is_preliminary"):
        return ai_data, False

    before = _summary_snapshot(ai_data.get("audit_summary") or {})
    old = dict(ai_data.get("audit_summary") or {})

    if force_refresh:
        priority = _suggest_priority(ai_data, input_data, str(old.get("priority") or "medium"))
        summary = {
            "client_problem": _build_client_problem(ai_data, input_data),
            "main_risk": _build_main_risk_from_sources(ai_data, input_data),
            "short_conclusion": suggest_short_conclusion(ai_data, input_data, force=True),
            "priority": priority,
        }
    else:
        summary = dict(old or {})
        problem = str(summary.get("client_problem") or "").strip()
        if not problem:
            summary["client_problem"] = _build_client_problem(ai_data, input_data)
        else:
            summary["client_problem"] = problem

        risk = humanize_main_risk(summary.get("main_risk"))
        if risk:
            summary["main_risk"] = risk
        elif not summary.get("main_risk"):
            summary["main_risk"] = _build_main_risk_from_sources(ai_data, input_data)

        if summary.get("priority") not in ("low", "medium", "high"):
            summary["priority"] = "medium"

        summary["short_conclusion"] = suggest_short_conclusion(ai_data, input_data)

    ai_data["audit_summary"] = summary
    changed = _summary_snapshot(summary) != before
    return ai_data, changed
