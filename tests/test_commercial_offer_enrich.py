from app.services.commercial_offer_enrich_service import (
    enrich_commercial_offer,
    is_generic_commercial_offer,
)


def test_detects_generic_offer():
    offer = {
        "proposal_title": "Оптимизация рекламных кампаний в Яндекс Директ",
        "recommended_services": [
            "Анализ семантики и условий показа",
            "Оптимизация бюджета и ставок",
            "Создание минус-слов",
            "Анализ креативов и посадочных страниц",
        ],
        "sales_argument": "Увеличение эффективности рекламных кампаний и снижение стоимости лидов.",
        "next_step": "Обсудить детали и утвердить план действий.",
        "estimated_work_days": 10,
        "forecast_scenarios": {
            "conservative": {"headline": "Увеличение лидов на 20%", "assumption": "x"},
            "target": {"headline": "Снижение CPL на 30%", "assumption": "y"},
        },
    }
    assert is_generic_commercial_offer(offer)


def test_force_refresh_builds_from_health():
    data = {
        "metrics": {"budget": 72910, "leads": 69, "cpl": 1057},
        "findings": [],
        "commercial_offer": {
            "proposal_title": "Оптимизация рекламных кампаний в Яндекс Директ",
            "recommended_services": ["Анализ семантики и условий показа"],
            "sales_argument": "Увеличение эффективности рекламных кампаний.",
            "next_step": "Обсудить детали и утвердить план действий.",
            "estimated_work_days": 10,
            "forecast_scenarios": {
                "conservative": {"headline": "Увеличение лидов на 20%", "assumption": "a"},
                "target": {"headline": "Снижение CPL на 30%", "assumption": "b"},
            },
        },
    }
    inp = {
        "niche": "Стоматология",
        "direct_statistics": {
            "health": {
                "performance_issues": [
                    {
                        "title": "Расход без лидов в условиях показа",
                        "action": "Добавить минус-слова по условиям без заявок",
                    }
                ],
                "action_plan": {
                    "prioritized": [
                        {
                            "horizon": "1–3 дня",
                            "action": "Добавить минус-слова по условиям без заявок",
                        }
                    ]
                },
            }
        },
    }
    data, changed = enrich_commercial_offer(data, inp, force_refresh=True)
    offer = data["commercial_offer"]
    assert changed
    assert "Оптимизация рекламных кампаний" not in offer["proposal_title"]
    assert "минус" in " ".join(offer["recommended_services"]).lower()
    assert "Обсудить детали" not in offer["next_step"]
    assert "1057" in offer["proposal_title"] or "CPL" in offer["proposal_title"]
    assert "20%" not in (offer.get("forecast_scenarios") or {}).get("conservative", {}).get("headline", "")
