from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.config import settings, is_force_demo_ai
from app.models import AuditProject, AuditRun, AuditFinding
from app.schemas import AIAnalysisResult
from app.services.privacy_service import dumps_analysis_output, dumps_masked, mask_for_log, prepare_context_for_ai
from app.services.client_contacts_service import assert_contacts_excluded_from_ai_payload
from app.services.feedback_service import build_feedback_prompt_block, collect_feedback_examples
from app.services.knowledge_base_service import search_knowledge_examples
from app.services.model_router import ModelRouter
from app.services.model_pricing_service import CostDTO, usage_to_api_dict
from app.services.metrics_service import calculate_derived_metrics, minimum_metrics_ready, NOT_CALCULATED
from app.services.note_metrics_service import (
    build_marketer_notes_brief,
    effective_metrics,
    effective_metrics_for_ai_prompt,
    effective_metrics_raw,
)
from app.services.ai_context_options import (
    context_options_from_privacy,
    material_allowed_by_context_options,
    normalize_ai_context_options,
)
from app.services.material_helpers import (
    document_slice_from_material,
    is_semantics_export_material,
    find_screenshot_ocr_sibling,
    get_marketer_ai_hint,
    material_for_ai,
)
from app.security import get_current_actor

SYSTEM_PROMPT = """Ты — senior-специалист по Яндекс Директу, performance-маркетингу и подготовке рекламных аудитов.

Твоя задача — провести предварительный аудит рекламного проекта на основании переданных материалов: текстовых заметок, расшифровок аудио, OCR-текста со скриншотов, ручных метрик, таблиц и комментариев маркетолога.

Главное правило: не выдумывай данные. Делай выводы только на основании переданных материалов. Если данных недостаточно, они противоречивы или не подтверждают вывод, обязательно ставь needs_review=true и указывай review_reason.

Каждый вывод должен иметь область проблемы, критичность, доказательство, рекомендацию, ожидаемый эффект, confidence от 0 до 1, needs_review и review_reason при необходимости.

Уровень доказательств evidence_level: strong — только если в evidence есть цитата из конкретного материала (material_id + quote_or_description); medium — опора на метрики или несколько материалов без прямой цитаты; weak — гипотеза или косвенный вывод; none — доказательств нет (обязательно needs_review=true). Не ставь strong без непустого evidence.

Запрещено: придумывать расходы, заявки, продажи, CPA, CPL, ROMI; делать финансовые выводы без исходных данных; утверждать проблему без доказательства; возвращать текст вне JSON.

Нужно: анализировать семантику, структуру, аналитику, CRM, посадочные, бюджет, риски потери бюджета; формировать КП; предлагать графики только по числовым данным; отделять подтверждённые выводы от гипотез.

Ответ верни строго в JSON по заданной схеме. Не используй markdown и пояснения до/после JSON."""

JSON_SCHEMA = """{
  "audit_summary": {"client_problem": "string", "main_risk": "string", "priority": "low | medium | high", "short_conclusion": "string"},
  "metrics": {"period": "string | null", "budget": "number | null", "clicks": "number | null", "leads": "number | null", "sales": "number | null", "revenue": "number | null", "cpl": "number | null", "cpa": "number | null", "romi": "number | null", "needs_review": "boolean", "review_reason": "string | null"},
  "findings": [{"area": "semantics | structure | analytics | crm | creatives | landing | budget | offer | other", "severity": "low | medium | high", "finding_kind": "confirmed | hypothesis | needs_data", "title": "string", "problem": "string", "direct_risk_ref": {"kind": "template | rule", "id": "string"} | null, "evidence": [{"material_id": "string", "material_type": "string", "quote_or_description": "string"}], "evidence_level": "strong | medium | weak | none", "based_on": "string", "missing_data": "string | null", "recommendation": "string", "recommended_action": "string", "expected_impact": "string", "confidence": "number", "needs_review": "boolean", "review_reason": "string | null"}],
  "charts": [{"type": "bar | line | funnel | score | pie", "title": "string", "description": "string", "data": {}, "insight": "string", "needs_review": "boolean", "review_reason": "string | null"}],
  "schemes": [{"type": "mermaid", "title": "string", "code": "string", "description": "string"}],
  "commercial_offer": {"proposal_title": "string", "recommended_services": ["string"], "estimated_work_days": "number", "sales_argument": "string", "next_step": "string", "forecast_scenarios": {"horizon_months": "number", "analytics_disclaimer": "string", "conservative": {"headline": "string", "assumption": "string"}, "target": {"headline": "string", "assumption": "string"}}},
  "global_needs_review": "boolean", "global_review_reasons": ["string"]
}"""


def _ecommerce_patterns_prompt_block() -> str:
    path = Path(__file__).resolve().parent.parent / "data" / "ecommerce_ppc_patterns.json"
    try:
        patterns = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ""
    if not isinstance(patterns, list) or not patterns:
        return ""
    lines = ["Типовые паттерны риска eCommerce-PPC (проверь, если есть сигналы в материалах):"]
    for item in patterns[:8]:
        if not isinstance(item, dict):
            continue
        lines.append(f"- {item.get('title')}: {item.get('hint')}")
    return "\n".join(lines)


def _is_direct_excel_material(mat) -> bool:
    if (mat.type or "") != "document":
        return False
    slice_data = document_slice_from_material(mat)
    return bool(slice_data and slice_data.get("format") == "yandex_direct_xlsx")


def prepare_materials_json(
    project: AuditProject,
    context_options: dict[str, bool] | None = None,
) -> List[Dict[str, Any]]:
    """Подготавливает список материалов. Приватизация применяется позже ко всему AI-контексту."""
    from app.services.metrics_periods_service import resolve_active_metrics_material

    opts = normalize_ai_context_options(context_options)
    active_metrics = resolve_active_metrics_material(project)
    active_metrics_id = active_metrics.id if active_metrics else None
    materials: List[Dict[str, Any]] = []
    for mat in project.materials:
        if not material_for_ai(mat):
            continue
        mtype = mat.type or ""
        if not material_allowed_by_context_options(mtype, opts):
            continue
        if mtype == "manual_metrics" and active_metrics_id and mat.id != active_metrics_id:
            continue
        if _is_direct_excel_material(mat):
            continue
        if mtype == "screenshot_ocr":
            continue
        item: Dict[str, Any] = {
            "id": f"mat_{mat.id}",
            "type": mat.type,
            "title": mat.title or "",
            "needs_review": bool(mat.needs_review),
            "review_reason": mat.review_reason,
        }

        if mtype == "screenshot":
            if not opts.get("send_screenshots_ocr") and not opts.get("send_setup_screenshots"):
                continue
            ocr = find_screenshot_ocr_sibling(project, mat)
            parts: list[str] = []
            # OCR-sibling всегда excluded_from_analysis (скрыт в UI), текст всё равно для скрина.
            ocr_text = ""
            if ocr:
                ocr_text = (ocr.extracted_text or ocr.raw_content or "").strip()
            if opts.get("send_screenshots_ocr") and ocr_text:
                parts.append(ocr_text)
            elif opts.get("send_setup_screenshots") and ocr_text:
                parts.append(
                    f"[Скриншот «{mat.title or 'без названия'}» — полный OCR-текст в блоке direct_setup]"
                )
            hint = get_marketer_ai_hint(mat) or (get_marketer_ai_hint(ocr) if ocr else "")
            if hint:
                parts.append(f"Подсказка маркетолога: {hint}")
            if not parts:
                parts.append(
                    f"[Скриншот «{mat.title or 'без названия'}» без текстового описания — "
                    "делай осторожные выводы, needs_review при необходимости]"
                )
            item["content"] = "\n\n".join(parts)
            item["needs_review"] = bool(
                mat.needs_review or (ocr and ocr.needs_review) or not (ocr and (ocr.extracted_text or ocr.raw_content))
            )
        elif mat.type == "manual_metrics" and mat.raw_content:
            try:
                item["content"] = json.loads(mat.raw_content)
            except json.JSONDecodeError:
                item["content"] = mat.raw_content
        elif mat.extracted_text:
            item["content"] = mat.extracted_text
        elif mat.raw_content:
            try:
                item["content"] = json.loads(mat.raw_content)
            except json.JSONDecodeError:
                item["content"] = mat.raw_content
        else:
            item["content"] = ""

        hint = get_marketer_ai_hint(mat)
        if hint and mtype != "screenshot":
            base = item.get("content")
            if isinstance(base, str) and hint not in base:
                item["content"] = f"{base}\n\nПодсказка маркетолога: {hint}".strip() if base else f"Подсказка маркетолога: {hint}"

        if is_semantics_export_material(mat):
            item["content_kind"] = "direct_semantics_export"
            base = item.get("content")
            if isinstance(base, str) and "[Материал: справочник фраз" not in base:
                item["content"] = (
                    "[Материал: справочник фраз/минус-слов из Excel — зона «Семантика», "
                    "не подменяет KPI мастер-отчёта]\n\n" + base
                )

        # Внешнему AI не отправляем прямые ссылки на файлы. Текст/метрики передаются отдельно.
        if mat.confidence is not None:
            item["confidence"] = mat.confidence
        materials.append(item)
    return materials


def build_user_prompt(project: AuditProject, input_data: Dict[str, Any], feedback_examples: List[Dict[str, Any]] | None = None) -> str:
    from app.services.audit_plan_service import resolve_assessment_reference_period
    from app.services.period_service import next_calendar_month_period

    materials_json = json.dumps(input_data.get("materials", []), ensure_ascii=False, indent=2)
    ref_period = (
        resolve_assessment_reference_period(project)
        or (input_data.get("effective_metrics") or {}).get("period")
        or "не указан"
    )
    forecast_start = next_calendar_month_period(str(ref_period)) or "месяц после опорного"
    privacy_notes = input_data.get("_privacy_notes") or []
    if isinstance(privacy_notes, str):
        privacy_notes = [privacy_notes]
    privacy_notes_text = "\n".join(f"- {note}" for note in privacy_notes) if privacy_notes else "- Нет специальных ограничений"
    feedback_block = build_feedback_prompt_block(feedback_examples or [])
    return f"""Проведи предварительный аудит рекламного проекта.

Данные клиента:
Клиент: {input_data.get("client_name") or "Не указано"}
Ниша: {input_data.get("niche") or 'Не указана'}
Сайт: {input_data.get("website") or 'Не указан'}
Цель аудита: {input_data.get("goal") or 'Не указана'}
Комментарий маркетолога: {input_data.get("comment") or 'Нет'}

Указания и фокус из текстовых заметок маркетолога (приоритет при расхождении с загруженными файлами):
{input_data.get("marketer_notes_brief") or "Нет"}

Сводные KPI для расчётов CPL/CPA/ROMI (ручные метрики + заметки):
{json.dumps(input_data.get("effective_metrics") or {}, ensure_ascii=False, indent=2)}

Периоды прогноза:
- Базовая линия / факт оценки: {ref_period}
- Старт сценариев forecast_scenarios (прогноз вперёд): {forecast_start}

Статистика Яндекс Директа (агрегаты по месяцам и кампаниям; НЕ суммируй строки условий показа повторно):
{json.dumps(input_data.get("direct_statistics") or {}, ensure_ascii=False, indent=2)}

Условия показа (агрегат за период файла; НЕ дублируй campaigns/monthly — только для семантики и минусов):
{json.dumps(input_data.get("direct_conditions") or {}, ensure_ascii=False, indent=2)}

Настройки кабинета (со скриншотов: структура, стратегия, корректировки, креатив):
{json.dumps(input_data.get("direct_setup") or {}, ensure_ascii=False, indent=2)}

Риски Директа для обогащения (скилы / Excel — уже посчитаны; НЕ дублируй их отдельными findings без direct_risk_ref):
{json.dumps(input_data.get("direct_risk_catalog") or [], ensure_ascii=False, indent=2)}

Материалы аудита:
{materials_json}

Ограничения приватности:
{privacy_notes_text}

{_ecommerce_patterns_prompt_block()}

Правила оценки:
1. Если есть расход и заявки — рассчитай CPL.
2. Если есть расход и продажи — рассчитай CPA.
3. Если есть расход и выручка — рассчитай ROMI как (выручка - расход) / расход * 100.
3a. Если есть расход и выручка — укажи ДРР (доля рекламных расходов) как расход / выручка * 100 в metrics.drr, если поле доступно.
3b. В commercial_offer.forecast_scenarios обязательно дай консервативный и целевой прогноз (headline + assumption) на 1–3 месяца ВПЕРЁД от опорного месяца KPI (см. блок «Периоды прогноза» в промпте); не обещай гарантий — укажи analytics_disclaimer. Маркетолог правит черновик вручную перед PDF.
4. Если нет продаж — не делай выводы по CPA.
5. Если нет выручки — не делай выводы по ROMI.
6. Если на скриншоте нет периода или точных чисел — поставь needs_review=true.
7. Если аудио не расшифровано — поставь needs_review=true.
8. Если вывод не имеет доказательства — поставь needs_review=true.
8a. В evidence укажи material_id из списка материалов (формат mat_12), тип материала и короткую цитату до 200 символов — только фрагмент, который подтверждает вывод, не шапку файла.
9. Если данные противоречат друг другу — поставь needs_review=true.
10. Если проблема основана только на предположении — укажи это как гипотезу и поставь needs_review=true.
11. Графики предлагай только по числовым данным.
12. Если точных данных для графика нет, не строй график, а поставь needs_review=true.
13. Если в материалах есть _privacy_notes о скрытой выручке/продажах, не рассчитывай CPA, ROMI и не выдумывай эти данные.
14. Название компании, контакты и ссылки могли быть заменены масками — это нормально и не должно снижать качество анализа.
15. Если ниже есть блок исправлений маркетолога, считай его более приоритетным, чем прошлый AI-вывод.
16. Отклонённые человеком выводы не повторяй без новых доказательств.
17. Если есть direct_statistics.monthly — опиши динамику лидов и CPL по месяцам, сравни лучший и худший месяц.
18. Главный KPI лида = форма + мессенджер (leads); CPL = расход / leads.
19. Если есть direct_statistics.campaigns — найди кампании с лучшим и худшим CPL, предложи как увеличить лиды и снизить стоимость лида.
20. Если есть direct_conditions — используй top_by_spend и high_spend_zero_leads для выводов по семантике; рекомендации с campaign_name и цифрами cost/leads/CPL.
21. Не считай каждую строку условия показа отдельной кампанией; не суммируй conditions вместе с campaigns повторно.
22. Если direct_conditions пуст — используй материалы с content_kind=direct_semantics_export (фразы/минус-слова из Excel); если и их нет — finding needs_data по семантике.
23. Учитывай direct_setup (стратегия, корректировки ставок, тексты) при рекомендациях; не противоречь скринам без объяснения.
24. Если есть direct_statistics.health — опирайся на summary_explain, score_breakdown и template_findings; назови 2–3 фактора score и план по action_plan, без выдуманных цифр.
25. Для каждого риска из блока «Риски Директа для обогащения» создай ровно один finding с тем же direct_risk_ref: детализируй кампанию/фразу/цифры, дай решение и текст для отчёта. Не создавай отдельный finding с тем же смыслом без direct_risk_ref.
26. Дополнительные findings без direct_risk_ref — только по CRM, посадочным, креативам и материалам вне checklist Excel; без данных — needs_review=true.
27. audit_summary — обязательный блок для клиентского PDF (все 4 поля непустые, без жаргона автопроверок):
   - client_problem: 1–2 предложения, суть для ЛПР; цифры CPL/заявок/бюджета — если есть в материалах.
   - main_risk: последствие для бизнеса («бюджет уходит без заявок», «CPL останется высоким»). Запрещено копировать title правил Excel («Расход без лидов в условиях показа»).
   - short_conclusion: обязательно 1–2 предложения — конкретный следующий шаг (из action_plan, рекомендаций или КП).
   - priority: high/medium/low по серьёзности рисков.
28. commercial_offer — коммерческий план для PDF (не шаблон «для любого клиента»):
   - proposal_title: от ниши/метрик аудита (CPL, заявки, ниша), не «Оптимизация рекламных кампаний в Яндекс Директ».
   - recommended_services: 3–6 этапов из action_plan.prioritized и findings (конкретные действия), не одинаковый список из 4 общих пунктов.
   - sales_argument: эффект с цифрами из metrics/health, если есть.
   - next_step: первый шаг из action_plan или рекомендаций, не «Обсудить детали и утвердить план».
   - estimated_work_days: 7–21 по объёму работ; forecast_scenarios — сценарии с опорой на CPL/заявки периода, не копируй «+20% лидов / −30% CPL» без привязки к данным.
{feedback_block}

Верни результат строго в JSON по схеме:
{JSON_SCHEMA}"""


def extract_json_from_response(text: str) -> str:
    """Извлекает JSON из ответа AI, очищая markdown-обёртки."""
    json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if json_match:
        return json_match.group(1).strip()
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
        return text[brace_start: brace_end + 1]
    return text.strip()


def _collect_manual_metrics(materials: List[Dict[str, Any]]) -> Dict[str, Any]:
    """KPI из активного manual_metrics (в промпт попадает один период)."""
    result: Dict[str, Any] = {
        "period": None,
        "budget": None,
        "clicks": None,
        "leads": None,
        "sales": None,
        "revenue": None,
        "gross_profit": None,
        "margin_percent": None,
    }
    for mat in materials:
        if mat.get("type") != "manual_metrics":
            continue
        content = mat.get("content")
        if isinstance(content, dict):
            for key in result:
                if content.get(key) is not None and content.get(key) != "":
                    result[key] = content.get(key)
            break
    return result


def _num(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _calculate_metrics(raw: Dict[str, Any]) -> Dict[str, Any]:
    return calculate_derived_metrics(raw)


def _classify_finding(finding: Dict[str, Any], materials: List[Dict[str, Any]]) -> None:
    """Assign finding_kind and extended metadata based on evidence quality."""
    evidence = finding.get("evidence") or []
    needs_review = bool(finding.get("needs_review"))
    confidence = float(finding.get("confidence") or 0)
    based_on_types = {e.get("material_type") for e in evidence if e.get("material_type")}
    unverified_types = {"text_note", "audio_transcript", "quality_guard"}
    only_notes = based_on_types and based_on_types <= unverified_types

    if not evidence or evidence[0].get("material_type") == "quality_guard":
        finding["evidence_level"] = "none"
        finding["finding_kind"] = "needs_data"
        finding["needs_review"] = True
        finding["missing_data"] = finding.get("missing_data") or "Нет подтверждённых доказательств из материалов"
    elif needs_review or only_notes or confidence < 0.65:
        finding["evidence_level"] = finding.get("evidence_level") or ("weak" if only_notes else "medium")
        finding["finding_kind"] = "hypothesis"
        if only_notes:
            finding["based_on"] = finding.get("based_on") or "Заметка или непроверенные данные"
    else:
        finding["evidence_level"] = finding.get("evidence_level") or "strong"
        finding["finding_kind"] = "confirmed"

    if not finding.get("title"):
        problem = (finding.get("problem") or "").strip()
        finding["title"] = problem[:120] + ("…" if len(problem) > 120 else "")
    if not finding.get("recommended_action"):
        finding["recommended_action"] = finding.get("recommendation")


def _text_blob(materials: List[Dict[str, Any]]) -> str:
    chunks = []
    for mat in materials:
        content = mat.get("content")
        if isinstance(content, dict):
            chunks.append(json.dumps(content, ensure_ascii=False))
        else:
            chunks.append(str(content or ""))
    return "\n".join(chunks).lower()


def _evidence(materials: List[Dict[str, Any]], keywords: list[str]) -> list[dict[str, str]]:
    for mat in materials:
        content = mat.get("content")
        text = json.dumps(content, ensure_ascii=False) if isinstance(content, dict) else str(content or "")
        low = text.lower()
        if any(k in low for k in keywords):
            return [{
                "material_id": mat.get("id", "unknown"),
                "material_type": mat.get("type", "unknown"),
                "quote_or_description": text[:350],
            }]
    return []


def _materials_have_content(materials: List[Dict[str, Any]]) -> bool:
    if not materials:
        return False
    for mat in materials:
        content = mat.get("content")
        if isinstance(content, dict) and content:
            return True
        if content and str(content).strip():
            return True
    return False


def _preliminary_structure_response(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Template-only response when audit has no source materials."""
    return {
        "audit_summary": {
            "client_problem": "Структура аудита создана. Для выводов нужны исходные данные.",
            "main_risk": "Без материалов отчёт останется предварительным шаблоном.",
            "priority": "low",
            "short_conclusion": (
                "Сначала добавьте период, расход, клики, заявки, продажи, поисковые запросы, "
                "цели Метрики, CRM-статусы и комментарии по качеству лидов."
            ),
        },
        "metrics": metrics,
        "findings": [],
        "charts": [],
        "schemes": [],
        "commercial_offer": None,
        "global_needs_review": True,
        "global_review_reasons": ["Данных недостаточно для полноценного PPC-аудита."],
        "is_preliminary": True,
    }


def mock_ai_response(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Демо-анализ без AI-ключа. Использует реальные материалы и считает метрики."""
    materials = input_data.get("materials", [])
    metrics = _calculate_metrics(_collect_manual_metrics(materials))
    if not _materials_have_content(materials):
        return _preliminary_structure_response(metrics)
    blob = _text_blob(materials)
    findings: List[Dict[str, Any]] = []
    catalog = input_data.get("direct_risk_catalog") or []
    for entry in catalog:
        ref = entry.get("direct_risk_ref")
        if not ref:
            continue
        title = (entry.get("title") or "").strip() or "Риск Direct"
        detail = (entry.get("detail") or "").strip()
        problem = title if not detail or detail in title else f"{title}: {detail}"
        evidence: List[Dict[str, Any]] = []
        if detail:
            evidence.append({
                "material_id": "direct_excel",
                "material_type": "document",
                "quote_or_description": detail[:500],
            })
        findings.append({
            "area": "budget" if entry.get("severity") in ("critical", "high") else "structure",
            "severity": entry.get("severity") or "medium",
            "finding_kind": "hypothesis",
            "title": title,
            "problem": problem,
            "recommendation": entry.get("recommended_action") or "",
            "expected_impact": "Демо-обогащение риска Direct для проверки pipeline 1:1.",
            "direct_risk_ref": ref,
            "enrichment_status": "complete",
            "evidence": evidence,
            "confidence": 0.65,
            "needs_review": True,
            "review_reason": "Демо-режим: проверьте детализацию по Excel Direct.",
        })

    if any(word in blob for word in ["нецелев", "информацион", "бесплат", "ремонт", "минус", "запрос"]):
        findings.append({
            "area": "semantics",
            "severity": "high" if any(word in blob for word in ["нецелев", "ремонт", "бесплат"]) else "medium",
            "problem": "Есть признаки нецелевого или смешанного поискового интента.",
            "evidence": _evidence(materials, ["нецелев", "информацион", "бесплат", "ремонт", "минус", "запрос"]),
            "recommendation": "Выгрузить поисковые запросы, разделить коммерческие и информационные интенты, собрать минус-фразы.",
            "expected_impact": "Снижение доли мусорных кликов и рост качества заявок.",
            "confidence": 0.78,
            "needs_review": True,
            "review_reason": "Для подтверждения нужна выгрузка поисковых запросов из рекламного кабинета.",
        })

    if any(word in blob for word in ["crm", "utm", "метрик", "продаж", "статус", "лид"]):
        findings.append({
            "area": "crm",
            "severity": "high",
            "problem": "Есть риск, что реклама оценивается по заявкам без подтверждения качества лидов и продаж.",
            "evidence": _evidence(materials, ["crm", "utm", "метрик", "продаж", "статус", "лид"]),
            "recommendation": "Проверить передачу UTM, цели, статусы лидов и связку заявок с CRM.",
            "expected_impact": "Оптимизация будет опираться не только на количество заявок, но и на продажи/качество лидов.",
            "confidence": 0.74,
            "needs_review": True,
            "review_reason": "Нет выгрузки CRM со статусами и продажами.",
        })

    if any(word in blob for word in ["главную", "лендинг", "страниц", "оффер", "посадоч"]):
        findings.append({
            "area": "landing",
            "severity": "medium",
            "problem": "Есть признаки слабого соответствия посадочной страницы рекламному интенту.",
            "evidence": _evidence(materials, ["главную", "лендинг", "страниц", "оффер", "посадоч"]),
            "recommendation": "Развести посадочные страницы под разные услуги, сегменты и офферы.",
            "expected_impact": "Рост конверсии из клика в заявку за счёт более точного предложения.",
            "confidence": 0.7,
            "needs_review": False,
            "review_reason": None,
        })

    if metrics.get("cpl") is not None and metrics["cpl"] > 5000:
        findings.append({
            "area": "budget",
            "severity": "medium",
            "problem": f"Стоимость заявки составляет {metrics['cpl']} ₽, показатель требует проверки на качество лидов.",
            "evidence": [{"material_id": "manual_metrics", "material_type": "manual_metrics", "quote_or_description": "CPL рассчитан по ручным метрикам: расход / заявки."}],
            "recommendation": "Проверить структуру кампаний, поисковые запросы, цели и статусы заявок в CRM.",
            "expected_impact": "Появится понимание, где теряется бюджет и какие кампании дают качественные заявки.",
            "confidence": 0.82,
            "needs_review": True,
            "review_reason": "Без данных по продажам нельзя оценить, является ли CPL допустимым для бизнеса.",
        })

    if not findings and not minimum_metrics_ready(metrics):
        findings.append({
            "area": "analytics",
            "severity": "medium",
            "finding_kind": "needs_data",
            "problem": "Недостаточно подтверждённых данных для полноценного PPC-аудита.",
            "evidence": [],
            "missing_data": "Период, расход, клики, заявки, продажи, поисковые запросы, цели Метрики, CRM.",
            "recommendation": "Добавить период, расход, клики, заявки, продажи, комментарии по качеству лидов и скриншоты/выгрузки.",
            "expected_impact": "После добавления данных аудит станет доказательным, а КП — более точным.",
            "confidence": 0.2,
            "needs_review": True,
            "review_reason": "Недостаточно исходных материалов.",
        })

    charts = []
    if metrics.get("clicks") is not None or metrics.get("leads") is not None or metrics.get("sales") is not None:
        funnel = {}
        if metrics.get("clicks") is not None:
            funnel["Клики"] = metrics["clicks"]
        if metrics.get("leads") is not None:
            funnel["Заявки"] = metrics["leads"]
        if metrics.get("sales") is not None:
            funnel["Продажи"] = metrics["sales"]
        charts.append({
            "type": "funnel",
            "title": "Воронка рекламы",
            "description": "Переход от кликов к заявкам и продажам по введённым данным.",
            "data": funnel,
            "insight": "Воронка помогает увидеть, на каком этапе теряется результат.",
            "needs_review": metrics.get("sales") is None,
            "review_reason": "Нет данных по продажам, воронка неполная." if metrics.get("sales") is None else None,
        })

    score_values = {
        "Семантика": 45 if "semantics" in [f["area"] for f in findings] else 65,
        "Аналитика/CRM": 35 if any(f["area"] in ["crm", "analytics"] for f in findings) else 70,
        "Посадочные": 50 if any(f["area"] == "landing" for f in findings) else 70,
        "Бюджет": 55 if any(f["area"] == "budget" for f in findings) else 70,
    }
    charts.append({
        "type": "bar",
        "title": "Оценка по зонам",
        "description": "Оценка зон аудита по шкале 0–100 на основании загруженных материалов.",
        "data": {
            "labels": list(score_values.keys()),
            "datasets": [{"label": "Балл", "data": list(score_values.values())}],
        },
        "insight": "Самые низкие зоны стоит вынести в первый этап работ.",
        "needs_review": True,
        "review_reason": "Score является предварительной оценкой без API-данных Директа/Метрики.",
    })

    material_reasons = [m.get("review_reason") for m in materials if m.get("needs_review") and m.get("review_reason")]
    review_reasons = []
    if metrics.get("review_reason"):
        review_reasons.append(metrics["review_reason"])
    review_reasons.extend(material_reasons)
    review_reasons.extend([f["review_reason"] for f in findings if f.get("needs_review") and f.get("review_reason")])
    review_reasons = list(dict.fromkeys([r for r in review_reasons if r]))

    return {
        "audit_summary": {
            "client_problem": "Рекламный проект требует проверки качества трафика, аналитики и связки заявок с результатом.",
            "main_risk": "Бюджет может расходоваться на клики и заявки, которые не подтверждены продажами или качеством лидов.",
            "priority": "high" if review_reasons else "medium",
            "short_conclusion": "Нужно подтвердить выводы данными по поисковым запросам, целям и CRM, затем упаковать работы в план оптимизации.",
        },
        "metrics": metrics,
        "findings": findings,
        "charts": charts,
        "schemes": [{
            "type": "mermaid",
            "title": "Логика аудита и решения",
            "code": "flowchart TD\nA[Материалы: заметки, аудио, скрины, метрики] --> B[Проверка данных]\nB --> C[Выводы с доказательствами]\nC --> D{Есть сомнения?}\nD -->|Да| E[needs_review и ручная проверка]\nD -->|Нет| F[Рекомендации]\nE --> F\nF --> G[КП и план работ]",
            "description": "Схема показывает, как система отделяет подтверждённые выводы от гипотез.",
        }],
        "commercial_offer": {
            "proposal_title": "Аудит и оптимизация Яндекс Директа с фокусом на качество заявок",
            "recommended_services": [
                "Проверка целей и аналитики",
                "Анализ поисковых запросов и минус-фраз",
                "Проверка связки с CRM и качества лидов",
                "Подготовка плана оптимизации кампаний",
                "Настройка отчётности по заявкам и продажам",
            ],
            "estimated_work_days": 14,
            "sales_argument": "Работы помогут понять, где теряется бюджет, какие заявки действительно ценные и что нужно исправить в первую очередь.",
            "next_step": "Провести созвон-разбор, подтвердить спорные данные и согласовать первый этап работ.",
            "forecast_scenarios": {
                "horizon_months": 3,
                "analytics_disclaimer": (
                    "Прогноз ориентировочный: для точной оценки нужна сквозная аналитика (CRM, e-commerce, атрибуция)."
                ),
                "conservative": {
                    "headline": "Стабилизация ДРР и качества заявок без резкого роста бюджета",
                    "assumption": "При условии доработки аналитики и сегментации кампаний в первый месяц.",
                },
                "target": {
                    "headline": "Рост валовой прибыли с контекста при сохранении управляемого ДРР",
                    "assumption": "После подтверждения данных по CRM и повторным продажам.",
                },
            },
        },
        "global_needs_review": bool(review_reasons),
        "global_review_reasons": review_reasons,
    }


def _normalize_temperature(value: Any | None, default: float) -> float:
    try:
        temperature = float(default if value is None else value)
    except (TypeError, ValueError):
        temperature = float(default)
    return max(settings.AI_TEMPERATURE_MIN, min(settings.AI_TEMPERATURE_MAX, temperature))


def _model_metadata_from_result(result, *, model_id: str | None, temperature: float) -> dict[str, Any]:
    metadata = {
        "provider_used": result.provider_used,
        "model_used": result.model_used,
        "model_id": model_id or result.model_id,
        "model_label": result.display_model or result.model_used,
        "fallback_used": result.fallback_used,
        "fallback_reason": result.fallback_reason,
        "duration_ms": result.duration_ms,
        "temperature": temperature,
        "raw_response": result.raw_response,
    }
    if result.usage is not None:
        cost = CostDTO(cost_usd=result.cost_usd, cost_rub=result.cost_rub)
        metadata.update(usage_to_api_dict(
            model_id=model_id or result.model_id or result.model_used,
            model_label=result.display_model or result.model_used,
            provider=result.provider_used,
            usage=result.usage,
            cost=cost,
            transport_host=result.transport_host,
            fallback_used=bool(result.fallback_used),
        ))
    return metadata


def call_ai_api(
    prompt: str,
    input_data: Dict[str, Any],
    temperature: float | None = None,
    model_id: str | None = None,
) -> Dict[str, Any]:
    """Вызывает Model Router или детерминированный демо-анализ без ключей.

    Primary/fallback providers are configured in .env. If no external provider
    is configured, the MVP stays free and deterministic.
    """
    normalized_temperature = _normalize_temperature(temperature, settings.AI_TEMPERATURE_ANALYSIS)
    router = ModelRouter()
    if input_data.get("_force_demo") or not router.has_any_configured_provider():
        data = mock_ai_response(input_data)
        data["_model_metadata"] = {
            "provider_used": "demo",
            "model_used": "local_rule_based",
            "model_label": "Локальный режим",
            "fallback_used": False,
            "fallback_reason": None,
            "temperature": normalized_temperature,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "cost_usd": "0.0000",
            "cost_rub": "0.00",
            "transport": "local",
        }
        return data

    result = router.call(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=prompt,
        temperature=normalized_temperature,
        max_tokens=5000,
        model_id=model_id,
    )
    data = json.loads(extract_json_from_response(result.content))
    data["_model_metadata"] = _model_metadata_from_result(
        result,
        model_id=model_id,
        temperature=normalized_temperature,
    )
    return data


def apply_quality_guard(
    ai_data: Dict[str, Any],
    input_data: Dict[str, Any],
    *,
    raw_materials: List[Dict[str, Any]] | None = None,
    project: AuditProject | None = None,
) -> Dict[str, Any]:
    """Финальная бизнес-проверка: не пропускает 'уверенные' выводы без доказательств."""
    reasons = list(ai_data.get("global_review_reasons") or [])
    materials_for_metrics = raw_materials if raw_materials is not None else input_data.get("materials", [])

    if project is not None:
        manual_metrics = metrics_from_project(project)
    else:
        manual_metrics = _calculate_metrics(_collect_manual_metrics(materials_for_metrics))
    ai_metrics = ai_data.get("metrics") or {}
    for key, value in manual_metrics.items():
        if value is not None or key in {"cpl", "cpa", "romi", "needs_review", "review_reason"}:
            ai_metrics[key] = value
    ai_data["metrics"] = ai_metrics
    if ai_metrics.get("needs_review") and ai_metrics.get("review_reason"):
        reasons.append(ai_metrics["review_reason"])

    from app.services.knowledge_base_service import is_data_limitation_problem

    metrics_ready = minimum_metrics_ready(manual_metrics)
    pruned_findings: list[dict[str, Any]] = []
    for finding in ai_data.get("findings", []):
        if metrics_ready and is_data_limitation_problem(finding.get("problem")):
            continue
        evidence = finding.get("evidence") or []
        if not evidence:
            if metrics_ready:
                finding["evidence"] = [{
                    "material_id": "manual_metrics",
                    "material_type": "manual_metrics",
                    "quote_or_description": "Базовые метрики подтверждены в материалах аудита.",
                }]
                finding["finding_kind"] = "hypothesis"
                finding["review_reason"] = finding.get("review_reason") or (
                    "Для детальных выводов добавьте запросы, CRM, скриншоты кампаний"
                )
            else:
                finding["evidence"] = [{
                    "material_id": "system",
                    "material_type": "quality_guard",
                    "quote_or_description": "Вывод не содержит доказательств из материалов.",
                }]
                finding["needs_review"] = True
                finding["review_reason"] = finding.get("review_reason") or "Вывод не имеет доказательства из материалов"
        if finding.get("needs_review") and not finding.get("review_reason"):
            finding["review_reason"] = "Требуется ручная проверка вывода"
        confidence = finding.get("confidence")
        if confidence is None:
            finding["confidence"] = 0.5
        else:
            finding["confidence"] = max(0, min(1, float(confidence)))
        _classify_finding(finding, input_data.get("materials", []))
        if finding.get("needs_review") and finding.get("review_reason"):
            reasons.append(finding["review_reason"])
        if raw_materials:
            from app.services.evidence_helpers import normalize_finding_evidence

            normalize_finding_evidence(finding, raw_materials)
        pruned_findings.append(finding)
    ai_data["findings"] = pruned_findings

    for chart in ai_data.get("charts", []):
        if chart.get("needs_review") and not chart.get("review_reason"):
            chart["review_reason"] = "График требует проверки исходных данных"
        if chart.get("needs_review") and chart.get("review_reason"):
            reasons.append(chart["review_reason"])

    for mat in input_data.get("materials", []):
        if mat.get("needs_review") and mat.get("review_reason"):
            reasons.append(mat["review_reason"])

    unique_reasons = list(dict.fromkeys([r for r in reasons if r]))
    ai_data["global_review_reasons"] = unique_reasons
    ai_data["global_needs_review"] = bool(unique_reasons) or any(
        f.get("needs_review") for f in ai_data.get("findings", [])
    )

    if not _materials_have_content(materials_for_metrics):
        ai_data["charts"] = []
        ai_data["schemes"] = []
        ai_data["commercial_offer"] = None
        ai_data["is_preliminary"] = True
        ai_data["findings"] = []
        summary = ai_data.get("audit_summary") or {}
        summary["priority"] = "low"
        ai_data["audit_summary"] = summary
        ai_data["global_review_reasons"] = ["Данных недостаточно для полноценного PPC-аудита."]
        ai_data["global_needs_review"] = True
    else:
        from app.services.audit_summary_enrich_service import enrich_audit_summary
        from app.services.commercial_offer_enrich_service import enrich_commercial_offer

        ai_data, _changed = enrich_audit_summary(ai_data, input_data)
        if ai_data.get("commercial_offer"):
            ai_data, _ = enrich_commercial_offer(ai_data, input_data)

    return ai_data


def _manual_metrics_materials(project: AuditProject) -> List[Dict[str, Any]]:
    """Collect manual_metrics for UI/coverage (includes needs_review — unlike AI context)."""
    items: List[Dict[str, Any]] = []
    for mat in project.materials or []:
        if mat.type != "manual_metrics" or not mat.raw_content:
            continue
        try:
            content = json.loads(mat.raw_content)
        except json.JSONDecodeError:
            continue
        if isinstance(content, dict):
            items.append({"type": "manual_metrics", "content": content})
    return items


def metrics_from_project(project: AuditProject) -> Dict[str, Any]:
    """Return metrics for UI/export: manual_metrics + KPI from notes and documents."""
    return effective_metrics(project)


def save_ai_result(project: AuditProject, ai_data: Dict[str, Any], db: Session) -> None:
    """Сохраняет результат AI-анализа; сохраняет findings direct_health."""
    from app.models import AuditFinding
    from app.services.direct_health_findings_service import is_direct_health_finding
    from app.services.finding_direct_link import direct_risk_ref_key, normalize_direct_risk_ref
    from app.services.knowledge_base_service import purge_kb_for_project_findings

    # Query DB explicitly — stale project.findings after background reload left duplicate AI rows.
    all_rows = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_project_id == project.id)
        .all()
    )
    direct_rows = [f for f in all_rows if is_direct_health_finding(f)]
    ai_rows = [f for f in all_rows if not is_direct_health_finding(f)]
    old_ai_ids = [f.id for f in ai_rows if f.id is not None]
    if old_ai_ids:
        purge_kb_for_project_findings(old_ai_ids)
    for row in ai_rows:
        db.delete(row)
    db.flush()

    deduped: dict[str, Dict[str, Any]] = {}
    standalone: list[Dict[str, Any]] = []
    for finding_data in ai_data.get("findings", []):
        if not isinstance(finding_data, dict):
            continue
        _classify_finding(finding_data, [])
        ref = normalize_direct_risk_ref(finding_data.get("direct_risk_ref"))
        if ref:
            key = direct_risk_ref_key(ref)
            if key and key not in deduped:
                finding_data = dict(finding_data)
                finding_data["direct_risk_ref"] = ref
                deduped[key] = finding_data
        else:
            standalone.append(finding_data)

    for finding_data in list(deduped.values()) + standalone:
        ref = normalize_direct_risk_ref(finding_data.get("direct_risk_ref"))
        original = dict(finding_data)
        if ref:
            original["interpretation_of"] = "direct_health"
            original["direct_risk_ref"] = ref
        finding = AuditFinding(
            audit_project_id=project.id,
            area=finding_data.get("area"),
            finding_kind=finding_data.get("finding_kind", "hypothesis"),
            title=finding_data.get("title"),
            severity=finding_data.get("severity"),
            problem=finding_data.get("problem"),
            evidence_json=json.dumps(finding_data.get("evidence", []), ensure_ascii=False),
            evidence_level=finding_data.get("evidence_level"),
            based_on=finding_data.get("based_on"),
            missing_data=finding_data.get("missing_data"),
            recommendation=finding_data.get("recommendation"),
            expected_impact=finding_data.get("expected_impact"),
            confidence=finding_data.get("confidence"),
            needs_review=finding_data.get("needs_review", False),
            review_reason=finding_data.get("review_reason"),
            status="ai_generated",
            original_ai_output=original,
        )
        db.add(finding)

    project.needs_review = ai_data.get("global_needs_review", False)
    project.status = "needs_review" if project.needs_review else "completed"
    project.updated_at = datetime.now(timezone.utc)
    db.commit()


def prepare_analysis_prompt_context(
    project: AuditProject,
    db: Session,
    privacy_options: Dict[str, Any] | None = None,
    *,
    skip_kb_search: bool = False,
) -> Dict[str, Any]:
    """Собирает тот же контекст и user_prompt, что уходят в AI-анализ."""
    raw_privacy_options = privacy_options or {}
    context_opts = context_options_from_privacy(raw_privacy_options)
    privacy_for_ai = {
        "hide_company_name": raw_privacy_options.get("hide_company_name", True),
        "hide_revenue": raw_privacy_options.get("hide_revenue", raw_privacy_options.get("exclude_revenue", True)),
        "hide_contacts": raw_privacy_options.get("hide_contacts", raw_privacy_options.get("exclude_contacts", True)),
        "hide_file_urls": raw_privacy_options.get("hide_file_urls", True),
        "company_name": project.client.name,
        "niche": project.client.niche,
    }
    raw_input_data = {
        "client_name": project.client.name,
        "niche": project.client.niche,
        "website": project.client.website,
        "goal": project.goal,
        "comment": project.client.comment,
        "privacy_options": {
            "send_metrics": True,
            "send_business_category": True,
            "send_revenue_sales": not bool(privacy_for_ai["hide_revenue"]),
            "hide_company_name": True,
            "hide_contacts": True,
            "hide_file_urls": True,
        },
        "materials": prepare_materials_json(project, context_opts),
    }
    input_data = prepare_context_for_ai(raw_input_data, privacy_for_ai)
    assert_contacts_excluded_from_ai_payload(raw_input_data)
    assert_contacts_excluded_from_ai_payload(input_data)
    input_data["marketer_notes_brief"] = (
        build_marketer_notes_brief(project) if context_opts.get("send_notes") else "Заметки не включены в отправку (включите в модалке AI-анализа)."
    )
    input_data["_ai_context_options"] = context_opts
    input_data["effective_metrics"] = effective_metrics_for_ai_prompt(project)
    from app.services.finding_direct_link import build_direct_risk_catalog
    from app.services.direct_slice_service import (
        build_direct_analytics,
        build_direct_conditions_for_ai,
        build_direct_setup_context,
    )

    from app.services.direct_slice_service import build_direct_statistics_for_ai

    da = build_direct_analytics(project)
    if da and context_opts.get("send_direct_summary"):
        input_data["direct_statistics"] = build_direct_statistics_for_ai(da, context_opts)
        input_data["direct_risk_catalog"] = build_direct_risk_catalog(da)
    else:
        input_data["direct_statistics"] = {}
        input_data["direct_risk_catalog"] = []
    input_data["direct_conditions"] = (
        build_direct_conditions_for_ai(project) if context_opts.get("send_direct_conditions") else {}
    )
    input_data["direct_setup"] = (
        build_direct_setup_context(project) if context_opts.get("send_setup_screenshots") else {"blocks": [], "has_setup": False}
    )
    raw_feedback_examples = collect_feedback_examples(db, project.id)
    materials_text_for_search = _text_blob(input_data.get("materials", []))
    metrics_for_search = effective_metrics_raw(project) if project else _collect_manual_metrics(input_data.get("materials", []))
    kb_examples: list[dict[str, Any]] = []
    if not skip_kb_search and settings.KNOWLEDGE_BASE_ENABLED:
        kb_examples = search_knowledge_examples(
            niche=input_data.get("niche"),
            materials_text=materials_text_for_search,
            metrics=metrics_for_search,
            top_k=settings.KNOWLEDGE_BASE_TOP_K,
        )
    raw_feedback_examples.extend(kb_examples)
    feedback_examples = prepare_context_for_ai({"examples": raw_feedback_examples}, privacy_for_ai).get("examples", [])
    user_prompt = build_user_prompt(project, input_data, feedback_examples=feedback_examples)
    return {
        "raw_privacy_options": raw_privacy_options,
        "context_options": context_opts,
        "raw_input_data": raw_input_data,
        "input_data": input_data,
        "feedback_examples": feedback_examples,
        "user_prompt": user_prompt,
        "extra_terms": [project.client.name],
        "kb_examples_count": len(kb_examples),
    }


def run_analysis(project: AuditProject, db: Session, progress_callback: Callable[[str, int, str], None] | None = None, privacy_options: Dict[str, Any] | None = None, temperature: float | None = None) -> Dict[str, Any]:
    """Запускает полный цикл AI-анализа."""
    def progress(step: str, percent: int, message: str) -> None:
        if progress_callback:
            progress_callback(step, percent, message)

    start_time = time.time()
    progress("prepare", 5, "Подготовка материалов")
    ctx = prepare_analysis_prompt_context(project, db, privacy_options)
    raw_privacy_options = ctx["raw_privacy_options"]
    raw_input_data = ctx["raw_input_data"]
    input_data = ctx["input_data"]
    feedback_examples = ctx["feedback_examples"]
    extra_terms = ctx["extra_terms"]
    requested_temperature = _normalize_temperature(
        temperature if temperature is not None else raw_privacy_options.get("ai_temperature"),
        settings.AI_TEMPERATURE_ANALYSIS,
    )
    input_data["_feedback_examples_count"] = len(feedback_examples)
    input_data["_knowledge_base_examples_count"] = ctx["kb_examples_count"]
    input_data["_knowledge_base_enabled"] = bool(settings.KNOWLEDGE_BASE_ENABLED)
    input_data["_ai_temperature"] = requested_temperature
    input_data["_force_demo"] = bool(raw_privacy_options.get("force_demo")) or is_force_demo_ai()

    run_record = AuditRun(
        audit_project_id=project.id,
        action="ai_analysis",
        input_json=dumps_masked(input_data, extra_terms=extra_terms, indent=2),
        actor=get_current_actor(),
        status="in_progress",
    )
    db.add(run_record)
    db.commit()
    db.refresh(run_record)

    try:
        progress("prompt", 20, "Сбор промпта, локальных правок и похожих примеров из базы знаний")
        user_prompt = ctx["user_prompt"]
        progress("model", 40, f"Запрос к Model Router или демо-анализу · temperature={requested_temperature}")
        ai_data = call_ai_api(
            user_prompt,
            input_data,
            temperature=requested_temperature,
            model_id=raw_privacy_options.get("model_id"),
        )
        progress("quality", 65, "Проверка JSON, метрик и доказательств")
        ai_data = apply_quality_guard(
            ai_data, input_data, raw_materials=raw_input_data["materials"], project=project
        )
        from app.services.direct_ai_enrichment_service import apply_direct_ai_enrichment

        apply_direct_ai_enrichment(ai_data, input_data.get("direct_risk_catalog") or [])
        AIAnalysisResult.model_validate(ai_data)
        progress("save", 85, "Сохранение выводов, графиков и КП")
        save_ai_result(project, ai_data, db)
        from app.services.audit_plan_service import seed_ai_forecast_into_audit_plan

        seed_ai_forecast_into_audit_plan(project, ai_data.get("commercial_offer") or {})

        duration_ms = int((time.time() - start_time) * 1000)
        run_record.output_json = dumps_analysis_output(ai_data, extra_terms=extra_terms, indent=2)
        run_record.status = "success"
        run_record.duration_ms = duration_ms
        db.commit()
        progress("done", 100, "Анализ завершён")

        return {
            "audit_id": project.id,
            "status": project.status,
            "global_needs_review": ai_data.get("global_needs_review", False),
            "findings_count": len(ai_data.get("findings", [])),
            "review_reasons": ai_data.get("global_review_reasons", []),
            "ai_usage": ai_data.get("_model_metadata") or {},
        }
    except ValidationError as e:
        error = f"Validation error: {e}"
    except Exception as e:  # noqa: BLE001 - нужен безопасный ответ и запись в audit_runs
        error = str(e)

    duration_ms = int((time.time() - start_time) * 1000)
    run_record.status = "failed"
    run_record.error = mask_for_log(error, extra_terms=extra_terms)
    run_record.duration_ms = duration_ms
    db.commit()
    progress("failed", 0, f"Ошибка анализа: {error}")

    project.status = "failed"
    project.needs_review = True
    project.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "audit_id": project.id,
        "status": "failed",
        "global_needs_review": True,
        "findings_count": 0,
        "review_reasons": ["AI вернул невалидный JSON или произошла ошибка обработки"],
        "error": error,
    }


def analyze_with_learning(project: AuditProject, db: Session, progress_callback: Callable[[str, int, str], None] | None = None, privacy_options: Dict[str, Any] | None = None, temperature: float | None = None) -> Dict[str, Any]:
    """AI-анализ с учётом исправлений маркетолога.

    MVP-реализация не требует ChromaDB: исправления хранятся в audit_findings/audit_runs
    и автоматически добавляются в промпт при повторном запуске через run_analysis().
    """
    return run_analysis(
        project,
        db,
        progress_callback=progress_callback,
        privacy_options=privacy_options,
        temperature=temperature,
    )
