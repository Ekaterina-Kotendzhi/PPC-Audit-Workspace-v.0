from __future__ import annotations

import re
from typing import Dict, List

RISKY_WEB_SPEECH_HINTS = [
    "неразборчиво",
    "текст может содержать ошибки",
    "распознано браузером",
]


def assess_transcript_quality(text: str, source: str = "manual", client_confidence: float | None = None, confirmed: bool = False) -> Dict[str, object]:
    """Простая проверка качества расшифровки.

    Web Speech API не возвращает стабильный серверный confidence, поэтому дополнительно
    учитываем источник, длину текста и факт ручного подтверждения маркетологом.
    """
    clean = (text or "").strip()
    reasons: List[str] = []
    score = 1.0

    if not clean:
        return {"confidence": 0.0, "needs_review": True, "review_reason": "Расшифровка отсутствует"}

    if len(clean) < 80:
        score -= 0.25
        reasons.append("расшифровка слишком короткая для надёжного анализа")

    words = re.findall(r"[А-Яа-яA-Za-z0-9]+", clean)
    unique_ratio = len(set(w.lower() for w in words)) / max(1, len(words))
    if len(words) > 20 and unique_ratio < 0.35:
        score -= 0.2
        reasons.append("много повторов, возможны ошибки распознавания")

    if source == "web_speech":
        score -= 0.25
        reasons.append("расшифровка через Web Speech API требует проверки")
        if not confirmed:
            score -= 0.2
            reasons.append("маркетолог не подтвердил расшифровку вручную")

    if source in {"external_stt", "server_stt"} and not confirmed:
        score -= 0.1
        reasons.append("автоматическая расшифровка не подтверждена человеком")

    if client_confidence is not None:
        try:
            score = min(score, max(0.0, min(1.0, float(client_confidence))))
        except (TypeError, ValueError):
            reasons.append("некорректная оценка уверенности распознавания")

    low = clean.lower()
    if any(hint in low for hint in RISKY_WEB_SPEECH_HINTS):
        score -= 0.15
        reasons.append("в тексте есть маркеры неуверенного распознавания")

    score = round(max(0.0, min(1.0, score)), 2)
    needs_review = score < 0.8 or bool(reasons) or (source == "web_speech") or (source in {"external_stt", "server_stt"} and not confirmed)
    return {
        "confidence": score,
        "needs_review": needs_review,
        "review_reason": "; ".join(dict.fromkeys(reasons)) if needs_review else None,
    }
