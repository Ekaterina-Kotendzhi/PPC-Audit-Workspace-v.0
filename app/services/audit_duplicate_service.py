"""Duplicate audit project with materials (G4), without runs/findings."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import AuditMaterial, AuditProject
from app.services.report_appendix_service import load_report_appendix_items, remap_appendix_material_ids, save_report_appendix


def duplicate_audit_project(source: AuditProject, db: Session) -> AuditProject:
    """Copy audit as new draft; reuses client, skips findings/runs/chat."""
    clone = AuditProject(
        client_id=source.client_id,
        goal=source.goal,
        status="draft",
        needs_review=False,
        accepted_data_limitations_json=None,
        archived_at=None,
    )
    db.add(clone)
    db.flush()

    id_map: dict[int, int] = {}
    for material in source.materials or []:
        created = AuditMaterial(
            audit_project_id=clone.id,
            type=material.type,
            title=material.title,
            raw_content=material.raw_content,
            file_url=material.file_url,
            extracted_text=material.extracted_text,
            confidence=material.confidence,
            needs_review=material.needs_review,
            review_reason=material.review_reason,
            status=material.status or "ready",
            excluded_from_analysis=material.excluded_from_analysis,
            excluded_from_report=material.excluded_from_report,
            exclusion_reason=material.exclusion_reason,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(created)
        db.flush()
        id_map[material.id] = created.id

    source_appendix = load_report_appendix_items(source)
    if source_appendix:
        remapped = remap_appendix_material_ids(source_appendix, id_map)
        if remapped:
            try:
                save_report_appendix(clone, remapped)
            except Exception:
                clone.report_appendix_json = json.dumps({"items": [], "updated_at": datetime.now(timezone.utc).isoformat()})

    db.commit()
    db.refresh(clone)
    return clone
