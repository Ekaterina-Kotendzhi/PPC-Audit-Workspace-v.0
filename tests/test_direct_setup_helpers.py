"""Setup screenshot kind detection from titles."""
from __future__ import annotations

from types import SimpleNamespace

from app.services.direct_setup_helpers import (
    _kind_from_title,
    screenshot_setup_kind_for_project,
)


def test_kind_from_title():
    assert _kind_from_title("Стратегия") == "strategy"
    assert _kind_from_title("Корректировки") == "adjustments"
    assert _kind_from_title("Креативы") == "creative"
    assert _kind_from_title("Структура") == "structure"


def test_title_overrides_stale_metadata():
    shot = SimpleNamespace(
        id=1,
        type="screenshot",
        title="Стратегия",
        raw_content='{"direct_setup_kind":"structure"}',
        extracted_text="",
    )
    project = SimpleNamespace(materials=[shot])
    assert screenshot_setup_kind_for_project(shot, project) == "strategy"
