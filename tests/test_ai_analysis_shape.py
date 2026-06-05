"""Ensure incomplete AI payloads pass schema validation."""
from __future__ import annotations

from app.schemas import AIAnalysisResult
from app.services.ai_service import ensure_ai_analysis_shape


def test_ensure_ai_analysis_shape_fills_missing_sections():
    raw = {
        "audit_summary": {
            "client_problem": "Дорогие заявки",
            "main_risk": "Потери бюджета",
            "priority": "high",
            "short_conclusion": "Нужна оптимизация",
        },
        "metrics": {"period": "май 2026", "budget": 1000.0, "clicks": 10, "leads": 2},
        "findings": [],
        "global_needs_review": False,
        "global_review_reasons": [],
        "enrichment_coverage": {"stubs_created": 2},
    }
    shaped = ensure_ai_analysis_shape(raw, input_data={"direct_statistics": {}})
    AIAnalysisResult.model_validate(shaped)
    assert isinstance(shaped["charts"], list)
    assert isinstance(shaped["schemes"], list)
    assert isinstance(shaped["commercial_offer"], dict)
    assert shaped["global_needs_review"] is True
