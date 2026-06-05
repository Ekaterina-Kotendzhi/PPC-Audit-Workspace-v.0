"""Detect Direct setup screenshot kinds from metadata or title/OCR."""
from __future__ import annotations

import json
from typing import Any

from app.models import AuditMaterial, AuditProject

SETUP_KIND_LABELS = {
    "structure": "Структура кампаний",
    "strategy": "Стратегия и цели",
    "adjustments": "Корректировки ставок",
    "creative": "Тексты объявлений",
    "other": "Прочее",
}

_SETUP_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("structure", ("структур", "список кампан", "кампани", "поиск |", "рся |", "тип кампан")),
    ("strategy", ("стратег", "максимум конверс", "оптимизация конверс", "целевые действ", "бюджет в неделю", "обучилась")),
    ("adjustments", ("корректиров", "младше 18", "смартфон", "десктоп", "планшет")),
    ("creative", ("объявл", "предпросмотр", "заголов", "быстрые ссыл", "текст объяв")),
]


def infer_direct_setup_kind(title: str = "", text: str = "") -> str:
    blob = f"{title} {text}".lower()
    for kind, keys in _SETUP_KEYWORDS:
        if any(k in blob for k in keys):
            return kind
    return "other"


def _kind_from_title(title: str) -> str:
    """Explicit marketer title beats stale metadata (e.g. all tagged «structure»)."""
    t = (title or "").strip().lower()
    if not t:
        return "other"
    if "стратег" in t:
        return "strategy"
    if "корректиров" in t:
        return "adjustments"
    if "креатив" in t or "объявл" in t:
        return "creative"
    if "структур" in t or ("кампан" in t and "список" in t):
        return "structure"
    return "other"


def _ocr_text_for_screenshot(material: AuditMaterial, project: AuditProject) -> str:
    title = (material.title or "").strip()
    for mat in project.materials or []:
        if getattr(mat, "type", None) != "screenshot_ocr":
            continue
        ocr_title = mat.title or ""
        if title and (title in ocr_title or ocr_title.endswith(title)):
            return (mat.extracted_text or mat.raw_content or "")[:4000]
    return (getattr(material, "extracted_text", None) or "")[:4000]


def screenshot_setup_kind(material: AuditMaterial) -> str:
    title_kind = _kind_from_title(getattr(material, "title", "") or "")
    if title_kind != "other":
        return title_kind
    raw = getattr(material, "raw_content", None)
    if raw:
        try:
            meta = json.loads(raw)
            if isinstance(meta, dict):
                kind = str(meta.get("direct_setup_kind") or "other").strip().lower()
                if kind in SETUP_KIND_LABELS and kind != "other":
                    return kind
        except (json.JSONDecodeError, TypeError):
            pass
    return infer_direct_setup_kind(getattr(material, "title", "") or "", getattr(material, "extracted_text", "") or "")


def screenshot_setup_kind_for_project(material: AuditMaterial, project: AuditProject) -> str:
    title = (material.title or "").strip()
    title_kind = _kind_from_title(title)
    if title_kind != "other":
        return title_kind
    ocr_text = _ocr_text_for_screenshot(material, project)
    inferred = infer_direct_setup_kind(title, ocr_text)
    if inferred != "other":
        return inferred
    return screenshot_setup_kind(material)


def collect_direct_setup_kinds(project: AuditProject) -> dict[str, Any]:
    """Screenshots grouped by detected setup kind (for coverage + health UI)."""
    by_kind: dict[str, list[dict[str, Any]]] = {k: [] for k in SETUP_KIND_LABELS if k != "other"}
    for mat in project.materials or []:
        if getattr(mat, "type", None) != "screenshot":
            continue
        kind = screenshot_setup_kind_for_project(mat, project)
        if kind == "other":
            continue
        by_kind.setdefault(kind, []).append({
            "material_id": mat.id,
            "title": mat.title or "",
            "kind": kind,
            "label": SETUP_KIND_LABELS.get(kind, kind),
        })
    kinds_found = [k for k, items in by_kind.items() if items]
    return {
        "kinds": kinds_found,
        "kinds_count": len(kinds_found),
        "screenshots_count": sum(len(v) for v in by_kind.values()),
        "by_kind": {k: v for k, v in by_kind.items() if v},
        "sufficient": len(kinds_found) >= 2,
    }


def merge_setup_kind_into_raw(raw_content: str | None, kind: str) -> str:
    kind = (kind or "other").strip().lower()
    if kind not in SETUP_KIND_LABELS:
        kind = "other"
    meta: dict[str, Any] = {}
    if raw_content:
        try:
            parsed = json.loads(raw_content)
            if isinstance(parsed, dict):
                meta = parsed
        except (json.JSONDecodeError, TypeError):
            meta = {}
    meta["direct_setup_kind"] = kind
    return json.dumps(meta, ensure_ascii=False)
