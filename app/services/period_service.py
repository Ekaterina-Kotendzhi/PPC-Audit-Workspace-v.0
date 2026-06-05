"""Validate and normalize audit metric period strings."""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

MONTH_PREFIXES: list[tuple[str, int]] = [
    ("январ", 1), ("феврал", 2), ("март", 3), ("апрел", 4),
    ("май", 5), ("мая", 5), ("июн", 6), ("июл", 7), ("август", 8),
    ("сентябр", 9), ("октябр", 10), ("ноябр", 11), ("декабр", 12),
]

MONTH_DISPLAY = {
    1: "январь", 2: "февраль", 3: "март", 4: "апрель", 5: "май", 6: "июнь",
    7: "июль", 8: "август", 9: "сентябрь", 10: "октябрь", 11: "ноябрь", 12: "декабрь",
}

MONTH_GENITIVE = {
    1: "января", 2: "февраля", 3: "марта", 4: "апреля", 5: "мая", 6: "июня",
    7: "июля", 8: "августа", 9: "сентября", 10: "октября", 11: "ноября", 12: "декабря",
}

SHORT_MONTH_RU: dict[str, int] = {
    "янв": 1, "фев": 2, "мар": 3, "апр": 4, "май": 5, "июн": 6,
    "июл": 7, "авг": 8, "сен": 9, "окт": 10, "ноя": 11, "дек": 12,
}


def parse_direct_month_label(label: str) -> str:
    """«янв 2026» → «январь 2026» for parse_period."""
    text = (label or "").strip().lower().replace("ё", "е")
    parts = text.split()
    if len(parts) >= 2 and parts[0] in SHORT_MONTH_RU:
        year = int(parts[1])
        month = SHORT_MONTH_RU[parts[0]]
        return f"{MONTH_DISPLAY[month]} {year}"
    return (label or "").strip()

RANGE_SEP = re.compile(r"\s*[-–—]\s*")
DMY = re.compile(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$")
ISO_DAY = re.compile(r"^(\d{4})-(\d{2})-(\d{2})$")
MONTH_NUM = re.compile(r"^(\d{1,2})[./](\d{4})$")
YEAR_MONTH = re.compile(r"^(\d{4})-(\d{2})$")

INVALID_PERIOD_MESSAGE = (
    "Укажите период в формате «апрель 2026», «04.2026» или «01.04.2026 — 30.04.2026»"
)


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    from datetime import timedelta
    start = date(year, month, 1)
    if month == 12:
        end = date(year, 12, 31)
    else:
        end = date(year, month + 1, 1) - timedelta(days=1)
    return start, end


def _parse_dmy(text: str) -> date:
    m = DMY.match(text.strip())
    if not m:
        raise ValueError(INVALID_PERIOD_MESSAGE)
    day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return date(year, month, day)


def _parse_iso_day(text: str) -> date:
    m = ISO_DAY.match(text.strip())
    if not m:
        raise ValueError(INVALID_PERIOD_MESSAGE)
    return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))


def _parse_month_year_text(text: str) -> tuple[int, int]:
    lowered = text.strip().lower().replace("ё", "е")
    for prefix, month in MONTH_PREFIXES:
        if lowered.startswith(prefix):
            rest = lowered[len(prefix):].lstrip(" .")
            if rest.startswith(("ь", "я")):
                rest = rest[1:].lstrip(" .")
            if not rest.isdigit() or len(rest) != 4:
                raise ValueError("Укажите месяц и год, например: апрель 2026")
            year = int(rest)
            if year < 2000 or year > 2100:
                raise ValueError("Год должен быть между 2000 и 2100")
            return year, month
    raise ValueError(INVALID_PERIOD_MESSAGE)


def parse_period(raw: str) -> dict[str, Any]:
    """Parse period string. Raises ValueError if invalid."""
    text = (raw or "").strip()
    if len(text) < 2:
        raise ValueError(INVALID_PERIOD_MESSAGE)
    if len(text) == 1 or (len(text) < 6 and not any(ch.isdigit() for ch in text)):
        raise ValueError(INVALID_PERIOD_MESSAGE)

    if RANGE_SEP.search(text):
        parts = RANGE_SEP.split(text, maxsplit=1)
        if len(parts) != 2:
            raise ValueError(INVALID_PERIOD_MESSAGE)
        left, right = parts[0].strip(), parts[1].strip()
        try:
            start = _parse_dmy(left)
            end = _parse_dmy(right)
        except ValueError:
            try:
                start = _parse_iso_day(left)
                end = _parse_iso_day(right)
            except ValueError as exc:
                raise ValueError(INVALID_PERIOD_MESSAGE) from exc
        if end < start:
            raise ValueError("Дата окончания не может быть раньше даты начала")
        display = f"{start.strftime('%d.%m.%Y')} — {end.strftime('%d.%m.%Y')}"
        return {
            "display": display,
            "kind": "range",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "sort_key": (start.year, start.month, start.day),
            "valid": True,
        }

    m = MONTH_NUM.match(text)
    if m:
        month, year = int(m.group(1)), int(m.group(2))
        if not 1 <= month <= 12:
            raise ValueError(INVALID_PERIOD_MESSAGE)
        start, end = _month_bounds(year, month)
        return {
            "display": f"{MONTH_DISPLAY[month]} {year}",
            "kind": "month",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "sort_key": (year, month, 1),
            "valid": True,
        }

    m = YEAR_MONTH.match(text)
    if m:
        year, month = int(m.group(1)), int(m.group(2))
        if not 1 <= month <= 12:
            raise ValueError(INVALID_PERIOD_MESSAGE)
        start, end = _month_bounds(year, month)
        return {
            "display": f"{MONTH_DISPLAY[month]} {year}",
            "kind": "month",
            "start": start.isoformat(),
            "end": end.isoformat(),
            "sort_key": (year, month, 1),
            "valid": True,
        }

    if DMY.match(text):
        day = _parse_dmy(text)
        return {
            "display": day.strftime("%d.%m.%Y"),
            "kind": "day",
            "start": day.isoformat(),
            "end": day.isoformat(),
            "sort_key": (day.year, day.month, day.day),
            "valid": True,
        }

    if ISO_DAY.match(text):
        day = _parse_iso_day(text)
        return {
            "display": day.strftime("%d.%m.%Y"),
            "kind": "day",
            "start": day.isoformat(),
            "end": day.isoformat(),
            "sort_key": (day.year, day.month, day.day),
            "valid": True,
        }

    try:
        year, month = _parse_month_year_text(text)
    except ValueError:
        raise ValueError(INVALID_PERIOD_MESSAGE) from None
    start, end = _month_bounds(year, month)
    return {
        "display": f"{MONTH_DISPLAY[month]} {year}",
        "kind": "month",
        "start": start.isoformat(),
        "end": end.isoformat(),
        "sort_key": (year, month, 1),
        "valid": True,
    }


def is_valid_period(raw: str | None) -> bool:
    if not raw or not str(raw).strip():
        return False
    try:
        parse_period(str(raw))
        return True
    except ValueError:
        return False


def period_sort_key(raw: str | None) -> tuple[int, int, int]:
    if not raw:
        return (0, 0, 0)
    try:
        return tuple(parse_period(str(raw))["sort_key"])
    except ValueError:
        return (0, 0, 0)


def period_label_preposition_s(raw: str | None) -> str | None:
    """Месяц в родительном падеже для «с …»: «июнь 2026» → «июня 2026»."""
    text = (raw or "").strip()
    if not text:
        return None
    try:
        parsed = parse_period(text)
        if not parsed.get("valid"):
            return text
        year, month = parsed["sort_key"][0], parsed["sort_key"][1]
        return f"{MONTH_GENITIVE[month]} {year}"
    except ValueError:
        return text


def next_calendar_month_period(raw: str | None) -> str | None:
    """Следующий календарный месяц после опорного: «май 2026» → «июнь 2026»."""
    text = (raw or "").strip()
    if not text:
        return None
    try:
        parsed = parse_period(text)
        if not parsed.get("valid"):
            return None
        year, month = parsed["sort_key"][0], parsed["sort_key"][1]
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1
        return f"{MONTH_DISPLAY[month]} {year}"
    except ValueError:
        return None
