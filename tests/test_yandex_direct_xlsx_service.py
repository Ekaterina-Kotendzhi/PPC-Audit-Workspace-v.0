"""Tests for Yandex Direct Excel import."""
from __future__ import annotations

from pathlib import Path

from app.services.yandex_direct_xlsx_service import (
    _column_kind,
    _header_score,
    _period_from_filename,
    slice_to_metrics_payload,
    try_parse_yandex_direct_xlsx,
)


def test_column_kind_recognizes_direct_headers():
    assert _column_kind("расход, ₽") == "cost"
    assert _column_kind("клики") == "clicks"
    assert _column_kind("конверсии") == "conversions"
    assert _column_kind("название кампании") == "campaign_name"


def test_header_score_requires_campaign_table():
    good = ["№ кампании", "Название кампании", "Расход, ₽", "Клики", "Конверсии"]
    bad = ["Дата", "Комментарий"]
    assert _header_score(good) >= 4
    assert _header_score(bad) < 4


def test_period_from_filename():
    path = Path("report_2026-04-01_2026-04-30.xlsx")
    assert _period_from_filename(path) == "2026-04-01 — 2026-04-30"


def test_try_parse_minimal_direct_xlsx(minimal_direct_xlsx: Path):
    result = try_parse_yandex_direct_xlsx(minimal_direct_xlsx)
    assert result is not None
    slice_data = result["document_slice"]
    assert slice_data["format"] == "yandex_direct_xlsx"
    assert len(slice_data.get("campaigns") or []) == 2
    totals = slice_data.get("totals") or {}
    assert totals.get("cost") == 230_000.50
    assert totals.get("clicks") == 8300
    assert totals.get("conversions") == 67
    assert result.get("extracted_text")
    assert "01.04.2026" in (slice_data.get("period") or "")


def test_slice_to_metrics_payload_from_totals():
    payload = slice_to_metrics_payload({
        "period": "01.04.2026 — 30.04.2026",
        "totals": {"cost": 100_000, "clicks": 500, "conversions": 12, "forms": 8, "messengers": 4},
    })
    assert payload["budget"] == 100_000
    assert payload["clicks"] == 500
    assert payload["leads"] == 12
    assert payload["leads_forms"] == 8
    assert payload["leads_messenger"] == 4


def test_non_direct_xlsx_returns_none(tmp_path: Path):
    path = tmp_path / "notes.txt"
    path.write_text("not excel", encoding="utf-8")
    assert try_parse_yandex_direct_xlsx(path) is None
