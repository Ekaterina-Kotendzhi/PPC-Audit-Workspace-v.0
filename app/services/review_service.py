"""Build unified review queue for audit UI."""
from __future__ import annotations

from app.models import AuditProject
from app.schemas import ReviewQueueItem
from app.services.direct_health_findings_service import is_direct_health_finding
from app.services.material_helpers import material_type_label


def build_review_queue(project: AuditProject) -> list[ReviewQueueItem]:
    items: list[ReviewQueueItem] = []

    for material in project.materials:
        if material.needs_review and not material.excluded_from_analysis:
            items.append(ReviewQueueItem(
                item_type="material",
                id=material.id,
                title=material.title or material_type_label(material.type),
                reason=material.review_reason,
                material_type=material.type,
                status=getattr(material, "status", None) or "needs_review",
            ))

    for finding in project.findings:
        if is_direct_health_finding(finding):
            continue
        if finding.needs_review and (finding.status or "ai_generated") != "human_rejected":
            items.append(ReviewQueueItem(
                item_type="finding",
                id=finding.id,
                title=(finding.title or finding.problem or "Вывод AI")[:200],
                reason=finding.review_reason,
                status=finding.status,
            ))

    return items


def count_needs_review(project: AuditProject) -> int:
    materials_count = sum(
        1 for m in project.materials
        if m.needs_review and not m.excluded_from_analysis
    )
    findings_count = sum(
        1 for f in project.findings
        if not is_direct_health_finding(f)
        and f.needs_review
        and (f.status or "ai_generated") != "human_rejected"
    )
    return materials_count + findings_count
