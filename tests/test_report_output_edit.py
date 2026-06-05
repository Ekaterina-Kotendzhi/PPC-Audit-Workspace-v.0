"""Tests for manual report output edits and period genitive labels."""
from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from app.services.period_service import period_label_preposition_s
from app.services.report_output_edit_service import patch_report_output


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("июнь 2026", "июня 2026"),
        ("май 2026", "мая 2026"),
        ("апрель 2026", "апреля 2026"),
    ],
)
def test_period_label_preposition_s(raw: str, expected: str):
    assert period_label_preposition_s(raw) == expected


def test_patch_report_output_merges_summary_and_offer():
    project = SimpleNamespace(id=1)
    payload = {
        "audit_summary": {
            "client_problem": "old",
            "main_risk": "risk",
            "priority": "medium",
            "short_conclusion": "step",
        },
        "commercial_offer": {
            "proposal_title": "КП",
            "recommended_services": ["a"],
            "estimated_work_days": 10,
            "sales_argument": "eff",
            "next_step": "call",
        },
    }
    run = SimpleNamespace(output_json=json.dumps(payload, ensure_ascii=False))
    with patch(
        "app.services.report_output_edit_service.latest_run",
        return_value=run,
    ):
        result = patch_report_output(
            project,
            audit_summary={"client_problem": "new problem", "priority": "high"},
            commercial_offer={"proposal_title": "Новое КП", "recommended_services": ["x", "y"]},
        )
    assert result["audit_summary"]["client_problem"] == "new problem"
    assert result["audit_summary"]["priority"] == "high"
    assert result["commercial_offer"]["proposal_title"] == "Новое КП"
    saved = json.loads(run.output_json)
    assert saved["commercial_offer"]["recommended_services"] == ["x", "y"]
