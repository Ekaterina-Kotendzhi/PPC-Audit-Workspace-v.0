"""Persist and load manual_metrics materials."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditMaterial
from app.services.material_helpers import sync_material_status
from app.services.metrics_service import validate_metrics_payload


def touch_material(material: AuditMaterial) -> None:
    material.updated_at = datetime.now(timezone.utc)


def upsert_manual_metrics(audit_id: int, payload: dict[str, Any], db: Session, project: AuditProject | None = None) -> AuditMaterial:
    normalized, review_reasons = validate_metrics_payload(payload)
    content = json.dumps(normalized, ensure_ascii=False)
    review_reason = "; ".join(dict.fromkeys(review_reasons)) if review_reasons else None

    if project is None:
        from app.models import AuditProject as AP
        project = db.query(AP).filter(AP.id == audit_id).first()

    from app.services.metrics_periods_service import (
        ensure_active_metrics_material_id,
        resolve_latest_period_metrics_material,
    )
    from app.services.period_service import period_sort_key

    existing = resolve_latest_period_metrics_material(project) if project else None
    if existing is None:
        existing = (
            db.query(AuditMaterial)
            .filter(AuditMaterial.audit_project_id == audit_id, AuditMaterial.type == "manual_metrics")
            .order_by(AuditMaterial.id.desc())
            .first()
        )
    if existing:
        try:
            old = json.loads(existing.raw_content or "{}")
        except json.JSONDecodeError:
            old = {}
        old_period = (old.get("period") if isinstance(old, dict) else None) or ""
        new_period = normalized.get("period") or ""
        same_month = (
            old_period
            and new_period
            and period_sort_key(old_period) == period_sort_key(new_period)
        )
        if same_month:
            merged = dict(old) if isinstance(old, dict) else {}
            merged.update({k: v for k, v in normalized.items() if v not in (None, "")})
            normalized, review_reasons = validate_metrics_payload(merged)
            content = json.dumps(normalized, ensure_ascii=False)
            review_reason = "; ".join(dict.fromkeys(review_reasons)) if review_reasons else None
            existing.raw_content = content
            existing.extracted_text = content
            existing.title = f"Метрики: {normalized.get('period') or 'без периода'}"
            existing.needs_review = bool(review_reasons)
            existing.review_reason = review_reason
            sync_material_status(existing)
            touch_material(existing)
            if project is not None:
                ensure_active_metrics_material_id(project, db)
            return existing

    created = AuditMaterial(
        audit_project_id=audit_id,
        type="manual_metrics",
        title=f"Метрики: {normalized.get('period') or 'без периода'}",
        raw_content=content,
        extracted_text=content,
        confidence=1.0,
        needs_review=bool(review_reasons),
        review_reason=review_reason,
        status="needs_review" if review_reasons else "ready",
    )
    sync_material_status(created)
    db.add(created)
    db.flush()
    if project is not None:
        ensure_active_metrics_material_id(project, db)
    return created


def load_manual_metrics_dict(project) -> dict[str, Any]:
    """Deprecated merge of all periods — use load_active_manual_metrics_dict."""
    from app.services.metrics_periods_service import load_active_manual_metrics_dict
    return load_active_manual_metrics_dict(project)


def latest_manual_metrics_material(project):
    from app.services.metrics_extract_service import _normalize_ts

    items = [m for m in (project.materials or []) if m.type == "manual_metrics"]
    if not items:
        return None

    def _key(m):
        ts = getattr(m, "updated_at", None) or getattr(m, "created_at", None)
        return (_normalize_ts(ts), getattr(m, "id", 0))

    return max(items, key=_key)
