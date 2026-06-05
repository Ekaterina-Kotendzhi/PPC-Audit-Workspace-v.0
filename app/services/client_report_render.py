"""Client-facing HTML fragments for PDF/preview (no internal marketer jargon)."""
from __future__ import annotations

import re
from html import escape
from typing import Any, Callable

FormatFn = Callable[[Any], str]

_AREA_LABELS: dict[str, str] = {
    "crm": "CRM и продажи",
    "semantics": "Семантика",
    "landing": "Посадочные страницы",
    "analytics": "Аналитика",
    "budget": "Бюджет и ставки",
    "structure": "Структура кампаний",
    "creatives": "Креативы",
}

_METRICS_REVIEW_SKIP_CLIENT = frozenset({
    "Нет продаж — CPA требует проверки",
    "Нет выручки — ROMI требует проверки",
    "Не указан период",
    "Не указан бюджет",
    "Не указаны заявки",
})

_GRADE_CLIENT: dict[str, tuple[str, str]] = {
    "A": ("Высокая", "Кабинет в хорошем состоянии"),
    "B": ("Хорошая", "Есть точечные улучшения"),
    "C": ("Средняя", "Есть зоны, которые стоит усилить"),
    "D": ("Низкая", "Нужны заметные изменения"),
    "F": ("Критичная", "Высокий риск потери эффективности"),
}

_HORIZON_CLIENT: dict[str, str] = {
    "Сегодня": "Срочно",
    "1–3 дня": "1–3 дня",
    "3 дня": "3 дня",
    "7 дней": "До 7 дней",
    "14 дней": "До 2 недель",
}

_INTERNAL_LINE_RE = [
    re.compile(r"^вывод\s*#\s*\d+", re.I),
    re.compile(r"^основания\s+для\s+вывода", re.I),
    re.compile(r"^высокая\s+уверенность", re.I),
    re.compile(r"^средняя\s+уверенность", re.I),
    re.compile(r"^низкая\s+уверенность", re.I),
    re.compile(r"^\[finding_\d+\]", re.I),
    re.compile(r"^\[mat_\d+\]", re.I),
]

_NUMBERED_STEP_RE = re.compile(r"^\s*\d+[\.\)]\s+(.+)$", re.M)


def _h(value: Any) -> str:
    if value is None:
        return ""
    return escape(str(value), quote=True)


def _truncate(text: str, limit: int = 200) -> str:
    text = " ".join(str(text or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _money(value: Any, *, digits: int = 0) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "—"
    return f"{number:,.{digits}f} ₽".replace(",", " ")


def _num(value: Any, *, digits: int = 0) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "—"
    if digits == 0:
        return f"{number:,.0f}".replace(",", " ")
    return f"{number:,.{digits}f}".replace(",", " ")


def sanitize_client_report_text(text: str) -> str:
    """Убирает служебные пометки чата/AI ([mat_N], Вывод #N и т.д.)."""
    raw = str(text or "").replace("\r\n", "\n").strip()
    if not raw:
        return ""

    lines = []
    for line in raw.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if any(pat.search(stripped) for pat in _INTERNAL_LINE_RE):
            continue
        lines.append(stripped)
    t = "\n".join(lines)

    t = re.sub(r"\[mat_\d+\]", "", t, flags=re.I)
    t = re.sub(r"\[finding_\d+\]", "", t, flags=re.I)
    t = re.sub(r"вывод\s*#\s*\d+\s*подтверждён[^\n]*", "", t, flags=re.I)
    t = re.sub(r"вывод\s*#\s*\d+[^\n]*", "", t, flags=re.I)
    t = re.sub(r"основания\s+для\s+вывода\s*:?\s*", "", t, flags=re.I)
    t = re.sub(r"(\d+)\.0(?=\s*₽|\s|$)", r"\1", t)
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def area_display_label(area: str | None) -> str:
    key = str(area or "").strip().lower()
    if key in _AREA_LABELS:
        return _AREA_LABELS[key]
    if key:
        return key.replace("_", " ").capitalize()
    return "Наблюдение"


def _split_problem_and_steps(problem: str, recommendation: str) -> tuple[str, list[str]]:
    prob = sanitize_client_report_text(problem)
    rec = sanitize_client_report_text(recommendation)
    steps: list[str] = []

    if rec:
        for line in rec.split("\n"):
            m = _NUMBERED_STEP_RE.match(line)
            if m:
                steps.append(m.group(1).strip())
            elif line.strip():
                steps.append(line.strip())
        return prob, steps

    if not prob:
        return "", steps

    matches = list(_NUMBERED_STEP_RE.finditer(prob))
    if matches:
        first_start = matches[0].start()
        body = prob[:first_start].strip()
        steps = [m.group(1).strip() for m in matches]
        return body or prob, steps

    return prob, steps


def _paragraphs_html(text: str) -> str:
    clean = sanitize_client_report_text(text)
    if not clean:
        return ""
    parts = [p.strip() for p in re.split(r"\n\s*\n", clean) if p.strip()]
    if not parts:
        parts = [clean]
    return "".join(f"<p>{_h(p)}</p>" for p in parts)


def client_report_extra_css() -> str:
    return """
.client-summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.client-summary-card { padding: 16px 18px; border-radius: 12px; background: #f8fafc; border: 1px solid #e6eaf0; }
.client-summary-card--wide { grid-column: 1 / -1; }
.client-summary-card h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: #667085; font-weight: 700; }
.client-summary-card p { margin: 0; font-size: 15px; line-height: 1.55; color: #344054; }
.client-summary-priority { display: inline-block; margin-top: 4px; padding: 4px 10px; border-radius: 999px; background: #e8f0ff; color: #244c80; font-weight: 700; font-size: 13px; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 4px; }
.kpi-tile { padding: 14px 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e6eaf0; }
.kpi-tile--period { grid-column: 1 / -1; background: linear-gradient(135deg, #f4f8ff 0%, #edf4ff 100%); border-color: #d0d9ea; }
.kpi-label { display: block; font-size: 12px; font-weight: 700; color: #667085; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .03em; }
.kpi-value { display: block; font-size: 20px; font-weight: 800; color: #1b3558; line-height: 1.2; }
.client-plan-block { margin-bottom: 22px; }
.client-plan-block h3 { margin: 0 0 12px; font-size: 17px; color: #1b3558; }
.client-baseline-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.client-baseline-chip { padding: 10px 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e6eaf0; font-size: 14px; }
.client-baseline-chip strong { color: #667085; font-weight: 700; margin-right: 6px; }
.forecast-scenarios { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
.forecast-scenario { padding: 16px 18px; border-radius: 12px; background: #f8fafc; border: 1px solid #e6eaf0; border-left: 4px solid #3062a8; }
.forecast-scenario--target { border-left-color: #12b76a; }
.forecast-scenario-label { margin: 0 0 6px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #667085; }
.forecast-scenario-headline { margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #1b3558; }
.forecast-scenario-note { margin: 0; font-size: 14px; color: #475467; line-height: 1.5; }
.forecast-disclaimer { margin: 10px 0 0; padding: 12px 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e6eaf0; font-size: 13px; color: #667085; line-height: 1.5; }
.client-offer-section { border: 2px solid #3062a8; background: linear-gradient(135deg, #f4f8ff 0%, #edf4ff 100%); }
.client-offer-lead { margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #1b3558; }
.client-offer-services { margin: 0 0 18px; padding: 0; list-style: none; }
.client-offer-services li { margin: 8px 0; padding-left: 22px; position: relative; line-height: 1.5; }
.client-offer-services li::before { content: "✓"; position: absolute; left: 0; color: #3062a8; font-weight: 700; }
.client-offer-meta { display: grid; gap: 10px; }
.client-offer-meta p { margin: 0; font-size: 15px; line-height: 1.55; }
.client-observations { list-style: none; padding: 0; margin: 0; }
.client-observation { margin: 0 0 18px; padding: 18px 20px; border-radius: 14px; background: #fbfcff; border: 1px solid #e6eaf0; page-break-inside: avoid; break-inside: avoid; }
.client-observation-area { display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px; background: #e8f0ff; color: #244c80; font-size: 12px; font-weight: 700; }
.client-observation-problem { margin: 0 0 10px; font-size: 15px; line-height: 1.6; color: #344054; }
.client-observation-steps { margin: 0; padding-left: 20px; color: #475467; }
.client-observation-steps li { margin: 6px 0; line-height: 1.5; }
.client-info-banner { margin-bottom: 18px; padding: 14px 16px; border-radius: 12px; background: #f4f8ff; border: 1px solid #c7d7f0; color: #344054; font-size: 14px; line-height: 1.5; }
@media (max-width: 720px) { .client-summary-grid, .forecast-scenarios { grid-template-columns: 1fr; } }
"""


def client_metrics_footer_html(metrics: dict[str, Any]) -> str:
    if not metrics:
        return ""
    reason = str(metrics.get("review_reason") or "").strip()
    parts = [p.strip() for p in reason.split(";") if p.strip()]
    important = [p for p in parts if p not in _METRICS_REVIEW_SKIP_CLIENT]
    missing_crm = any(p in _METRICS_REVIEW_SKIP_CLIENT for p in parts)

    chunks: list[str] = []
    if important:
        chunks.append(
            f'<p class="metrics-data-note"><strong>Уточнение по цифрам:</strong> '
            f'{_h("; ".join(important))}</p>'
        )
    if missing_crm and not any(
        metrics.get(k) is not None and metrics.get(k) != ""
        for k in ("sales", "revenue")
    ):
        chunks.append(
            '<p class="metrics-footnote">Продажи и выручка не указаны — '
            "CPA и ROMI появятся в отчёте после данных из CRM или ручного ввода.</p>"
        )
    return "".join(chunks)


def render_client_summary(snapshot: dict[str, Any]) -> str:
    summary = snapshot.get("audit_summary") or {}
    if not summary:
        return ""
    priority = ""
    if not snapshot.get("is_preliminary"):
        label = snapshot.get("priority_label") or ""
        if label:
            priority = (
                f'<article class="client-summary-card">'
                f'<h3>Приоритет</h3><p><span class="client-summary-priority">{_h(label)}</span></p></article>'
            )
    return (
        f'<section class="section client-summary-section"><h2>Краткий вывод</h2>'
        f'<div class="client-summary-grid">'
        f'<article class="client-summary-card client-summary-card--wide">'
        f'<h3>Суть</h3><p>{_h(summary.get("client_problem") or "—")}</p></article>'
        f'<article class="client-summary-card client-summary-card--wide">'
        f'<h3>Если не исправить</h3><p>{_h(summary.get("main_risk") or "—")}</p></article>'
        f'{priority}'
        f'<article class="client-summary-card client-summary-card--wide">'
        f'<h3>Следующий шаг</h3><p>{_h(summary.get("short_conclusion") or "—")}</p></article>'
        f"</div></section>"
    )


def render_client_metrics_section(
    rows: list[tuple[str, str]],
    metrics: dict[str, Any],
) -> str:
    if not rows:
        return ""
    tiles = []
    for label, value in rows:
        cls = "kpi-tile kpi-tile--period" if label == "Период" else "kpi-tile"
        tiles.append(
            f'<div class="{cls}"><span class="kpi-label">{_h(label)}</span>'
            f'<span class="kpi-value">{value}</span></div>'
        )
    footer = client_metrics_footer_html(metrics)
    return (
        f'<section class="section metrics-section"><h2>Ключевые метрики</h2>'
        f'<div class="kpi-grid">{"".join(tiles)}</div>{footer}</section>'
    )


def render_client_cabinet_health(health: dict[str, Any]) -> str:
    if not health.get("available"):
        return ""

    score = int(health.get("health_score") or 0)
    grade = str(health.get("grade") or "—")
    level_label, tagline = _grade_labels(grade, score)
    period = str(health.get("period") or "").strip()
    period_html = (
        f'<p class="cabinet-health-period">Период анализа: <strong>{_h(period)}</strong></p>'
        if period
        else ""
    )

    lead = _h(_client_health_lead(health))
    reasons = health.get("top_reasons") or []
    risks_html = ""
    if reasons:
        items = "".join(
            f"<li><strong>{_h(r.get('title'))}</strong>"
            f"{f' — {_h(_truncate(r.get('detail') or '', 160))}' if r.get('detail') else ''}</li>"
            for r in reasons[:3]
            if r.get("title")
        )
        if items:
            risks_html = f'<h3>На что обратить внимание</h3><ul class="cabinet-health-list">{items}</ul>'

    plan_items = health.get("action_plan") or []
    plan_html = ""
    if plan_items:
        rows = "".join(
            f'<li><span class="cabinet-health-horizon">'
            f'{_h(_HORIZON_CLIENT.get(str(p.get("horizon") or ""), p.get("horizon") or ""))}</span> '
            f'{_h(p.get("action") or p.get("title") or "")}</li>'
            for p in plan_items[:4]
            if p.get("action") or p.get("title")
        )
        if rows:
            plan_html = f'<h3>Рекомендуемые шаги</h3><ul class="cabinet-health-plan">{rows}</ul>'

    return (
        f'<section class="section cabinet-health-section">'
        f'<h2>Состояние рекламного кабинета</h2>'
        f'<div class="cabinet-health-hero">'
        f'<div class="cabinet-health-score" aria-label="Оценка {score} из 100">'
        f'<span class="cabinet-health-score-value">{score}</span>'
        f'<span class="cabinet-health-score-max">/100</span></div>'
        f'<div class="cabinet-health-meta">'
        f'<p class="cabinet-health-level">{_h(level_label)} оценка · {_h(grade)}</p>'
        f'<p class="cabinet-health-tagline">{_h(tagline)}</p>'
        f"{period_html}</div></div>"
        f'<p class="cabinet-health-lead">{lead}</p>'
        f"{risks_html}{plan_html}"
        f'<p class="cabinet-health-source muted">На основе отчёта Яндекс.Директа за указанный период.</p>'
        f"</section>"
    )


def _grade_labels(grade: str | None, score: int | float) -> tuple[str, str]:
    key = str(grade or "").strip().upper()[:1]
    if key in _GRADE_CLIENT:
        return _GRADE_CLIENT[key]
    if score >= 80:
        return _GRADE_CLIENT["B"]
    if score >= 60:
        return _GRADE_CLIENT["C"]
    if score >= 40:
        return _GRADE_CLIENT["D"]
    return _GRADE_CLIENT["F"]


def _client_health_lead(health: dict[str, Any]) -> str:
    reasons = health.get("top_reasons") or []
    if reasons:
        first = reasons[0]
        title = str(first.get("title") or "").strip()
        detail = _truncate(str(first.get("detail") or ""), 220)
        if title and detail:
            return f"{title} — {detail}"
        return title or detail
    score = health.get("health_score")
    grade = health.get("grade") or "—"
    _, tagline = _grade_labels(grade, score or 0)
    return f"{tagline}. Сводная оценка по рекламным данным — {score}/100."


def render_client_audit_plan(snapshot: dict[str, Any]) -> str:
    plan = snapshot.get("audit_plan") or {}
    if not (snapshot.get("has_forecast") or snapshot.get("has_baseline") or snapshot.get("has_targets")):
        return ""

    chunks: list[str] = []
    baseline = plan.get("baseline") or {}
    if snapshot.get("has_baseline"):
        metrics = baseline.get("metrics") or {}
        chips = []
        for label, key, fmt in (
            ("Бюджет", "budget", _money),
            ("Выручка", "revenue", _money),
            ("Валовая прибыль", "gross_profit", _money),
            ("ДРР", "drr", lambda v: f"{v}%" if v is not None else "—"),
            ("Заявки", "leads", _num),
        ):
            val = metrics.get(key)
            if val is not None:
                chips.append(
                    f'<span class="client-baseline-chip"><strong>{_h(label)}</strong>{fmt(val)}</span>'
                )
        chips_html = f'<div class="client-baseline-grid">{"".join(chips)}</div>' if chips else ""
        note = f'<p class="muted">{_h(baseline.get("note"))}</p>' if baseline.get("note") else ""
        captured = (
            baseline.get("reference_period")
            or metrics.get("period")
            or baseline.get("captured_at")
            or snapshot.get("audit_date")
        )
        chunks.append(
            f'<div class="client-plan-block"><h3>Базовая линия ({_h(captured)})</h3>'
            f"{chips_html}{note}</div>"
        )

    targets = plan.get("targets") or {}
    if snapshot.get("has_targets"):
        tm = targets.get("metrics") or {}
        horizon = targets.get("horizon_months") or 3
        chips = []
        for label, key, fmt in (
            ("Выручка", "revenue", _money),
            ("Валовая прибыль", "gross_profit", _money),
            ("ДРР", "drr", lambda v: f"{v}%" if v is not None else "—"),
            ("Заявки", "leads", _num),
        ):
            val = tm.get(key)
            if val is not None:
                chips.append(
                    f'<span class="client-baseline-chip"><strong>{_h(label)}</strong>{fmt(val)}</span>'
                )
        chips_html = f'<div class="client-baseline-grid">{"".join(chips)}</div>' if chips else ""
        note = f'<p class="muted">{_h(targets.get("note"))}</p>' if targets.get("note") else ""
        chunks.append(
            f'<div class="client-plan-block"><h3>Цель через {horizon} мес.</h3>{chips_html}{note}</div>'
        )

    forecast = plan.get("forecast") or {}
    if snapshot.get("has_forecast"):
        horizon = forecast.get("horizon_months") or 3
        start_period = (forecast.get("forecast_start_period") or "").strip()
        ref_period = (forecast.get("reference_period") or "").strip()
        if start_period:
            from app.services.period_service import period_label_preposition_s

            start_label = period_label_preposition_s(start_period) or start_period
            ref_suffix = f" с {_h(start_label)}"
        elif ref_period:
            ref_suffix = f" от {_h(ref_period)}"
        else:
            ref_suffix = ""
        baseline_note = (
            f'<p class="muted">Опора на период: {_h(ref_period)}.</p>'
            if ref_period
            else ""
        )
        disclaimer = (forecast.get("analytics_disclaimer") or "").strip()
        disc_html = (
            f'<p class="forecast-disclaimer">{_h(disclaimer)}</p>' if disclaimer else ""
        )
        scenarios = []
        for title, key, css in (
            ("Консервативный сценарий", "conservative", "forecast-scenario"),
            ("Целевой сценарий", "target", "forecast-scenario forecast-scenario--target"),
        ):
            block = forecast.get(key) or {}
            headline = (block.get("headline") or "").strip()
            assumption = (block.get("assumption") or "").strip()
            if headline or assumption:
                scenarios.append(
                    f'<article class="{css}">'
                    f'<p class="forecast-scenario-label">{_h(title)}</p>'
                    f'<p class="forecast-scenario-headline">{_h(headline)}</p>'
                    f'<p class="forecast-scenario-note">{_h(assumption)}</p></article>'
                )
        if scenarios:
            chunks.append(
                f'<div class="client-plan-block"><h3>Прогноз{ref_suffix} ({horizon} мес.)</h3>'
                f"{baseline_note}{disc_html}"
                f'<div class="forecast-scenarios">{"".join(scenarios)}</div></div>'
            )

    if not chunks:
        return ""
    return f'<section class="section client-plan-section"><h2>Прогноз и цели</h2>{"".join(chunks)}</section>'


def render_client_offer(offer: dict[str, Any]) -> str:
    if not offer:
        return ""
    services = "".join(
        f"<li>{_h(item)}</li>" for item in (offer.get("recommended_services") or []) if item
    )
    title = (offer.get("proposal_title") or "План работ").strip()
    days = offer.get("estimated_work_days")
    days_line = f"<p><strong>Срок:</strong> {_h(days)} рабочих дней</p>" if days else ""
    return (
        f'<section class="section client-offer-section">'
        f"<h2>Коммерческое предложение</h2>"
        f'<p class="client-offer-lead">{_h(title)}</p>'
        f'<ul class="client-offer-services">{services}</ul>'
        f'<div class="client-offer-meta">'
        f"{days_line}"
        f'<p><strong>Зачем это важно:</strong> {_h(offer.get("sales_argument") or "—")}</p>'
        f'<p><strong>Следующий шаг:</strong> {_h(offer.get("next_step") or "—")}</p>'
        f"</div></section>"
    )


def render_client_confirmed_observations(items: list[dict[str, Any]]) -> str:
    if not items:
        return ""
    blocks = []
    for item in items:
        problem, steps = _split_problem_and_steps(
            str(item.get("problem") or ""),
            str(item.get("recommendation") or ""),
        )
        if not problem and not steps:
            continue
        area = area_display_label(item.get("area"))
        prob_html = _paragraphs_html(problem) if problem else ""
        steps_html = ""
        if steps:
            steps_html = (
                "<ol class='client-observation-steps'>"
                + "".join(f"<li>{_h(s)}</li>" for s in steps[:8])
                + "</ol>"
            )
        image = ""
        if item.get("illustration_image_data_uri"):
            alt = _h(item.get("illustration_title") or "Иллюстрация")
            caption = ""
            if item.get("illustration_caption"):
                caption = f'<p class="figure-caption">{_h(item.get("illustration_caption"))}</p>'
            image = (
                f'<figure class="finding-illustration-inline">'
                f'<img class="material-image" src="{item["illustration_image_data_uri"]}" alt="{alt}">'
                f"{caption}</figure>"
            )
        blocks.append(
            f"<li class='client-observation'>"
            f"<span class='client-observation-area'>{_h(area)}</span>"
            f"<div class='client-observation-problem'>{prob_html or '<p>—</p>'}</div>"
            f"{steps_html}{image}</li>"
        )
    if not blocks:
        return ""
    return (
        f'<section class="section client-observations-section"><h2>Согласованные наблюдения</h2>'
        f'<ul class="client-observations">{"".join(blocks)}</ul></section>'
    )


def render_client_draft_banner(snapshot: dict[str, Any]) -> str:
    if not snapshot.get("is_draft") or not snapshot.get("draft_reason"):
        return ""
    return (
        f'<div class="client-info-banner"><strong>Черновик для согласования.</strong> '
        f'{_h(snapshot["draft_reason"])}</div>'
    )
