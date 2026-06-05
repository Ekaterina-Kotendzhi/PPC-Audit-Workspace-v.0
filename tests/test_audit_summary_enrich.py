from app.services.audit_summary_enrich_service import (
    enrich_audit_summary,
    humanize_main_risk,
    humanize_performance_detail,
)


def test_humanize_performance_detail_waste():
    out = humanize_performance_detail(
        "10 условий ≥500 ₽ без лидов, сумма 12012.0 ₽.",
        "Расход без лидов в условиях показа",
    )
    assert "≥" not in out
    assert "12 012" in out
    assert "заявк" in out.lower()


def test_humanize_rule_title_risk():
    out = humanize_main_risk("Расход без лидов в условиях показа")
    assert "условиях показа" not in out or "бюджета" in out
    assert "заявок" in out.lower()


def test_enrich_fills_short_conclusion():
    data = {
        "audit_summary": {
            "client_problem": "Высокий CPL.",
            "main_risk": "Расход без лидов в условиях показа",
            "priority": "high",
            "short_conclusion": "",
        },
        "commercial_offer": {"next_step": "Созвон и согласование плана."},
        "findings": [],
    }
    data, changed = enrich_audit_summary(
        data,
        {"direct_statistics": {"health": {"action_plan": {"prioritized": []}}}},
    )
    assert data["audit_summary"]["short_conclusion"]
    assert "Расход без лидов в условиях показа" != data["audit_summary"]["main_risk"]
    assert changed


def test_force_refresh_rebuilds_summary():
    data = {
        "audit_summary": {
            "client_problem": "Старое.",
            "main_risk": "Расход без лидов в условиях показа",
            "priority": "high",
            "short_conclusion": "Старое заключение достаточной длины для skip.",
        },
        "metrics": {"budget": 72910, "leads": 69, "cpl": 1056.67},
        "commercial_offer": {"next_step": "Созвон."},
        "findings": [],
    }
    inp = {
        "direct_statistics": {
            "health": {
                "health_score": 65,
                "performance_issues": [
                    {
                        "title": "Расход без лидов в условиях показа",
                        "detail": "12 012 ₽ ушло на условия без заявок.",
                    }
                ],
                "action_plan": {
                    "prioritized": [{"horizon": "1–3 дня", "action": "Добавить минус-слова"}]
                },
            }
        }
    }
    data, _ = enrich_audit_summary(data, inp, force_refresh=True)
    assert "Старое." not in data["audit_summary"]["client_problem"]
    assert "заявок" in data["audit_summary"]["client_problem"].lower()
    assert "минус" in data["audit_summary"]["short_conclusion"].lower()
    assert data["audit_summary"]["priority"] == "medium"


def test_force_refresh_humanizes_technical_detail():
    data = {
        "audit_summary": {},
        "metrics": {"budget": 72910, "leads": 69},
        "commercial_offer": {"next_step": "Обсудить детали коммерческого предложения."},
        "findings": [],
    }
    inp = {
        "direct_statistics": {
            "health": {
                "health_score": 65,
                "performance_issues": [
                    {
                        "title": "Расход без лидов в условиях показа",
                        "detail": "10 условий ≥500 ₽ без лидов, сумма 12012.0 ₽.",
                    }
                ],
                "action_plan": {
                    "prioritized": [{"action": "Добавить минус-слова"}]
                },
            }
        }
    }
    data, _ = enrich_audit_summary(data, inp, force_refresh=True)
    risk = data["audit_summary"]["main_risk"]
    assert "≥" not in risk
    assert "12 012" in risk
    assert "минус" in data["audit_summary"]["short_conclusion"].lower()
    assert "Обсудить детали" not in data["audit_summary"]["short_conclusion"]
