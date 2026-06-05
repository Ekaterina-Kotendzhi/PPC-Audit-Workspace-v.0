"""User-controlled slices of audit context sent to external AI (cost control)."""
from __future__ import annotations

from typing import Any

# Direct summary = health score, risk catalog, monthly KPI — not raw Excel sheets.
AI_CONTEXT_OPTION_KEYS = (
    "send_direct_summary",
    "send_notes",
    "send_screenshots_ocr",
    "send_setup_screenshots",
    "send_direct_campaign_detail",
    "send_direct_conditions",
    "send_other_documents",
)

NOTE_LIKE_MATERIAL_TYPES = frozenset({"text_note", "audio_transcript"})
OTHER_DOCUMENT_MATERIAL_TYPES = frozenset({"document", "table"})


def material_allowed_by_context_options(mtype: str, opts: dict[str, bool]) -> bool:
    """Gate materials list in AI prompt by modal checkboxes (M2 context flags)."""
    normalized = (mtype or "").strip()
    if normalized in NOTE_LIKE_MATERIAL_TYPES:
        return bool(opts.get("send_notes"))
    if normalized in OTHER_DOCUMENT_MATERIAL_TYPES:
        return bool(opts.get("send_other_documents"))
    return True


DEFAULT_AI_CONTEXT_OPTIONS: dict[str, bool] = {
    "send_direct_summary": True,
    "send_notes": False,
    "send_screenshots_ocr": False,
    "send_setup_screenshots": False,
    "send_direct_campaign_detail": False,
    "send_direct_conditions": False,
    "send_other_documents": False,
}


def normalize_ai_context_options(raw: dict[str, Any] | None) -> dict[str, bool]:
    """Merge user/modal flags with cost-saving defaults."""
    opts = dict(DEFAULT_AI_CONTEXT_OPTIONS)
    if not raw:
        return opts
    nested = raw.get("context")
    if isinstance(nested, dict):
        raw = {**raw, **nested}
    for key in AI_CONTEXT_OPTION_KEYS:
        if key in raw:
            opts[key] = bool(raw[key])
    return opts


def context_options_from_privacy(privacy_options: dict[str, Any] | None) -> dict[str, bool]:
    return normalize_ai_context_options(privacy_options)


def context_included_summary(options: dict[str, bool]) -> dict[str, bool]:
    return {key: bool(options.get(key)) for key in AI_CONTEXT_OPTION_KEYS}


def all_ai_context_options_enabled() -> dict[str, bool]:
    return {key: True for key in AI_CONTEXT_OPTION_KEYS}
