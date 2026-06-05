"""Tests for multi-period KPI selection (latest month wins)."""
from __future__ import annotations

from datetime import datetime, timezone

from app.services.metrics_periods_service import (
    ensure_active_metrics_material_id,
    list_metrics_period_rows,
    list_metrics_periods,
    load_active_manual_metrics_dict,
    resolve_latest_period_metrics_material,
)


def test_list_metrics_period_rows_sorted_and_deduped(make_material, make_project):
    march_old = make_material(
        1,
        "март 2026",
        updated_at=datetime(2026, 3, 10, tzinfo=timezone.utc),
    )
    march_new = make_material(
        2,
        "март 2026",
        budget=120_000,
        updated_at=datetime(2026, 3, 20, tzinfo=timezone.utc),
    )
    may = make_material(
        3,
        "май 2026",
        budget=150_000,
        updated_at=datetime(2026, 5, 5, tzinfo=timezone.utc),
    )
    project = make_project([march_old, march_new, may])

    rows = list_metrics_period_rows(project)
    assert len(rows) == 2
    assert rows[0]["period"] == "март 2026"
    assert rows[0]["material_id"] == 2
    assert rows[1]["period"] == "май 2026"
    assert rows[1]["material_id"] == 3


def test_resolve_latest_period_picks_last_month(make_material, make_project):
    materials = [
        make_material(1, "январь 2026"),
        make_material(2, "март 2026"),
        make_material(3, "февраль 2026"),
    ]
    project = make_project(materials)
    latest = resolve_latest_period_metrics_material(project)
    assert latest is not None
    assert latest.id == 2
    assert latest.raw_content and "март 2026" in latest.raw_content


def test_active_metrics_syncs_to_latest(make_material, make_project):
    project = make_project([
        make_material(1, "март 2026"),
        make_material(2, "апрель 2026"),
    ])
    project.active_metrics_material_id = 1

    mat_id = ensure_active_metrics_material_id(project)
    assert mat_id == 2
    assert project.active_metrics_material_id == 2


def test_list_metrics_periods_marks_latest_active(make_material, make_project):
    project = make_project([
        make_material(1, "март 2026"),
        make_material(2, "апрель 2026"),
    ])
    periods = list_metrics_periods(project)
    assert periods[0]["is_active"] is False
    assert periods[1]["is_active"] is True


def test_load_active_manual_metrics_dict(make_material, make_project):
    project = make_project([
        make_material(1, "март 2026", budget=50_000, clicks=500, leads=10),
        make_material(2, "апрель 2026", budget=80_000, clicks=800, leads=20),
    ])
    metrics = load_active_manual_metrics_dict(project)
    assert metrics["period"] == "апрель 2026"
    assert metrics["budget"] == 80_000
    assert metrics["clicks"] == 800
    assert metrics["leads"] == 20


def test_empty_project_returns_none_active(make_project):
    project = make_project([])
    assert resolve_latest_period_metrics_material(project) is None
    metrics = load_active_manual_metrics_dict(project)
    assert metrics["period"] is None
    assert metrics["budget"] is None
