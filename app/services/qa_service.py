"""Q&A over audit context — answers grounded in materials and findings."""
from __future__ import annotations

import json
import logging
import re
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings
from app.models import AuditChatMessage, AuditFinding, AuditMaterial, AuditProject
from app.services.ai_service import metrics_from_project, prepare_materials_json
from app.services.audit_gate_service import build_analysis_readiness
from app.services.material_helpers import (
    document_slice_from_material,
    is_semantics_export_material,
    material_for_ai,
    material_for_qa,
)
from app.services.model_pricing_service import CostDTO, usage_to_api_dict
from app.services.model_router import ModelRouter, ModelRouterError
from app.services.privacy_service import prepare_context_for_ai
from app.services.review_service import build_review_queue, count_needs_review
from app.services.chat_telemetry_service import chat_telemetry
from app.services.chat_telemetry_service import save_chat_telemetry_event
from app.services.knowledge_base_service import search_knowledge_examples
from app.services.note_metrics_service import effective_metrics_raw
from app.services.client_snapshot_service import build_client_snapshot
from app.services.comparison_service import build_before_after_comparison
from app.services.niche_patterns_service import build_niche_patterns_prompt_block, fetch_niche_patterns
from app.services.direct_slice_service import (
    build_direct_analytics,
    build_direct_conditions_for_ai,
    build_direct_statistics_for_ai,
)
from app.services.metrics_periods_service import comparison_period_rows, resolve_active_metrics_material
from app.services.direct_user_copy import HEALTH_SCORE_TITLE, health_fact_line, health_missing

logger = logging.getLogger(__name__)
QA_CONTEXT_VERSION = "v2.7"
_SEMANTICS_QUESTION_RE = re.compile(r"минус|фраз|семант|ставк|ключев|объявлен", re.IGNORECASE)

QA_CLIENT_MODE_SUFFIX = """

Режим «как для клиента»: отвечай так, как если бы маркетолог объяснял это ЛПР на созвоне.
Не упоминай очередь проверки, внутренние заметки, отклонённые выводы и служебные поля workspace.
"""

QA_SYSTEM_PROMPT = """Ты — ассистент PPC-маркетолога в системе PPC Audit Workspace.

Правила:
1. Отвечай ТОЛЬКО на основе переданного контекста аудита (материалы, метрики, выводы).
2. Если данных нет — прямо скажи «В материалах аудита этого нет» и перечисли, что нужно загрузить.
3. Не выдумывай цифры CPA, CPL, ROMI, бюджет, заявки.
4. Ссылайся на источники: [mat_N] для материалов, [finding_N] для выводов.
5. Материалы с пометкой «требует проверки» используй осторожно — укажи, что данные не подтверждены.
6. Отвечай по-русски, структурированно; объём и глубину задай инструкция «Стиль ответа» ниже.
7. Если вопрос не про рекламу/аудит — вежливо верни к теме аудита.
8. При общем выводе по аудиту — синтезируй приоритеты, не копируй подряд одинаковые формулировки по каждому выводу.
9. Блок «похожие проверенные выводы из базы знаний» — только паттерны и формулировки из прошлых аудитов; чужие цифры не переноси.
10. Если задан якорь (конкретный вывод или метрики) — отвечай по нему, не уходи в общий обзор всего аудита.
11. metrics — активный период KPI; metrics_periods — все загруженные периоды; direct_statistics — цифры из Excel Директа (помесячно, кампании, итоги). Файл Excel не дублируется в verified_materials.
12. Вопрос про метрики/динамику — используй metrics_periods и direct_statistics.monthly; не пиши «нет в материалах», если эти блоки заполнены.
13. Вопрос про стратегию/рекомендации — используй findings.recommendation, commercial_offer, direct_health.action_plan; не требуй повторной загрузки Excel только ради стратегии.
14. semantics_exports — Excel с фразами/минус-словами; поле excerpt — текст из файла. Для минус-слов и фраз цитируй excerpt, не пиши «нет в материалах», если excerpt непустой.
15. Снижение ставок по конкретным запросам — нужны direct_statistics.conditions_top_by_spend или отчёт «Поисковые запросы» на «Директ»; один Excel семантики не заменяет отчёт по запросам с расходом.

Формат ответа — обычный текст (не JSON)."""

QA_FINDING_ANCHOR_SUFFIX = """

Вопрос привязан к конкретному выводу аудита.
- В основном ответе можно использовать [mat_N] и внутренние пояснения.
- В конце обязательно отдельный блок:

Текст для PDF:
Что не так: (один факт с цифрами из материалов, без «Вывод #N» и без [finding_N])
Что сделать: (1–3 нумерованных шага для клиента)
Ожидаемый эффект: (одна короткая фраза)

В блоке «Текст для PDF» не используй номера выводов, [finding_N], [mat_N] и фразы «вывод подтверждён».
Не дублируй в «Текст для PDF» те же шаги, что в «Рекомендациях» — только три поля (что не так / что сделать / эффект).
В «Рекомендациях» — 1–3 коротких шага; «Основания» — отдельный блок с цифрами и [mat_N]."""

CHAT_RESPONSE_STYLES: dict[str, dict[str, Any]] = {
    "brief": {
        "label": "Кратко",
        "temperature": 0.25,
        "max_tokens": 900,
        "suffix": """
Стиль ответа «Кратко»: 3–5 буллетов или до 6 предложений. Без вводных общих фраз и повторов.
Если уместен список действий — только топ-приоритеты с цифрами из контекста.""",
    },
    "balanced": {
        "label": "Стандарт",
        "temperature": 0.42,
        "max_tokens": 1600,
        "suffix": """
Стиль ответа «Стандарт»: краткий вывод в начале (2–3 предложения), затем структурированный список или 2–3 блока.
Конкретные цифры из материалов; разные рекомендации — разными формулировками, без шаблонного копипаста.""",
    },
    "deep": {
        "label": "Развёрнуто",
        "temperature": 0.58,
        "max_tokens": 2600,
        "suffix": """
Стиль ответа «Развёрнуто»: развёрнутый разбор для маркетолога.
1) Итог в 2–3 предложениях. 2) Подзаголовки: «Что видно в данных», «Что сделать», «Риски и проверки».
3) Приоритет: срочно / можно позже. 4) Цифры и [mat_N] / [finding_N] по делу.
Избегай сухих однотипных абзацев; объясни логику, а не только перечисли выводы.""",
    },
}


def _clamp_chat_temperature(value: float | None, default: float) -> float:
    try:
        temp = float(default if value is None else value)
    except (TypeError, ValueError):
        temp = float(default)
    return max(settings.AI_TEMPERATURE_MIN, min(settings.AI_TEMPERATURE_MAX, temp))


def _resolve_chat_generation(
    response_style: str | None,
    temperature_override: float | None = None,
) -> tuple[str, float, int, str]:
    key = (response_style or "balanced").strip().lower()
    if key not in CHAT_RESPONSE_STYLES:
        key = "balanced"
    preset = CHAT_RESPONSE_STYLES[key]
    temp = _clamp_chat_temperature(temperature_override, preset["temperature"])
    return key, temp, int(preset["max_tokens"]), str(preset["suffix"])


def _last_run_summary(project: AuditProject) -> dict[str, Any]:
    from app.services.audit_run_helpers import latest_run

    run = latest_run(project, action="ai_analysis", status="success", require_output=True)
    if not run or not run.output_json:
        return {}
    try:
        data = json.loads(run.output_json)
        if isinstance(data, dict):
            offer = data.get("commercial_offer") or {}
            return {
                "audit_summary": data.get("audit_summary"),
                "commercial_offer_title": offer.get("proposal_title"),
                "commercial_offer": {
                    "proposal_title": offer.get("proposal_title"),
                    "work_stages": (offer.get("work_stages") or [])[:8],
                    "expected_effect": offer.get("expected_effect"),
                    "timeline": offer.get("timeline"),
                    "next_step": offer.get("next_step"),
                },
            }
    except json.JSONDecodeError:
        pass
    return {}


def _semantics_excerpt_for_chat(text: str, *, max_chars: int = 20_000) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""
    if len(raw) <= max_chars:
        return raw
    lines = raw.splitlines()
    picked: list[str] = []
    total = 0
    for line in lines:
        low = line.lower()
        if "минус" in low or low.startswith("## текст"):
            picked.append(line)
            total += len(line) + 1
    if picked:
        head = "\n".join(picked[:400])
        if len(head) <= max_chars:
            return head + "\n… (файл обрезан для чата)"
    return raw[:max_chars] + "… (файл обрезан для чата)"


def _metrics_periods_for_chat(project: AuditProject) -> list[dict[str, Any]]:
    rows = comparison_period_rows(project)
    compact_keys = (
        "period", "budget", "clicks", "leads", "sales", "revenue",
        "cpl", "cpa", "romi", "drr", "needs_review",
    )
    return [{k: row.get(k) for k in compact_keys if k in row} for row in rows]


def _direct_statistics_for_chat(project: AuditProject) -> dict[str, Any] | None:
    da = build_direct_analytics(project)
    if not da:
        return None
    stats = build_direct_statistics_for_ai(da, {"send_direct_campaign_detail": True})
    conditions = build_direct_conditions_for_ai(project)
    if conditions:
        stats["conditions_top_by_spend"] = (conditions.get("top_by_spend") or [])[:8]
    monthly = stats.get("monthly") or []
    if len(monthly) > 12:
        stats["monthly"] = monthly[-12:]
    campaigns = stats.get("campaigns") or []
    if len(campaigns) > 12:
        stats["campaigns"] = sorted(
            campaigns,
            key=lambda c: -(c.get("leads") or 0),
        )[:12]
    return stats


def _findings_for_context(project: AuditProject) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for f in project.findings:
        status = f.status or "ai_generated"
        if status == "human_rejected":
            continue
        items.append({
            "id": f.id,
            "area": f.area,
            "finding_kind": getattr(f, "finding_kind", None) or "hypothesis",
            "title": getattr(f, "title", None) or f.problem,
            "problem": f.problem,
            "recommendation": f.recommendation,
            "confidence": f.confidence,
            "needs_review": bool(f.needs_review),
            "review_reason": f.review_reason,
            "status": status,
        })
    return items


def _build_client_audience_context(project: AuditProject) -> dict[str, Any]:
    """Client-safe context aligned with build_client_snapshot (M2.15)."""
    snap = build_client_snapshot(project)
    verified_materials = []
    for mat in project.materials:
        if mat.type != "metrics":
            continue
        if mat.excluded_from_report or mat.excluded_from_analysis:
            continue
        verified_materials.append({
            "id": f"mat_{mat.id}",
            "type": mat.type,
            "title": mat.title,
            "needs_review": bool(mat.needs_review),
        })
    return {
        "audience_mode": "client",
        "client": {
            "name": snap.get("cover", {}).get("client_name"),
            "niche": snap.get("cover", {}).get("niche"),
            "website": snap.get("cover", {}).get("website"),
            "goal": snap.get("goal"),
        },
        "metrics": snap.get("metrics") or {},
        "audit_summary": snap.get("audit_summary") or {},
        "confirmed_observations": snap.get("confirmed_observations") or [],
        "limitations_text": snap.get("limitations_text") or "",
        "is_draft": snap.get("is_draft"),
        "draft_reason": snap.get("draft_reason"),
        "verified_materials": verified_materials,
        "findings": [],
        "unverified_materials_summary": [],
        "review_queue_count": 0,
        "readiness": {"export_ready": snap.get("is_ready_for_client")},
        "last_analysis": {
            "audit_summary": snap.get("audit_summary"),
        },
    }


def _health_for_chat(project: AuditProject) -> dict[str, Any] | None:
    direct_analytics = build_direct_analytics(project)
    health = (direct_analytics or {}).get("health") or {}
    if not health:
        return None
    return {
        "health_score": health.get("health_score"),
        "grade": health.get("grade"),
        "summary_explain": health.get("summary_explain"),
        "top_issues": (health.get("top_issues") or [])[:3],
        "action_plan": health.get("action_plan"),
    }


def build_qa_context(
    project: AuditProject,
    *,
    include_unverified: bool = True,
    audience_mode: str = "internal",
    question: str | None = None,
) -> dict[str, Any]:
    """Build structured context for Q&A."""
    if (audience_mode or "internal").strip().lower() == "client":
        return _build_client_audience_context(project)
    verified_materials = []
    unverified_summary = []
    prepared_materials = prepare_materials_json(project)
    prepared_by_id = {m.get("id"): m for m in prepared_materials if m.get("id")}

    for mat in project.materials:
        item = {
            "id": f"mat_{mat.id}",
            "type": mat.type,
            "title": mat.title,
            "needs_review": bool(mat.needs_review),
            "review_reason": mat.review_reason,
        }
        if material_for_ai(mat):
            payload = prepared_by_id.get(f"mat_{mat.id}")
            if payload:
                item["content"] = payload.get("content")
                if payload.get("content_kind"):
                    item["content_kind"] = payload.get("content_kind")
            verified_materials.append(item)
        elif include_unverified and material_for_qa(mat) and mat.type != "audio":
            text = (mat.extracted_text or "")[:400]
            unverified_summary.append({
                "id": f"mat_{mat.id}",
                "type": mat.type,
                "title": mat.title,
                "needs_review": bool(mat.needs_review),
                "review_reason": mat.review_reason,
                "preview": text + ("…" if len(mat.extracted_text or "") > 400 else ""),
            })

    readiness = build_analysis_readiness(project)
    active_mat = resolve_active_metrics_material(project)
    include_semantics_text = bool(question and _SEMANTICS_QUESTION_RE.search(question))
    semantics_exports = []
    for mat in (project.materials or []):
        if not is_semantics_export_material(mat) or mat.excluded_from_analysis:
            continue
        excerpt = _semantics_excerpt_for_chat(mat.extracted_text or "") if include_semantics_text else ""
        semantics_exports.append({
            "id": f"mat_{mat.id}",
            "title": mat.title,
            "sheets": (document_slice_from_material(mat) or {}).get("sheets"),
            "in_ai": material_for_ai(mat),
            "excerpt": excerpt,
            "excerpt_chars": len(excerpt),
        })
    return {
        "client": {
            "name": project.client.name,
            "niche": project.client.niche,
            "website": project.client.website,
            "goal": project.goal,
            "comment": project.client.comment,
        },
        "metrics": metrics_from_project(project),
        "metrics_periods": _metrics_periods_for_chat(project),
        "metrics_active_period": (active_mat and _parse_period_label(active_mat)) or None,
        "verified_materials": verified_materials,
        "unverified_materials_summary": unverified_summary,
        "findings": _findings_for_context(project),
        "review_queue_count": count_needs_review(project),
        "readiness": readiness,
        "last_analysis": _last_run_summary(project),
        "direct_health": _health_for_chat(project),
        "direct_statistics": _direct_statistics_for_chat(project),
        "semantics_exports": semantics_exports,
    }


def _parse_period_label(material: AuditMaterial) -> str | None:
    if not material.raw_content:
        return material.title
    try:
        data = json.loads(material.raw_content)
        return str(data.get("period") or material.title or "")
    except json.JSONDecodeError:
        return material.title


def _apply_privacy(context: dict[str, Any]) -> dict[str, Any]:
    privacy = {
        "hide_company_name": True,
        "hide_revenue": True,
        "hide_contacts": True,
        "hide_file_urls": True,
        "company_name": context.get("client", {}).get("name"),
        "niche": context.get("client", {}).get("niche"),
    }
    wrapped = {"materials": context.get("verified_materials", []), **context}
    return prepare_context_for_ai(wrapped, privacy)


def _apply_context_budget(context: dict[str, Any], question: str) -> dict[str, Any]:
    """Trim context for model call while preserving the most relevant chunks."""
    q_words = _tokenize(question)
    out = dict(context)
    verified = list(context.get("verified_materials") or [])
    findings = list(context.get("findings") or [])
    unverified = list(context.get("unverified_materials_summary") or [])

    def score_material(row: dict[str, Any]) -> int:
        text = f"{row.get('title', '')} {row.get('type', '')} {str(row.get('content', ''))[:300]}"
        return len(q_words & _tokenize(text))

    def score_finding(row: dict[str, Any]) -> int:
        text = f"{row.get('title', '')} {row.get('problem', '')} {row.get('area', '')}"
        return len(q_words & _tokenize(text))

    semantics_q = bool(_SEMANTICS_QUESTION_RE.search(question))
    verified = sorted(verified, key=score_material, reverse=True)[:10]
    findings = sorted(findings, key=score_finding, reverse=True)[:8]
    unverified = sorted(unverified, key=score_material, reverse=True)[:4]

    for row in verified:
        content = str(row.get("content") or "")
        is_sem = row.get("content_kind") == "direct_semantics_export"
        limit = 12_000 if (semantics_q and is_sem) else 800
        if len(content) > limit:
            row["content"] = content[:limit] + "…"
    for row in unverified:
        preview = str(row.get("preview") or "")
        if len(preview) > 300:
            row["preview"] = preview[:300] + "…"

    out["verified_materials"] = verified
    out["findings"] = findings
    out["unverified_materials_summary"] = unverified
    for protected in ("metrics_periods", "direct_statistics", "metrics", "metrics_active_period", "direct_health", "semantics_exports"):
        if protected in context:
            out[protected] = context[protected]
    if context.get("last_analysis"):
        out["last_analysis"] = context["last_analysis"]
    return out


def _tokenize(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-zA-Zа-яА-Я0-9_]{3,}", (text or "").lower())}


def _extract_sources(answer: str, context: dict[str, Any], question: str = "") -> list[dict[str, str]]:
    sources: list[dict[str, str]] = []
    for token in re.findall(r"\[(mat_\d+|finding_\d+)\]", answer, flags=re.I):
        token_l = token.lower().replace("finding_", "finding_")
        if token_l.startswith("mat_"):
            mid = token_l.replace("mat_", "")
            for m in context.get("verified_materials", []) + context.get("unverified_materials_summary", []):
                if str(m.get("id", "")).replace("mat_", "") == mid:
                    sources.append({"ref": m["id"], "title": m.get("title") or m.get("type", "")})
                    break
        elif "finding_" in token_l:
            fid = int(re.sub(r"\D", "", token_l) or 0)
            for f in context.get("findings", []):
                if f.get("id") == fid:
                    sources.append({"ref": f"finding_{fid}", "title": (f.get("title") or "")[:120]})
                    break
    if sources:
        # Keep first-seen order and remove duplicates by ref.
        dedup: list[dict[str, str]] = []
        seen: set[str] = set()
        for src in sources:
            ref = str(src.get("ref") or "")
            if not ref or ref in seen:
                continue
            seen.add(ref)
            dedup.append(src)
        return dedup

    # Fallback: ranked references from context when model omitted [mat_N]/[finding_N] tags.
    q_words = _tokenize(question or answer)
    candidates: list[dict[str, Any]] = []
    for m in (context.get("verified_materials") or []):
        title = m.get("title") or m.get("type", "")
        text = f"{title} {m.get('type', '')}"
        score = len(q_words & _tokenize(text))
        mid = str(m.get("id") or "")
        if mid:
            candidates.append({"ref": mid, "title": title, "score": score, "kind": 0})
    for f in (context.get("findings") or []):
        fid = f.get("id")
        if fid is None:
            continue
        title = (f.get("title") or "")[:120]
        text = f"{title} {f.get('problem', '')} {f.get('area', '')}"
        score = len(q_words & _tokenize(text))
        candidates.append({"ref": f"finding_{fid}", "title": title, "score": score, "kind": 1})
    ranked = sorted(candidates, key=lambda c: (-int(c["score"]), int(c["kind"])))
    return [{"ref": c["ref"], "title": c["title"]} for c in ranked[:5]]


def _confidence_level(sources: list[dict[str, str]], context: dict[str, Any]) -> str:
    if not sources:
        return "low"
    unverified_refs = {str(m.get("id")) for m in (context.get("unverified_materials_summary") or [])}
    source_refs = {str(s.get("ref") or "") for s in sources}
    if source_refs & unverified_refs:
        return "low"
    if (context.get("review_queue_count") or 0) > 0:
        return "medium"
    return "high"


def _contains_numeric_claims(text: str) -> bool:
    return bool(re.search(r"\b\d+[.,]?\d*\b", text or ""))


def _mock_qa_answer(question: str, context: dict[str, Any]) -> str:
    q = question.lower()
    metrics = context.get("metrics") or {}
    readiness = context.get("readiness") or {}
    findings = context.get("findings") or []

    if any(w in q for w in ["метрик", "бюджет", "cpl", "cpa", "romi", "клик", "заявк", "динамик", "месяц"]):
        periods = context.get("metrics_periods") or []
        direct = context.get("direct_statistics") or {}
        parts = []
        if metrics.get("period"):
            active = context.get("metrics_active_period")
            parts.append(f"Активный период KPI: {active or metrics['period']}")
        if metrics.get("budget") is not None:
            parts.append(f"Бюджет (активный): {metrics['budget']} ₽")
        if metrics.get("leads") is not None:
            parts.append(f"Заявки (активный): {metrics['leads']}")
        if len(periods) >= 2:
            parts.append(f"Загружено периодов KPI: {len(periods)} ({periods[0].get('period')} — {periods[-1].get('period')})")
        monthly = direct.get("monthly") or []
        if monthly:
            parts.append(f"Excel Директа: {len(monthly)} мес. в срезе")
        if metrics.get("needs_review"):
            parts.append(f"⚠️ Метрики требуют проверки: {metrics.get('review_reason')}")
        if not parts:
            return (
                "В материалах аудита нет заполненных ручных метрик. "
                "Добавьте набор метрик с периодом, бюджетом и заявками во вкладке «Материалы»."
            )
        return "По загруженным метрикам:\n" + "\n".join(f"• {p}" for p in parts)

    if any(w in q for w in ["минус", "фраз", "ставк", "ключев", "семант"]):
        exports = context.get("semantics_exports") or []
        lines: list[str] = []
        for ex in exports:
            title = ex.get("title") or "Excel"
            text = (ex.get("excerpt") or "").strip()
            if not text:
                if ex.get("in_ai") is False:
                    lines.append(f"• {title}: файл есть, но не отмечен «В AI» — включите на «Источники».")
                else:
                    lines.append(f"• {title}: текст не извлечён — перезалейте файл семантики.")
                continue
            for row in text.splitlines():
                low = row.lower()
                if "минус" in low and len(row) > 20:
                    lines.append(row[:500])
                    if len(lines) >= 8:
                        break
            if len(lines) >= 8:
                break
        direct = context.get("direct_statistics") or {}
        cond = direct.get("conditions_top_by_spend") or []
        if cond:
            lines.append("Запросы с расходом (Директ):")
            for c in cond[:6]:
                lines.append(f"• {c.get('query') or c.get('condition')}: расход {c.get('cost')}")
        if lines:
            return "По семантике и условиям показа:\n" + "\n".join(lines[:12])
        return (
            "Нет текста семантики в контексте. Загрузите Excel с фразами/минус-словами на «Источники», "
            "отметьте «В AI», перезалейте файл после обновления парсера. "
            "Для снижения ставок по запросам — отчёт «Поисковые запросы» на «Директ»."
        )

    if any(w in q for w in ["стратег", "рекоменд", "план работ", "коммерч"]):
        offer = (context.get("last_analysis") or {}).get("commercial_offer") or {}
        findings = context.get("findings") or []
        health = context.get("direct_health") or {}
        lines = []
        if offer.get("proposal_title"):
            lines.append(f"КП: {offer['proposal_title']}")
        for stage in (offer.get("work_stages") or [])[:4]:
            lines.append(f"• {stage}")
        if offer.get("next_step"):
            lines.append(f"Следующий шаг: {offer['next_step']}")
        for f in findings[:4]:
            rec = (f.get("recommendation") or "").strip()
            if rec:
                lines.append(f"• [{f.get('area')}] {rec[:200]}")
        plan = health.get("action_plan")
        if plan:
            lines.append(f"План по кабинету: {str(plan)[:300]}")
        if lines:
            return "Рекомендации по стратегии (из аудита):\n" + "\n".join(lines)
        return (
            "В материалах нет готового блока стратегии. Запустите AI-анализ или уточните вопрос по конкретному выводу."
        )

    if any(w in q for w in ["проверк", "needs_review", "исправ"]):
        n = readiness.get("needs_review_count", 0)
        if n == 0:
            return "Очередь проверки пуста — можно запускать AI-анализ."
        reasons = readiness.get("block_reasons") or []
        return f"Требует проверки: {n} элемент(ов).\n" + "\n".join(f"• {r}" for r in reasons)

    if any(w in q for w in ["вывод", "проблем", "риск", "рекоменд"]):
        if not findings:
            return "AI-выводы ещё не сформированы. Запустите AI-анализ после проверки материалов."
        lines = []
        for f in findings[:5]:
            kind = f.get("finding_kind", "hypothesis")
            lines.append(f"• [{kind}] {f.get('title', '')[:100]} (уверенность {int((f.get('confidence') or 0)*100)}%)")
        return "Основные выводы аудита:\n" + "\n".join(lines)
    if any(w in q for w in ["health", "здоров", "score", "оценк"]):
        health = context.get("direct_health") or {}
        if not health:
            return health_missing()
        return (
            f"{health_fact_line(health.get('health_score'), health.get('grade'))} "
            f"{health.get('summary_explain') or ''}".strip()
        )

    if any(w in q for w in ["материал", "загруж", "документ", "аудио"]):
        v = len(context.get("verified_materials") or [])
        u = len(context.get("unverified_materials_summary") or [])
        return (
            f"В аудите {v} проверенных материал(ов) для AI и {u} с пометкой «требует проверки». "
            "Откройте вкладку «Материалы» или «Проверка» для деталей."
        )

    summary = (context.get("last_analysis") or {}).get("audit_summary") or {}
    if summary.get("short_conclusion"):
        return f"Краткий вывод последнего анализа: {summary['short_conclusion']}"

    return (
        "Задайте вопрос про метрики, материалы, выводы или очередь проверки. "
        "Я отвечаю только на основе данных этого аудита."
    )


def _parse_kb_distance(example: dict[str, Any]) -> float | None:
    note = str(example.get("similarity_note") or "")
    match = re.search(r"distance=([\d.]+)", note)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None


def _kb_example_for_api(example: dict[str, Any]) -> dict[str, Any]:
    edited = example.get("edited_output")
    if isinstance(edited, dict):
        snippet = str(edited.get("problem") or edited.get("title") or json.dumps(edited, ensure_ascii=False))[:220]
    else:
        snippet = str(edited or "")[:220]
    return {
        "finding_id": example.get("finding_id"),
        "area": example.get("area"),
        "niche": example.get("niche"),
        "snippet": snippet,
        "distance": _parse_kb_distance(example),
    }


def _brief_context_for_kb_search(context: dict[str, Any]) -> str:
    parts: list[str] = []
    client = context.get("client") or {}
    if client.get("niche"):
        parts.append(str(client["niche"]))
    if client.get("goal"):
        parts.append(str(client["goal"])[:120])
    for f in (context.get("findings") or [])[:3]:
        parts.append(str(f.get("title") or f.get("problem") or "")[:100])
    return "\n".join(parts)[:600]


def fetch_chat_kb_examples(project: AuditProject, question: str, context: dict[str, Any]) -> list[dict[str, Any]]:
    """Similar confirmed findings from KB for chat prompt and UI (M2.13)."""
    if not settings.KNOWLEDGE_BASE_ENABLED:
        return []
    materials_text = f"{question}\n{_brief_context_for_kb_search(context)}"
    try:
        raw = search_knowledge_examples(
            niche=project.client.niche if project.client else None,
            materials_text=materials_text,
            metrics=effective_metrics_raw(project),
            top_k=max(settings.CHAT_KB_TOP_K * 2, settings.CHAT_KB_TOP_K),
        )
    except Exception:  # noqa: BLE001
        logger.warning("qa.chat_kb_search_failed", exc_info=True)
        return []
    filtered: list[dict[str, Any]] = []
    for ex in raw:
        dist = _parse_kb_distance(ex)
        if dist is not None and dist > settings.CHAT_KB_MAX_DISTANCE:
            continue
        filtered.append(_kb_example_for_api(ex))
        if len(filtered) >= settings.CHAT_KB_TOP_K:
            break
    return filtered


def build_knowledge_prompt_block(examples: list[dict[str, Any]]) -> str:
    if not examples:
        return ""
    lines = [
        "",
        "---",
        "",
        "## Похожие проверенные выводы из базы знаний (другие аудиты)",
        "Используй только как паттерны формулировок и типичных рисков.",
        "НЕ переноси чужие цифры (бюджет, CPL, ROMI) — только факты текущего аудита.",
        "",
    ]
    for idx, ex in enumerate(examples, 1):
        lines.append(
            f"Пример {idx} (ниша: {ex.get('niche') or '—'}, зона: {ex.get('area') or '—'}, "
            f"distance={ex.get('distance') if ex.get('distance') is not None else '—'}):"
        )
        if ex.get("snippet"):
            lines.append(str(ex["snippet"])[:500])
        lines.append("")
    return "\n".join(lines)


def _finding_anchor_block(project: AuditProject, finding_id: int) -> tuple[str, str]:
    finding = next((f for f in project.findings if f.id == finding_id), None)
    if not finding:
        raise ValueError(f"Вывод #{finding_id} не найден в этом аудите")
    evidence: list[Any] = []
    if finding.evidence_json:
        try:
            parsed = json.loads(finding.evidence_json)
            if isinstance(parsed, list):
                evidence = parsed[:8]
        except json.JSONDecodeError:
            evidence = []
    title = getattr(finding, "title", None) or finding.problem or f"Вывод #{finding_id}"
    label = (title or "")[:120]
    block = {
        "finding_id": finding_id,
        "area": finding.area,
        "finding_kind": getattr(finding, "finding_kind", None) or "hypothesis",
        "title": title,
        "problem": finding.problem,
        "recommendation": finding.recommendation,
        "confidence": finding.confidence,
        "status": finding.status,
        "evidence": evidence,
    }
    return (
        label,
        "Маркетолог задал вопрос конкретно про этот вывод — не уходи в общий обзор аудита.\n"
        f"Якорь (вывод #{finding_id}):\n{json.dumps(block, ensure_ascii=False, indent=2)}",
    )


def _metric_anchor_block(project: AuditProject) -> tuple[str, str]:
    metrics = effective_metrics_raw(project)
    label = f"Метрики: {metrics.get('period') or 'период не указан'}"
    return (
        label,
        "Маркетолог задал вопрос про KPI / метрики этого аудита — отвечай по ним.\n"
        f"Якорь (метрики):\n{json.dumps(metrics, ensure_ascii=False, indent=2)}",
    )


def _comparison_anchor_block(project: AuditProject) -> tuple[str, str]:
    comparison = build_before_after_comparison(project)
    if not comparison.get("available"):
        raise ValueError("Добавьте минимум два периода метрик для сравнения")
    before = comparison.get("before") or {}
    after = comparison.get("after") or {}
    label = f"Сравнение: {before.get('period', '—')} → {after.get('period', '—')}"
    return (
        label,
        "Маркетолог спрашивает про динамику KPI между периодами.\n"
        f"Якорь (сравнение периодов):\n{json.dumps(comparison, ensure_ascii=False, indent=2)}",
    )


def _resolve_context_anchor(
    project: AuditProject,
    context_anchor: dict[str, Any] | None,
) -> tuple[str | None, str]:
    if not context_anchor:
        return None, ""
    anchor_type = (context_anchor.get("type") or "").strip().lower()
    if anchor_type == "finding":
        fid = context_anchor.get("finding_id")
        if not fid:
            raise ValueError("Укажите finding_id для context_anchor.type=finding")
        return _finding_anchor_block(project, int(fid))
    if anchor_type == "metric":
        return _metric_anchor_block(project)
    if anchor_type == "comparison":
        return _comparison_anchor_block(project)
    if anchor_type == "health":
        health = _health_for_chat(project)
        if not health:
            raise ValueError(health_missing())
        return (
            health_fact_line(health.get("health_score"), health.get("grade")).rstrip("."),
            f"Маркетолог спрашивает про {HEALTH_SCORE_TITLE.lower()}.\n"
            f"Якорь (health):\n{json.dumps(health, ensure_ascii=False, indent=2)}",
        )
    raise ValueError("context_anchor.type должен быть finding, metric, comparison или health")


def _compute_trust_layers(
    answer: str,
    sources: list[dict[str, Any]],
    kb_examples: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "from_audit_sources": len(sources),
        "has_kb_examples": bool(kb_examples),
        "has_unsourced_numbers": bool(_contains_numeric_claims(answer) and not sources),
    }


def _encode_message_payload(
    *,
    sources: list[dict[str, Any]] | None = None,
    usage: dict[str, Any] | None = None,
    kb_examples: list[dict[str, Any]] | None = None,
    niche_patterns: list[dict[str, Any]] | None = None,
    trust_layers: dict[str, Any] | None = None,
    context_anchor_label: str | None = None,
    context_anchor: dict[str, Any] | None = None,
    reply_context_anchor: dict[str, Any] | None = None,
    store_reply_context_anchor: bool = False,
    audience_mode: str | None = None,
    chat_response_style: str | None = None,
    chat_temperature: float | None = None,
) -> str | None:
    payload: dict[str, Any] = {}
    if sources:
        payload["sources"] = sources
    if usage:
        payload["usage"] = usage
    if kb_examples:
        payload["kb_examples"] = kb_examples
    if niche_patterns:
        payload["niche_patterns"] = niche_patterns
    if audience_mode:
        payload["audience_mode"] = audience_mode
    if trust_layers:
        payload["trust_layers"] = trust_layers
    if context_anchor_label:
        payload["context_anchor_label"] = context_anchor_label
    if context_anchor:
        payload["context_anchor"] = context_anchor
    if store_reply_context_anchor:
        payload["reply_context_anchor"] = reply_context_anchor
    if chat_response_style:
        payload["chat_response_style"] = chat_response_style
    if chat_temperature is not None:
        payload["chat_temperature"] = chat_temperature
    if not payload:
        return None
    return json.dumps(payload, ensure_ascii=False)


def _decode_message_payload(raw: str | None) -> dict[str, Any]:
    empty: dict[str, Any] = {
        "sources": [],
        "usage": None,
        "kb_examples": [],
        "niche_patterns": [],
        "trust_layers": None,
        "context_anchor_label": None,
        "context_anchor": None,
        "reply_context_anchor": None,
        "has_reply_context_anchor": False,
        "audience_mode": None,
        "chat_response_style": None,
        "chat_temperature": None,
    }
    if not raw:
        return empty
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return empty
    if isinstance(parsed, list):
        empty["sources"] = parsed
        return empty
    if not isinstance(parsed, dict):
        return empty
    empty["sources"] = parsed.get("sources") if isinstance(parsed.get("sources"), list) else []
    empty["usage"] = parsed.get("usage") if isinstance(parsed.get("usage"), dict) else None
    empty["kb_examples"] = parsed.get("kb_examples") if isinstance(parsed.get("kb_examples"), list) else []
    empty["niche_patterns"] = parsed.get("niche_patterns") if isinstance(parsed.get("niche_patterns"), list) else []
    empty["trust_layers"] = parsed.get("trust_layers") if isinstance(parsed.get("trust_layers"), dict) else None
    empty["audience_mode"] = parsed.get("audience_mode")
    empty["context_anchor_label"] = parsed.get("context_anchor_label")
    empty["context_anchor"] = parsed.get("context_anchor")
    empty["chat_response_style"] = parsed.get("chat_response_style")
    raw_temp = parsed.get("chat_temperature")
    if raw_temp is not None:
        try:
            empty["chat_temperature"] = float(raw_temp)
        except (TypeError, ValueError):
            empty["chat_temperature"] = None
    if "reply_context_anchor" in parsed:
        empty["has_reply_context_anchor"] = True
        raw_reply = parsed.get("reply_context_anchor")
        empty["reply_context_anchor"] = raw_reply if isinstance(raw_reply, dict) else None
    return empty


def _encode_sources_payload(sources: list[dict[str, Any]], usage: dict[str, Any] | None) -> str | None:
    return _encode_message_payload(sources=sources, usage=usage)


def _decode_sources_payload(raw: str | None) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    meta = _decode_message_payload(raw)
    return meta["sources"], meta["usage"]


def ask_audit_question(
    project: AuditProject,
    question: str,
    db: Session,
    *,
    include_unverified: bool = True,
    model_id: str | None = None,
    context_anchor: dict[str, Any] | None = None,
    audience_mode: str = "internal",
    response_style: str = "balanced",
    temperature: float | None = None,
) -> dict[str, Any]:
    """Answer a user question about the audit."""
    question = (question or "").strip()
    if not question:
        raise ValueError("Введите вопрос")
    if len(question) > 2000:
        raise ValueError("Вопрос слишком длинный (макс. 2000 символов)")

    mode = (audience_mode or "internal").strip().lower()
    if mode == "client":
        include_unverified = False
    context = build_qa_context(
        project,
        include_unverified=include_unverified,
        audience_mode=mode,
        question=question,
    )
    anchor_label, anchor_block = _resolve_context_anchor(project, context_anchor)
    kb_examples = fetch_chat_kb_examples(project, question, context) if mode == "internal" else []
    niche_patterns = fetch_niche_patterns(db, niche=project.client.niche if project.client else None)
    kb_enabled = bool(settings.KNOWLEDGE_BASE_ENABLED)
    prompt_context = _apply_context_budget(context, question)
    safe_context = _apply_privacy(prompt_context)
    context_json = json.dumps(safe_context, ensure_ascii=False, indent=2)
    kb_block = build_knowledge_prompt_block(kb_examples)
    patterns_block = build_niche_patterns_prompt_block(niche_patterns)

    system_prompt = QA_SYSTEM_PROMPT
    if mode == "client":
        system_prompt = QA_SYSTEM_PROMPT + QA_CLIENT_MODE_SUFFIX
    anchor_type = (context_anchor or {}).get("type") if context_anchor else None
    if anchor_type == "finding" and mode != "client":
        system_prompt = system_prompt + QA_FINDING_ANCHOR_SUFFIX

    style_key, gen_temperature, max_tokens, style_suffix = _resolve_chat_generation(
        response_style,
        temperature,
    )
    system_prompt = system_prompt + style_suffix

    user_prompt = f"""Контекст аудита (JSON):
{context_json}
{anchor_block}
{kb_block}
{patterns_block}

Вопрос маркетолога:
{question}

Ответь по правилам системного промпта."""

    router = ModelRouter()
    answer: str
    provider_used = "local"
    model_used = "heuristic"
    model_label = "Локальный режим"
    duration_ms: int | None = None
    fallback_used = False
    context_version = QA_CONTEXT_VERSION
    usage_payload: dict[str, Any] | None = None

    chat_timeout = 35 if style_key == "deep" else 28
    if _SEMANTICS_QUESTION_RE.search(question):
        chat_timeout = max(chat_timeout, 50)

    if router.has_any_configured_provider():
        try:
            result = router.call_text(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=gen_temperature,
                max_tokens=max_tokens,
                timeout_seconds=chat_timeout,
                model_id=model_id,
            )
            answer = (result.content or "").strip()
            provider_used = result.provider_used
            model_used = result.model_used
            model_label = result.display_model or result.model_used
            duration_ms = result.duration_ms
            fallback_used = bool(result.fallback_used)
            if result.usage is not None:
                cost = CostDTO(cost_usd=result.cost_usd, cost_rub=result.cost_rub)
                usage_payload = usage_to_api_dict(
                    model_id=model_id or result.model_id or result.model_used,
                    model_label=model_label,
                    provider=provider_used,
                    usage=result.usage,
                    cost=cost,
                    transport_host=result.transport_host,
                    fallback_used=fallback_used,
                )
        except ModelRouterError:
            answer = _mock_qa_answer(question, context)
    else:
        answer = _mock_qa_answer(question, context)

    if not answer:
        answer = (
            "Не удалось получить текст ответа от модели. Повторите вопрос; "
            "если повторяется — сократите «Развёрнуто» до «Стандарт» или проверьте API-ключ."
        )

    sources = _extract_sources(answer, context, question=question)
    trust_layers = _compute_trust_layers(answer, sources, kb_examples)
    if trust_layers.get("has_unsourced_numbers"):
        answer += "\n\n⚠️ Числовые утверждения без подтверждённых источников требуют проверки."
    confidence_level = _confidence_level(sources, context)

    user_msg = AuditChatMessage(
        audit_project_id=project.id,
        role="user",
        content=question,
        sources_json=_encode_message_payload(
            context_anchor_label=anchor_label,
            context_anchor=context_anchor,
        ) if anchor_label else None,
    )
    assistant_msg = AuditChatMessage(
        audit_project_id=project.id,
        role="assistant",
        content=answer,
        sources_json=_encode_message_payload(
            sources=sources,
            usage=usage_payload,
            kb_examples=kb_examples,
            niche_patterns=niche_patterns,
            trust_layers=trust_layers,
            audience_mode=mode,
            reply_context_anchor=context_anchor,
            store_reply_context_anchor=True,
            chat_response_style=style_key,
            chat_temperature=gen_temperature,
        ),
        provider=provider_used,
        model_name=model_used,
        confidence_level=confidence_level,
        fallback_used=fallback_used,
        duration_ms=duration_ms,
        context_version=context_version,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    save_chat_telemetry_event(
        db,
        audit_project_id=project.id,
        provider=provider_used,
        model_name=model_used,
        duration_ms=duration_ms,
        fallback_used=fallback_used,
        sources_count=len(sources),
        include_unverified=include_unverified,
        confidence_level=confidence_level,
        errored=False,
        error_type=None,
    )
    db.commit()
    db.refresh(assistant_msg)

    logger.info(
        "qa.chat_response",
        extra={
            "audit_id": project.id,
            "provider": provider_used,
            "model": model_used,
            "duration_ms": duration_ms,
            "fallback_used": fallback_used,
            "sources_count": len(sources),
            "include_unverified": include_unverified,
            "confidence_level": confidence_level,
            "context_version": context_version,
            "kb_hits_count": len(kb_examples),
            "kb_enabled": kb_enabled,
            "niche_patterns_count": len(niche_patterns),
            "audience_mode": mode,
            "has_context_anchor": bool(context_anchor),
        },
    )
    chat_telemetry.record(
        duration_ms=duration_ms,
        fallback_used=fallback_used,
        confidence_level=confidence_level,
        include_unverified=include_unverified,
        errored=False,
    )

    needs_review_parts: list[str] = []
    if context.get("review_queue_count"):
        needs_review_parts.append(
            f"В очереди проверки {context['review_queue_count']} элемент(ов) — часть данных может быть неполной."
        )
    if trust_layers.get("has_unsourced_numbers"):
        needs_review_parts.append("В ответе есть цифры без ссылок на материалы — проверьте перед отправкой клиенту.")
    response: dict[str, Any] = {
        "answer": answer,
        "sources": sources,
        "message_id": assistant_msg.id,
        "provider": provider_used,
        "model": model_used,
        "model_label": model_label,
        "duration_ms": duration_ms,
        "fallback_used": fallback_used,
        "context_version": context_version,
        "confidence_level": confidence_level,
        "kb_examples": kb_examples,
        "niche_patterns": niche_patterns,
        "trust_layers": trust_layers,
        "context_anchor_label": anchor_label,
        "audience_mode": mode,
        "needs_review_note": " ".join(needs_review_parts) if needs_review_parts else None,
    }
    if usage_payload:
        response.update({
            "prompt_tokens": usage_payload.get("prompt_tokens"),
            "completion_tokens": usage_payload.get("completion_tokens"),
            "total_tokens": usage_payload.get("total_tokens"),
            "cost_usd": usage_payload.get("cost_usd"),
            "cost_rub": usage_payload.get("cost_rub"),
            "transport": usage_payload.get("transport"),
            "transport_host": usage_payload.get("transport_host"),
        })
    return response


def list_chat_history(project: AuditProject, db: Session, limit: int = 50) -> list[dict[str, Any]]:
    latest_rows = (
        db.query(AuditChatMessage)
        .filter(AuditChatMessage.audit_project_id == project.id)
        .order_by(AuditChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    rows = list(reversed(latest_rows))
    result = []
    last_user_anchor: dict[str, Any] | None = None
    for row in rows:
        meta = _decode_message_payload(row.sources_json)
        sources = meta["sources"]
        usage = meta["usage"]
        user_anchor = meta.get("context_anchor") if row.role == "user" else None
        if row.role == "user":
            if isinstance(user_anchor, dict) and user_anchor.get("type"):
                last_user_anchor = user_anchor
            else:
                last_user_anchor = None
        item = {
            "id": row.id,
            "role": row.role,
            "content": row.content,
            "sources": sources,
            "provider": row.provider,
            "model": row.model_name,
            "confidence_level": getattr(row, "confidence_level", None),
            "fallback_used": getattr(row, "fallback_used", None),
            "duration_ms": getattr(row, "duration_ms", None),
            "context_version": getattr(row, "context_version", None),
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "kb_examples": meta["kb_examples"] if row.role == "assistant" else [],
            "niche_patterns": meta["niche_patterns"] if row.role == "assistant" else [],
            "trust_layers": meta["trust_layers"] if row.role == "assistant" else None,
            "context_anchor_label": meta["context_anchor_label"] if row.role == "user" else None,
            "context_anchor": user_anchor if row.role == "user" else None,
            "reply_context_anchor": (
                (
                    meta["reply_context_anchor"]
                    if meta.get("has_reply_context_anchor")
                    else last_user_anchor
                )
                if row.role == "assistant"
                else None
            ),
            "audience_mode": meta.get("audience_mode") if row.role == "assistant" else None,
            "chat_response_style": meta.get("chat_response_style") if row.role == "assistant" else None,
            "chat_temperature": meta.get("chat_temperature") if row.role == "assistant" else None,
        }
        if usage:
            item.update({
                "model_label": usage.get("model_label"),
                "prompt_tokens": usage.get("prompt_tokens"),
                "completion_tokens": usage.get("completion_tokens"),
                "total_tokens": usage.get("total_tokens"),
                "cost_usd": usage.get("cost_usd"),
                "cost_rub": usage.get("cost_rub"),
                "transport": usage.get("transport"),
                "transport_host": usage.get("transport_host"),
            })
        result.append(item)
    return result
