"""Normalize finding evidence: material links, short relevant quotes."""
from __future__ import annotations

import re
from typing import Any

MAT_REF_RE = re.compile(r"^mat_(\d+)$", re.IGNORECASE)
SKIP_EVIDENCE_TYPES = {"quality_guard", "system"}
MAX_QUOTE_LEN = 220
DOCUMENT_DUMP_MARKERS = (
    "тестовые данные",
    "информация о клиенте",
    "клиент:",
    "ниша:",
    "период анализа:",
    "цель аудита:",
)


def parse_material_ref(raw: Any) -> int | None:
    text = str(raw or "").strip()
    if not text or text in {"unknown", "manual_metrics"}:
        return None
    if text.isdigit():
        return int(text)
    match = MAT_REF_RE.match(text)
    if match:
        return int(match.group(1))
    return None


def build_materials_index(raw_materials: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
    index: dict[int, dict[str, Any]] = {}
    for mat in raw_materials or []:
        mid = parse_material_ref(mat.get("id"))
        if mid is not None:
            index[mid] = mat
    return index


def resolve_material_id(
    raw_id: Any,
    material_type: str | None,
    index: dict[int, dict[str, Any]],
) -> int | None:
    mid = parse_material_ref(raw_id)
    if mid is not None and mid in index:
        return mid
    mtype = str(material_type or "").strip()
    if mtype and mtype not in SKIP_EVIDENCE_TYPES:
        for candidate_id, mat in index.items():
            if str(mat.get("type") or "") == mtype:
                return candidate_id
    return None


def _keywords_from_finding(finding: dict[str, Any]) -> list[str]:
    blob = " ".join(
        str(finding.get(key) or "")
        for key in ("problem", "recommendation", "title", "area", "review_reason")
    ).lower()
    words = re.findall(r"[a-zа-яё0-9]{4,}", blob, flags=re.IGNORECASE)
    seen: set[str] = set()
    result: list[str] = []
    for word in words:
        key = word.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(key)
        if len(result) >= 12:
            break
    return result


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?…])\s+|\n+", text)
    return [part.strip() for part in parts if part and part.strip()]


def extract_relevant_quote(
    quote: str,
    *,
    problem: str = "",
    keywords: list[str] | None = None,
    max_len: int = MAX_QUOTE_LEN,
) -> str:
    text = re.sub(r"\s+", " ", str(quote or "").strip())
    if not text:
        return ""
    keys = keywords or _keywords_from_finding({"problem": problem})
    if keys:
        low = text.lower()
        for key in keys:
            pos = low.find(key)
            if pos == -1:
                continue
            start = max(0, pos - 80)
            snippet = text[start : start + max_len].strip()
            if start > 0:
                snippet = "…" + snippet
            if start + max_len < len(text):
                snippet = snippet.rstrip() + "…"
            return snippet[: max_len + 2]
        for sentence in _split_sentences(text):
            sentence_low = sentence.lower()
            if any(key in sentence_low for key in keys):
                if len(sentence) <= max_len:
                    return sentence
                return sentence[: max_len - 1].rstrip() + "…"
    if len(text) <= max_len:
        return text
    cut = text[:max_len]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip() + "…"


def is_weak_document_dump(quote: str, material_id: int | None) -> bool:
    low = str(quote or "").lower()
    if not low:
        return True
    marker_hits = sum(1 for marker in DOCUMENT_DUMP_MARKERS if marker in low)
    if marker_hits >= 2 and len(low) > 120:
        return True
    if material_id is None and len(low) > 160 and len(low) > 320:
        return True
    return False


def normalize_finding_evidence(
    finding: dict[str, Any],
    raw_materials: list[dict[str, Any]] | None,
) -> None:
    """Resolve material_id, shorten quotes, drop non-evidential dumps."""
    index = build_materials_index(raw_materials or [])
    keywords = _keywords_from_finding(finding)
    problem = str(finding.get("problem") or "")
    cleaned: list[dict[str, str]] = []

    for item in finding.get("evidence") or []:
        if not isinstance(item, dict):
            continue
        mtype = str(item.get("material_type") or "").strip()
        if mtype in SKIP_EVIDENCE_TYPES:
            cleaned.append(
                {
                    "material_id": str(item.get("material_id") or mtype),
                    "material_type": mtype,
                    "quote_or_description": str(item.get("quote_or_description") or "").strip(),
                }
            )
            continue

        mid = resolve_material_id(item.get("material_id"), mtype, index)
        raw_quote = str(item.get("quote_or_description") or "")
        if is_weak_document_dump(raw_quote, mid):
            continue
        quote = extract_relevant_quote(
            raw_quote,
            problem=problem,
            keywords=keywords,
        )
        if not quote or is_weak_document_dump(quote, mid):
            continue
        if mid is None and mtype != "manual_metrics":
            continue

        mat = index.get(mid) if mid is not None else None
        cleaned.append(
            {
                "material_id": str(mid) if mid is not None else str(item.get("material_id") or mtype),
                "material_type": str((mat or {}).get("type") or mtype or "document"),
                "quote_or_description": quote,
            }
        )

    had_evidence = bool(finding.get("evidence"))
    finding["evidence"] = cleaned
    if had_evidence and not any(
        e.get("material_type") not in SKIP_EVIDENCE_TYPES for e in cleaned
    ):
        finding["needs_review"] = True
        finding["review_reason"] = (
            finding.get("review_reason")
            or "AI не привязал доказательство к конкретному материалу — проверьте вручную"
        )
        if finding.get("evidence_level") not in (None, "none"):
            finding["evidence_level"] = "weak"
