"""Tests for PII masking and AI context privacy."""
from __future__ import annotations

import json

from app.services.privacy_service import (
    mask_emails,
    mask_for_log,
    mask_phones,
    mask_text,
    prepare_context_for_ai,
    sanitize_analysis_output,
)


def test_mask_emails_in_string():
    text = "Связаться: manager@example.com или sales@test.ru"
    result = mask_emails(text)
    assert "manager@example.com" not in result
    assert "sales@test.ru" not in result
    assert result.count("[email скрыт]") == 2


def test_mask_phones_preserves_date_ranges():
    text = "Звонок +7 999 123-45-67, период 01.04.2026 — 30.04.2026"
    result = mask_phones(text)
    assert "+7 999 123-45-67" not in result
    assert "[телефон скрыт]" in result
    assert "01.04.2026 — 30.04.2026" in result


def test_mask_phones_in_nested_dict():
    data = {"note": "Телефон 8 (495) 123-45-67", "nested": [{"x": "+79991234567"}]}
    result = mask_phones(data)
    assert "123-45-67" not in json.dumps(result, ensure_ascii=False)
    assert "[телефон скрыт]" in json.dumps(result, ensure_ascii=False)


def test_prepare_context_hides_company_and_revenue_by_default():
    payload = {
        "client_name": "ООО Рога и Копыта",
        "niche": "стоматология",
        "email": "boss@clinic.ru",
        "revenue": 1_500_000,
        "budget": 200_000,
        "note": "Менеджер Иван Петров звонил с +7 999 111-22-33",
    }
    result = prepare_context_for_ai(payload)
    dumped = json.dumps(result, ensure_ascii=False)
    assert "ООО Рога и Копыта" not in dumped
    assert "компания из ниши стоматология" in dumped
    assert "boss@clinic.ru" not in dumped
    assert result.get("revenue") is None
    assert "_privacy_notes" in result


def test_prepare_context_allows_revenue_when_opted_in():
    payload = {"revenue": 500_000, "sales": 10, "budget": 100_000}
    result = prepare_context_for_ai(payload, {"hide_revenue": False, "hide_company_name": False})
    assert result.get("revenue") == 500_000


def test_mask_for_log_redacts_contact_and_revenue_keys():
    data = {
        "phone": "+79991234567",
        "revenue": 900_000,
        "budget": 100_000,
        "findings": [{"title": "Проблема с CPC"}],
    }
    result = mask_for_log(data)
    assert result["phone"] == "[скрыто]"
    assert result["revenue"] == "[финансовое поле скрыто]"
    assert result["budget"] == 100_000


def test_sanitize_analysis_output_keeps_chart_titles():
    data = {
        "charts": [{"title": "Audit Score by month", "data": {"x": 1}}],
        "audit_summary": {"client_problem": "Email test@test.com"},
    }
    result = sanitize_analysis_output(data)
    assert result["charts"][0]["title"] == "Audit Score by month"
    assert "test@test.com" not in json.dumps(result, ensure_ascii=False)


def test_mask_text_masks_secrets_in_urls():
    text = "api_key=supersecret12345 dropped in log"
    result = mask_text(text)
    assert "supersecret12345" not in result
    assert "[секрет скрыт]" in result
