from __future__ import annotations

import base64
import json
import mimetypes
from pathlib import Path
from datetime import datetime
from html import escape
from typing import Any

from app.config import settings
from app.models import AuditProject
from app.services.comparison_service import build_before_after_comparison
from app.services.file_service import file_url_to_path
from app.services.ai_service import metrics_from_project
from app.services.material_helpers import material_type_label, material_for_report, dedupe_materials_for_display
from app.services.metrics_service import NOT_CALCULATED
from app.services.client_report_render import (
    client_report_extra_css,
    render_client_audit_plan,
    render_client_cabinet_health,
    render_client_confirmed_observations,
    render_client_draft_banner,
    render_client_metrics_section,
    render_client_offer,
    render_client_summary,
)
from app.services.client_snapshot_service import build_client_snapshot, report_priority_label


def _h(value: Any) -> str:
    if value is None:
        return ""
    return escape(str(value), quote=True)


def _report_priority_label(value: Any) -> str:
    return report_priority_label(value)


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


def _percent(value: Any) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "—"
    return f"{number:.1f}%"


def _json_loads_safe(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def _inline_vendor_script(filename: str) -> str:
    """Inline local vendor JS so Playwright PDF works without CDN or base URL."""
    path = Path(settings.STATIC_DIR) / "vendor" / filename
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _last_successful_output(project: AuditProject) -> dict[str, Any]:
    from app.services.audit_run_helpers import latest_run

    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run or not run.output_json:
        return {}
    data = _json_loads_safe(run.output_json, {})
    if isinstance(data, dict) and data.get("audit_summary") is not None:
        return data
    return {}


def _public_upload_as_data_uri(file_url: str | None) -> str | None:
    if not file_url:
        return None
    path = file_url_to_path(file_url)
    if not path or not path.exists() or not path.is_file():
        return None
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if not mime.startswith("image/"):
        return None
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _format_metric_value(key: str, metrics: dict[str, Any]) -> str:
    if key in {"cpl", "cpa"}:
        display = metrics.get(f"{key}_display")
        if display == NOT_CALCULATED or metrics.get(key) is None:
            return NOT_CALCULATED
        return _money(metrics.get(key), digits=2)
    if key == "romi":
        display = metrics.get("romi_display")
        if display == NOT_CALCULATED or metrics.get("romi") is None:
            return NOT_CALCULATED
        return _percent(metrics.get("romi"))
    if key in {"budget", "revenue"}:
        return _money(metrics.get(key))
    return _num(metrics.get(key))


def _humanize_material_content(item: dict[str, Any]) -> str:
    material_type = item.get("type")
    content = item.get("content") or ""
    if material_type == "manual_metrics":
        try:
            data = json.loads(content) if isinstance(content, str) else content
        except (TypeError, json.JSONDecodeError):
            return str(content)[:2000]
        if isinstance(data, dict):
            lines = []
            labels = {
                "period": "Период", "budget": "Бюджет", "clicks": "Клики",
                "leads": "Заявки", "sales": "Продажи", "revenue": "Выручка",
            }
            for key, label in labels.items():
                if data.get(key) is not None:
                    val = data[key]
                    if key in {"budget", "revenue"}:
                        lines.append(f"{label}: {_money(val)}")
                    else:
                        lines.append(f"{label}: {val}")
            return "\n".join(lines) if lines else "Метрики не заполнены"
    return str(content)[:2000]


def _prepare_findings(project: AuditProject) -> list[dict[str, Any]]:
    items = []
    for item in project.findings:
        if (item.status or "ai_generated") == "human_rejected":
            continue
        kind = getattr(item, "finding_kind", None) or "hypothesis"
        items.append({
            "area": item.area,
            "finding_kind": kind,
            "title": getattr(item, "title", None) or item.problem,
            "severity": item.severity or "medium",
            "problem": item.problem,
            "evidence": _json_loads_safe(item.evidence_json, []),
            "recommendation": item.recommendation,
            "recommended_action": item.recommendation,
            "expected_impact": item.expected_impact,
            "confidence": item.confidence or 0,
            "needs_review": bool(item.needs_review),
            "review_reason": item.review_reason,
            "evidence_level": getattr(item, "evidence_level", None),
            "based_on": getattr(item, "based_on", None),
            "missing_data": getattr(item, "missing_data", None),
            "status": item.status or "ai_generated",
            "human_comment": item.human_comment,
        })
    return items


def _prepare_materials(project: AuditProject) -> list[dict[str, Any]]:
    materials = []
    for item in project.materials:
        if not material_for_report(item):
            continue
        image_data_uri = _public_upload_as_data_uri(item.file_url) if item.type == "screenshot" else None
        content = item.extracted_text or ""
        if item.type == "manual_metrics" and item.raw_content:
            content = item.raw_content
        materials.append({
            "id": item.id,
            "type": item.type,
            "type_label": material_type_label(item.type),
            "title": item.title,
            "content": content,
            "extracted_text": item.extracted_text,
            "image_data_uri": image_data_uri,
            "needs_review": bool(item.needs_review),
            "review_reason": item.review_reason,
            "file_url": item.file_url,
        })
    return dedupe_materials_for_display(materials)


def _render_metrics(metrics: dict[str, Any]) -> str:
    if not metrics:
        return ""

    def _present(value: Any, rendered: str) -> bool:
        if value is not None and value != "":
            return True
        if rendered in {"", "—", NOT_CALCULATED}:
            return False
        return True

    candidates = [
        ("Период", metrics.get("period"), _h(metrics.get("period") or "")),
        ("Бюджет", metrics.get("budget"), _money(metrics.get("budget"))),
        ("Клики", metrics.get("clicks"), _num(metrics.get("clicks"))),
        ("Заявки", metrics.get("leads"), _num(metrics.get("leads"))),
        ("Продажи", metrics.get("sales"), _num(metrics.get("sales"))),
        ("Выручка", metrics.get("revenue"), _money(metrics.get("revenue"))),
        ("CPL", metrics.get("cpl"), _format_metric_value("cpl", metrics)),
        ("CPA", metrics.get("cpa"), _format_metric_value("cpa", metrics)),
        ("ROMI", metrics.get("romi"), _format_metric_value("romi", metrics)),
        ("Валовая прибыль", metrics.get("gross_profit"), _money(metrics.get("gross_profit"))),
        (
            "Маржинальность",
            metrics.get("margin_percent"),
            _percent(metrics.get("margin_percent")) if metrics.get("margin_percent") is not None else "—",
        ),
        ("ДРР", metrics.get("drr"), _format_metric_value("drr", metrics) if metrics.get("drr") is not None else "—"),
    ]
    rows = [(label, rendered) for label, raw, rendered in candidates if _present(raw, rendered)]
    if not rows:
        return ""
    return render_client_metrics_section(rows, metrics)


def _render_findings_group(findings: list[dict[str, Any]], *, title: str, kinds: set[str] | None = None) -> str:
    filtered = [f for f in findings if (kinds is None or f.get("finding_kind") in kinds)]
    if not filtered:
        return ""
    chunks = []
    for item in filtered:
        if item.get("finding_kind") == "confirmed" and item.get("needs_review"):
            continue
        evidence_html = "".join(
            f'<div class="evidence-item"><p>«{_h(e.get("quote_or_description"))}»</p></div>'
            for e in (item.get("evidence") or [])
        ) or '<p class="muted">Доказательство не указано.</p>'
        review = f'<div class="needs-review"><span class="label">Требует проверки:</span> {_h(item.get("review_reason"))}</div>' if item.get("needs_review") else ""
        confidence = float(item.get("confidence") or 0) * 100
        severity = _h(item.get("severity") or "medium")
        chunks.append(f'''
        <article class="finding {severity}">
            <div class="finding-topline"><span class="area">{_h(item.get('area'))}</span><span class="severity {severity}">{severity}</span></div>
            <h3>{_h(item.get('title') or item.get('problem'))}</h3>
            <div class="evidence">{evidence_html}</div>
            <p><strong>Рекомендация:</strong> {_h(item.get('recommended_action') or item.get('recommendation'))}</p>
            <p><strong>Ожидаемый эффект:</strong> {_h(item.get('expected_impact'))}</p>
            <p class="muted">Уверенность: {confidence:.0f}% · Уровень доказательств: {_h(item.get('evidence_level') or '—')}</p>{review}
        </article>''')
    return f'<section class="section"><h2>{_h(title)}</h2>{"".join(chunks)}</section>'


def _render_findings(findings: list[dict[str, Any]]) -> str:
    confirmed = _render_findings_group(findings, title="Подтверждённые выводы", kinds={"confirmed"})
    hypothesis = _render_findings_group(findings, title="Гипотезы", kinds={"hypothesis"})
    needs_data = _render_findings_group(findings, title="Что требует данных", kinds={"needs_data"})
    risk_patterns = _render_findings_group(findings, title="Паттерны риска (ограничения данных)", kinds={"risk_pattern"})
    body = confirmed + hypothesis + needs_data + risk_patterns
    if body:
        return body
    return '<section class="section"><h2>Выводы</h2><p class="muted">Выводы пока не сформированы. Запустите AI-анализ.</p></section>'


def _chart_fallback(chart: dict[str, Any]) -> str:
    data = chart.get("data") or {}
    if isinstance(data, dict):
        pairs: list[tuple[str, float]] = []
        if "labels" in data and "datasets" in data:
            labels = data.get("labels") or []
            datasets = data.get("datasets") or []
            values = datasets[0].get("data", []) if datasets and isinstance(datasets[0], dict) else []
            for label, value in zip(labels, values):
                try:
                    pairs.append((str(label), float(value)))
                except (TypeError, ValueError):
                    pass
        else:
            for label, value in data.items():
                try:
                    pairs.append((str(label), float(value)))
                except (TypeError, ValueError):
                    pass
        if pairs:
            max_value = max(value for _, value in pairs) or 1
            bars = []
            for label, value in pairs:
                width = max(6, min(100, value / max_value * 100))
                bars.append(f'<div class="fallback-bar-row"><div class="fallback-label">{_h(label)}</div><div class="fallback-track"><div class="fallback-fill" style="width:{width:.1f}%"></div></div><div class="fallback-value">{_num(value)}</div></div>')
            return f'<div class="chart-fallback">{"".join(bars)}</div>'
    return f'<pre class="chart-data">{_h(json.dumps(data, ensure_ascii=False, indent=2))}</pre>'


def _render_charts(charts: list[dict[str, Any]]) -> str:
    if not charts:
        return ""
    blocks = []
    for index, chart in enumerate(charts):
        title = chart.get("title") or "График"
        review = f'<div class="needs-review"><span class="label">Требует проверки:</span> {_h(chart.get("review_reason"))}</div>' if chart.get("needs_review") else ""
        blocks.append(f'''
        <article class="chart-container">
            <h3>{_h(title)}</h3><p>{_h(chart.get('description'))}</p>
            <canvas id="chart_{index}" height="230"></canvas>{_chart_fallback(chart)}
            <div class="chart-insight">{_h(chart.get('insight'))}</div>{review}
        </article>''')
    return f'<section class="section"><h2>Графики</h2>{"".join(blocks)}</section>'


def _render_schemes(schemes: list[dict[str, Any]]) -> str:
    if not schemes:
        return ""
    blocks = [f'<article class="scheme-block"><h3>{_h(item.get("title"))}</h3><p>{_h(item.get("description"))}</p><div class="mermaid">{_h(item.get("code"))}</div></article>' for item in schemes]
    return f'<section class="section"><h2>Схемы</h2>{"".join(blocks)}</section>'



def _render_comparison(project: AuditProject) -> str:
    comparison = build_before_after_comparison(project)
    if not comparison.get("available"):
        return ""
    before = comparison.get("before", {})
    after = comparison.get("after", {})
    deltas = comparison.get("deltas", {})

    def delta_text(key: str) -> str:
        value = (deltas.get(key) or {}).get("percent")
        if value is None:
            return "—"
        sign = "+" if float(value) > 0 else ""
        return f"{sign}{value}%"

    rows = [
        ("Период", _h(before.get("period")), _h(after.get("period")), "—"),
        ("Бюджет", _money(before.get("budget")), _money(after.get("budget")), delta_text("budget")),
        ("Заявки", _num(before.get("leads")), _num(after.get("leads")), delta_text("leads")),
        ("Продажи", _num(before.get("sales")), _num(after.get("sales")), delta_text("sales")),
        ("CPL", _money(before.get("cpl"), digits=2), _money(after.get("cpl"), digits=2), delta_text("cpl")),
        ("CPA", _money(before.get("cpa"), digits=2), _money(after.get("cpa"), digits=2), delta_text("cpa")),
        ("ROMI", _percent(before.get("romi")), _percent(after.get("romi")), delta_text("romi")),
    ]
    body = "".join(f"<tr><td>{_h(label)}</td><td>{before_v}</td><td>{after_v}</td><td>{delta}</td></tr>" for label, before_v, after_v, delta in rows)
    message = _h(comparison.get("message"))
    return f'<section class="section"><h2>Сравнение до/после</h2><p>{message}</p><table class="metrics-table"><thead><tr><td>Метрика</td><td>До</td><td>После</td><td>Изменение</td></tr></thead><tbody>{body}</tbody></table></section>'

def _render_offer(offer: dict[str, Any]) -> str:
    return render_client_offer(offer)


def _render_audit_plan(snapshot: dict[str, Any]) -> str:
    return render_client_audit_plan(snapshot)


def _render_data_quality(materials: list[dict[str, Any]], metrics: dict[str, Any], last_run: dict[str, Any]) -> str:
    groups: dict[str, int] = {}
    for item in materials:
        if item.get("needs_review"):
            label = item.get("type_label") or item.get("type") or "Материал"
            groups[label] = groups.get(label, 0) + 1
    issues: list[str] = []
    for label, count in sorted(groups.items()):
        issues.append(f"{label}: {count} шт. требуют проверки")
    if metrics.get("needs_review") and metrics.get("review_reason"):
        issues.append(f"Метрики: {_h(metrics.get('review_reason'))}")
    finding_reasons = []
    for reason in last_run.get("global_review_reasons") or []:
        if reason and reason not in finding_reasons:
            finding_reasons.append(_h(reason))
    if finding_reasons:
        issues.append("Выводы AI: " + "; ".join(finding_reasons[:3]))
    if not issues:
        return '<section class="section"><h2>Качество данных</h2><p class="muted">Критичных проблем с качеством данных не обнаружено.</p></section>'
    items = "".join(f"<li>{issue}</li>" for issue in dict.fromkeys(issues))
    return f'<section class="section"><h2>Качество данных</h2><ul>{items}</ul></section>'


def _render_uploaded_data(materials: list[dict[str, Any]]) -> str:
    if not materials:
        return '<section class="section"><h2>Загруженные данные</h2><p class="muted">Материалы не добавлены.</p></section>'
    blocks = []
    for item in materials:
        text = _humanize_material_content(item)
        if item.get("transcript"):
            text = (text + "\n\nРасшифровка:\n" + str(item.get("transcript")))[:2000]
        elif item.get("ocr_text"):
            text = (text + "\n\nОписание:\n" + str(item.get("ocr_text")))[:2000]
        else:
            text = text[:2000]
        image = f'<img class="material-image" src="{item["image_data_uri"]}" alt="{_h(item.get("title"))}">' if item.get("image_data_uri") else ""
        review = f'<div class="source">Требует проверки: {_h(item.get("review_reason"))}</div>' if item.get("needs_review") else ""
        blocks.append(
            f'<article class="material-block"><p><strong>{_h(item.get("title") or item.get("type_label"))}</strong> '
            f'<span class="muted">({_h(item.get("type_label"))})</span></p>{image}<pre>{_h(text)}</pre>{review}</article>'
        )
    return f'<section class="section"><h2>Загруженные данные</h2>{"".join(blocks)}</section>'


def _render_review_queue(findings: list[dict[str, Any]], materials: list[dict[str, Any]]) -> str:
    items = []
    for m in materials:
        if m.get("needs_review"):
            items.append(f'<li><strong>{_h(m.get("type_label"))}:</strong> {_h(m.get("title"))} — {_h(m.get("review_reason"))}</li>')
    for f in findings:
        if f.get("needs_review"):
            items.append(f'<li><strong>Вывод:</strong> {_h(f.get("title") or f.get("problem"))} — {_h(f.get("review_reason"))}</li>')
    if not items:
        return '<section class="section"><h2>Что требует проверки</h2><p class="muted">Нет элементов, требующих проверки.</p></section>'
    return f'<section class="section"><h2>Что требует проверки</h2><ul>{"".join(items)}</ul></section>'


def _render_snapshot_draft_banner(snapshot: dict[str, Any]) -> str:
    return render_client_draft_banner(snapshot)


def _render_snapshot_goal(snapshot: dict[str, Any]) -> str:
    return f'<section class="section"><h2>Цель аудита</h2><p>{_h(snapshot.get("goal"))}</p></section>'


def _render_snapshot_summary(snapshot: dict[str, Any]) -> str:
    return render_client_summary(snapshot)


def _render_snapshot_preliminary_limits(snapshot: dict[str, Any]) -> str:
    if not snapshot.get("is_preliminary"):
        return ""
    items = [str(x) for x in (snapshot.get("cannot_evaluate") or [])]
    core = {"CPL", "CPA", "ROMI"}
    can_calc = [x for x in items if x.upper() in core]
    quality_limits = [x for x in items if x.upper() not in core]
    return (
        '<section class="section"><h2>Ограничения по качеству оценки</h2>'
        + (f'<p><strong>Можно посчитать по метрикам:</strong> {_h(", ".join(can_calc))}</p>' if can_calc else "")
        + '<p><strong>Нельзя подтвердить корректность показателей без:</strong></p>'
        + f'<ul>{"".join(f"<li>{_h(x)}</li>" for x in quality_limits) or "<li>дополнительных источников качества данных</li>"}</ul></section>'
    )


def _render_snapshot_limitations(snapshot: dict[str, Any]) -> str:
    if snapshot.get("is_preliminary"):
        return ""
    text = str(snapshot.get("limitations_text") or "").strip()
    if not text:
        return ""
    return f'<section class="section"><h2>Ограничения анализа</h2><p class="muted">{_h(text)}</p></section>'


def _render_report_appendix(snapshot: dict[str, Any]) -> str:
    items = snapshot.get("report_appendix") or []
    if not items:
        return ""
    blocks = []
    for item in items:
        review = ""
        if item.get("needs_review"):
            reason = item.get("review_reason") or "требует проверки"
            review = f'<p class="muted appendix-review-note">⚠ Иллюстрация {_h(item.get("figure_label") or "")}: {_h(reason)}</p>'
        source = ""
        if item.get("source_line"):
            source = f'<p class="muted appendix-source">{_h(item.get("source_line"))}</p>'
        blocks.append(
            f'<article class="appendix-figure">'
            f'<img class="material-image" src="{item["image_data_uri"]}" alt="{_h(item.get("material_title"))}">'
            f'<p class="figure-caption"><strong>{_h(item.get("figure_label"))}.</strong> {_h(item.get("caption"))}</p>'
            f'{source}{review}</article>'
        )
    return (
        '<section class="section report-appendix-section">'
        '<h2>Приложение: иллюстрации</h2>'
        f'{"".join(blocks)}</section>'
    )


def _render_snapshot_direct_health(snapshot: dict[str, Any]) -> str:
    return render_client_cabinet_health(snapshot.get("direct_health") or {})


def _render_snapshot_confirmed(snapshot: dict[str, Any]) -> str:
    return render_client_confirmed_observations(snapshot.get("confirmed_observations") or [])


def _render_zone_charts(charts: list[dict[str, Any]]) -> str:
    if not charts:
        return ""
    blocks = []
    for index, chart in enumerate(charts):
        title = chart.get("title") or "Приоритет работ"
        review = ""
        if chart.get("needs_review") and chart.get("review_reason"):
            review = f'<p class="muted">{_h(chart.get("review_reason"))}</p>'
        blocks.append(f'''
        <article class="chart-container">
            <h3>{_h(title)}</h3>
            <p>{_h(chart.get('description'))}</p>
            <canvas id="chart_{index}" height="230"></canvas>{_chart_fallback(chart)}
            <div class="chart-insight">{_h(chart.get('insight'))}</div>{review}
        </article>''')
    return f'<section class="section"><h2>Приоритет работ</h2>{"".join(blocks)}</section>'


def _render_recommendations(findings: list[dict[str, Any]], offer: dict[str, Any], *, preliminary: bool = False, data_collection_text: str = "") -> str:
    if preliminary:
        text = data_collection_text or "Сначала добавьте период, расход, клики, заявки, продажи, поисковые запросы, цели Метрики, CRM-статусы и комментарии по качеству лидов."
        return f'<section class="section"><h2>Рекомендации по сбору данных</h2><p>{_h(text)}</p></section>'
    recs = [f.get("recommended_action") or f.get("recommendation") for f in findings if f.get("recommendation")]
    recs = [r for r in dict.fromkeys(recs) if r]
    chunks = []
    if recs:
        chunks.append("<ul>" + "".join(f"<li>{_h(r)}</li>" for r in recs) + "</ul>")
    if offer and offer.get("next_step"):
        chunks.append(f'<p><strong>Следующий шаг:</strong> {_h(offer.get("next_step"))}</p>')
    if not chunks:
        return ""
    return f'<section class="section"><h2>Рекомендации</h2>{"".join(chunks)}</section>'


def generate_html_report(project: AuditProject) -> str:
    snapshot = build_client_snapshot(project)
    cover = snapshot.get("cover") or {}
    metrics = snapshot.get("metrics") or {}
    offer = snapshot.get("commercial_offer") or {}
    zone_charts = snapshot.get("zone_charts") or []
    draft_banner = _render_snapshot_draft_banner(snapshot)
    charts_json = json.dumps(zone_charts, ensure_ascii=False)
    chart_js = _inline_vendor_script("chart.umd.min.js")
    mermaid_js = _inline_vendor_script("mermaid.min.js")
    extra_css = client_report_extra_css()

    body_sections = [
        _render_snapshot_goal(snapshot),
        _render_snapshot_summary(snapshot),
        _render_snapshot_preliminary_limits(snapshot),
        _render_metrics(metrics),
        _render_snapshot_direct_health(snapshot),
        _render_zone_charts(zone_charts),
        _render_snapshot_confirmed(snapshot),
        _render_offer(offer),
        _render_audit_plan(snapshot),
        _render_snapshot_limitations(snapshot),
        _render_report_appendix(snapshot),
    ]

    return f'''<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Аудит: {_h(cover.get("client_name"))}</title>
<script>{chart_js}</script>
<style>
@page {{ size: A4; margin: 14mm 12mm 16mm 12mm; }} * {{ box-sizing: border-box; }} body {{ margin: 0; font-family: Arial, 'Segoe UI', sans-serif; color: #172033; line-height: 1.55; background: #eef2f6; }} .container {{ max-width: 1060px; margin: 0 auto; padding: 24px; }}
.cover {{ min-height: 260mm; display: flex; flex-direction: column; justify-content: center; color: white; padding: 54px; border-radius: 18px; background: linear-gradient(135deg, #1b3558 0%, #3062a8 100%); page-break-after: always; }} .brand {{ font-size: 14px; letter-spacing: .12em; text-transform: uppercase; opacity: .85; margin-bottom: 36px; }} .cover h1 {{ font-size: 44px; line-height: 1.12; margin: 0 0 22px 0; }} .cover .meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px 28px; font-size: 15px; margin-top: 28px; }} .cover-card {{ background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.22); border-radius: 14px; padding: 18px; }}
.section {{ background: white; padding: 26px; margin: 0 0 22px 0; border-radius: 14px; box-shadow: 0 2px 10px rgba(16,24,40,.06); page-break-inside: avoid; break-inside: avoid; }} .draft-banner {{ margin-bottom: 18px; border-radius: 12px; padding: 14px 16px; }} .section h2 {{ color: #1b3558; font-size: 24px; margin: 0 0 18px 0; padding-bottom: 10px; border-bottom: 2px solid #3062a8; }} .section h3 {{ color: #244c80; font-size: 18px; margin: 12px 0 8px; }} .muted {{ color: #667085; }} .priority {{ display: inline-block; padding: 3px 10px; border-radius: 999px; background: #e8f0ff; color: #244c80; font-weight: 700; }}
.metrics-table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }} .metrics-table td {{ padding: 11px 12px; border-bottom: 1px solid #e6eaf0; }} .metrics-table td:first-child {{ font-weight: 700; color: #344054; width: 38%; }}
.finding {{ border-left: 5px solid #f5b942; padding: 16px 18px; margin: 0 0 16px; background: #fbfcff; border-radius: 12px; page-break-inside: avoid; break-inside: avoid; }} .finding.high {{ border-left-color: #d92d20; }} .finding.medium {{ border-left-color: #f79009; }} .finding.low {{ border-left-color: #12b76a; }} .finding-topline {{ display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }} .area, .severity {{ display: inline-block; font-size: 12px; border-radius: 999px; padding: 4px 10px; font-weight: 700; }} .area {{ background: #eef2f6; color: #344054; }} .severity.high {{ background: #fee4e2; color: #912018; }} .severity.medium {{ background: #fef0c7; color: #93370d; }} .severity.low {{ background: #dcfae6; color: #05603a; }}
.evidence, .material-block, .chart-fallback {{ background: #f8fafc; border: 1px solid #e6eaf0; border-radius: 12px; padding: 14px; margin: 12px 0; }} .evidence-item + .evidence-item {{ margin-top: 10px; }} .source {{ font-size: 12px; color: #667085; }} .needs-review {{ background: #fff8e5; border: 1px solid #f5c451; border-radius: 12px; padding: 14px; margin-top: 12px; }} .needs-review .label {{ font-weight: 700; color: #8a5a00; }}
.metrics-footnote, .metrics-data-note {{ margin-top: 14px; padding: 12px 14px; border-radius: 10px; font-size: 14px; line-height: 1.5; }}
.metrics-footnote {{ background: #f8fafc; border: 1px solid #e6eaf0; color: #475467; }}
.metrics-data-note {{ background: #f4f8ff; border: 1px solid #d0d9ea; color: #344054; }}
.cabinet-health-hero {{ display: flex; gap: 20px; align-items: center; margin-bottom: 18px; padding: 18px 20px; background: linear-gradient(135deg, #f4f8ff 0%, #edf4ff 100%); border-radius: 14px; border: 1px solid #d0d9ea; }}
.cabinet-health-score {{ flex-shrink: 0; text-align: center; min-width: 88px; }}
.cabinet-health-score-value {{ display: block; font-size: 42px; font-weight: 800; color: #1b3558; line-height: 1; }}
.cabinet-health-score-max {{ font-size: 14px; color: #667085; font-weight: 600; }}
.cabinet-health-level {{ margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #1b3558; }}
.cabinet-health-tagline {{ margin: 0 0 8px; color: #475467; font-size: 15px; }}
.cabinet-health-period {{ margin: 0; font-size: 14px; color: #667085; }}
.cabinet-health-lead {{ font-size: 16px; line-height: 1.6; color: #344054; margin: 0 0 16px; }}
.cabinet-health-list, .cabinet-health-plan {{ margin: 0 0 14px; padding-left: 20px; }}
.cabinet-health-list li, .cabinet-health-plan li {{ margin: 8px 0; line-height: 1.55; }}
.cabinet-health-horizon {{ display: inline-block; min-width: 72px; font-weight: 700; color: #3062a8; }}
.cabinet-health-source {{ margin-top: 12px; font-size: 13px; }}
{extra_css}
.chart-container, .scheme-block {{ margin: 0 0 22px; page-break-inside: avoid; break-inside: avoid; }} .chart-container canvas {{ display: block; width: 100%; max-height: 320px; margin: 10px 0 12px; }} .chart-insight {{ color: #475467; font-size: 14px; margin-top: 10px; }} .fallback-bar-row {{ display: grid; grid-template-columns: 120px 1fr 80px; align-items: center; gap: 10px; margin: 8px 0; }} .fallback-label {{ font-weight: 700; font-size: 13px; }} .fallback-track {{ height: 16px; background: #e6eaf0; border-radius: 999px; overflow: hidden; }} .fallback-fill {{ height: 100%; background: #3062a8; border-radius: 999px; }} .fallback-value {{ text-align: right; font-size: 13px; color: #475467; }} .chart-data, .material-block pre {{ white-space: pre-wrap; word-break: break-word; margin: 8px 0 0; font-family: Consolas, monospace; font-size: 12px; color: #344054; }} .mermaid {{ background: #f8fafc; border: 1px solid #e6eaf0; padding: 18px; border-radius: 12px; text-align: center; }} .mermaid-local-diagram {{ display:grid; gap:8px; text-align:left; }} .mermaid-local-title {{ font-weight:800; color:#1e3a5f; }} .mermaid-local-row {{ padding:8px 10px; border:1px solid #d0d5dd; border-radius:10px; background:#fff; font-family:Consolas, monospace; font-size:12px; color:#344054; }} .commercial-offer {{ border: 2px solid #3062a8; background: linear-gradient(135deg, #f4f8ff 0%, #edf4ff 100%); }} .services-list {{ margin: 10px 0 16px; padding-left: 20px; }} .services-list li {{ margin: 6px 0; }} .material-image {{ display: block; max-width: 100%; max-height: 420px; border-radius: 10px; border: 1px solid #e6eaf0; margin: 10px 0; }} .finding-illustration-inline {{ margin: 10px 0 0; page-break-inside: avoid; break-inside: avoid; }} .finding-illustration-inline .material-image {{ margin: 0; max-height: 320px; }} .report-appendix-section {{ page-break-before: always; break-before: page; }} .appendix-figure {{ margin: 0 0 24px; page-break-inside: avoid; break-inside: avoid; }} .figure-caption {{ margin: 12px 0 4px; color: #344054; line-height: 1.5; }} .appendix-source, .appendix-review-note {{ font-size: 13px; margin: 4px 0 0; }} .footer {{ text-align: center; color: #667085; font-size: 12px; padding: 24px 0 10px; }}
@media print {{ body {{ background: white; }} .container {{ max-width: none; padding: 0; }} .section {{ box-shadow: none; border: 1px solid #e6eaf0; }} h2, h3 {{ page-break-after: avoid; break-after: avoid; }} .finding, .chart-container, .material-block, .commercial-offer {{ page-break-inside: avoid; break-inside: avoid; }} }}
</style></head><body><main class="container">
<section class="cover"><div class="brand">PPC Audit Workspace · Jam Agency</div><h1>Аудит рекламного проекта</h1><p>PPC-аудит и коммерческое предложение на основании согласованных данных клиента.</p>{draft_banner}<div class="meta"><div class="cover-card"><strong>Клиент</strong><br>{_h(cover.get("client_name"))}</div><div class="cover-card"><strong>Ниша</strong><br>{_h(cover.get("niche"))}</div><div class="cover-card"><strong>Сайт</strong><br>{_h(cover.get("website"))}</div><div class="cover-card"><strong>Дата аудита</strong><br>{_h(snapshot.get("audit_date"))}</div></div></section>
{"".join(body_sections)}<div class="footer"><p>Отчёт сгенерирован {_h(snapshot.get("generated_at"))} · PPC Audit Workspace MVP</p></div></main>
<script>window.__reportReady=false;window.__reportCharts={charts_json};function renderCharts(){{if(!window.Chart)return;window.__reportCharts.forEach(function(c,i){{var canvas=document.getElementById('chart_'+i);if(!canvas)return;var ctx=canvas.getContext('2d');if(c.type==='funnel'||c.type==='score'){{var labels=Object.keys(c.data||{{}});var values=Object.values(c.data||{{}});new Chart(ctx,{{type:'bar',data:{{labels:labels,datasets:[{{label:c.type==='funnel'?'Количество':'Балл',data:values}}]}},options:{{indexAxis:'y',responsive:true,animation:false,plugins:{{legend:{{display:false}}}}}}}});}}else if(c.type==='pie'){{var pieLabels=Object.keys(c.data||{{}});var pieValues=Object.values(c.data||{{}});new Chart(ctx,{{type:'pie',data:{{labels:pieLabels,datasets:[{{data:pieValues}}]}},options:{{responsive:true,animation:false}}}});}}else{{new Chart(ctx,{{type:c.type||'bar',data:c.data||{{}},options:{{responsive:true,animation:false,plugins:{{legend:{{position:'top'}}}}}}}});}}}});}}document.addEventListener('DOMContentLoaded',function(){{Promise.resolve().then(function(){{renderCharts();if(window.mermaid){{mermaid.initialize({{startOnLoad:true,securityLevel:'loose'}});}}}}).catch(function(error){{console.warn('Report render warning:',error);}}).finally(function(){{setTimeout(function(){{window.__reportReady=true;}},800);}});}});</script></body></html>'''
