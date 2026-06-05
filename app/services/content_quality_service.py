"""Heuristics for PPC-relevant vs noise content."""
from __future__ import annotations

import re

PPC_KEYWORDS = (
    "директ", "direct", "реклам", "кампан", "бюджет", "клик", "cpc", "cpm", "cpl", "cpa",
    "romi", "roi", "лид", "заявк", "конвер", "метрик", "utm", "crm", "яндекс", "google ads",
    "ctr", "показ", "расход", "выручк", "продаж", "семант", "ключев", "минус", "фраз",
    "фид", "товарн", "корзин", "аналит", "метрик", "кабинет", "объявлен",
)

NOISE_PATTERNS = (
    r"чист(ить|и)\s+зуб",
    r"сосиск",
    r"поиграл",
    r"игр[аы]",
    r"pytest",
    r"тестовый клиент",
)


def looks_ppc_relevant(text: str) -> bool:
    low = (text or "").lower()
    if len(low.strip()) < 20:
        return False
    if any(re.search(p, low) for p in NOISE_PATTERNS):
        return False
    return any(kw in low for kw in PPC_KEYWORDS)


def suggest_review_for_content(text: str, material_type: str) -> str | None:
    """Return review reason if content looks irrelevant for PPC audit."""
    if material_type not in {"audio_transcript", "text_note", "document"}:
        return None
    body = (text or "").strip()
    if len(body) < 30:
        return None
    if looks_ppc_relevant(body):
        return None
    return "Текст не похож на данные PPC-аудита — проверьте или исключите из анализа"
