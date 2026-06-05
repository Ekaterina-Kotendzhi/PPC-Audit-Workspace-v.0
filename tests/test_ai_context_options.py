"""AI context option flags filter materials sent to analysis."""
from __future__ import annotations

from types import SimpleNamespace

from app.services.ai_context_options import material_allowed_by_context_options
from app.services.ai_service import prepare_materials_json


def _mat(mid: int, mtype: str, *, in_ai: bool = True, text: str = "body") -> SimpleNamespace:
    return SimpleNamespace(
        id=mid,
        type=mtype,
        title=f"Mat {mid}",
        excluded_from_analysis=not in_ai,
        excluded_from_report=False,
        needs_review=False,
        review_reason=None,
        extracted_text=text,
        raw_content=None,
        file_url=None,
        confidence=None,
    )


def test_material_allowed_by_context_options():
    opts = {
        "send_notes": False,
        "send_other_documents": True,
    }
    assert material_allowed_by_context_options("text_note", opts) is False
    assert material_allowed_by_context_options("audio_transcript", opts) is False
    assert material_allowed_by_context_options("document", opts) is True
    assert material_allowed_by_context_options("screenshot", opts) is True

    opts2 = {"send_notes": True, "send_other_documents": False}
    assert material_allowed_by_context_options("document", opts2) is False
    assert material_allowed_by_context_options("table", opts2) is False
    assert material_allowed_by_context_options("text_note", opts2) is True


def test_prepare_materials_json_respects_other_documents_flag():
    project = SimpleNamespace(
        materials=[
            _mat(1, "document", text="doc text"),
            _mat(2, "text_note", text="note text"),
        ],
        active_metrics_material_id=None,
    )
    with_docs = prepare_materials_json(
        project,
        {"send_other_documents": True, "send_notes": True},
    )
    assert len(with_docs) == 2

    no_docs = prepare_materials_json(
        project,
        {"send_other_documents": False, "send_notes": True},
    )
    assert len(no_docs) == 1
    assert no_docs[0]["type"] == "text_note"

    notes_off = prepare_materials_json(
        project,
        {"send_other_documents": True, "send_notes": False},
    )
    assert len(notes_off) == 1
    assert notes_off[0]["type"] == "document"
