"""Русские подписи «Яндекс Директ» для API (согласовано с frontend direct-copy.js)."""

HEALTH_SCORE_TITLE = "Оценка здоровья кабинета"
HEALTH_SCORE_LABEL = "Оценка кабинета"
SLICE_TITLE = "Срез Яндекс Директ"
FINDING_RULE = "Проверка по Excel"


def health_missing(*, with_conditions: bool = False) -> str:
    base = "Нет оценки кабинета — загрузите Excel Мастер отчёта"
    if with_conditions:
        return f"{base} с условиями показа."
    return f"{base}."


def health_fact_line(score: object, grade: object) -> str:
    if score is None and not grade:
        return ""
    s = score if score is not None else "—"
    g = grade or "—"
    return f"{HEALTH_SCORE_LABEL}: {s}/100, оценка {g}."
