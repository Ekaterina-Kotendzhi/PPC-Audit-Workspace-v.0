"""Tests for material AI inclusion rules."""
from __future__ import annotations

import json

from app.services.material_helpers import (
    apply_new_material_ai_defaults,
    material_for_ai,
    material_for_qa,
)


def test_new_materials_excluded_from_ai_by_default(make_material):
    note = make_material(
        1,
        "апрель 2026",
        mtype="text_note",
        raw_content=None,
        extracted_text="Заметка маркетолога",
    )
    apply_new_material_ai_defaults(note)
    assert note.excluded_from_analysis is True
    assert note.exclusion_reason == "Не отмечено для AI"
    assert material_for_ai(note) is False


def test_screenshot_always_in_ai_when_not_excluded(make_material):
    shot = make_material(
        1,
        "апрель 2026",
        mtype="screenshot",
        raw_content=None,
        excluded_from_analysis=False,
    )
    assert material_for_ai(shot) is True


def test_text_note_in_ai_when_has_content_and_not_excluded(make_material):
    note = make_material(
        1,
        "апрель 2026",
        mtype="text_note",
        raw_content=None,
        extracted_text="Клиент жалуется на CPL",
        excluded_from_analysis=False,
    )
    assert material_for_ai(note) is True


def test_audio_never_in_ai(make_material):
    audio = make_material(
        1,
        "апрель 2026",
        mtype="audio",
        file_url="/uploads/audio.mp3",
        excluded_from_analysis=False,
    )
    assert material_for_ai(audio) is False
    assert material_for_qa(audio) is True


def test_manual_metrics_in_ai_with_raw_content(make_material):
    metrics = make_material(
        1,
        "апрель 2026",
        mtype="manual_metrics",
        excluded_from_analysis=False,
    )
    assert material_for_ai(metrics) is True

    empty = make_material(
        2,
        "апрель 2026",
        mtype="manual_metrics",
        raw_content="",
        excluded_from_analysis=False,
    )
    assert material_for_ai(empty) is False


def test_marketer_ai_hint_enables_empty_text_note(make_material):
    meta = json.dumps({"marketer_ai_hint": "Важно: упал CR на мобильных"})
    note = make_material(
        1,
        "апрель 2026",
        mtype="text_note",
        raw_content=meta,
        extracted_text="",
        excluded_from_analysis=False,
    )
    assert material_for_ai(note) is True
