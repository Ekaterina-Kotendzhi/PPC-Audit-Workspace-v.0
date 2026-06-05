"""Merge marketer notes into KPI for report, coverage, and AI analysis."""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditMaterial, AuditProject
from app.services.manual_metrics_service import (
    latest_manual_metrics_material,
    upsert_manual_metrics,
)
from app.services.metrics_periods_service import load_active_manual_metrics_dict, resolve_active_metrics_material
from app.services.metrics_extract_service import (
    KPI_FIELDS,
    collect_metrics_extract_payload,
    collect_metrics_from_material_types,
    extract_metrics_payload_from_text,
)
from app.services.metrics_service import calculate_derived_metrics

NOTE_SYNC_REVIEW = "Часть KPI подтянута из текстовой заметки — проверьте перед отчётом"
MARKETER_FOCUS_PREFIXES = (
    "фокус:",
    "важно:",
    "проверить:",
    "приоритет:",
    "цель:",
    "задача:",
    "обратить внимание:",
    "для ai:",
    "для аи:",
)


def _material_ts(material: AuditMaterial) -> datetime:
    from app.services.metrics_extract_service import _normalize_ts

    return _normalize_ts(getattr(material, "updated_at", None) or getattr(material, "created_at", None))


def _sorted_text_notes(project: AuditProject) -> list[AuditMaterial]:
    return sorted(
        [
            m
            for m in (project.materials or [])
            if m.type == "text_note" and not bool(getattr(m, "excluded_from_analysis", False))
        ],
        key=lambda m: (_material_ts(m), getattr(m, "id", 0)),
        reverse=True,
    )


def _has_structured_kpi(payload: dict[str, Any]) -> bool:
    core = ("budget", "clicks", "leads")
    return sum(1 for k in core if payload.get(k) not in (None, "")) >= 2


def effective_metrics_raw(project: AuditProject) -> dict[str, Any]:
    """
    KPI for report, coverage, and quality guard:
    manual_metrics + gaps from notes (priority) and documents.
    Newer structured note overrides stale manual_metrics KPI.
    """
    manual = load_active_manual_metrics_dict(project)
    from_notes = collect_metrics_from_material_types(project, {"text_note"})
    from_docs = collect_metrics_from_material_types(project, {"document"})

    result: dict[str, Any] = {**from_docs, **from_notes}
    for key, value in manual.items():
        if value not in (None, ""):
            result[key] = value

    latest_note = _sorted_text_notes(project)[0] if _sorted_text_notes(project) else None
    manual_mat = latest_manual_metrics_material(project)
    if latest_note:
        note_text = (latest_note.extracted_text or latest_note.raw_content or "").strip()
        note_kpi = extract_metrics_payload_from_text(note_text)
        if _has_structured_kpi(note_kpi):
            note_ts = _material_ts(latest_note)
            manual_ts = _material_ts(manual_mat) if manual_mat else None
            if manual_mat is None or note_ts >= manual_ts:
                for key in KPI_FIELDS:
                    if note_kpi.get(key) not in (None, ""):
                        result[key] = note_kpi[key]

    return result


def effective_metrics(project: AuditProject) -> dict[str, Any]:
    return calculate_derived_metrics(effective_metrics_raw(project))


def build_marketer_notes_brief(project: AuditProject, *, max_notes: int = 6, max_chars: int = 6000) -> str:
    """Text block for AI: recent notes + explicit focus lines."""
    notes = _sorted_text_notes(project)
    if not notes:
        return "Нет"

    parts: list[str] = []
    used = 0
    for note in notes[:max_notes]:
        title = (note.title or "Заметка").strip()
        body = (note.extracted_text or note.raw_content or "").strip()
        if not body:
            continue
        focus_lines = []
        for line in body.splitlines():
            low = line.strip().lower()
            if any(low.startswith(p) for p in MARKETER_FOCUS_PREFIXES):
                focus_lines.append(line.strip())
        chunk = f"### {title}\n"
        if focus_lines:
            chunk += "Фокус маркетолога:\n" + "\n".join(f"- {ln}" for ln in focus_lines) + "\n\n"
        remaining = max_chars - used - len(chunk)
        if remaining <= 0:
            break
        chunk += body[:remaining] + ("…" if len(body) > remaining else "")
        parts.append(chunk)
        used += len(chunk)
        if used >= max_chars:
            break

    return "\n\n".join(parts) if parts else "Нет"


def sync_manual_metrics_from_note(
    project: AuditProject,
    db: Session,
    note: AuditMaterial,
    *,
    merge_project_sources: bool = True,
) -> AuditMaterial | None:
    """
    After add/update text note: merge KPI into manual_metrics for report/analysis.
    Uses note text; optionally fills gaps from other notes (not documents on note save).
    """
    note_text = (note.extracted_text or note.raw_content or "").strip()
    payload = extract_metrics_payload_from_text(note_text)
    if merge_project_sources:
        for key, value in collect_metrics_from_material_types(project, {"text_note"}).items():
            if key not in payload and value not in (None, ""):
                payload[key] = value
    if not _has_structured_kpi(payload) and not payload.get("period"):
        return None

    try:
        material = upsert_manual_metrics(project.id, payload, db, project=project)
    except ValueError:
        return None

    reasons: list[str] = []
    if material.review_reason:
        reasons.append(material.review_reason)
    if NOTE_SYNC_REVIEW not in reasons:
        reasons.append(NOTE_SYNC_REVIEW)
    material.review_reason = "; ".join(dict.fromkeys(reasons))
    material.needs_review = True
    from app.services.material_helpers import sync_material_status

    sync_material_status(material)
    return material


def effective_metrics_for_ai_prompt(project: AuditProject) -> dict[str, Any]:
    """Derived KPI JSON for the analysis prompt."""
    metrics = effective_metrics(project)
    return {k: metrics.get(k) for k in list(KPI_FIELDS) + ["cpl", "cpa", "romi", "needs_review", "review_reason"] if k in metrics}


def _primary_kpi_source_kind(project: AuditProject) -> str | None:
    """Which material type wins in effective_metrics_raw for structured KPI (FR-UX-11)."""
    manual_mat = resolve_active_metrics_material(project)
    manual_dict = load_active_manual_metrics_dict(project)
    has_manual_core = manual_mat and any(manual_dict.get(k) not in (None, "") for k in KPI_FIELDS)

    notes = _sorted_text_notes(project)
    latest_note = notes[0] if notes else None
    if latest_note:
        text = (latest_note.extracted_text or latest_note.raw_content or "").strip()
        note_kpi = extract_metrics_payload_from_text(text)
        if _has_structured_kpi(note_kpi):
            note_ts = _material_ts(latest_note)
            manual_ts = _material_ts(manual_mat) if manual_mat else None
            if manual_mat is None or note_ts >= manual_ts:
                return "text_note"

    if has_manual_core:
        return "manual_metrics"

    for doc in sorted(
        [m for m in (project.materials or []) if m.type == "document"],
        key=lambda m: (_material_ts(m), getattr(m, "id", 0)),
        reverse=True,
    ):
        text = (doc.extracted_text or doc.raw_content or "").strip()
        doc_kpi = extract_metrics_payload_from_text(text)
        if _has_structured_kpi(doc_kpi) or doc_kpi.get("period"):
            return "document"

    if latest_note:
        return "text_note"
    return "manual_metrics" if has_manual_core else None


def build_metrics_kpi_provenance(project: AuditProject) -> dict[str, Any]:
    """Human-readable KPI sources for the report tab (FR-UX-11)."""
    parts: list[dict[str, Any]] = []

    manual_mat = resolve_active_metrics_material(project)
    manual_dict = load_active_manual_metrics_dict(project)
    if manual_mat and any(manual_dict.get(k) not in (None, "") for k in KPI_FIELDS):
        parts.append({
            "kind": "manual_metrics",
            "title": (manual_mat.title or "Метрики").strip(),
            "updated_at": _material_ts(manual_mat).isoformat(),
        })

    for note in _sorted_text_notes(project):
        text = (note.extracted_text or note.raw_content or "").strip()
        note_kpi = extract_metrics_payload_from_text(text)
        if not _has_structured_kpi(note_kpi) and not note_kpi.get("period"):
            continue
        parts.append({
            "kind": "text_note",
            "title": (note.title or "Заметка").strip(),
            "updated_at": _material_ts(note).isoformat(),
        })
        break

    for doc in sorted(
        [m for m in (project.materials or []) if m.type == "document"],
        key=lambda m: (_material_ts(m), getattr(m, "id", 0)),
        reverse=True,
    ):
        text = (doc.extracted_text or doc.raw_content or "").strip()
        doc_kpi = extract_metrics_payload_from_text(text)
        if _has_structured_kpi(doc_kpi) or doc_kpi.get("period"):
            parts.append({
                "kind": "document",
                "title": (doc.title or "Документ").strip(),
                "updated_at": _material_ts(doc).isoformat(),
            })
            break

    if not parts:
        return {"parts": [], "summary_line": None, "primary_kind": None}

    from app.services.material_helpers import material_type_label

    fragments: list[str] = []
    for item in parts:
        kind_label = material_type_label(item["kind"])
        ts = item.get("updated_at") or ""
        date_bit = ts[:10] if ts else ""
        fragments.append(f'{kind_label} «{item["title"]}»' + (f' ({date_bit})' if date_bit else ''))

    primary_kind = _primary_kpi_source_kind(project)
    primary_line = None
    if primary_kind:
        primary_item = next((p for p in parts if p["kind"] == primary_kind), parts[0])
        ts = primary_item.get("updated_at") or ""
        date_bit = ts[:10] if ts else ""
        primary_line = (
            f'{material_type_label(primary_item["kind"])} «{primary_item["title"]}»'
            + (f' ({date_bit})' if date_bit else '')
        )

    summary = f"Источник KPI: {primary_line}" if primary_line else None
    if len(fragments) > 1 and primary_line:
        others = [f for f in fragments if f != primary_line]
        if others:
            summary += f" · также: {'; '.join(others)}"

    return {
        "parts": parts,
        "primary_kind": primary_kind,
        "summary_line": summary,
    }
