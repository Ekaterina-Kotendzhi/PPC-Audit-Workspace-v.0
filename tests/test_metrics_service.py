"""Tests for manual KPI validation and derived metrics."""
from __future__ import annotations

import pytest

from app.services.metrics_service import (
    calculate_derived_metrics,
    minimum_metrics_ready,
    validate_metrics_payload,
)


def test_minimum_metrics_ready_requires_core_fields():
    assert minimum_metrics_ready({"period": "апрель 2026", "budget": 100_000, "clicks": 1000, "leads": 50})
    assert minimum_metrics_ready({"period": "апрель 2026", "budget": 100_000, "clicks": 1000}) is False
    assert minimum_metrics_ready({"period": "", "budget": 100_000, "clicks": 1000, "leads": 50}) is False


def test_calculate_derived_metrics_cpl_cpa_romi():
    raw = {
        "period": "апрель 2026",
        "budget": 100_000,
        "clicks": 2000,
        "leads": 100,
        "sales": 20,
        "revenue": 500_000,
    }
    result = calculate_derived_metrics(raw)
    assert result["cpl"] == 1000.0
    assert result["cpa"] == 5000.0
    assert result["romi"] == 400.0
    assert result["needs_review"] is False


def test_calculate_derived_metrics_skips_derived_for_small_budget():
    raw = {"period": "апрель 2026", "budget": 50, "clicks": 10, "leads": 2}
    result = calculate_derived_metrics(raw)
    assert result["cpl"] is None
    assert "меньше 100" in (result.get("review_reason") or "")


def test_validate_metrics_payload_normalizes_period():
    normalized, reasons = validate_metrics_payload({
        "period": "04.2026",
        "budget": 100_000,
        "clicks": 500,
        "leads": 25,
    })
    assert normalized["period"] == "апрель 2026"
    assert normalized["period_kind"] == "month"
    assert "Не указан период" not in reasons


def test_validate_metrics_payload_rejects_negative_budget():
    with pytest.raises(ValueError, match="отрицательным"):
        validate_metrics_payload({"period": "апрель 2026", "budget": -1, "clicks": 1, "leads": 1})
