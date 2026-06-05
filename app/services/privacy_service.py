"""Privacy helpers for AI context, logs and user-facing consent.

The project uses three privacy levels:
1) AI context minimization: keep marketing signal, remove personal/secret data.
2) Log redaction: never store raw sensitive input/output in audit_runs.
3) User consent metadata: explain what leaves the app before external AI/STT calls.
"""
from __future__ import annotations

import copy
import json
import re
from typing import Any, Iterable

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d[\d\s().-]{8,}\d)(?!\d)")
DATE_RANGE_RE = re.compile(
    r"\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\s*[—–\-]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4}\b"
)
DATE_ISO_RANGE_RE = re.compile(
    r"\b\d{4}-\d{2}-\d{2}\s*[—–\-]\s*\d{4}-\d{2}-\d{2}\b"
)
URL_RE = re.compile(r"(?i)\b(?:https?://|www\.)[^\s<>'\"]+")
URL_TOKEN_RE = re.compile(r"(?i)(api[_-]?key|token|secret|password|passwd|authorization)[\s:=\"]+[^\s,}\]]+")
PERSON_NAME_RE = re.compile(
    r"\b[А-ЯЁ][а-яё]{2,}\s+[А-ЯЁ][а-яё]{2,}(?:\s+[А-ЯЁ][а-яё]{2,})?\b"
)
EN_PERSON_NAME_RE = re.compile(
    r"\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b"
)
PERSON_MARKER_RE = re.compile(
    r"(?i)\b(менеджер|директор|собственник|клиент|маркетолог|руководитель|контакт|manager|director|owner|client|marketer|contact)"
    r"\s+([А-ЯЁ][а-яё]{2,}|[A-Z][a-z]{2,})(?:\s+([А-ЯЁ][а-яё]{2,}|[A-Z][a-z]{2,}))?"
)
MONEY_RE = re.compile(
    r"(?i)(выручк[аеиу]?|оборот|revenue|income|profit|прибыль|sales[_\s-]?value|sales|продаж[аеиу]?|заказ(?:ов|а|ы)?|ценность продаж)"
    r"\s*[:=—-]?\s*[0-9][0-9\s.,]*(?:₽|руб\.?|р\.?|k|m|тыс\.?|млн\.?)?"
)

# Fields that directly reveal revenue/sales and should be optional.
REVENUE_FIELDS = {
    "revenue", "выручка", "turnover", "income", "gross_profit", "profit", "margin",
    "sales", "sales_count", "sales_value", "orders", "order_value", "avg_check",
    "purchase_revenue", "crm_sales", "closed_deals",
}

# Fields that should never go to AI/logs as raw values.
CONTACT_KEYS = {"email", "phone", "contact", "manager", "responsible", "person", "fio", "full_name", "first_name", "last_name", "username", "telegram", "whatsapp"}
COMPANY_KEYS = {"client_name", "company", "company_name", "organization", "org", "name"}
SECRET_KEYS = {"api_key", "token", "secret", "password", "passwd", "authorization", "cookie"}
FILE_URL_KEYS = {"file_url", "url", "download_url", "path", "file_path", "local_path"}


def mask_emails(data: Any) -> Any:
    return _map_strings(data, lambda s: EMAIL_RE.sub("[email скрыт]", s))


def _mask_phones_in_text(text: str) -> str:
    placeholders: list[str] = []

    def _stash(match: re.Match[str]) -> str:
        placeholders.append(match.group(0))
        return f"__DATE_RANGE_{len(placeholders) - 1}__"

    protected = text
    protected = DATE_RANGE_RE.sub(_stash, protected)
    protected = DATE_ISO_RANGE_RE.sub(_stash, protected)
    protected = PHONE_RE.sub("[телефон скрыт]", protected)
    for idx, original in enumerate(placeholders):
        protected = protected.replace(f"__DATE_RANGE_{idx}__", original)
    return protected


def mask_phones(data: Any) -> Any:
    return _map_strings(data, _mask_phones_in_text)


def mask_urls(data: Any) -> Any:
    return _map_strings(data, lambda s: URL_RE.sub("[url скрыт]", s))


def mask_names(data: Any) -> Any:
    def repl(text: str) -> str:
        text = PERSON_NAME_RE.sub("[имя скрыто]", text)
        text = EN_PERSON_NAME_RE.sub("[name hidden]", text)
        text = PERSON_MARKER_RE.sub(lambda m: f"{m.group(1)} [имя скрыто]", text)
        return text

    return _map_strings(data, repl)


# English Title Case pairs that are product copy, not person names (avoid "Audit Score" → [name hidden]).
_EN_NAME_FALSE_POSITIVES = frozenset({
    "audit score", "audit and", "direct audit", "quality score", "lead quality",
})


def _mask_en_person_names(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        phrase = match.group(0)
        if phrase.lower() in _EN_NAME_FALSE_POSITIVES:
            return phrase
        return "[name hidden]"

    return EN_PERSON_NAME_RE.sub(repl, text)


def mask_names_strict(data: Any) -> Any:
    """Mask person names in free text (logs, AI input). Uses stricter EN matching."""

    def repl(text: str) -> str:
        text = PERSON_NAME_RE.sub("[имя скрыто]", text)
        text = _mask_en_person_names(text)
        text = PERSON_MARKER_RE.sub(lambda m: f"{m.group(1)} [имя скрыто]", text)
        return text

    return _map_strings(data, repl)


def sanitize_analysis_output(data: Any, extra_terms: Iterable[str] | None = None) -> Any:
    """Redact PII in saved analysis output without mangling chart/KP titles."""
    result = mask_secrets(mask_urls(mask_phones(mask_emails(copy.deepcopy(data)))))
    terms = [str(term or "").strip() for term in (extra_terms or []) if str(term or "").strip()]
    if terms:
        result = replace_terms(result, terms, "[название скрыто]")
    return result


def dumps_analysis_output(data: Any, *, extra_terms: Iterable[str] | None = None, indent: int | None = 2) -> str:
    return json.dumps(
        sanitize_analysis_output(data, extra_terms=extra_terms),
        ensure_ascii=False,
        indent=indent,
    )


def mask_secrets(data: Any) -> Any:
    return _map_strings(data, lambda s: URL_TOKEN_RE.sub(lambda m: m.group(1) + "=[секрет скрыт]", s))


def _map_strings(data: Any, fn) -> Any:
    if isinstance(data, str):
        return fn(data)
    if isinstance(data, list):
        return [_map_strings(item, fn) for item in data]
    if isinstance(data, dict):
        return {key: _map_strings(value, fn) for key, value in data.items()}
    return data


def _key_matches(key: Any, names: set[str]) -> bool:
    low = str(key).lower()
    return low in names or any(token in low for token in names)


def remove_fields(data: Any, fields: Iterable[str]) -> Any:
    fields_set = {str(field).lower() for field in fields}
    if isinstance(data, list):
        return [remove_fields(item, fields_set) for item in data]
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            low = str(key).lower()
            if low in fields_set or any(token in low for token in fields_set):
                continue
            result[key] = remove_fields(value, fields_set)
        return result
    return data


def replace_terms(data: Any, terms: Iterable[str], replacement: str) -> Any:
    terms = [str(term or "").strip() for term in terms if str(term or "").strip()]
    if not terms:
        return data

    def repl(text: str) -> str:
        result = text
        for term in terms:
            if len(term) >= 3:
                result = re.sub(re.escape(term), replacement, result, flags=re.IGNORECASE)
        return result

    return _map_strings(data, repl)


def replace_company_name_with_niche(data: Any, company_name: str | None = None, niche: str | None = None) -> Any:
    """Replace company name with an analytical but non-identifying description."""
    business_label = f"компания из ниши {niche}" if niche else "компания из указанной ниши"
    result = copy.deepcopy(data)

    if isinstance(result, dict):
        # Keep category/niche, remove identifying company name.
        for key in list(result.keys()):
            if _key_matches(key, COMPANY_KEYS):
                result[key] = business_label

    terms = [company_name] if company_name else []
    return replace_terms(result, terms, business_label)


def _remove_file_urls(data: Any) -> Any:
    if isinstance(data, list):
        return [_remove_file_urls(item) for item in data]
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if _key_matches(key, FILE_URL_KEYS):
                continue
            result[key] = _remove_file_urls(value)
        return result
    return data


def _mask_contact_fields(data: Any) -> Any:
    if isinstance(data, list):
        return [_mask_contact_fields(item) for item in data]
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            low = str(key).lower()
            if _key_matches(low, CONTACT_KEYS) or _key_matches(low, SECRET_KEYS):
                result[key] = "[скрыто]" if value not in (None, "") else value
            else:
                result[key] = _mask_contact_fields(value)
        return result
    if isinstance(data, str):
        return mask_names_strict(mask_secrets(mask_urls(mask_phones(mask_emails(data)))))
    return data


def _mask_revenue_text(data: Any) -> Any:
    return _map_strings(data, lambda s: MONEY_RE.sub(lambda m: m.group(1) + " [финансовое поле скрыто] ", s))


def prepare_context_for_ai(material_data: dict[str, Any], privacy_settings: dict[str, Any] | None = None) -> dict[str, Any]:
    """Prepare a useful but privacy-safe AI context.

    privacy_settings:
        hide_company_name: bool      # True by default and forced for external AI
        hide_revenue: bool           # optional; if True, ROMI/CPA must not be calculated
        hide_contacts: bool          # True by default
        hide_file_urls: bool         # True by default
        company_name: str | None
        niche: str | None

    Contacts/company/file URLs are clean identifiers and are hidden because they do
    not improve PPC analysis. Metrics and business category are kept. Revenue and
    sales can be included only when the user explicitly chooses to send them.
    """
    settings = privacy_settings or {}
    result = copy.deepcopy(material_data)

    hide_company_name = settings.get("hide_company_name", True)
    hide_revenue = settings.get("hide_revenue", True)
    hide_contacts = settings.get("hide_contacts", True)
    hide_file_urls = settings.get("hide_file_urls", True)
    company_name = settings.get("company_name") or material_data.get("client_name")
    niche = settings.get("niche") or material_data.get("niche")

    # Always safe: does not reduce analytical usefulness.
    result = mask_phones(result)
    result = mask_emails(result)
    result = mask_urls(result)
    result = mask_names(result)
    result = mask_secrets(result)

    if hide_contacts:
        result = _mask_contact_fields(result)

    if hide_file_urls:
        result = _remove_file_urls(result)

    if hide_company_name:
        result = replace_company_name_with_niche(result, company_name=company_name, niche=niche)

    if hide_revenue:
        result = remove_fields(result, REVENUE_FIELDS)
        result = _mask_revenue_text(result)
        notes = result.get("_privacy_notes", []) if isinstance(result, dict) else []
        if not isinstance(notes, list):
            notes = [str(notes)]
        notes.append("Выручка и продажи скрыты пользователем. ROMI и CPA не рассчитывать и не выдумывать.")
        result["_privacy_notes"] = notes

    return result


def mask_text(value: str, extra_terms: Iterable[str] | None = None) -> str:
    """Backward-compatible text masker for logs."""
    masked = mask_names(mask_secrets(mask_urls(mask_phones(mask_emails(value)))))
    masked = _mask_revenue_text(masked)
    for term in extra_terms or []:
        term = str(term or "").strip()
        if len(term) >= 3:
            masked = re.sub(re.escape(term), "[название скрыто]", masked, flags=re.IGNORECASE)
    return masked


def mask_for_log(data: Any, extra_terms: Iterable[str] | None = None) -> Any:
    """Recursively redact data before writing audit_runs."""
    if isinstance(data, str):
        try:
            parsed = json.loads(data)
            return json.dumps(mask_for_log(parsed, extra_terms=extra_terms), ensure_ascii=False, indent=2)
        except Exception:  # noqa: BLE001
            return mask_text(data, extra_terms=extra_terms)
    if isinstance(data, list):
        return [mask_for_log(item, extra_terms=extra_terms) for item in data]
    if isinstance(data, dict):
        result: dict[str, Any] = {}
        for key, value in data.items():
            low_key = str(key).lower()
            if _key_matches(low_key, CONTACT_KEYS | COMPANY_KEYS | SECRET_KEYS | FILE_URL_KEYS):
                result[key] = "[скрыто]" if value not in (None, "") else value
            elif low_key in REVENUE_FIELDS:
                # Logs are stricter than AI context: do not store raw revenue/sales.
                result[key] = "[финансовое поле скрыто]" if value not in (None, "") else value
            else:
                result[key] = mask_for_log(value, extra_terms=extra_terms)
        return result
    return data


def dumps_masked(data: Any, *, extra_terms: Iterable[str] | None = None, indent: int | None = None) -> str:
    return json.dumps(mask_for_log(data, extra_terms=extra_terms), ensure_ascii=False, indent=indent)


def minimize_materials_for_ai(materials: list[dict[str, Any]], privacy_options: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """Backward-compatible wrapper used by older code paths."""
    settings = privacy_options or {}
    return prepare_context_for_ai(
        {"materials": materials},
        {
            "hide_company_name": settings.get("hide_company_name", settings.get("exclude_client_name", True)),
            "hide_revenue": settings.get("hide_revenue", settings.get("exclude_revenue", True)),
            "hide_contacts": settings.get("hide_contacts", settings.get("exclude_contacts", True)),
            "hide_file_urls": settings.get("hide_file_urls", settings.get("exclude_file_urls", True)),
            "company_name": settings.get("company_name"),
            "niche": settings.get("niche"),
        },
    ).get("materials", [])


def build_ai_privacy_notice(provider_name: str, privacy_url: str, external_ai_enabled: bool) -> dict[str, Any]:
    return {
        "external_ai_enabled": external_ai_enabled,
        "provider_name": provider_name,
        "privacy_url": privacy_url,
        "message": (
            f"Материалы аудита будут отправлены внешнему AI-провайдеру: {provider_name}. "
            "Название компании, контакты, имена и ссылки скрываются всегда. "
            "Выручку и продажи можно отправить отдельно для расчёта CPA/ROMI."
            if external_ai_enabled else
            "AI API-ключ не настроен: анализ будет выполнен в локальном демо-режиме без отправки материалов внешнему AI-провайдеру."
        ),
    }
