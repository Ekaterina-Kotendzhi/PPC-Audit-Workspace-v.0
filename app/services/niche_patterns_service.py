"""Aggregated risk patterns by niche for chat (M2.16)."""
from __future__ import annotations

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import AuditFinding, AuditProject, Client

_CONFIRMED_STATUSES = ("human_confirmed", "human_edited")


def fetch_niche_patterns(
    db: Session,
    *,
    niche: str | None,
    limit: int = 3,
) -> list[dict[str, Any]]:
    """MVP: SQL group by area for confirmed risk_pattern findings in the same niche."""
    niche_clean = (niche or "").strip()
    if not niche_clean:
        return []

    area_rows = (
        db.query(
            AuditFinding.area,
            func.count(AuditFinding.id).label("finding_count"),
            func.count(func.distinct(AuditFinding.audit_project_id)).label("audit_count"),
        )
        .join(AuditProject, AuditProject.id == AuditFinding.audit_project_id)
        .join(Client, Client.id == AuditProject.client_id)
        .filter(Client.niche == niche_clean)
        .filter(AuditFinding.finding_kind == "risk_pattern")
        .filter(AuditFinding.status.in_(_CONFIRMED_STATUSES))
        .group_by(AuditFinding.area)
        .order_by(func.count(func.distinct(AuditFinding.audit_project_id)).desc())
        .limit(limit)
        .all()
    )
    if not area_rows:
        return []

    patterns: list[dict[str, Any]] = []
    for area, finding_count, audit_count in area_rows:
        sample = (
            db.query(AuditFinding.problem, AuditFinding.recommendation)
            .join(AuditProject, AuditProject.id == AuditFinding.audit_project_id)
            .join(Client, Client.id == AuditProject.client_id)
            .filter(Client.niche == niche_clean)
            .filter(AuditFinding.finding_kind == "risk_pattern")
            .filter(AuditFinding.status.in_(_CONFIRMED_STATUSES))
            .filter(AuditFinding.area == area)
            .order_by(AuditFinding.edited_at.desc(), AuditFinding.created_at.desc())
            .limit(2)
            .all()
        )
        formulations = [
            str(row.problem or "").strip()[:200]
            for row in sample
            if row.problem
        ]
        patterns.append({
            "area": area or "other",
            "niche": niche_clean,
            "audit_count": int(audit_count or 0),
            "finding_count": int(finding_count or 0),
            "sample_formulations": formulations,
            "label": f"В {int(audit_count or 0)} аудит(ах) ниши «{niche_clean}» — зона «{area or 'прочее'}»",
        })
    return patterns


def build_niche_patterns_prompt_block(patterns: list[dict[str, Any]]) -> str:
    if not patterns:
        return ""
    lines = [
        "",
        "---",
        "",
        "## Паттерны агентства по нише (подтверждённые risk_pattern)",
        "Используй как контекст «что часто встречается», без чужих цифр из других аудитов.",
        "",
    ]
    for idx, row in enumerate(patterns, 1):
        lines.append(f"Паттерн {idx}: {row.get('label', '')}")
        for sample in row.get("sample_formulations") or []:
            lines.append(f"  — {sample}")
        lines.append("")
    return "\n".join(lines)
