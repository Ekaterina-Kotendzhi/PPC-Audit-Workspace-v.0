"""Client PDF fragments — readable copy, no internal review banners."""
from app.services.client_report_render import (
    client_metrics_footer_html,
    render_client_cabinet_health,
    render_client_confirmed_observations,
    render_client_metrics_section,
    render_client_offer,
    render_client_summary,
    sanitize_client_report_text,
)


def test_metrics_footer_skips_internal_cpa_romi_review():
    html = client_metrics_footer_html({
        "needs_review": True,
        "review_reason": "Нет продаж — CPA требует проверки; Нет выручки — ROMI требует проверки",
        "sales": None,
        "revenue": None,
    })
    assert "Требует проверки" not in html
    assert "needs-review" not in html
    assert "CRM" in html or "Продажи" in html


def test_metrics_footer_shows_real_data_issues():
    html = client_metrics_footer_html({
        "needs_review": True,
        "review_reason": "Заявок больше, чем кликов — проверьте данные",
        "sales": 1,
        "revenue": 100,
    })
    assert "Уточнение по цифрам" in html
    assert "кликов" in html


def test_cabinet_health_client_section_no_excel_jargon():
    html = render_client_cabinet_health({
        "available": True,
        "health_score": 65,
        "grade": "C",
        "period": "янв 2026 — май 2026",
        "summary_explain": "Оценка кабинета: 65/100 (C). Основные зоны риска: семантика (−26).",
        "top_reasons": [
            {"title": "Расход без лидов", "detail": "12 012 ₽ ушло на условия без заявок."},
        ],
        "action_plan": [
            {"horizon": "1–3 дня", "action": "Добавить минус-слова", "title": "Минус-слова"},
        ],
    })
    assert "Период Excel" not in html
    assert "Мастер отчёт" not in html
    assert "Состояние рекламного кабинета" in html
    assert "cabinet-health-hero" in html
    assert "семантика (−26)" not in html
    assert "Расход без лидов" in html
    assert "Период анализа" in html


def test_sanitize_removes_mat_and_finding_tokens():
    raw = "Расход 12012.0 ₽ без лидов по условиям.\n[mat_21]\nВывод #31 подтверждён."
    clean = sanitize_client_report_text(raw)
    assert "[mat_" not in clean
    assert "Вывод #31" not in clean
    assert "12012" in clean
    assert "без лидов" in clean


def test_confirmed_observations_client_cards():
    html = render_client_confirmed_observations([
        {
            "area": "semantics",
            "problem": "Вывод #5: 10 условий без лидов.\n1. Добавить минус-слова\n2. Снизить ставки",
            "recommendation": "",
        },
    ])
    assert "client-observation" in html
    assert "Семантика" in html
    assert "[mat_" not in html
    assert "Вывод #5" not in html
    assert "client-observation-steps" in html


def test_summary_and_metrics_grid():
    summary_html = render_client_summary({
        "audit_summary": {
            "client_problem": "Высокий CPL",
            "main_risk": "Потери бюджета",
            "short_conclusion": "Оптимизация",
        },
        "priority_label": "Требует внимания",
        "is_preliminary": False,
    })
    assert "client-summary-grid" in summary_html
    metrics_html = render_client_metrics_section(
        [("Период", "май 2026"), ("Бюджет", "72 910 ₽")],
        {},
    )
    assert "kpi-grid" in metrics_html
    assert "metrics-table" not in metrics_html


def test_offer_client_layout():
    html = render_client_offer({
        "proposal_title": "Оптимизация Директа",
        "recommended_services": ["Анализ семантики", "Минус-слова"],
        "estimated_work_days": 10,
        "sales_argument": "Снизим CPL",
        "next_step": "Созвон",
    })
    assert "client-offer-section" in html
    assert "client-offer-services" in html
