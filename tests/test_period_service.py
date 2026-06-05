"""Tests for KPI period parsing and sorting."""
from __future__ import annotations

import pytest

from app.services.period_service import (
    is_valid_period,
    parse_direct_month_label,
    parse_period,
    period_sort_key,
)


@pytest.mark.parametrize(
    "raw,expected_display",
    [
        ("апрель 2026", "апрель 2026"),
        ("04.2026", "апрель 2026"),
        ("01.04.2026 — 30.04.2026", "01.04.2026 — 30.04.2026"),
    ],
)
def test_parse_period_formats(raw: str, expected_display: str):
    parsed = parse_period(raw)
    assert parsed["display"] == expected_display
    assert parsed["valid"] is True


def test_parse_period_rejects_iso_dash_as_range():
    """2026-04 is parsed as a date range and fails — use 04.2026 instead."""
    with pytest.raises(ValueError):
        parse_period("2026-04")


def test_parse_period_rejects_empty():
    with pytest.raises(ValueError):
        parse_period("")


def test_parse_period_rejects_inverted_range():
    with pytest.raises(ValueError, match="раньше"):
        parse_period("30.04.2026 — 01.04.2026")


def test_is_valid_period():
    assert is_valid_period("май 2026") is True
    assert is_valid_period("") is False
    assert is_valid_period("???") is False


def test_period_sort_key_chronological():
    assert period_sort_key("март 2026") < period_sort_key("апрель 2026")
    assert period_sort_key("апрель 2026") < period_sort_key("май 2026")


def test_parse_direct_month_label():
    assert parse_direct_month_label("янв 2026") == "январь 2026"
    assert parse_direct_month_label("апрель 2026") == "апрель 2026"
