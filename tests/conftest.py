"""Shared pytest fixtures."""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest

# Demo AI in tests — never call external providers.
os.environ.setdefault("PPC_FORCE_DEMO_AI", "1")


@pytest.fixture
def make_material():
    """Factory for lightweight AuditMaterial-like objects (no DB)."""

    def _factory(
        material_id: int,
        period: str,
        *,
        budget: float = 100_000,
        clicks: int = 1000,
        leads: int = 50,
        updated_at: datetime | None = None,
        excluded: bool = False,
        mtype: str = "manual_metrics",
        raw_content: str | None = None,
        extracted_text: str | None = None,
        excluded_from_analysis: bool | None = None,
        file_url: str | None = None,
        title: str | None = None,
    ):
        payload = {
            "period": period,
            "budget": budget,
            "clicks": clicks,
            "leads": leads,
        }
        if raw_content is None and mtype == "manual_metrics":
            raw_content = json.dumps(payload, ensure_ascii=False)
        return SimpleNamespace(
            id=material_id,
            type=mtype,
            title=title,
            raw_content=raw_content,
            extracted_text=extracted_text,
            file_url=file_url,
            excluded_from_analysis=excluded if excluded_from_analysis is None else excluded_from_analysis,
            excluded_from_report=False,
            needs_review=False,
            exclusion_reason=None,
            status="ready",
            updated_at=updated_at or datetime(2026, 1, 1, tzinfo=timezone.utc),
        )

    return _factory


@pytest.fixture
def make_project(make_material):
    """Factory for AuditProject-like objects with materials list."""

    def _factory(materials: list | None = None):
        return SimpleNamespace(
            id=1,
            materials=materials or [],
            active_metrics_material_id=None,
        )

    return _factory


@pytest.fixture
def minimal_direct_xlsx(tmp_path: Path) -> Path:
    """Minimal Yandex Direct campaign statistics export for parser tests."""
    from openpyxl import Workbook

    path = tmp_path / "direct_2026-04-01_2026-04-30.xlsx"
    wb = Workbook()
    ws = wb.active
    ws.title = "Кампании"
    ws.append(["Клиент: Тестовый клиент"])
    ws.append(["Период: 01.04.2026 — 30.04.2026"])
    ws.append([])
    ws.append(["№ кампании", "Название кампании", "Расход, ₽", "Клики", "Конверсии", "CR, %", "CPA, ₽"])
    ws.append(["1001", "Поиск — бренд", 150_000.50, 3200, 45, 1.4, 3333.34])
    ws.append(["1002", "РСЯ — ретarget", 80_000, 5100, 22, 0.43, 3636.36])
    ws.append(["", "Итого", 230_000.50, 8300, 67, None, None])
    wb.save(path)
    wb.close()
    return path
